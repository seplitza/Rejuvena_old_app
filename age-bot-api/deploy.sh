#!/bin/bash

# Скрипт для развертывания Age-bot API на Timeweb

SERVER="root@37.252.20.170"
REMOTE_DIR="/var/www/age-bot-api"

echo "🚀 Deploying Age-bot API to Timeweb..."

# 1. Создание директории на сервере
echo "📁 Creating remote directory..."
ssh $SERVER "mkdir -p $REMOTE_DIR"

# 2. Копирование файлов
echo "📤 Uploading files..."
scp -r app.py requirements.txt README.md $SERVER:$REMOTE_DIR/

# 3. Копирование моделей (если есть)
if [ -d "./models" ]; then
    echo "📦 Uploading models..."
    scp -r models/ $SERVER:$REMOTE_DIR/models/
fi

# 4. Установка зависимостей и запуск
echo "⚙️  Setting up environment on server..."
ssh $SERVER << 'EOF'
cd /var/www/age-bot-api

# Создание виртуального окружения
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Активация и установка зависимостей
source venv/bin/activate
pip install -r requirements.txt

# Остановка старого процесса (если есть)
pkill -f "gunicorn.*age-bot-api" || true

# Запуск сервера
nohup gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 120 app:app > logs.txt 2>&1 &

echo "✅ Age-bot API deployed and running on port 5000"
EOF

echo ""
echo "✅ Deployment complete!"
echo "🌐 API available at: http://37.252.20.170:5000"
echo "📊 Check health: http://37.252.20.170:5000/health"
