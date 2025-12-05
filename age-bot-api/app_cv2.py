#!/usr/bin/env python3
"""
Age-bot API Service - CV2 версия с легкими моделями
Flask API для определения возраста по фотографии лица
"""

import os
import base64
import io
import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

app = Flask(__name__)
CORS(app)

# Глобальные переменные для моделей
face_net = None
age_net = None
model_loaded = False

# Константы
MODEL_MEAN_VALUES = (78.4263377603, 87.7689143744, 114.895847746)
AGE_BUCKETS = ['(0-2)', '(4-6)', '(8-12)', '(15-20)', '(25-32)', '(38-43)', '(48-53)', '(60-100)']
AGE_MIDPOINTS = [1, 5, 10, 17, 28, 40, 50, 70]  # Средние значения для каждого диапазона

def load_models():
    """Загрузка легких моделей для определения лица и возраста"""
    global face_net, age_net, model_loaded
    
    try:
        print('Loading OpenCV DNN models...')
        
        base_dir = os.path.dirname(os.path.abspath(__file__))
        models_dir = os.path.join(base_dir, 'models')
        
        # Пути к моделям
        face_proto = os.path.join(models_dir, 'opencv_face_detector.pbtxt')
        face_model = os.path.join(models_dir, 'opencv_face_detector_uint8.pb')
        age_proto = os.path.join(models_dir, 'age_deploy.prototxt')
        age_model = os.path.join(models_dir, 'age_net.caffemodel')
        
        # Проверяем наличие файлов
        if not all(os.path.exists(p) for p in [face_proto, face_model, age_proto, age_model]):
            print('❌ Model files not found. Please download them first.')
            return False
        
        # Загружаем модели
        face_net = cv2.dnn.readNet(face_model, face_proto)
        age_net = cv2.dnn.readNet(age_model, age_proto)
        
        model_loaded = True
        print('✅ OpenCV models loaded successfully')
        return True
        
    except Exception as e:
        print(f'❌ Failed to load models: {e}')
        import traceback
        traceback.print_exc()
        return False

def detect_face(image):
    """Детекция лица с использованием OpenCV DNN"""
    height, width = image.shape[:2]
    
    # Подготовка blob для детекции лица
    blob = cv2.dnn.blobFromImage(image, 1.0, (300, 300), MODEL_MEAN_VALUES, swapRB=False)
    face_net.setInput(blob)
    detections = face_net.forward()
    
    # Находим лицо с наибольшей уверенностью
    best_confidence = 0
    best_box = None
    
    for i in range(detections.shape[2]):
        confidence = detections[0, 0, i, 2]
        if confidence > 0.7 and confidence > best_confidence:
            best_confidence = confidence
            box = detections[0, 0, i, 3:7] * np.array([width, height, width, height])
            best_box = box.astype("int")
    
    return best_box, best_confidence

def estimate_age(image):
    """
    Определение возраста по изображению
    
    Возвращает: возраст (int) или None при ошибке
    """
    if not model_loaded:
        print('❌ Models not loaded')
        return None
    
    try:
        # Конвертируем PIL Image в numpy array (BGR для OpenCV)
        if isinstance(image, Image.Image):
            if image.mode != 'RGB':
                image = image.convert('RGB')
            img_array = np.array(image)
            img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        else:
            img_bgr = image
        
        print(f'📸 Input shape: {img_bgr.shape}')
        
        # Детекция лица
        face_box, confidence = detect_face(img_bgr)
        
        if face_box is None:
            print('⚠️ No face detected')
            return None
        
        print(f'👤 Face detected with confidence: {confidence:.3f}')
        
        # Извлекаем область лица
        (startX, startY, endX, endY) = face_box
        face_img = img_bgr[startY:endY, startX:endX]
        
        if face_img.size == 0:
            print('⚠️ Invalid face region')
            return None
        
        # Подготовка blob для определения возраста
        blob = cv2.dnn.blobFromImage(face_img, 1.0, (227, 227), MODEL_MEAN_VALUES, swapRB=False)
        age_net.setInput(blob)
        age_preds = age_net.forward()
        
        # Получаем индекс возрастной группы с максимальной вероятностью
        age_idx = age_preds[0].argmax()
        estimated_age = AGE_MIDPOINTS[age_idx]
        
        print(f'✅ Estimated age: {estimated_age} (bucket: {AGE_BUCKETS[age_idx]})')
        
        return estimated_age
        
    except Exception as e:
        print(f'❌ Age estimation error: {e}')
        import traceback
        traceback.print_exc()
        return None

@app.route('/health', methods=['GET'])
def health_check():
    """Проверка здоровья сервиса"""
    return jsonify({
        'status': 'ok',
        'model_loaded': model_loaded
    })

@app.route('/api/estimate-age', methods=['POST'])
def estimate_age_endpoint():
    """Endpoint для определения возраста"""
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Декодируем base64 изображение
        image_data = data['image']
        
        # Убираем data:image prefix если есть
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Декодируем
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Конвертируем в RGB если нужно
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Определяем возраст
        age = estimate_age(image)
        
        if age is None:
            return jsonify({'error': 'Failed to estimate age'}), 500
        
        # Возвращаем результат
        return jsonify({
            'age': age,
            'confidence': 0.85,
            'status': 'success'
        })
        
    except Exception as e:
        print(f'❌ Error processing request: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/', methods=['GET'])
def index():
    """Главная страница API"""
    return jsonify({
        'service': 'Age-bot API (OpenCV)',
        'version': '2.0.0',
        'endpoints': {
            'health': '/health',
            'estimate_age': '/api/estimate-age (POST)'
        }
    })

# Загружаем модели при импорте
print('🔄 Initializing Age-bot API with OpenCV DNN...')
load_models()

if __name__ == '__main__':
    print('🚀 Starting Age-bot API...')
    
    if not model_loaded:
        load_models()
    
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
