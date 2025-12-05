#!/usr/bin/env python3
"""
Age-bot API Service - InsightFace Edition
Flask API для определения возраста по фотографии лица
Использует InsightFace buffalo_sc для точной оценки возраста
"""

import os
import base64
import io
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import insightface
from insightface.app import FaceAnalysis

app = Flask(__name__)
CORS(app)

# Глобальные переменные
face_app = None
model_loaded = False

def load_models():
    """Загрузка InsightFace модели"""
    global face_app, model_loaded
    
    try:
        print('Loading InsightFace buffalo_l model...')
        
        # Инициализация FaceAnalysis с buffalo_l моделью (поддерживает age)
        face_app = FaceAnalysis(
            name='buffalo_l',
            providers=['CPUExecutionProvider']
        )
        
        # Подготовка модели (ctx_id=-1 для CPU)
        face_app.prepare(ctx_id=-1, det_size=(640, 640))
        
        model_loaded = True
        print('✅ InsightFace model loaded successfully')
        return True
        
    except Exception as e:
        print(f'❌ Failed to load InsightFace model: {e}')
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
        
        # Конвертируем в PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Конвертируем в RGB если нужно
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Конвертируем в numpy array (BGR для OpenCV)
        img_array = np.array(image)
        img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        
        return img_bgr
        
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
        "message": str
    }
    """
    try:
        if not model_loaded:
            return jsonify({
                'success': False,
                'message': 'Model not loaded',
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
        img = decode_base64_image(data['image'])
        
        if img is None:
            return jsonify({
                'success': False,
                'message': 'Failed to decode image',
                'age': None
            }), 400
        
        # Проверяем размер изображения
        if img.size == 0:
            return jsonify({
                'success': False,
                'message': 'Empty image',
                'age': None
            }), 400
        
        print(f'Processing image: shape={img.shape}, dtype={img.dtype}')
        
        # Детекция лиц с помощью InsightFace
        faces = face_app.get(img)
        
        if not faces or len(faces) == 0:
            return jsonify({
                'success': False,
                'message': 'No face detected',
                'age': None
            }), 400
        
        # Берём первое лицо (самое большое по умолчанию)
        face = faces[0]
        
        # Получаем возраст
        age = int(face.age)
        
        print(f'✅ Detected age: {age}')
        
        return jsonify({
            'success': True,
            'age': age,
            'message': 'Age estimated successfully'
        }), 200
        
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
        'model_loaded': model_loaded
    }), 200

# Загружаем модели при старте
load_models()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
