# Age-bot API Service

Flask API для определения возраста по фотографии лица с использованием MXNet модели.

## 🚀 Быстрый старт

### Локальная разработка

```bash
# Установка зависимостей
pip install -r requirements.txt

# Запуск сервера
python app.py
```

Сервер запустится на `http://localhost:5000`

### Развертывание на Timeweb

```bash
# 1. Подключение к серверу
ssh root@37.252.20.170

# 2. Создание директории
mkdir -p /var/www/age-bot-api
cd /var/www/age-bot-api

# 3. Копирование файлов (с локальной машины)
scp -r * root@37.252.20.170:/var/www/age-bot-api/

# 4. Установка зависимостей на сервере
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 5. Запуск с gunicorn
gunicorn --bind 0.0.0.0:5000 --workers 2 app:app
```

## 📡 API Endpoints

### GET `/health`
Проверка здоровья сервиса

**Response:**
```json
{
  "status": "ok",
  "model_loaded": true
}
```

### POST `/api/estimate-age`
Определение возраста по фотографии

**Request:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response:**
```json
{
  "age": 35,
  "confidence": 0.95,
  "status": "success"
}
```

## 📁 Структура проекта

```
age-bot-api/
├── app.py              # Flask приложение
├── requirements.txt    # Python зависимости
├── models/            # MXNet модели (нужно добавить)
│   ├── model-0000.params
│   └── model-symbol.json
├── README.md
└── .gitignore
```

## 🔧 Настройка модели

Модели нужно скопировать из `/Users/alexeipinaev/Documents/Rejuvena/age-gender-estimation-master/models/`

## 🌐 CORS

API настроен с CORS для работы с фронтендом на `https://seplitza.github.io`

## 🔒 Безопасность

- Рекомендуется добавить rate limiting
- Настроить nginx как reverse proxy
- Добавить API key authentication
