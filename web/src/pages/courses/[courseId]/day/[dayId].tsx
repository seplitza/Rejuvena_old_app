/**
 * Marathon Day Page
 * Displays detailed view of a single marathon day with exercises
 */

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectCurrentDay,
  selectDayLoading,
  selectDayError,
  selectMarathonDay,
} from '@/store/modules/day/selectors';
import { getDayExercise, clearDayData } from '@/store/modules/day/slice';
import DayHeader from '@/components/day/DayHeader';
import DayDescription from '@/components/day/DayDescription';
import DayPlan from '@/components/day/DayPlan';

export default function MarathonDayPage() {
  const router = useRouter();
  const { courseId, dayId } = router.query;
  const dispatch = useAppDispatch();
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentDay = useAppSelector(selectCurrentDay);
  const loading = useAppSelector(selectDayLoading);
  const error = useAppSelector(selectDayError);
  const marathonDay = useAppSelector(selectMarathonDay);

  // Fetch day data - with retry logic for activation race conditions
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
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [courseId, dayId, dispatch, retryCount]);

  // Auto-retry if "Order not found" (course activation in progress)
  useEffect(() => {
    const isOrderNotFound = error && (error.includes('Order not found') || error.includes('400'));
    
    if (isOrderNotFound && retryCount < 5) {
      console.log(`⏳ Order not found, retrying in ${1 + retryCount}s... (attempt ${retryCount + 1}/5)`);
      
      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, (1 + retryCount) * 1000); // Increasing delay: 1s, 2s, 3s, 4s, 5s
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [error, retryCount]);

  if (loading) {
    // Show if we're waiting for activation
    const isWaitingForActivation = retryCount > 0;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isWaitingForActivation ? 'Активируем курс...' : 'Загрузка дня...'}
          </p>
          {isWaitingForActivation && (
            <p className="text-sm text-gray-500 mt-2">
              Попытка {retryCount} из 5
            </p>
          )}
        </div>
      </div>
    );
  }
  
  if (error) {
    // Check if error is "Order not found" - might still be activating
    const isOrderNotFound = error.includes('Order not found') || error.includes('400');
    const isStillRetrying = isOrderNotFound && retryCount < 5;
    
    // If still retrying, show loading instead of error
    if (isStillRetrying) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Активируем курс...</p>
            <p className="text-sm text-gray-500 mt-2">
              Попытка {retryCount + 1} из 5
            </p>
          </div>
        </div>
      );
    }
    
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
