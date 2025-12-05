#!/usr/bin/env python3
"""
Age-bot API Service - Face++ Edition
Flask API для определения возраста по фотографии лица
Использует Face++ API для точной оценки возраста
"""

import os
import base64
import io
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Face++ API credentials (из переменных окружения)
FACEPP_API_KEY = os.environ.get('FACEPP_API_KEY', '')
FACEPP_API_SECRET = os.environ.get('FACEPP_API_SECRET', '')
FACEPP_API_URL = 'https://api-us.faceplusplus.com/facepp/v3/detect'

# Глобальные переменные
model_loaded = False

def load_models():
    """Проверка наличия API ключей"""
    global model_loaded
    
    try:
        print('Checking Face++ API credentials...')
        
        if not FACEPP_API_KEY or not FACEPP_API_SECRET:
            print('❌ Face++ API credentials not found')
            print('Please set FACEPP_API_KEY and FACEPP_API_SECRET environment variables')
            return False
        
        print(f'✅ Face++ API Key: {FACEPP_API_KEY[:8]}...')
        model_loaded = True
        return True
        
    except Exception as e:
        print(f'❌ Failed to initialize Face++ API: {e}')
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
        "confidence": float (optional),
        "gender": str (optional)
    }
    """
    try:
        if not model_loaded:
            return jsonify({
                'success': False,
                'message': 'Face++ API not initialized. Check API credentials.',
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
        
        # Подготовка запроса к Face++ API
        files = {
            'image_file': ('image.jpg', image_bytes, 'image/jpeg')
        }
        
        payload = {
            'api_key': FACEPP_API_KEY,
            'api_secret': FACEPP_API_SECRET,
            'return_attributes': 'age,gender'  # Запрашиваем возраст и пол
        }
        
        # Отправляем запрос к Face++ API
        print('Sending request to Face++ API...')
        response = requests.post(
            FACEPP_API_URL,
            data=payload,
            files=files,
            timeout=30
        )
        
        # Проверяем статус ответа
        if response.status_code != 200:
            print(f'Face++ API error: {response.status_code}')
            print(f'Response: {response.text}')
            return jsonify({
                'success': False,
                'message': f'Face++ API returned error: {response.status_code}',
                'age': None
            }), 500
        
        result = response.json()
        
        # Проверяем наличие ошибок в ответе
        if 'error_message' in result:
            print(f'Face++ error: {result["error_message"]}')
            return jsonify({
                'success': False,
                'message': result['error_message'],
                'age': None
            }), 400
        
        # Проверяем наличие лиц
        if 'faces' not in result or len(result['faces']) == 0:
            return jsonify({
                'success': False,
                'message': 'No face detected',
                'age': None
            }), 400
        
        # Берём первое лицо (самое большое по умолчанию)
        face = result['faces'][0]
        
        # Извлекаем возраст
        if 'attributes' not in face or 'age' not in face['attributes']:
            return jsonify({
                'success': False,
                'message': 'Age attribute not returned by Face++ API',
                'age': None
            }), 500
        
        age = face['attributes']['age']['value']
        gender = face['attributes'].get('gender', {}).get('value', 'Unknown')
        
        print(f'✅ Detected age: {age}, gender: {gender}')
        
        return jsonify({
            'success': True,
            'age': int(age),
            'gender': gender,
            'message': 'Age estimated successfully'
        }), 200
        
    except requests.exceptions.Timeout:
        print('❌ Face++ API timeout')
        return jsonify({
            'success': False,
            'message': 'Face++ API timeout. Please try again.',
            'age': None
        }), 504
        
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
        'provider': 'Face++ API'
    }), 200

# Загружаем модели при старте
load_models()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
