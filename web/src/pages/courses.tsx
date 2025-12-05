import React, { useState } from 'react';
import { useRouter } from 'next/router';
import MyCourseCard from '../components/courses/MyCourseCard';
import CourseCard from '../components/courses/CourseCard';
import CourseDetailModal from '../components/courses/CourseDetailModal';

// Mockup данные для демонстрации
const mockMyCourses = [
  {
    id: 'demo-1',
    title: 'Slow down aging',
    subtitle: 'Free demo course',
    description: '5 days of education + practice courses',
    callToAction: 'TRY IT FOR FREE!!!',
    imageUrl: '/images/courses/demo-aging.jpg',
    progress: 40,
    totalDays: 5,
    completedDays: 2,
    status: 'active',
    isFree: true,
    isDemo: true,
  },
];

const mockAvailableCourses = [
  {
    id: 'course-1',
    title: 'Продвинутый',
    subtitle: '+на шею',
    description: '7 дней обучения + курсы практики',
    priceFrom: 3000,
    currency: '₽',
    imageUrl: '/images/courses/neck.jpg',
    duration: 7,
    level: 'advanced',
    tags: ['шея', 'продвинутый'],
  },
  {
    id: 'course-2',
    title: 'Базовый усиленный',
    subtitle: '+на лоб и глаза',
    description: '7 дней обучения + курсы практики',
    priceFrom: 2500,
    currency: '₽',
    imageUrl: '/images/courses/forehead-eyes.jpg',
    duration: 7,
    level: 'intermediate',
    tags: ['лоб', 'глаза', 'базовый'],
  },
  {
    id: 'course-3',
    title: 'Комплексный курс',
    subtitle: '+полное омоложение',
    description: '14 дней обучения + курсы практики',
    priceFrom: 5000,
    currency: '₽',
    imageUrl: '/images/courses/complex.jpg',
    duration: 14,
    level: 'expert',
    tags: ['комплексный', 'все зоны'],
  },
];

const CoursesPage: React.FC = () => {
  const router = useRouter();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCourseDetails = (course: any) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  const handleStartCourse = (courseId: string) => {
    // TODO: Навигация к упражнениям курса
    router.push(`/course/${courseId}/exercises`);
  };

  const handleJoinCourse = (courseId: string) => {
    // TODO: Логика покупки/активации курса
    console.log('Join course:', courseId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-[#1e3a8a]">
            Rejuvena
          </h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            Назад
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Мои курсы - секция активных курсов */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-center text-[#1e3a8a] mb-8 uppercase tracking-wider">
            МОИ КУРСЫ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockMyCourses.map((course) => (
              <MyCourseCard
                key={course.id}
                course={course}
                onStart={() => handleStartCourse(course.id)}
                onLearnMore={() => handleCourseDetails(course)}
              />
            ))}
          </div>
        </section>

        {/* Доступные курсы */}
        <section>
          <h2 className="text-3xl font-bold text-center text-[#1e3a8a] mb-8 uppercase tracking-wider">
            ДОСТУПНЫЕ КУРСЫ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockAvailableCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onJoin={() => handleJoinCourse(course.id)}
                onDetails={() => handleCourseDetails(course)}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Модальное окно с деталями курса */}
      {isModalOpen && selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onJoin={() => {
            handleJoinCourse(selectedCourse.id);
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default CoursesPage;
