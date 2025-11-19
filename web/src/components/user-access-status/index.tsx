import { useState } from 'react';

interface UserAccessStatusProps {
  user: any;
  onRequestAccess?: () => void;
}

export default function UserAccessStatus({ user, onRequestAccess }: UserAccessStatusProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const needsFullAccess = user?.needsFullAccess;
  const isTelegramUser = user?.telegramId;

  if (!isTelegramUser) {
    return null; // Не показываем для обычных пользователей
  }

  return (
    <div className="mb-4">
      {needsFullAccess ? (
        // Ограниченный доступ
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Ограниченный доступ
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Некоторые функции недоступны:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Сохранение фото на сервере (1 месяц бесплатно)</li>
                  <li>Скачивание коллажа</li>
                  <li>Персонализация с вашим именем</li>
                </ul>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                >
                  {showDetails ? 'Скрыть детали' : 'Что нужно для полного доступа?'}
                </button>
              </div>
              
              {showDetails && (
                <div className="mt-3 bg-yellow-100 rounded p-3 text-sm text-yellow-800">
                  <p className="font-medium mb-2">Для активации всех функций нужны данные:</p>
                  <ul className="space-y-1">
                    <li>✓ Имя и фамилия</li>
                    <li>✓ Username Telegram</li>
                  </ul>
                  <p className="mt-2 text-xs">
                    Эти данные используются только для:
                    - Идентификации ваших фото на сервере
                    - Подписи на коллаже
                  </p>
                </div>
              )}

              {onRequestAccess && (
                <div className="mt-4">
                  <button
                    onClick={onRequestAccess}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                  >
                    🔓 Предоставить полный доступ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Полный доступ
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                ✅ Полный доступ активирован
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Доступны все функции:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Хранение оригиналов на сервере (1 месяц бесплатно)</li>
                  <li>Скачивание персонализированного коллажа</li>
                  <li>Восстановление данных при потере</li>
                </ul>
              </div>
              
              {user.username && (
                <p className="mt-2 text-xs text-green-600">
                  Вход выполнен через Telegram: @{user.username}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
