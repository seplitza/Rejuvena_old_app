import React from 'react';

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
  };
  onJoin: () => void;
  onDetails: () => void;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onJoin, onDetails }) => {
  const getLevelColor = () => {
    switch (course.level) {
      case 'advanced':
        return 'from-red-400 to-pink-500';
      case 'intermediate':
        return 'from-blue-400 to-cyan-500';
      default:
        return 'from-green-400 to-emerald-500';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-gray-100">
      {/* Header с иконкой */}
      <div className={`relative h-48 bg-gradient-to-br ${getLevelColor()} flex items-center justify-center`}>
        {/* Placeholder для изображения курса */}
        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg">
          <div className="text-6xl">
            {course.level === 'advanced' ? '💪' : course.level === 'intermediate' ? '👁️' : '🌟'}
          </div>
        </div>
        {/* Badge на шею/лоб */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-800 shadow-md">
          {course.subtitle}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Level Badge */}
        <div className="inline-block mb-3">
          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
            {course.title}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-700 font-medium mb-4">
          {course.description}
        </p>

        {/* Price */}
        <div className="mb-4">
          <p className="text-gray-600 text-sm mb-1">Подписки от</p>
          <p className="text-2xl font-bold text-[#1e3a8a]">
            {course.priceFrom.toLocaleString('ru-RU')} {course.currency}
          </p>
        </div>

        {/* Tags */}
        {course.tags && course.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {course.tags.map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onJoin}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 text-sm uppercase"
          >
            Присоединиться
          </button>
          <button
            onClick={onDetails}
            className="flex-1 bg-white border-2 border-[#1e3a8a] text-[#1e3a8a] font-bold py-3 px-4 rounded-full hover:bg-blue-50 transition-all duration-300 text-sm uppercase"
          >
            Подробнее
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
