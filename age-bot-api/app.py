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
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ImageDraw, ImageFont
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
        # Используем buffalo_l с genderage.onnx для определения возраста и пола
        # Требует ~500MB RAM, используем swap если нужно
        face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
        face_app.prepare(ctx_id=-1, det_size=(640, 640))
        model_loaded = True
        print('✅ InsightFace buffalo_l model loaded successfully (with age/gender estimation)')
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
            return jsonify({
                'success': False,
                'message': 'Failed to estimate age',
                'age': None
            }), 500
        
        # Возвращаем результат в формате, ожидаемом фронтендом
        return jsonify({
            'success': True,
            'age': age,
            'confidence': 0.95,
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
        print('🎨 create_collage called')
        data = request.get_json()
        
        if not data:
            print('❌ No data provided')
            return jsonify({'error': 'No data provided'}), 400
        
        print(f'📦 Received data keys: {list(data.keys())}')
        
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
        
        # Извлекаем userInfo для заголовка и футера
        user_info = data.get('userInfo', {})
        username = user_info.get('username', 'Пользователь')
        print(f'📄 UserInfo: {user_info}')
        
        # Создаём вертикальный коллаж с заголовком и футером
        # Размеры одного фото в коллаже (КВАДРАТНЫЕ) - Увеличено для лучшего качества
        photo_size = 800  # квадратные фото 800x800
        
        # Отступы (пропорционально увеличены)
        padding = 30  # отступ между фото в паре
        row_spacing = 60  # отступ между парами
        border = 60  # рамка по краям
        header_height = 120  # высота заголовка
        footer_height = 350  # высота футера с анкетой
        
        # Определяем количество пар
        num_pairs = len(rows)
        
        # Размер коллажа
        pair_width = photo_size * 2 + padding
        collage_width = pair_width + border * 2
        photos_height = (photo_size + row_spacing) * num_pairs - row_spacing
        collage_height = header_height + photos_height + footer_height + border * 2
        
        # Создаём белый фон
        collage = Image.new('RGB', (collage_width, collage_height), 'white')
        draw = ImageDraw.Draw(collage)
        
        # Шрифты (увеличенные для 800px фото)
        try:
            font_large = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 48)
            font_normal = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 36)
            font_small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 28)
            print('✅ Fonts loaded successfully')
        except Exception as e:
            print(f'⚠️ Font loading failed: {e}, using default')
            font_large = ImageFont.load_default()
            font_normal = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # ЗАГОЛОВОК: "Фотодневник | Имя | Дата"
        current_date = datetime.now().strftime('%d.%m.%Y')
        header_text = f"Фотодневник | {username} | {current_date}"
        draw.text((border, 30), header_text, fill='black', font=font_large)
        
        # Функция для обрезки изображения в квадрат (crop center)
        def crop_to_square(img):
            width, height = img.size
            size = min(width, height)
            left = (width - size) // 2
            top = (height - size) // 2
            return img.crop((left, top, left + size, top + size))
        
        # Размещаем пары фото (До слева, После справа)
        photos_start_y = header_height + border
        for i in range(num_pairs):
            y_position = photos_start_y + i * (photo_size + row_spacing)
            
            # Фото "До" (левое)
            if i < len(before_images) and before_images[i]:
                img_before = before_images[i].copy()
                img_before = crop_to_square(img_before)  # Квадратное
                img_before = img_before.resize((photo_size, photo_size), Image.Resampling.LANCZOS)
                x_before = border
                collage.paste(img_before, (x_before, y_position))
            
            # Фото "После" (правое)
            if i < len(after_images) and after_images[i]:
                img_after = after_images[i].copy()
                img_after = crop_to_square(img_after)  # Квадратное
                img_after = img_after.resize((photo_size, photo_size), Image.Resampling.LANCZOS)
                x_after = border + photo_size + padding
                collage.paste(img_after, (x_after, y_position))
        
        # ФУТЕР С АНКЕТОЙ (только заполненные поля)
        footer_y = photos_start_y + photos_height + 60
        draw.text((border, footer_y), "Анкета:", fill='black', font=font_normal)
        
        footer_fields = []
        if user_info.get('realAgeBefore'):
            footer_fields.append(f"Возраст До: {user_info['realAgeBefore']}")
        if user_info.get('realAgeAfter'):
            footer_fields.append(f"Возраст После: {user_info['realAgeAfter']}")
        if user_info.get('gender'):
            footer_fields.append(f"Пол: {user_info['gender']}")
        if user_info.get('skinType'):
            footer_fields.append(f"Тип кожи: {user_info['skinType']}")
        if user_info.get('procedures'):
            footer_fields.append(f"Процедуры: {user_info['procedures']}")
        
        print(f'📝 Footer fields: {footer_fields}')
        
        line_y = footer_y + 50
        for field in footer_fields:
            draw.text((border, line_y), field, fill='black', font=font_small)
            line_y += 45
        
        # Сохраняем в буфер как JPEG с максимальным качеством
        output = io.BytesIO()
        collage.save(output, format='JPEG', quality=95, optimize=True)
        output.seek(0)
        print(f'✅ Collage created: {collage.size}, {len(output.getvalue())} bytes')
        
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
