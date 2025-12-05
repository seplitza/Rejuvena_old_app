# Age-bot API - Документация

## Описание
Flask API для определения возраста по фотографии лица с использованием MXNet модели.

## Сервер
- **URL**: http://37.252.20.170:5000
- **Сервер**: Timeweb (Ubuntu 24.04, Python 3.10)
- **Управление**: systemd сервис `age-bot`

## Endpoints

### 1. Health Check
```bash
GET /health
```

Ответ:
```json
{
  "status": "ok",
  "model_loaded": true
}
```

### 2. Estimate Age
```bash
POST /api/estimate-age
Content-Type: application/json

{
  "image": "<base64_encoded_image>"
}
```

Ответ:
```json
{
  "age": 35,
  "confidence": 0.95,
  "status": "success"
}
```

## Управление сервисом

```bash
# Статус
systemctl status age-bot

# Запуск
systemctl start age-bot

# Остановка
systemctl stop age-bot

# Перезапуск
systemctl restart age-bot

# Логи
journalctl -u age-bot -f
tail -f /var/www/age-bot-api/error.log
tail -f /var/www/age-bot-api/access.log
```

## Структура файлов

```
/var/www/age-bot-api/
├── app.py                 # Flask приложение
├── requirements.txt       # Python зависимости
├── models/
│   ├── model-0000.params  # Веса модели (1.1MB)
│   └── model-symbol.json  # Архитектура (50KB)
├── venv/                  # Виртуальное окружение (Python 3.10)
├── error.log              # Логи ошибок
└── access.log             # Access логи
```

## Модель
- **Тип**: MXNet MobileNet 0.25X
- **Размер**: 1MB
- **Вход**: RGB изображение 112x112
- **Выход**: Возраст (1-100 лет)
- **Производительность**: ~10ms на CPU

## Интеграция с фронтендом

```typescript
const estimateAge = async (imageDataUrl: string) => {
  const base64Data = imageDataUrl.split(',')[1];
  
  const response = await fetch('http://37.252.20.170:5000/api/estimate-age', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Data }),
  });

  const result = await response.json();
  return result.age;
};
```

## Примечания
- Модель загружается при старте (занимает ~8 секунд)
- Gunicorn с 4 воркерами для параллельной обработки
- Timeout установлен в 300 секунд
- Автозапуск при перезагрузке сервера
