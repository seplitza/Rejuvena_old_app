/**
 * Days List Component
 * Displays list of all marathon days with star ratings
 */

import React from 'react';
import { useRouter } from 'next/router';
import { useAppSelector } from '@/store/hooks';
import { selectMarathonData } from '@/store/modules/day/selectors';

interface MarathonDay {
  id: string;
  day: number;
  title?: string;
  description?: string;
  dayDate?: string;
  progress?: number;
  isLocked?: boolean;
}

interface DaysListProps {
  marathonId: string;
  currentDayId: string;
}

/**
 * Calculate star rating from progress percentage
 * Progress >= 200 → 5 stars
 * Progress >= 150 → 4 stars  
 * Progress >= 100 → 3 stars
 * Progress >= 50  → 2 stars
 * Progress >= 1   → 1 star
 * Progress = 0    → 0 stars
 */
const getRatingFromProgress = (progress: number = 0): number => {
  if (progress >= 200) return 5;
  if (progress >= 150) return 4;
  if (progress >= 100) return 3;
  if (progress >= 50) return 2;
  if (progress >= 1) return 1;
  return 0;
};

/**
 * Star Rating Component
 */
const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="flex items-center justify-center space-x-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3 h-3 ${
            star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
          viewBox="0 0 20 20"
        >
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      ))}
    </div>
  );
};

export default function DaysList({ marathonId, currentDayId }: DaysListProps) {
  const router = useRouter();
  
  // Use marathon data from Redux (already loaded by saga)
  const marathonData = useAppSelector(selectMarathonData);
  
  const marathonDays = marathonData?.marathonDays || [];
  const greatExtensionDays = marathonData?.greatExtensionDays || [];

  const handleDayClick = (dayId: string) => {
    router.push(`/courses/${marathonId}/day/${dayId}`);
  };

  const allDays = [...marathonDays, ...greatExtensionDays];

  if (allDays.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4">
        Пройденные дни
      </h3>
      
      {/* Marathon Days (Learning) */}
      {marathonDays.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-purple-600 mb-3">
            Обучение
          </h4>
          <div className="grid grid-cols-7 gap-2">
            {marathonDays.map((day) => {
              const isActive = day.id === currentDayId;
              const rating = getRatingFromProgress(day.progress || 0);
              
              return (
                <button
                  key={day.id}
                  onClick={() => handleDayClick(day.id)}
                  disabled={day.isLocked}
                  className={`
                    relative p-3 rounded-lg border-2 transition-all
                    ${isActive 
                      ? 'border-purple-500 bg-purple-50' 
                      : day.isLocked
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-purple-300 hover:shadow-md cursor-pointer'
                    }
                  `}
                >
                  <div className="text-center">
                    <div className={`text-xs font-semibold mb-1 ${
                      isActive ? 'text-purple-700' : 'text-gray-600'
                    }`}>
                      День
                    </div>
                    <div className={`text-lg font-bold ${
                      isActive ? 'text-purple-700' : 'text-gray-800'
                    }`}>
                      {day.day}
                    </div>
                  </div>
                  
                  {/* Star rating at top */}
                  {rating > 0 && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      <StarRating rating={rating} />
                    </div>
                  )}
                  
                  {/* Lock icon for locked days */}
                  {day.isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Great Extension Days (Practice) */}
      {greatExtensionDays.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-orange-600 mb-3">
            Практика
          </h4>
          <div className="grid grid-cols-7 gap-2">
            {greatExtensionDays.map((day) => {
              const isActive = day.id === currentDayId;
              const rating = getRatingFromProgress(day.progress || 0);
              
              return (
                <button
                  key={day.id}
                  onClick={() => handleDayClick(day.id)}
                  disabled={day.isLocked}
                  className={`
                    relative p-3 rounded-lg border-2 transition-all
                    ${isActive 
                      ? 'border-orange-500 bg-orange-50' 
                      : day.isLocked
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-orange-300 hover:shadow-md cursor-pointer'
                    }
                  `}
                >
                  <div className="text-center">
                    <div className={`text-xs font-semibold mb-1 ${
                      isActive ? 'text-orange-700' : 'text-gray-600'
                    }`}>
                      День
                    </div>
                    <div className={`text-lg font-bold ${
                      isActive ? 'text-orange-700' : 'text-gray-800'
                    }`}>
                      {day.day}
                    </div>
                  </div>
                  
                  {/* Star rating at top */}
                  {rating > 0 && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      <StarRating rating={rating} />
                    </div>
                  )}
                  
                  {/* Lock icon for locked days */}
                  {day.isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
