/**
 * Marathon Day Page
 * Displays detailed view of a single marathon day with exercises
 */

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectCurrentDay,
  selectDayLoading,
  selectDayError,
  selectMarathonDay,
} from '@/store/modules/day/selectors';
import { getDayExercise, clearDayData } from '@/store/modules/day/slice';
import { selectCourseHasValidAccess, selectIsCoursePurchased } from '@/store/modules/courses/selectors';
import DayHeader from '@/components/day/DayHeader';
import DayDescription from '@/components/day/DayDescription';
import DayPlan from '@/components/day/DayPlan';

export default function MarathonDayPage() {
  const router = useRouter();
  const { courseId, dayId } = router.query;
  const dispatch = useAppDispatch();

  const currentDay = useAppSelector(selectCurrentDay);
  const loading = useAppSelector(selectDayLoading);
  const error = useAppSelector(selectDayError);
  const marathonDay = useAppSelector(selectMarathonDay);
  
  // Check if user has valid access to this course
  const hasValidAccess = useAppSelector(useMemo(
    () => selectCourseHasValidAccess(typeof courseId === 'string' ? courseId : ''),
    [courseId]
  ));
  const isCoursePurchased = useAppSelector(useMemo(
    () => selectIsCoursePurchased(typeof courseId === 'string' ? courseId : ''),
    [courseId]
  ));

  // Fetch day data
  useEffect(() => {
    if (courseId && dayId && typeof courseId === 'string' && typeof dayId === 'string') {
      dispatch(getDayExercise({
        marathonId: courseId,
        dayId: dayId,
      }));
    }

    // Cleanup on unmount
    return () => {
      dispatch(clearDayData());
    };
  }, [courseId, dayId, dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка дня...</p>
        </div>
      </div>
    );
  }

  // Check if course is purchased but has no valid access (empty orderId)
  if (isCoursePurchased && !hasValidAccess && !loading) {
    const handleActivateCourse = async () => {
      try {
        // Import actions
        const { createOrder, purchaseCourse, fetchMyOrders } = await import('@/store/modules/courses/slice');
        
        // Create order for this course
        const orderResult: any = await dispatch(createOrder(typeof courseId === 'string' ? courseId : ''));
        const orderNumber = orderResult.payload;
        
        // Activate the order (purchase with free coupon for demo courses)
        await dispatch(purchaseCourse({
          orderNumber: String(orderNumber),
          couponCode: null,
        }));
        
        // Reload orders to get new orderId
        await dispatch(fetchMyOrders());
        
        // Re-fetch day data with new orderId
        if (courseId && dayId && typeof courseId === 'string' && typeof dayId === 'string') {
          dispatch(getDayExercise({
            marathonId: courseId,
            dayId: dayId,
          }));
        }
      } catch (error) {
        console.error('Failed to activate course:', error);
        alert('Не удалось активировать курс. Попробуйте позже.');
      }
    };
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Требуется активация
          </h2>
          <p className="text-gray-600 mb-6">
            Этот курс доступен в вашем аккаунте, но для просмотра содержимого необходимо создать активный заказ. Нажмите кнопку ниже для автоматической активации.
          </p>
          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={handleActivateCourse}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors font-semibold shadow-lg"
            >
              🚀 Активировать курс
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/courses')}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                К курсам
              </button>
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Назад
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    // Check if error is "Order not found" - means user doesn't own this course
    const isOrderNotFound = error.includes('Order not found') || error.includes('400');
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">{isOrderNotFound ? '🔒' : '😞'}</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {isOrderNotFound ? 'Курс недоступен' : 'Ошибка загрузки'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isOrderNotFound 
              ? 'Этот курс доступен только после покупки. Вернитесь на страницу курсов и приобретите курс, чтобы получить доступ к его содержимому.'
              : error}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/courses')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {isOrderNotFound ? 'К курсам' : 'Вернуться'}
            </button>
            {isOrderNotFound && (
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Назад
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentDay || !marathonDay) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header */}
      <DayHeader />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Day Description with Video/Images */}
        <DayDescription />

        {/* Day Plan with Exercises */}
        <DayPlan />
      </div>
    </div>
  );
}
