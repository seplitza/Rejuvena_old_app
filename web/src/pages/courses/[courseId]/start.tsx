/**
 * Marathon Start Page
 * Shows course description and rules
 * User must accept terms before accessing day content
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectMarathonData } from '@/store/modules/day/selectors';
import { selectUserOrders } from '@/store/modules/courses/selectors';
import { getDayExercise } from '@/store/modules/day/slice';
import { request } from '@/api/request';
import * as endpoints from '@/api/endpoints';
import DaysList from '@/components/day/DaysList';
import Image from 'next/image';

export default function CourseStartPage() {
  const router = useRouter();
  const { courseId } = router.query;
  const dispatch = useAppDispatch();

  const marathonData = useAppSelector(selectMarathonData);
  const userOrders = useAppSelector(selectUserOrders);

  const [isRulesExpanded, setIsRulesExpanded] = useState(true);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find current course - courseId from URL can be either order.id or order.wpMarathonId
  const currentCourse = userOrders.find(order => 
    order.id === courseId || order.wpMarathonId === courseId
  );

  // CRITICAL: Use order.id (not wpMarathonId) for /startmarathon API
  // The backend expects marathonId parameter to be the order ID
  const marathonId = currentCourse?.id || (courseId as string);

  // Load marathon data if not already loaded
  useEffect(() => {
    if (marathonId && !marathonData) {
      console.log('📚 Loading marathon data for order ID:', marathonId);
      dispatch(getDayExercise({
        marathonId: marathonId,
        dayId: 'current',
      }));
    }
  }, [marathonId, marathonData, dispatch]);

  const handleAcceptRules = async () => {
    if (!marathonId || isSubmitting) return;

    try {
      setIsSubmitting(true);

      await request.get(endpoints.accept_marathon_terms, {
        params: {
          courseId: marathonId,
          status: true,
        },
      });

      console.log('✅ Rules accepted for marathon:', marathonId);
      
      // Navigate to first day - use original courseId from URL
      router.push(`/courses/${courseId}/day/day-1`);
    } catch (error) {
      console.error('❌ Failed to accept rules:', error);
      alert('Не удалось принять правила. Попробуйте еще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentCourse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка курса...</p>
        </div>
      </div>
    );
  }

  const rules = marathonData?.marathonDays?.[0]?.description || '';
  const marathonDays = marathonData?.marathonDays || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            {/* Back button */}
            <button
              onClick={() => router.push('/courses')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Назад"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Course Icon */}
            {currentCourse.imagePath && (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/10">
                <Image
                  src={currentCourse.imagePath}
                  alt={currentCourse.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Course Name */}
            <div className="flex-1">
              <h1 className="text-lg font-bold">{currentCourse.title}</h1>
              {currentCourse.subTitle && (
                <p className="text-sm text-white/80">{currentCourse.subTitle}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Добро пожаловать на курс!
          </h2>
          <p className="text-gray-600 mb-4">
            Вы начинаете путь к естественному омоложению. Чтобы получить максимум от курса, 
            внимательно ознакомьтесь с правилами и рекомендациями.
          </p>
        </div>

        {/* Rules Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Rules Header - Collapsible */}
          <button
            onClick={() => setIsRulesExpanded(!isRulesExpanded)}
            className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 transition-colors"
          >
            <h3 className="text-xl font-bold text-purple-900">
              Правила курса
            </h3>
            <svg
              className={`w-6 h-6 text-purple-600 transition-transform ${
                isRulesExpanded ? 'transform rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Rules Content */}
          {isRulesExpanded && (
            <div className="p-6">
              {rules ? (
                <div
                  className="prose prose-purple max-w-none"
                  dangerouslySetInnerHTML={{ __html: rules }}
                />
              ) : (
                <div className="text-gray-600">
                  <p className="mb-4">📋 <strong>Основные правила:</strong></p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Выполняйте упражнения ежедневно в течение 14 дней</li>
                    <li>Следуйте видеоинструкциям для правильной техники</li>
                    <li>Делайте фото до/после для отслеживания прогресса</li>
                    <li>Отмечайте выполненные упражнения галочками</li>
                    <li>Набирайте звезды за качественное выполнение</li>
                  </ul>
                </div>
              )}

              {/* Accept Checkbox */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAccepted}
                    onChange={(e) => setIsAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-gray-700">
                    Я ознакомился(ась) с правилами курса и принимаю условия
                  </span>
                </label>

                <button
                  onClick={handleAcceptRules}
                  disabled={!isAccepted || isSubmitting}
                  className={`
                    mt-4 w-full py-3 px-6 rounded-lg font-semibold text-white transition-all
                    ${isAccepted && !isSubmitting
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg'
                      : 'bg-gray-300 cursor-not-allowed'
                    }
                  `}
                >
                  {isSubmitting ? 'Отправка...' : 'Начать курс'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Days List */}
        {marathonId && marathonDays.length > 0 && (
          <DaysList 
            marathonId={marathonId} 
            currentDayId={marathonDays[0]?.id || ''}
          />
        )}
      </div>
    </div>
  );
}
