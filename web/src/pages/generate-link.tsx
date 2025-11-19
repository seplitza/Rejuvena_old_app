import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAppSelector } from '@/store/hooks';

export default function GenerateLinkPage() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    userId: '',
    username: '',
    firstName: '',
    lastName: '',
  });
  const [notificationConsent, setNotificationConsent] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  
  // Предзаполнение формы если пришли с параметром prefill
  useEffect(() => {
    if (router.query.prefill === 'true' && router.query.tg_user_id) {
      setFormData({
        userId: router.query.tg_user_id as string,
        username: router.query.tg_username as string || user?.username || '',
        firstName: router.query.tg_first_name as string || (user as any)?.firstName || '',
        lastName: router.query.tg_last_name as string || (user as any)?.lastName || '',
      });
    }
  }, [router.query, user]);

  const generateLink = () => {
    const baseUrl = 'https://seplitza.github.io/rejuvena/test-user';
    const params = new URLSearchParams();

    if (formData.userId) params.append('tg_user_id', formData.userId);
    if (formData.username) params.append('tg_username', formData.username);
    if (formData.firstName) params.append('tg_first_name', formData.firstName);
    if (formData.lastName) params.append('tg_last_name', formData.lastName);
    params.append('auto', 'true'); // Автоматический вход

    const link = `${baseUrl}?${params.toString()}`;
    setGeneratedLink(link);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    alert('Ссылка скопирована в буфер обмена!');
  };

  return (
    <>
      <Head>
        <title>Генератор ссылок - Rejuvena</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-blue-600 mb-6">
              🔗 Генератор персональных ссылок
            </h1>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Назначение:</strong> Создание персональных ссылок для доступа к Фотодневнику через Telegram.
                Пользователь переходит по ссылке и автоматически входит в приложение.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Данные пользователя:</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telegram User ID * (обязательно)
                </label>
                <input
                  type="text"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  placeholder="123456789"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Уникальный ID пользователя в Telegram</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username (опционально)
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="john_doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">@username пользователя (без @)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Имя (опционально)
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Иван"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Фамилия (опционально)
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Иванов"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Согласие на уведомления */}
            <div className="mb-6">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="notificationConsent"
                  checked={notificationConsent}
                  onChange={(e) => setNotificationConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="notificationConsent" className="ml-3 text-sm text-gray-700">
                  Я согласен получать{' '}
                  <a 
                    href="/rejuvena/notification-consent" 
                    target="_blank" 
                    className="text-blue-600 hover:underline"
                  >
                    уведомления
                  </a>
                  {' '}о сроках хранения фото и других важных событиях
                </label>
              </div>
              <p className="ml-7 text-xs text-gray-500 mt-1">
                Уведомления помогут не потерять фото: вы получите напоминания за 7, 3 и 1 день до удаления
              </p>
            </div>

            <button
              onClick={generateLink}
              disabled={!formData.userId || !notificationConsent}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition ${
                formData.userId && notificationConsent
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {notificationConsent ? 'Предоставить доступ' : 'Требуется согласие на уведомления'}
            </button>

            {generatedLink && (
              <div className="mt-6 space-y-4">
                <div className="bg-green-50 border-l-4 border-green-500 p-4">
                  <p className="font-semibold text-green-800 mb-2">✅ Ссылка сгенерирована!</p>
                  <div className="bg-white rounded p-3 break-all text-sm font-mono">
                    {generatedLink}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={copyToClipboard}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition"
                  >
                    📋 Копировать ссылку
                  </button>
                  <a
                    href={generatedLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium text-center transition"
                  >
                    🚀 Открыть ссылку
                  </a>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-sm">
                  <p className="font-semibold text-gray-700 mb-2">ℹ️ Что будет происходить:</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-600">
                    <li>Пользователь переходит по ссылке</li>
                    <li>Автоматически создается аккаунт с указанными данными</li>
                    <li>Выполняется вход в приложение</li>
                    <li>Открывается страница Фотодневника</li>
                  </ol>
                  
                  {(!formData.firstName || !formData.username) && (
                    <div className="mt-3 bg-yellow-50 border-l-2 border-yellow-400 p-2">
                      <p className="text-xs text-yellow-800">
                        <strong>⚠️ Ограниченный доступ:</strong> Не все данные указаны. 
                        Пользователю будет предложено предоставить полный доступ при попытке 
                        скачать коллаж или сохранить фото на сервере.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8 bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">📖 Примеры использования:</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  <strong>1. Полные данные:</strong> Пользователь получает доступ ко всем функциям сразу
                </p>
                <p>
                  <strong>2. Только User ID:</strong> Базовый доступ, запрос полных данных при необходимости
                </p>
                <p>
                  <strong>3. Интеграция с ботом:</strong> Бот автоматически генерирует ссылку с данными пользователя
                </p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <a href="/" className="text-blue-600 hover:underline text-sm">
                ← Вернуться на главную
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
