#!/usr/bin/env python3
"""
Age-bot API Service - AWS Rekognition
Flask API для определения возраста по фотографии лица
Использует AWS Rekognition DetectFaces для точной оценки возраста
"""

import os
import base64
import io
import boto3
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

app = Flask(__name__)
CORS(app)

# AWS Rekognition client
rekognition_client = None
aws_configured = False

def load_aws_rekognition():
    """Инициализация AWS Rekognition client"""
    global rekognition_client, aws_configured
    
    try:
        print('Initializing AWS Rekognition...')
        
        # AWS credentials должны быть в ~/.aws/credentials или переменных окружения:
        # AWS_ACCESS_KEY_ID и AWS_SECRET_ACCESS_KEY
        rekognition_client = boto3.client(
            'rekognition',
            region_name=os.environ.get('AWS_REGION', 'us-east-1')
        )
        
        aws_configured = True
        print('✅ AWS Rekognition initialized')
        return True
        
    except Exception as e:
        print(f'❌ Failed to initialize AWS Rekognition: {e}')
        import traceback
        traceback.print_exc()
        return False

def detect_age_with_rekognition(image_bytes):
    """
    Определение возраста с помощью AWS Rekognition DetectFaces API
    
    Args:
        image_bytes: байты изображения
        
    Returns:
        dict: {'age_low': int, 'age_high': int, 'estimated_age': int, 'confidence': float}
    """
    try:
        # Вызов AWS Rekognition DetectFaces API
        response = rekognition_client.detect_faces(
            Image={'Bytes': image_bytes},
            Attributes=['ALL']  # Запрашиваем все атрибуты включая возраст
        )
        
        # Проверяем, что лицо обнаружено
        if not response['FaceDetails']:
            return None
            
        # Берём первое обнаруженное лицо (самое крупное)
        face = response['FaceDetails'][0]
        
        # Извлекаем возрастной диапазон
        age_range = face.get('AgeRange', {})
        age_low = age_range.get('Low', 0)
        age_high = age_range.get('High', 0)
        
        # Вычисляем средний возраст
        estimated_age = int((age_low + age_high) / 2)
        
        # Confidence для всего лица
        confidence = face.get('Confidence', 0)
        
        print(f'AWS Rekognition detected: {age_low}-{age_high} years (avg: {estimated_age}), confidence: {confidence:.1f}%')
        
        return {
            'age_low': age_low,
            'age_high': age_high,
            'estimated_age': estimated_age,
            'confidence': confidence,
            'gender': face.get('Gender', {}).get('Value', 'Unknown'),
            'emotions': face.get('Emotions', [])[:3]  # Топ-3 эмоции
        }
        
    except Exception as e:
        print(f'Error in AWS Rekognition detection: {e}')
        import traceback
        traceback.print_exc()
        return None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'aws_rekognition': aws_configured
    })

@app.route('/api/estimate-age', methods=['POST'])
def estimate_age():
    """
    POST /api/estimate-age
    Body: {"image": "base64_encoded_image"}
    
    Response: {
        "age": int,
        "age_range": {"low": int, "high": int},
        "confidence": float,
        "method": "aws_rekognition"
    }
    """
    try:
        # Проверяем AWS Rekognition
        if not aws_configured:
            return jsonify({'error': 'AWS Rekognition not configured'}), 500
        
        # Получаем данные
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Декодируем base64 изображение
        image_data = data['image']
        
        # Убираем префикс data:image/...;base64, если есть
        if 'base64,' in image_data:
            image_data = image_data.split('base64,')[1]
        
        # Декодируем base64
        image_bytes = base64.b64decode(image_data)
        
        # Проверяем размер (AWS Rekognition limit: 5MB для DetectFaces)
        if len(image_bytes) > 5 * 1024 * 1024:
            return jsonify({'error': 'Image too large (max 5MB)'}), 413
        
        print(f'Received image: {len(image_bytes)} bytes')
        
        # Определяем возраст с помощью AWS Rekognition
        result = detect_age_with_rekognition(image_bytes)
        
        if result is None:
            return jsonify({'error': 'No face detected'}), 400
        
        # Формируем ответ
        response_data = {
            'age': result['estimated_age'],
            'age_range': {
                'low': result['age_low'],
                'high': result['age_high']
            },
            'confidence': round(result['confidence'], 2),
            'gender': result['gender'],
            'emotions': result['emotions'],
            'method': 'aws_rekognition'
        }
        
        print(f'Response: age={response_data["age"]}, confidence={response_data["confidence"]}%')
        
        return jsonify(response_data)
    
    except Exception as e:
        print(f'Error processing request: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print('🚀 Starting Age-bot API (AWS Rekognition)...')
    print('='*50)
    
    # Загружаем AWS Rekognition
    if not load_aws_rekognition():
        print('⚠️  Warning: AWS Rekognition not available')
        print('Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables')
    
    print('='*50)
    print('✅ Server ready')
    
    # Запускаем Flask
    app.run(host='0.0.0.0', port=5000, debug=False)
