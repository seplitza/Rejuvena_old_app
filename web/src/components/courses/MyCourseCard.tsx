import React from 'react';

interface MyCourseCardProps {
  course: {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    callToAction?: string;
    imageUrl: string;
    progress: number;
    totalDays: number;
    completedDays: number;
    status: string;
    isFree?: boolean;
    isDemo?: boolean;
  };
  onStart: () => void;
  onLearnMore: () => void;
}

const MyCourseCard: React.FC<MyCourseCardProps> = ({ course, onStart, onLearnMore }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-gray-100">
      {/* Header с иконкой */}
      <div className="relative h-48 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
        {/* Placeholder для изображения курса */}
        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg">
          <div className="text-6xl">🧘‍♀️</div>
        </div>
        {course.isDemo && (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
            DEMO COURSE
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Goal Badge */}
        <div className="inline-block mb-3">
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            1 goal. {course.title}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-[#1e3a8a] mb-1">
          {course.subtitle}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-700 font-medium mb-2">
          {course.description}
        </p>

        {/* Call to Action */}
        {course.callToAction && (
          <p className="text-base font-bold text-red-600 mb-4 uppercase">
            {course.callToAction}
          </p>
        )}

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-600 font-medium">
              Прогресс: {course.completedDays} из {course.totalDays} дней
            </span>
            <span className="text-xs font-bold text-[#1e3a8a]">
              {course.progress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${course.progress}%` }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onStart}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-sm uppercase"
          >
            ПРИСТУПИТЬ
          </button>
          <button
            onClick={onLearnMore}
            className="flex-1 bg-white border-2 border-[#1e3a8a] text-[#1e3a8a] font-bold py-3 px-4 rounded-full hover:bg-blue-50 transition-all duration-300 text-sm uppercase"
          >
            ПОДРОБНЕЕ
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyCourseCard;
