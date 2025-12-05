#!/usr/bin/env python3
"""Тест Age-bot API с реальным изображением"""

import base64
import requests
from PIL import Image
import io

# Создаём простое тестовое изображение лица 112x112
img = Image.new('RGB', (112, 112), color=(128, 128, 128))
buffer = io.BytesIO()
img.save(buffer, format='JPEG')
img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

# Отправляем запрос
url = 'http://37.252.20.170:5000/api/estimate-age'
response = requests.post(url, json={'image': img_base64})

print('Status Code:', response.status_code)
print('Response:', response.json())
