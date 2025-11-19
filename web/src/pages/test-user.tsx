import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch } from '@/store/hooks';
import { setAuthToken, setUser } from '@/store/modules/auth/slice';

// Объявляем Telegram WebApp API
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            is_premium?: boolean;
            photo_url?: string;
          };
          auth_date: number;
          hash: string;
        };
        ready: () => void;
        expand: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
        };
      };
    };
  }
}

export default function TestUserPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [userSource, setUserSource] = useState<'telegram' | 'manual' | 'test'>('test');
  const [detectedUser, setDetectedUser] = useState<any>(null);

  // Определение источника пользователя и извлечение данных
  useEffect(() => {
    // 1. Проверяем Telegram Web App
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      const tgUser = tg.initDataUnsafe?.user;
      
      if (tgUser) {
        const user = {
          id: `tg-${tgUser.id}`,
          email: tgUser.username ? `${tgUser.username}@telegram.user` : `user${tgUser.id}@telegram.user`,
          name: `${tgUser.first_name}${tgUser.last_name ? ' ' + tgUser.last_name : ''}`,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name || '',
          username: tgUser.username || '',
          telegramId: tgUser.id,
          photoUrl: tgUser.photo_url,
          isPremium: tgUser.is_premium,
          languageCode: tgUser.language_code,
        };
        
        setDetectedUser(user);
        setUserSource('telegram');
        console.log('✅ Обнаружен Telegram пользователь:', user);
        return;
      }
    }

    // 2. Проверяем URL параметры (Deep Link от бота или внешних источников)
    const urlParams = new URLSearchParams(window.location.search);
    const tgUserId = urlParams.get('tg_user_id') || urlParams.get('tg_id');
    const tgUsername = urlParams.get('tg_username');
    const tgFirstName = urlParams.get('tg_first_name') || urlParams.get('first_name');
    const tgLastName = urlParams.get('tg_last_name') || urlParams.get('last_name');

    if (tgUserId) {
      const user = {
        id: `tg-${tgUserId}`,
        email: tgUsername ? `${tgUsername}@telegram.user` : `user${tgUserId}@telegram.user`,
        name: `${tgFirstName || 'Пользователь'}${tgLastName ? ' ' + tgLastName : ''}`,
        firstName: tgFirstName || 'Пользователь',
        lastName: tgLastName || '',
        username: tgUsername || '',
        telegramId: parseInt(tgUserId),
        // Флаг что данные неполные (нужно будет запросить разрешение)
        needsFullAccess: !tgFirstName || !tgUsername,
      };
      
      setDetectedUser(user);
      setUserSource('manual');
      console.log('✅ Создан пользователь из URL параметров (Deep Link):', user);
      return;
    }

    // 3. Тестовый пользователь по умолчанию
    setDetectedUser({
      id: 'test-user-12345',
      email: 'test@rejuvena.ru',
      name: 'Тестовый Пользователь',
      firstName: 'Тестовый',
      lastName: 'Пользователь',
    });
    setUserSource('test');
  }, []);

  const createUser = (user: any) => {
    try {
      setStatus('creating');

      // Создаем токен
      const token = `${userSource}-token-${Date.now()}`;

      // Сохраняем в Redux
      dispatch(setAuthToken(token));
      dispatch(setUser(user));

      // Также сохраняем напрямую в localStorage для надежности
      localStorage.setItem('rejuvena_auth', JSON.stringify({
        isAuthenticated: true,
        token: token,
        user: user,
        loading: false,
        error: null,
      }));

      localStorage.setItem('rejuvena_user', JSON.stringify(user));

      console.log('✅ Пользователь создан:', user);
      setStatus('success');

      // Перенаправление через 2 секунды
      setTimeout(() => {
        router.push('/photo-diary');
      }, 2000);

    } catch (error) {
      console.error('❌ Ошибка создания пользователя:', error);
      setStatus('error');
    }
  };

  // Автоматическое создание при загрузке
  useEffect(() => {
    // Автоматически создаем пользователя если:
    // 1. Это Telegram пользователь (всегда автоматически)
    // 2. Или передан параметр auto=true
    if (detectedUser && (userSource === 'telegram' || router.query.auto === 'true')) {
      // Небольшая задержка для UX
      setTimeout(() => {
        createUser(detectedUser);
      }, 500);
    }
  }, [detectedUser, router.query]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-blue-600 mb-6">
          {userSource === 'telegram' ? '📱 Вход через Telegram' : 
           userSource === 'manual' ? '🔗 Вход по ссылке' : 
           '🧪 Тестовый вход'}
        </h1>

        {userSource === 'telegram' && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <p className="font-semibold text-blue-800">✅ Обнаружен Telegram аккаунт</p>
            <p className="text-sm text-blue-700 mt-1">
              Вход будет выполнен автоматически через ваш Telegram профиль
            </p>
          </div>
        )}

        {userSource === 'manual' && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
            <p className="font-semibold text-green-800">✅ Получены данные из ссылки</p>
            <p className="text-sm text-green-700 mt-1">
              Нажмите кнопку ниже для входа в приложение
            </p>
          </div>
        )}

        {userSource === 'test' && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
            <p className="font-semibold mb-2">Инструкция:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Нажмите кнопку "Войти в приложение"</li>
              <li>Дождитесь подтверждения создания</li>
              <li>Автоматически будет выполнен вход и переход в Фотодневник</li>
            </ol>
          </div>
        )}

        {detectedUser && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 font-mono text-sm">
            <p className="font-bold mb-2">Данные пользователя:</p>
            {detectedUser.username && (
              <p><span className="text-gray-600">Telegram:</span> <strong>@{detectedUser.username}</strong></p>
            )}
            {detectedUser.telegramId && (
              <p><span className="text-gray-600">Telegram ID:</span> <strong>{detectedUser.telegramId}</strong></p>
            )}
            <p><span className="text-gray-600">Email:</span> <strong>{detectedUser.email}</strong></p>
            <p><span className="text-gray-600">Имя:</span> <strong>{detectedUser.name}</strong></p>
            <p><span className="text-gray-600">User ID:</span> <strong>{detectedUser.id}</strong></p>
          </div>
        )}

        {status === 'idle' && detectedUser && (
          <button
            onClick={() => createUser(detectedUser)}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {userSource === 'telegram' ? '📱 Войти через Telegram' : 
             userSource === 'manual' ? '🔗 Войти в приложение' : 
             '🧪 Войти как тестовый пользователь'}
          </button>
        )}

        {status === 'creating' && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600 mr-3"></div>
              <span className="text-yellow-800">Создание пользователя...</span>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4">
            <p className="text-green-800">
              ✅ <strong>Вход выполнен успешно!</strong><br />
              <span className="text-sm">Переход в Фотодневник...</span>
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <p className="text-red-800">
              ❌ <strong>Ошибка создания пользователя</strong><br />
              <span className="text-sm">Проверьте консоль браузера для деталей</span>
            </p>
            <button
              onClick={() => detectedUser && createUser(detectedUser)}
              className="mt-3 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition text-sm"
            >
              Попробовать снова
            </button>
          </div>
        )}

        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <p className="font-semibold mb-2 text-sm text-gray-700">
            📋 Способы использования:
          </p>
          <div className="space-y-2 text-sm">
            <div>
              <strong>1. Через Telegram Bot:</strong>
              <p className="text-gray-600 mt-1">
                Добавьте скрипт Telegram WebApp на страницу и откройте через бота.<br/>
                Пользователь будет определен автоматически.
              </p>
              <code className="block bg-gray-800 text-green-400 p-2 mt-2 rounded text-xs">
                https://seplitza.github.io/rejuvena/test-user?auto=true
              </code>
            </div>
            <div className="mt-3">
              <strong>2. Через URL параметры (для тестирования):</strong>
              <code className="block bg-gray-800 text-green-400 p-2 mt-2 rounded text-xs overflow-x-auto">
{`https://seplitza.github.io/rejuvena/test-user?auto=true
&tg_id=123456789
&tg_username=username
&tg_first_name=Ivan
&tg_last_name=Petrov`}
              </code>
            </div>
            <div className="mt-3">
              <strong>3. Тестовый режим (по умолчанию):</strong>
              <p className="text-gray-600 mt-1">
                Просто откройте страницу без параметров для тестового пользователя
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-blue-600 hover:underline text-sm">
            ← Вернуться на главную
          </a>
        </div>
      </div>
    </div>
  );
}
