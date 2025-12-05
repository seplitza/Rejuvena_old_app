#!/usr/bin/env python3
"""
Age-bot API Service - Google Cloud Vision Edition
Flask API для определения возраста по фотографии лица
Использует Google Cloud Vision API для точной оценки возраста
"""

import os
import base64
import io
from flask import Flask, request, jsonify
from flask_cors import CORS
from google.cloud import vision
from google.oauth2 import service_account

app = Flask(__name__)
CORS(app)

# Глобальные переменные
vision_client = None
model_loaded = False

def load_models():
    """Загрузка Google Cloud Vision API клиента"""
    global vision_client, model_loaded
    
    try:
        print('Loading Google Cloud Vision API client...')
        
        # Путь к JSON ключу service account
        credentials_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', 
                                         '/var/www/age-bot-api/google-credentials.json')
        
        if not os.path.exists(credentials_path):
            print(f'❌ Credentials file not found: {credentials_path}')
            print('Please set GOOGLE_APPLICATION_CREDENTIALS environment variable')
            return False
        
        # Создаём credentials из JSON файла
        credentials = service_account.Credentials.from_service_account_file(
            credentials_path,
            scopes=['https://www.googleapis.com/auth/cloud-vision']
        )
        
        # Инициализация Vision API клиента
        vision_client = vision.ImageAnnotatorClient(credentials=credentials)
        
        model_loaded = True
        print('✅ Google Cloud Vision API client loaded successfully')
        return True
        
    except Exception as e:
        print(f'❌ Failed to load Google Cloud Vision API: {e}')
        import traceback
        traceback.print_exc()
        return False

def decode_base64_image(base64_string):
    """Декодирование base64 изображения"""
    try:
        # Убираем префикс data:image/...;base64, если есть
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # Декодируем base64
        image_data = base64.b64decode(base64_string)
        
        return image_data
        
    except Exception as e:
        print(f'Error decoding image: {e}')
        return None

@app.route('/api/estimate-age', methods=['POST'])
def estimate_age():
    """
    API endpoint для определения возраста по фото
    
    Ожидает JSON:
    {
        "image": "base64_encoded_image_data"
    }
    
    Возвращает:
    {
        "age": int,
        "success": bool,
        "message": str,
        "confidence": float (optional)
    }
    """
    try:
        if not model_loaded:
            return jsonify({
                'success': False,
                'message': 'Google Cloud Vision API not initialized',
                'age': None
            }), 500
        
        # Получаем данные из запроса
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({
                'success': False,
                'message': 'No image data provided',
                'age': None
            }), 400
        
        # Декодируем изображение
        image_bytes = decode_base64_image(data['image'])
        
        if image_bytes is None:
            return jsonify({
                'success': False,
                'message': 'Failed to decode image',
                'age': None
            }), 400
        
        print(f'Processing image: {len(image_bytes)} bytes')
        
        # Создаём Vision API Image объект
        image = vision.Image(content=image_bytes)
        
        # Вызываем Face Detection
        response = vision_client.face_detection(image=image)
        faces = response.face_annotations
        
        if response.error.message:
            raise Exception(f'Vision API error: {response.error.message}')
        
        if not faces or len(faces) == 0:
            return jsonify({
                'success': False,
                'message': 'No face detected',
                'age': None
            }), 400
        
        # Берём первое лицо (обычно самое большое)
        face = faces[0]
        
        # Google Cloud Vision НЕ возвращает точный возраст напрямую
        # Но можно использовать другие признаки или Face++ API
        # Для примера используем joy_likelihood как базу (это не точно)
        
        # АЛЬТЕРНАТИВА: используем Celebrity Recognition или переключаемся на Face++
        print(f'Face detected with confidence: {face.detection_confidence}')
        print(f'Landmarks: {len(face.landmarks)}')
        
        # Google Vision API НЕ предоставляет возраст!
        # Нужно использовать Face++ или Microsoft Azure Face
        
        return jsonify({
            'success': False,
            'message': 'Google Cloud Vision API does not provide age estimation. Use Microsoft Azure Face API or Face++ instead.',
            'age': None,
            'note': 'Vision API detected face but cannot estimate age'
        }), 501
        
    except Exception as e:
        print(f'❌ Error in estimate_age: {e}')
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'message': f'Internal server error: {str(e)}',
            'age': None
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model_loaded,
        'provider': 'Google Cloud Vision API'
    }), 200

# Загружаем модели при старте
load_models()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
