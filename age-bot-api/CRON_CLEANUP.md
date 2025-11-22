# Инструкция по установке CRON-задачи для очистки файлов

## Описание

Скрипт `cleanup.sh` автоматически удаляет временные файлы, старые фотографии и коллажи с сервера по следующим правилам:

- **Временные файлы** (`/var/www/age-bot-api/tmp/`) — удаляются через **7 дней**
- **Загруженные фото** (`/var/www/uploads/`) — удаляются через **30 дней**
- **Коллажи** (`/var/www/collages/`) — удаляются через **30 дней**
- **Кэш** (`/var/www/cache/`) — удаляется через **30 дней**
- **Логи** (`*.log`) — удаляются через **90 дней**

## Установка на сервер (Timeweb)

### 1. Подключитесь к серверу

```bash
ssh root@37.252.20.170
```

Пароль: `c+d2Ei@GeWWKq8` (из `DEPLOYMENT.md`)

### 2. Скопируйте скрипт на сервер

Из локальной машины:

```bash
cd /Users/alexeipinaev/Documents/Rejuvena/age-bot-api
scp cleanup.sh root@37.252.20.170:/var/www/age-bot-api/
```

Или создайте файл вручную на сервере:

```bash
ssh root@37.252.20.170
cd /var/www/age-bot-api
nano cleanup.sh
# Вставьте содержимое скрипта и сохраните (Ctrl+X, Y, Enter)
```

### 3. Сделайте скрипт исполняемым

```bash
chmod +x /var/www/age-bot-api/cleanup.sh
```

### 4. Создайте директории (если их нет)

```bash
mkdir -p /var/www/age-bot-api/tmp
mkdir -p /var/www/uploads
mkdir -p /var/www/collages
mkdir -p /var/www/cache
```

### 5. Протестируйте скрипт вручную

```bash
/var/www/age-bot-api/cleanup.sh
```

Проверьте вывод — должны быть сообщения о проверке директорий и статистика диска.

### 6. Добавьте задачу в CRON

Откройте редактор crontab:

```bash
crontab -e
```

Добавьте следующую строку (запуск каждый день в 3:00 утра):

```cron
0 3 * * * /var/www/age-bot-api/cleanup.sh >> /var/www/age-bot-api/cleanup.log 2>&1
```

Сохраните и выйдите (`:wq` в vim или `Ctrl+X, Y, Enter` в nano).

### 7. Проверьте установку CRON

```bash
crontab -l
```

Должна появиться строка с задачей очистки.

## Проверка работы

### Логи выполнения

Логи сохраняются в `/var/www/age-bot-api/cleanup.log`:

```bash
tail -f /var/www/age-bot-api/cleanup.log
```

### Ручной запуск для теста

```bash
/var/www/age-bot-api/cleanup.sh
```

### Проверка статистики диска

```bash
df -h
```

## Настройка сроков хранения

Откройте `cleanup.sh` и измените переменные:

```bash
nano /var/www/age-bot-api/cleanup.sh
```

Найдите и отредактируйте:

```bash
RETENTION_DAYS=30          # Срок хранения фото/коллажей (дней)
TEMP_RETENTION_DAYS=7      # Срок хранения временных файлов (дней)
```

Сохраните изменения.

## Отключение CRON-задачи

Если нужно временно отключить автоочистку:

```bash
crontab -e
```

Закомментируйте строку (добавьте `#` в начале):

```cron
# 0 3 * * * /var/www/age-bot-api/cleanup.sh >> /var/www/age-bot-api/cleanup.log 2>&1
```

Или полностью удалите её.

## Примечания

- Скрипт не удаляет файлы, если директории не существуют (безопасно).
- Пустые директории также удаляются автоматически.
- Все действия логируются с timestamp.
- Скрипт использует `-mtime +N` — файлы старше N *полных* дней.

## Интеграция с backend

Если backend (Node.js/PHP/Python) сохраняет фото в другие директории, обновите пути в `cleanup.sh`:

```bash
UPLOADS_DIR="/путь/к/вашим/uploads"
COLLAGES_DIR="/путь/к/вашим/collages"
```

Перезапустите cron не нужно — изменения вступят в силу при следующем запуске.
