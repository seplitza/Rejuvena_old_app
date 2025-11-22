#!/bin/bash
#
# Rejuvena Photo Cleanup Script
# Автоматическая очистка временных файлов и старых фотографий/коллажей
#
# Установка:
# 1. Скопируйте скрипт на сервер: /var/www/age-bot-api/cleanup.sh
# 2. Сделайте исполняемым: chmod +x /var/www/age-bot-api/cleanup.sh
# 3. Добавьте в crontab: crontab -e
#    0 3 * * * /var/www/age-bot-api/cleanup.sh >> /var/www/age-bot-api/cleanup.log 2>&1
#
# Скрипт запускается ежедневно в 3:00 утра
#

set -e

# Логирование
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "========================================="
log "Starting Rejuvena photo cleanup script"
log "========================================="

# Конфигурация
# Путь к временным файлам (если есть)
TMP_DIR="/var/www/age-bot-api/tmp"
# Путь к загруженным фото (если backend сохраняет их локально)
UPLOADS_DIR="/var/www/uploads"
# Путь к коллажам (если сохраняются локально)
COLLAGES_DIR="/var/www/collages"
# Путь к кэшу
CACHE_DIR="/var/www/cache"

# Срок хранения файлов (в днях)
RETENTION_DAYS=30
TEMP_RETENTION_DAYS=7

# Функция очистки директории
cleanup_directory() {
    local dir=$1
    local days=$2
    local description=$3
    
    if [ -d "$dir" ]; then
        log "Cleaning $description in $dir (older than $days days)..."
        
        # Подсчёт файлов для удаления
        file_count=$(find "$dir" -type f -mtime +$days 2>/dev/null | wc -l)
        
        if [ "$file_count" -gt 0 ]; then
            # Удаление файлов старше N дней
            find "$dir" -type f -mtime +$days -delete 2>/dev/null || true
            log "✅ Deleted $file_count files from $dir"
        else
            log "ℹ️  No files to delete in $dir"
        fi
        
        # Удаление пустых директорий
        find "$dir" -type d -empty -delete 2>/dev/null || true
    else
        log "⚠️  Directory $dir does not exist, skipping"
    fi
}

# Очистка временных файлов (7 дней)
cleanup_directory "$TMP_DIR" "$TEMP_RETENTION_DAYS" "temporary files"

# Очистка старых загруженных фото (30 дней)
cleanup_directory "$UPLOADS_DIR" "$RETENTION_DAYS" "uploaded photos"

# Очистка старых коллажей (30 дней)
cleanup_directory "$COLLAGES_DIR" "$RETENTION_DAYS" "collages"

# Очистка кэша (30 дней)
cleanup_directory "$CACHE_DIR" "$RETENTION_DAYS" "cache files"

# Очистка логов старше 90 дней
LOG_DIR="/var/www/age-bot-api"
if [ -d "$LOG_DIR" ]; then
    log "Cleaning old log files (older than 90 days)..."
    find "$LOG_DIR" -name "*.log" -type f -mtime +90 -delete 2>/dev/null || true
fi

# Статистика использования диска
log "========================================="
log "Disk usage after cleanup:"
df -h | grep -E '(Filesystem|/var)' || df -h
log "========================================="

log "✅ Cleanup completed successfully"
log ""
