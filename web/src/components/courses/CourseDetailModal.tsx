import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import { translations, getRussianPluralForm, type LanguageCode } from '../../utils/i18n';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMarathon } from '../../store/modules/courses/slice';

interface CourseDetailModalProps {
  course: any;
  isOpen: boolean;
  onClose: () => void;
  onJoin: () => void;
  isOwnedCourse?: boolean; // Flag to determine if user owns this course
  language?: LanguageCode; // Current language for translations
}

// Function to clean and extract bullet points from HTML description
const extractBulletPoints = (htmlContent: string, courseDuration?: number): string[] => {
  if (!htmlContent) return [];
  
  // Remove "Powered by Froala Editor" text
  let cleanedContent = htmlContent.replace(/Powered by Froala Editor/gi, '');
  
  // Decode HTML entities (&nbsp;, &laquo;, &raquo;, etc.)
  cleanedContent = cleanedContent
    .replace(/&nbsp;/g, ' ')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  
  // Remove HTML tags but preserve structure
  const textContent = cleanedContent
    .replace(/<br\s*\/?>/gi, '. ')
    .replace(/<\/p>/gi, '. ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Split into sentences
  const sentences = textContent
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 15 && s.length < 200); // Filter reasonable sentences
  
  // Smart selection: prefer sentences with keywords
  const keywords = ['получ', 'научи', 'освои', 'работа', 'упражнен', 'техник', 'метод', 'результат', 'улучш', 'избав'];
  const scoreSentence = (s: string) => {
    const lower = s.toLowerCase();
    return keywords.reduce((score, kw) => score + (lower.includes(kw) ? 1 : 0), 0);
  };
  
  // Sort by relevance and take top 3-4
  const sortedSentences = sentences
    .map(s => ({ text: s, score: scoreSentence(s) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(item => item.text);
  
  // If we got good sentences, use them; otherwise use defaults
  if (sortedSentences.length >= 2) {
    return sortedSentences;
  }
  
  // Fallback to default points
  return [
    `${courseDuration || 0} дней обучающих материалов`,
    'Практические упражнения каждый день',
    'Доступ к материалам навсегда'
  ];
};

const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
  course,
  isOpen,
  onClose,
  onJoin,
  isOwnedCourse = false,
  language = 'ru',
}) => {
  const [activeTab, setActiveTab] = useState<'description' | 'program' | 'reviews'>('description');
  const t = translations[language];
  const dispatch = useAppDispatch();
  const router = useRouter();
  
  // Get marathon data from Redux store
  const marathonId = course.wpMarathonId || course.marathonId || course.id;
  const marathon = useAppSelector(state => state.courses.marathons[marathonId]);
  const loadingMarathon = useAppSelector(state => state.courses.loadingMarathon);

  // Fetch marathon data when modal opens and course is owned
  useEffect(() => {
    if (isOpen && isOwnedCourse && marathonId && !marathon) {
      const timeZoneOffset = new Date().getTimezoneOffset();
      dispatch(fetchMarathon({ marathonId, timeZoneOffset }));
    }
  }, [isOpen, isOwnedCourse, marathonId, marathon, dispatch]);

  // Handle day click - navigate to day page
  const handleDayClick = (dayId: string) => {
    if (marathonId) {
      onClose(); // Close modal before navigation
      router.push(`/courses/${marathonId}/day/${dayId}`);
    }
  };

  // Clean description HTML from unwanted content
  const cleanDescription = useMemo(() => {
    let html = course.courseDescription || course.description || 'Описание курса';
    
    // SUPER AGGRESSIVE Remove "Powered by Froala Editor" - FIRST PASS: Remove from everywhere
    // 1. Remove plain text occurrences (case insensitive, with any whitespace)
    html = html.replace(/Powered\s*by\s*Froala\s*Editor/gi, '');
    
    // 2. Remove when wrapped in ANY HTML tag
    html = html.replace(/<([^>]+)>\s*Powered\s*by\s*Froala\s*Editor\s*<\/\1>/gi, '');
    
    // 3. Remove from beginning of string (with or without tags)
    html = html.replace(/^\s*Powered\s*by\s*Froala\s*Editor\s*/i, '');
    html = html.replace(/^\s*<[^>]+>\s*Powered\s*by\s*Froala\s*Editor\s*<\/[^>]+>\s*/i, '');
    
    // 4. Remove from end of string (with or without tags)  
    html = html.replace(/\s*Powered\s*by\s*Froala\s*Editor\s*$/i, '');
    html = html.replace(/\s*<[^>]+>\s*Powered\s*by\s*Froala\s*Editor\s*<\/[^>]+>\s*$/i, '');
    
    // 5. Remove specific common patterns
    html = html.replace(/<p[^>]*>\s*Powered\s*by\s*Froala\s*Editor\s*<\/p>/gi, '');
    html = html.replace(/<div[^>]*>\s*Powered\s*by\s*Froala\s*Editor\s*<\/div>/gi, '');
    
    // 6. Nuclear option: remove any line containing the phrase
    const lines = html.split('\n');
    html = lines.filter((line: string) => !/Powered\s*by\s*Froala\s*Editor/i.test(line)).join('\n');
    
    // Fix HTML entities
    html = html
      .replace(/&nbsp;/g, ' ')
      .replace(/&laquo;/g, '«')
      .replace(/&raquo;/g, '»')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');
    
    // Remove duplicate emojis (2 or more of the same emoji in a row)
    html = html.replace(/([\u{1F300}-\u{1F9FF}])\1+/gu, '$1');
    
    // Clean up excessive whitespace
    html = html.replace(/\s{2,}/g, ' ');
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.trim();
    
    return html;
  }, [course.courseDescription, course.description]);

  // Generate access info based on pricing tiers
  const getAccessInfo = (monthsPeriod: number) => {
    // Training days is FIXED from course (e.g., 14 days)
    const trainingDays = course.duration || course.days || 14;
    // Total days in the period (30 days per month)
    const totalDaysInPeriod = monthsPeriod * 30;
    // Practice days = remaining days after training
    const practiceDays = totalDaysInPeriod - trainingDays;
    
    return {
      trainingDays: trainingDays,
      practiceDays: practiceDays,
      totalDays: totalDaysInPeriod,
      photoStorageDays: totalDaysInPeriod + 30, // tariff period + 1 month
    };
  };

  // Pricing tiers with access information and translations
  const pricingTiers = useMemo(() => {
    const tiers = [
      { period: 1, label: { ru: 'месяц', en: 'month', es: 'mes' } },
      { period: 3, label: { ru: '3 месяца', en: '3 months', es: '3 meses' } },
      { period: 12, label: { ru: 'год', en: 'year', es: 'año' } },
    ];

    return tiers.map(tier => {
      const access = getAccessInfo(tier.period);
      const periodLabel = tier.label[language];
      
      return {
        ...tier,
        access,
        periodLabel,
      };
    });
  }, [course.duration, course.days, language]);

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
                course.productType?.toLowerCase().includes('marathon') ? 'rounded-full' : 'rounded-[20px]'
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
                    {t.description}
                  </button>
                  <button
                    onClick={() => setActiveTab('program')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'program'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {t.program}
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'reviews'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {t.reviews}
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="mb-8">
                {activeTab === 'description' && (
                  <div className="prose max-w-none">
                    <div 
                      className="text-gray-700 leading-relaxed mb-4"
                      dangerouslySetInnerHTML={{ __html: cleanDescription }}
                    />
                    <div className="bg-blue-50 rounded-lg p-6 mt-6">
                      <h3 className="text-lg font-semibold text-[#1e3a8a] mb-4">
                        {t.whatYouGet}
                      </h3>
                      
                      <div className="space-y-6">
                        {pricingTiers.map((tier, index) => (
                          <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
                            <h4 className="font-bold text-purple-700 mb-3">
                              {t.tariff} «{tier.periodLabel}»:
                            </h4>
                            <ul className="space-y-2 text-gray-700 text-sm">
                              <li className="flex items-start">
                                <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{t.accessToCourse} <strong>{tier.access.trainingDays} {t.daysOfTraining}</strong> {language === 'en' ? 'and' : language === 'es' ? 'y' : 'и'} <strong>{tier.access.practiceDays} {t.daysOfPractice}</strong> {t.withArchive}</span>
                              </li>
                              <li className="flex items-start">
                                <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{t.photoStorage} <strong>{tier.access.photoStorageDays} {t.daysStorage}</strong> ({tier.periodLabel} {t.plusOneMonth})</span>
                              </li>
                            </ul>
                          </div>
                        ))}
                        
                        <div className="mt-4 pt-4 border-t border-blue-200">
                          <p className="flex items-start text-sm text-gray-700">
                            <svg className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                            </svg>
                            <span>{t.communitySupport} <a href="https://t.me/seplitza_support" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://t.me/seplitza_support</a></span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'program' && (
                  <div>
                    {/* Training Days Section */}
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-[#1e3a8a] mb-4">
                        {t.trainingProgram}
                      </h3>
                      <div className="space-y-3">
                        {loadingMarathon ? (
                          // Loading state
                          <div className="flex justify-center items-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            <span className="ml-3 text-gray-600">
                              {language === 'ru' ? 'Загрузка программы...' : language === 'en' ? 'Loading program...' : 'Cargando programa...'}
                            </span>
                          </div>
                        ) : marathon && marathon.marathonDays && marathon.marathonDays.length > 0 ? (
                          // Show real day descriptions from API
                          marathon.marathonDays.map((day) => (
                            <button
                              key={day.id}
                              onClick={() => handleDayClick(day.id)}
                              className="w-full flex items-center p-4 bg-gray-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer border-2 border-transparent hover:border-purple-300 text-left"
                            >
                              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                                {day.day}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">
                                  {t.dayLabel} {day.day}
                                </h4>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {day.description || (language === 'ru' 
                                    ? 'Упражнения и теория'
                                    : language === 'en'
                                    ? 'Exercises and theory'
                                    : 'Ejercicios y teoría')}
                                </p>
                              </div>
                              {day.progress > 0 && (
                                <div className="flex-shrink-0 ml-3">
                                  <div className="flex items-center">
                                    {[...Array(Math.ceil(day.progress / 20))].map((_, i) => (
                                      <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <svg className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          ))
                        ) : (
                          // Fallback: Show generic days if no marathon data (still clickable)
                          [...Array(course.duration || course.days || 7)].map((_, index) => {
                            const dayNumber = index + 1;
                            const exerciseBrief = language === 'ru' 
                              ? 'Упражнения и теория'
                              : language === 'en'
                              ? 'Exercises and theory'
                              : 'Ejercicios y teoría';
                            // Generate a temporary dayId for fallback days
                            const tempDayId = `day-${dayNumber}`;

                            return (
                              <button
                                key={index}
                                onClick={() => handleDayClick(tempDayId)}
                                className="w-full flex items-center p-4 bg-gray-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer border-2 border-transparent hover:border-purple-300 text-left"
                              >
                                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                                  {dayNumber}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">
                                    {t.dayLabel} {dayNumber}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {exerciseBrief}
                                  </p>
                                </div>
                                <svg className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Practice Section */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
                      <div className="flex items-start mb-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-purple-700 mb-2">
                            {t.practiceSection}
                          </h3>
                          <p className="text-gray-700 mb-3">
                            {t.practiceIntro}
                          </p>
                          <div className="bg-white rounded-lg p-4 mb-3">
                            <p className="text-sm text-gray-700">
                              {course.productType?.toLowerCase().includes('advanced') || course.courseType?.toLowerCase().includes('advanced')
                                ? t.practiceAdvancedCourse
                                : t.practiceBasicCourse.replace('{count}', (course.exerciseCount || 33).toString())}
                            </p>
                          </div>
                          <div className="flex items-center text-purple-700 font-semibold">
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>
                              {(() => {
                                const days = pricingTiers[0]?.access.practiceDays || 16;
                                if (language === 'ru') {
                                  const form = getRussianPluralForm(days, 'день', 'дня', 'дней');
                                  return `${days} ${form} практики`;
                                }
                                return `${days} ${t.practiceDays}`;
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
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
                      <p className="text-sm text-gray-600 mb-1">{t.cost}</p>
                      <p className="text-3xl font-bold text-[#1e3a8a]">
                        {language === 'ru' ? 'от' : language === 'en' ? 'from' : 'desde'} {course.priceFrom?.toLocaleString(language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'es-ES')} {course.currency}
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
                  {isOwnedCourse ? t.startCourse : t.pay}
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-4 bg-gray-100 text-gray-700 font-medium rounded-full hover:bg-gray-200 transition-colors"
                >
                  {t.close}
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
