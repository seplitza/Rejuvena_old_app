import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch } from '@/store/hooks';
import { setAuthToken, setUser } from '@/store/modules/auth/slice';

export default function TestUserPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');

  const testUser = {
    id: 'test-user-12345',
    email: 'test@rejuvena.ru',
    name: 'Тестовый Пользователь',
    firstName: 'Тестовый',
    lastName: 'Пользователь',
  };

  const createTestUser = () => {
    try {
      setStatus('creating');

      // Создаем токен
      const testToken = `test-token-${Date.now()}`;

      // Сохраняем в Redux
      dispatch(setAuthToken(testToken));
      dispatch(setUser(testUser));

      // Также сохраняем напрямую в localStorage для надежности
      localStorage.setItem('rejuvena_auth', JSON.stringify({
        isAuthenticated: true,
        token: testToken,
        user: testUser,
        loading: false,
        error: null,
      }));

      localStorage.setItem('rejuvena_user', JSON.stringify(testUser));

      console.log('✅ Тестовый пользователь создан:', testUser);
      setStatus('success');

      // Перенаправление через 2 секунды
      setTimeout(() => {
        router.push('/photo-diary');
      }, 2000);

    } catch (error) {
      console.error('❌ Ошибка создания тестового пользователя:', error);
      setStatus('error');
    }
  };

  // Автоматическое создание при загрузке с параметром ?auto=true
  useEffect(() => {
    if (router.query.auto === 'true') {
      createTestUser();
    }
  }, [router.query]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-blue-600 mb-6">
          🧪 Создание тестового пользователя
        </h1>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="font-semibold mb-2">Инструкция:</p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Нажмите кнопку "Создать тестового пользователя"</li>
            <li>Дождитесь подтверждения создания</li>
            <li>Автоматически будет выполнен вход и переход в Фотодневник</li>
          </ol>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 font-mono text-sm">
          <p className="font-bold mb-2">Данные тестового пользователя:</p>
          <p><span className="text-gray-600">Email:</span> <strong>test@rejuvena.ru</strong></p>
          <p><span className="text-gray-600">Имя:</span> <strong>Тестовый Пользователь</strong></p>
          <p><span className="text-gray-600">User ID:</span> <strong>test-user-12345</strong></p>
        </div>

        {status === 'idle' && (
          <button
            onClick={createTestUser}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Создать тестового пользователя
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
              ✅ <strong>Тестовый пользователь успешно создан!</strong><br />
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
              onClick={createTestUser}
              className="mt-3 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition text-sm"
            >
              Попробовать снова
            </button>
          </div>
        )}

        <div className="mt-8 bg-gray-50 rounded-lg p-4">
          <p className="font-semibold mb-2 text-sm text-gray-700">
            Альтернативный способ (через консоль браузера):
          </p>
          <pre className="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`// Выполните в консоли браузера (F12)
const user = ${JSON.stringify(testUser, null, 2)};
const token = 'test-token-' + Date.now();
localStorage.setItem('rejuvena_auth', JSON.stringify({
  isAuthenticated: true,
  token: token,
  user: user,
  loading: false,
  error: null
}));
window.location.href = '/rejuvena/photo-diary';`}
          </pre>
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
