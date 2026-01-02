/**
 * Navigation Menu Component
 * Slide-out menu with main navigation items
 */

import { useRouter } from 'next/router';
import { useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/modules/auth/slice';

interface NavigationMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

// Normalize emoji by removing variation selectors and zero-width joiners
function normalizeEmoji(text: string): string {
  return text
    .replace(/[\uFE00-\uFE0F]/g, '') // Remove variation selectors
    .replace(/\u200D/g, '');           // Remove zero-width joiner
}

export default function NavigationMenu({ isOpen, onClose }: NavigationMenuProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleNavigation = (path: string) => {
    router.push(path);
    onClose();
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push('/');
    onClose();
  };

  const menuItems = [
    { label: 'Личная информация', path: '/profile', icon: '👤' },
    { label: 'Фотодневник', path: '/photo-diary', icon: '📸' },
    { label: 'Мои заказы', path: '/orders', icon: '📦' },
    { label: 'Лучшие результаты', path: '/results', icon: '🏆' },
    { label: 'Уведомления', path: '/notifications', icon: '🔔' },
    { label: 'Обратная связь', path: '/feedback', icon: '💬' },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Menu Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Меню</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Закрыть меню"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm opacity-90">Rejuvena - Естественное омоложение</p>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-purple-50 transition-colors text-left group"
            >
              <span className="text-2xl">{normalizeEmoji(item.icon)}</span>
              <div className="flex-1">
                <span className="text-gray-800 group-hover:text-purple-600 font-medium">
                  {item.label}
                </span>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}

          {/* Divider */}
          <div className="border-t border-gray-200 my-4"></div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-red-50 transition-colors text-left group"
          >
            <span className="text-2xl">{normalizeEmoji('🚪')}</span>
            <span className="text-gray-800 group-hover:text-red-600 font-medium">Выйти</span>
          </button>
        </nav>
      </div>
    </>
  );
}
