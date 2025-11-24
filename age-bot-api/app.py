#!/usr/bin/env python3
"""
Age-bot API Service
Flask API для определения возраста по фотографии лица
Использует MXNet модель из age-gender-estimation
"""

import os
import base64
import io
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from insightface.app import FaceAnalysis

app = Flask(__name__)
CORS(app)  # Разрешаем CORS для фронтенда

# InsightFace app
face_app = None
model_loaded = False

def load_insightface_model():
    """Загрузка InsightFace модели для определения возраста"""
    global face_app, model_loaded
    try:
        print('Loading InsightFace model...')
        # Используем buffalo_sc с явным включением атрибутов (возраст)
        face_app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
        # allowed_modules=['detection', 'genderage'] для включения определения возраста
        face_app.prepare(ctx_id=-1, det_size=(640, 640))
        model_loaded = True
        print('✅ InsightFace model loaded successfully')
        return True
    except Exception as e:
        print(f'❌ Failed to load InsightFace model: {e}')
        import traceback
        traceback.print_exc()
        return False

def estimate_age(image):
    """
    Определение возраста по изображению с использованием InsightFace
    
    Возвращает: возраст (int) или None при ошибке
    """
    if face_app is None:
        print('❌ InsightFace model not loaded')
        return None
    
    try:
        # Конвертируем PIL Image в numpy array (BGR для InsightFace)
        if isinstance(image, Image.Image):
            # Конвертируем в RGB если нужно
            if image.mode != 'RGB':
                image = image.convert('RGB')
            img_array = np.array(image)
        else:
            img_array = image
        
        # InsightFace требует BGR (OpenCV format)
        img_bgr = img_array[:, :, ::-1]
        
        print(f'📸 Input shape: {img_bgr.shape}')
        
        # Detect faces and analyze
        faces = face_app.get(img_bgr)
        
        if len(faces) == 0:
            print('⚠️ No face detected')
            return None
        
        # Берём первое лицо (самое большое по умолчанию)
        face = faces[0]
        
        # InsightFace возвращает точный возраст
        estimated_age = int(face.age)
        
        print(f'✅ InsightFace estimated age: {estimated_age}')
        print(f'   Face bbox: {face.bbox}, det_score: {face.det_score:.3f}')
        
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
    """
    Endpoint для определения возраста
    
    Request JSON:
    {
        "image": "base64_encoded_image_data"
    }
    
    Response JSON:
    {
        "age": 35,
        "confidence": 0.95
    }
    """
    try:
        # Получаем данные
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
            'confidence': 0.95,  # Mock confidence, можно добавить реальную если модель поддерживает
            'status': 'success'
        })
        
    except Exception as e:
        print(f'❌ Error processing request: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/create-collage', methods=['POST'])
def create_collage():
    """
    Создание коллажа из загруженных фотографий
    
    Request JSON (new format):
    {
        "rows": [
            {"beforePhoto": "base64_img", "afterPhoto": "base64_img", "photoType": "front"},
            ...
        ],
        "metadata": {...},
        "userInfo": {
            "username": "user@email.com",
            "realAgeBefore": 36,
            "realAgeAfter": 36,
            ...
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Поддержка новой структуры с rows
        rows = data.get('rows', [])
        
        if not rows or len(rows) == 0:
            return jsonify({'error': 'No photo rows provided'}), 400
        
        print(f'📸 Processing {len(rows)} photo rows for collage...')
        
        # Декодируем изображения из rows
        before_images = []
        after_images = []
        
        for idx, row in enumerate(rows):
            # Обрабатываем фото "До"
            before_base64 = row.get('beforePhoto')
            if before_base64:
                try:
                    if ',' in before_base64:
                        before_base64 = before_base64.split(',')[1]
                    img_bytes = base64.b64decode(before_base64)
                    img = Image.open(io.BytesIO(img_bytes))
                    if img.mode != 'RGB':
                        img = img.convert('RGB')
                    before_images.append(img)
                    print(f'  ✅ Row {idx}: Before photo loaded')
                except Exception as e:
                    print(f'  ⚠️ Row {idx}: Failed to load before photo: {e}')
                    before_images.append(None)
            else:
                before_images.append(None)
                print(f'  ⏭️ Row {idx}: No before photo')
            
            # Обрабатываем фото "После"
            after_base64 = row.get('afterPhoto')
            if after_base64:
                try:
                    if ',' in after_base64:
                        after_base64 = after_base64.split(',')[1]
                    img_bytes = base64.b64decode(after_base64)
                    img = Image.open(io.BytesIO(img_bytes))
                    if img.mode != 'RGB':
                        img = img.convert('RGB')
                    after_images.append(img)
                    print(f'  ✅ Row {idx}: After photo loaded')
                except Exception as e:
                    print(f'  ⚠️ Row {idx}: Failed to load after photo: {e}')
                    after_images.append(None)
            else:
                after_images.append(None)
                print(f'  ⏭️ Row {idx}: No after photo')
        
        # Создаём вертикальный коллаж (как на примере)
        # Формат: 12 рядов (6 пар "До | После")
        
        # Размеры одного фото в коллаже
        photo_width = 480  # ширина одного фото
        photo_height = 640  # высота одного фото
        
        # Отступы
        padding = 20  # отступ между фото в паре
        row_spacing = 40  # отступ между парами
        border = 40  # рамка по краям
        
        # Размер коллажа
        pair_width = photo_width * 2 + padding  # две фото + отступ между ними
        collage_width = pair_width + border * 2  # + рамки слева и справа
        collage_height = (photo_height + row_spacing) * 6 + border * 2 - row_spacing  # 6 пар + рамки - последний отступ
        
        # Создаём белый фон
        collage = Image.new('RGB', (collage_width, collage_height), 'white')
        
        # Размещаем 6 пар фото (До слева, После справа)
        for i in range(6):
            y_position = border + i * (photo_height + row_spacing)
            
            # Фото "До" (левое)
            if before_images[i]:
                img_before = before_images[i].copy()
                img_before = img_before.resize((photo_width, photo_height), Image.Resampling.LANCZOS)
                x_before = border
                collage.paste(img_before, (x_before, y_position))
            
            # Фото "После" (правое)
            if after_images[i]:
                img_after = after_images[i].copy()
                img_after = img_after.resize((photo_width, photo_height), Image.Resampling.LANCZOS)
                x_after = border + photo_width + padding
                collage.paste(img_after, (x_after, y_position))
        
        # Сохраняем в буфер как JPEG
        output = io.BytesIO()
        collage.save(output, format='JPEG', quality=85)
        output.seek(0)
        
        # Возвращаем как base64
        collage_base64 = base64.b64encode(output.getvalue()).decode('utf-8')
        
        return jsonify({
            'success': True,
            'collage': f'data:image/jpeg;base64,{collage_base64}'
        })
        
    except Exception as e:
        print(f'❌ Error creating collage: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/', methods=['GET'])
def index():
    """Главная страница API"""
    return jsonify({
        'service': 'Age-bot API',
        'version': '1.0.0',
        'endpoints': {
            'health': '/health',
            'estimate_age': '/api/estimate-age (POST)',
            'create_collage': '/api/create-collage (POST)'
        }
    })

# Загружаем InsightFace модель при импорте (для gunicorn workers)
print('🔄 Initializing Age-bot API with InsightFace...')
load_insightface_model()

if __name__ == '__main__':
    print('🚀 Starting Age-bot API...')
    
    # Загружаем модель при старте
    if not model_loaded:
        load_insightface_model()
    
    # Запускаем сервер
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
