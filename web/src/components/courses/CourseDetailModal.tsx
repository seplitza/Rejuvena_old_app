import React, { useState } from 'react';

interface CourseDetailModalProps {
  course: any;
  isOpen: boolean;
  onClose: () => void;
  onJoin: () => void;
  isOwnedCourse?: boolean; // Flag to determine if user owns this course
}

const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  course,
  isOpen,
  onClose,
  onJoin,
  isOwnedCourse = false,
}) => {
  const [activeTab, setActiveTab] = useState<'description' | 'program' | 'reviews'>('description');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
          >
            <svg
              className="h-6 w-6 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="overflow-y-auto max-h-[90vh]">
            {/* Header with Image */}
            <div className="relative h-64 bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <div className={`w-40 h-40 bg-white flex items-center justify-center shadow-2xl overflow-hidden ${
                course.productType?.toLowerCase().includes('marathon') ? 'rounded-full' : 'rounded-[40px]'
              }`}>
                {course.imageUrl || course.imagePath ? (
                  <img 
                    src={course.imageUrl || course.imagePath} 
                    alt={course.title} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="text-8xl">🧘‍♀️</div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              {/* Title */}
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-[#1e3a8a] mb-2">
                  {course.title}
                </h2>
                {course.subTitle && (
                  <p className="text-lg text-purple-600 font-medium mb-1">{course.subTitle}</p>
                )}
                <p className="text-sm text-gray-500">{course.subtitle}</p>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8 justify-center">
                  <button
                    onClick={() => setActiveTab('description')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'description'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Описание
                  </button>
                  <button
                    onClick={() => setActiveTab('program')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'program'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Программа
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'reviews'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Отзывы
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="mb-8">
                {activeTab === 'description' && (
                  <div className="prose max-w-none">
                    <div 
                      className="text-gray-700 leading-relaxed mb-4"
                      dangerouslySetInnerHTML={{ __html: course.courseDescription || course.description || 'Описание курса' }}
                    />
                    <div className="bg-blue-50 rounded-lg p-6 mt-6">
                      <h3 className="text-lg font-semibold text-[#1e3a8a] mb-3">
                        Что вы получите:
                      </h3>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start">
                          <svg className="h-6 w-6 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>{course.duration} дней обучающих материалов</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="h-6 w-6 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Практические упражнения каждый день</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="h-6 w-6 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Доступ к материалам навсегда</span>
                        </li>
                        <li className="flex items-start">
                          <svg className="h-6 w-6 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Поддержка сообщества</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {activeTab === 'program' && (
                  <div>
                    <h3 className="text-lg font-semibold text-[#1e3a8a] mb-4">
                      Программа курса
                    </h3>
                    <div className="space-y-3">
                      {[...Array(course.duration || 7)].map((_, index) => (
                        <div
                          key={index}
                          className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              День {index + 1}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Упражнения и теория
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div>
                    <h3 className="text-lg font-semibold text-[#1e3a8a] mb-4">
                      Отзывы участников
                    </h3>
                    <div className="text-center text-gray-500 py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p>Отзывы скоро появятся</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Price and Action */}
              {!course.isFree && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Стоимость</p>
                      <p className="text-3xl font-bold text-[#1e3a8a]">
                        от {course.priceFrom?.toLocaleString('ru-RU')} {course.currency}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={onJoin}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isOwnedCourse ? 'ПРИСТУПИТЬ' : 'ОПЛАТИТЬ'}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-4 bg-gray-100 text-gray-700 font-medium rounded-full hover:bg-gray-200 transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailModal;
