import React from 'react';
import { translations, type LanguageCode } from '../../utils/i18n';

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    priceFrom: number;
    currency: string;
    imageUrl: string;
    duration: number;
    level: string;
    tags: string[];
    isFree?: boolean;
    productType?: string;
  };
  language: LanguageCode;
  onJoin: () => void;
  onDetails: () => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, language, onJoin, onDetails }) => {
  const t = translations[language];
  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-gray-100">
      {/* Header с изображением */}
      <div className="relative h-48 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
        {/* Изображение курса: круглое для Marathon, квадратное для Course */}
        <div className={`w-32 h-32 bg-white flex items-center justify-center shadow-lg overflow-hidden ${
          course.productType?.toLowerCase().includes('marathon') ? 'rounded-full' : 'rounded-[20px]'
        }`}>
          {course.imageUrl ? (
            <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover" />
          ) : (
            <div className="text-6xl">🌟</div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Subtitle Badge */}
        {course.subtitle && (
          <div className="inline-block mb-3">
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              {course.subtitle}
            </span>
          </div>
        )}

        {/* Title */}
        <h3 className="text-xl font-bold text-[#1e3a8a] mb-2">
          {course.title}
        </h3>

        {/* Duration Description */}
        {course.description && (
          <p className="text-sm text-gray-600 mb-2">
            {course.description}
          </p>
        )}

        {/* Cost */}
        {!course.isFree && course.priceFrom > 0 && (
          <p className="text-sm text-gray-700 font-medium mb-2">
            {t.subscriptionsFrom} <span className="font-bold text-[#1e3a8a]">{course.priceFrom} {course.currency}</span>
          </p>
        )}

        {/* Call to Action for Free Courses */}
        {course.isFree && (
          <p className="text-base font-bold text-red-600 mb-4 uppercase">
            {t.freeCourseCall}
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onJoin}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-sm uppercase"
          >
            {t.join}
          </button>
          <button
            onClick={onDetails}
            className="flex-1 bg-white border-2 border-[#1e3a8a] text-[#1e3a8a] font-bold py-3 px-4 rounded-full hover:bg-blue-50 transition-all duration-300 text-sm uppercase"
          >
            {t.learnMore}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
