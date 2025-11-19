# 🤖 Настройка Telegram Bot для Фотодневника

## Преимущества Telegram Web App
- ✅ Автоматическая аутентификация по Telegram профилю
- ✅ Нет необходимости в email/пароле
- ✅ Telegram Payments для оплаты
- ✅ Прямой доступ из чата с ботом
- ✅ Уведомления через бота

## Шаг 1: Создание Telegram Bot

1. Откройте [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте команду `/newbot`
3. Введите имя бота: `Rejuvena Photo Diary`
4. Введите username: `rejuvena_bot` (или другой доступный)
5. Сохраните полученный **Bot Token**

## Шаг 2: Настройка Web App

1. В чате с @BotFather отправьте команду `/mybots`
2. Выберите вашего бота
3. Выберите `Bot Settings` → `Menu Button`
4. Выберите `Edit Menu Button URL`
5. Введите URL:
```
https://seplitza.github.io/rejuvena/test-user?auto=true
```

6. Введите название кнопки: `Открыть Фотодневник`

## Шаг 3: Настройка команд бота

В @BotFather выберите `Edit Commands` и добавьте:

```
start - Открыть Фотодневник
diary - Мой фотодневник
collage - Скачать коллаж
help - Помощь
```

## Шаг 4: Настройка описания

```
/setdescription
Фотодневник для отслеживания прогресса в фитнесе и уходе за собой. Сохраняйте фото "До" и "После", создавайте коллажи, делитесь результатами!
```

```
/setabouttext
Rejuvena Photo Diary - профессиональный инструмент для фитнес-тренеров и бьюти-экспертов
```

## Шаг 5: Создание простого бота (Python)

```python
import os
from telegram import Update, WebAppInfo
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE'
WEB_APP_URL = 'https://seplitza.github.io/rejuvena/test-user?auto=true'

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Обработчик команды /start"""
    keyboard = [
        [InlineKeyboardButton("📱 Открыть Фотодневник", web_app=WebAppInfo(url=WEB_APP_URL))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "👋 Добро пожаловать в Rejuvena Photo Diary!\n\n"
        "🎯 Отслеживайте свой прогресс в фитнесе и красоте\n"
        "📸 Создавайте коллажи \"До\" и \"После\"\n"
        "💾 Безопасное хранение фотографий\n\n"
        "Нажмите кнопку ниже, чтобы начать:",
        reply_markup=reply_markup
    )

async def diary(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Открыть фотодневник"""
    keyboard = [
        [InlineKeyboardButton("📱 Мой Фотодневник", web_app=WebAppInfo(url=WEB_APP_URL))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text("📸 Открыть фотодневник:", reply_markup=reply_markup)

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Помощь"""
    await update.message.reply_text(
        "📋 Доступные команды:\n\n"
        "/start - Начать работу\n"
        "/diary - Открыть фотодневник\n"
        "/help - Эта справка\n\n"
        "❓ Поддержка: @your_support"
    )

def main():
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("diary", diary))
    app.add_handler(CommandHandler("help", help_command))
    
    print("🤖 Бот запущен!")
    app.run_polling()

if __name__ == '__main__':
    main()
```

## Шаг 6: Установка зависимостей

```bash
pip install python-telegram-bot --upgrade
```

## Шаг 7: Запуск бота

```bash
python bot.py
```

## Как работает аутентификация

1. Пользователь открывает Web App через бота
2. Telegram автоматически передает данные пользователя через `window.Telegram.WebApp.initDataUnsafe`
3. Приложение извлекает:
   - `user.id` - уникальный Telegram ID
   - `user.first_name` - имя
   - `user.last_name` - фамилия
   - `user.username` - @username
   - `user.photo_url` - фото профиля
4. Создается пользователь с ID: `tg-{telegram_id}`
5. Выполняется автоматический вход

## Тестирование без бота

Для тестирования можно использовать URL с параметрами:

```
https://seplitza.github.io/rejuvena/test-user?auto=true&tg_id=123456789&tg_username=testuser&tg_first_name=Ivan&tg_last_name=Petrov
```

## Безопасность

Для production необходимо:
1. Проверять `hash` из `initData` на сервере
2. Валидировать `auth_date` (не старше 24 часов)
3. Использовать серверную авторизацию

Пример проверки на Python:
```python
import hmac
import hashlib
from urllib.parse import parse_qs

def verify_telegram_auth(init_data: str, bot_token: str) -> bool:
    """Проверка подлинности данных от Telegram"""
    parsed = parse_qs(init_data)
    hash_value = parsed.get('hash', [''])[0]
    
    # Удаляем hash из данных
    data_check_string = '\n'.join(
        f"{k}={v[0]}" for k, v in sorted(parsed.items()) if k != 'hash'
    )
    
    # Создаем secret_key
    secret_key = hmac.new(
        "WebAppData".encode(),
        bot_token.encode(),
        hashlib.sha256
    ).digest()
    
    # Проверяем hash
    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return calculated_hash == hash_value
```

## Telegram Payments (будущее)

Для приема платежей через Telegram:

1. Настройте провайдера платежей в @BotFather
2. Используйте `sendInvoice` API для создания счетов
3. Обрабатывайте callback `pre_checkout_query` и `successful_payment`

Примеры провайдеров:
- YooKassa (для России)
- Stripe
- PayPal

## Полезные ссылки

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Web Apps](https://core.telegram.org/bots/webapps)
- [python-telegram-bot](https://python-telegram-bot.org/)
- [Telegram Payments](https://core.telegram.org/bots/payments)

## Контакты

При возникновении вопросов:
- Документация: https://core.telegram.org/bots
- Чат разработчиков: https://t.me/BotDevelopment
