import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAppSelector } from '../store/hooks';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  lessonsCount: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  isPurchased: boolean;
  progress?: number;
  price?: number;
}

const CoursesPage: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [courses, setCourses] = useState<Course[]>([]);
  const [filter, setFilter] = useState<'all' | 'my' | 'available'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // TODO: Fetch courses from API
    // Временные данные для демонстрации
    setTimeout(() => {
      setCourses([
        {
          id: '1',
          title: 'Базовый курс омоложения лица',
          description: 'Основные техники и упражнения для естественного омоложения лица',
          thumbnail: 'https://via.placeholder.com/400x250/4F46E5/ffffff?text=Базовый+курс',
          duration: '4 недели',
          lessonsCount: 20,
          level: 'beginner',
          isPurchased: true,
          progress: 45,
        },
        {
          id: '2',
          title: 'Продвинутый уровень',
          description: 'Углубленное изучение техник массажа и упражнений для лица',
          thumbnail: 'https://via.placeholder.com/400x250/7C3AED/ffffff?text=Продвинутый',
          duration: '6 недель',
          lessonsCount: 30,
          level: 'advanced',
          isPurchased: true,
          progress: 12,
        },
        {
          id: '3',
          title: 'Лимфодренажный массаж',
          description: 'Техники лимфодренажного массажа для здоровья и красоты',
          thumbnail: 'https://via.placeholder.com/400x250/DB2777/ffffff?text=Лимфодренаж',
          duration: '3 недели',
          lessonsCount: 15,
          level: 'intermediate',
          isPurchased: false,
          price: 2990,
        },
        {
          id: '4',
          title: 'Гимнастика для шеи',
          description: 'Специальный комплекс упражнений для шеи и декольте',
          thumbnail: 'https://via.placeholder.com/400x250/059669/ffffff?text=Шея',
          duration: '2 недели',
          lessonsCount: 10,
          level: 'beginner',
          isPurchased: false,
          price: 1990,
        },
        {
          id: '5',
          title: 'Утренний комплекс',
          description: 'Быстрые упражнения для утреннего пробуждения лица',
          thumbnail: 'https://via.placeholder.com/400x250/DC2626/ffffff?text=Утро',
          duration: '1 неделя',
          lessonsCount: 7,
          level: 'beginner',
          isPurchased: false,
          price: 990,
        },
        {
          id: '6',
          title: 'Антивозрастной марафон',
          description: 'Интенсивный курс для быстрых результатов',
          thumbnail: 'https://via.placeholder.com/400x250/EA580C/ffffff?text=Марафон',
          duration: '8 недель',
          lessonsCount: 40,
          level: 'advanced',
          isPurchased: false,
          price: 4990,
        },
      ]);
      setLoading(false);
    }, 500);
  }, [isAuthenticated, router]);

  const filteredCourses = courses.filter(course => {
    if (filter === 'my') return course.isPurchased;
    if (filter === 'available') return !course.isPurchased;
    return true;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'beginner': return 'Начальный';
      case 'intermediate': return 'Средний';
      case 'advanced': return 'Продвинутый';
      default: return level;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Курсы
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{courses.filter(c => c.isPurchased).length}</p>
              <p className="text-sm opacity-90 mt-1">Мои курсы</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">
                {Math.round(courses.filter(c => c.isPurchased).reduce((sum, c) => sum + (c.progress || 0), 0) / Math.max(courses.filter(c => c.isPurchased).length, 1))}%
              </p>
              <p className="text-sm opacity-90 mt-1">Средний прогресс</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{courses.filter(c => !c.isPurchased).length}</p>
              <p className="text-sm opacity-90 mt-1">Доступно курсов</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setFilter('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                filter === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Все курсы
              <span className="ml-2 py-0.5 px-2 rounded-full bg-gray-100 text-xs">
                {courses.length}
              </span>
            </button>
            <button
              onClick={() => setFilter('my')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                filter === 'my'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Мои курсы
              <span className="ml-2 py-0.5 px-2 rounded-full bg-gray-100 text-xs">
                {courses.filter(c => c.isPurchased).length}
              </span>
            </button>
            <button
              onClick={() => setFilter('available')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                filter === 'available'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Доступные
              <span className="ml-2 py-0.5 px-2 rounded-full bg-gray-100 text-xs">
                {courses.filter(c => !c.isPurchased).length}
              </span>
            </button>
          </nav>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка курсов...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12">
            <div className="text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Курсы не найдены
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {filter === 'my' ? 'У вас пока нет приобретенных курсов' : 'Нет доступных курсов'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-lg shadow hover:shadow-xl transition-shadow overflow-hidden cursor-pointer"
                onClick={() => router.push(`/courses/${course.id}`)}
              >
                {/* Thumbnail */}
                <div className="relative h-48 bg-gray-200">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  {course.isPurchased && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      ✓ Куплен
                    </div>
                  )}
                  <span className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(course.level)}`}>
                    {getLevelText(course.level)}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {course.description}
                  </p>

                  {/* Info */}
                  <div className="flex items-center text-xs text-gray-500 mb-4 space-x-4">
                    <div className="flex items-center">
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {course.duration}
                    </div>
                    <div className="flex items-center">
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {course.lessonsCount} уроков
                    </div>
                  </div>

                  {/* Progress or Price */}
                  {course.isPurchased ? (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-600">Прогресс</span>
                        <span className="text-xs font-medium text-gray-900">{course.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                      <button className="mt-4 w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                        Продолжить
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-gray-900">
                        {course.price?.toLocaleString('ru-RU')} ₽
                      </span>
                      <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
                        Купить
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CoursesPage;
