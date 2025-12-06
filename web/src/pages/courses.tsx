import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  fetchMyOrders,
  fetchAvailableCourses,
  fetchDemoCourses,
  fetchCourseDetails,
  fetchMarathon,
  createOrder,
  purchaseCourse as purchaseCourseAction,
} from '../store/modules/courses/slice';
import {
  selectCoursesWithProgress,
  selectAvailableCourses,
  selectDemoCourses,
  selectLoadingOrders,
  selectLoadingCourses,
  selectSelectedCourse,
} from '../store/modules/courses/selectors';
import MyCourseCard from '../components/courses/MyCourseCard';
import CourseCard from '../components/courses/CourseCard';
import CourseDetailModal from '../components/courses/CourseDetailModal';

const CoursesPage: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Redux selectors
  const myCoursesWithProgress = useAppSelector(selectCoursesWithProgress);
  const availableCourses = useAppSelector(selectAvailableCourses);
  const demoCourses = useAppSelector(selectDemoCourses);
  const loadingOrders = useAppSelector(selectLoadingOrders);
  const loadingCourses = useAppSelector(selectLoadingCourses);
  const courseDetails = useAppSelector(selectSelectedCourse);

  // Fetch data on mount
  useEffect(() => {
    dispatch(fetchMyOrders());
    dispatch(fetchAvailableCourses());
    dispatch(fetchDemoCourses());
  }, [dispatch]);

  // Fetch marathon progress for each active order
  useEffect(() => {
    if (myCoursesWithProgress.length > 0) {
      myCoursesWithProgress.forEach((course) => {
        if (!course.marathon) {
          dispatch(
            fetchMarathon({
              marathonId: course.marathonId,
              timeZoneOffset: new Date().getTimezoneOffset(),
            })
          );
        }
      });
    }
  }, [myCoursesWithProgress.length, dispatch]);

  const handleCourseDetails = (course: any) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
    // Fetch detailed info from API
    if (course.id || course.marathonId) {
      dispatch(fetchCourseDetails(course.id || course.marathonId));
    }
  };

  const handleStartCourse = (marathonId: string) => {
    // Navigate to exercises for this marathon
    router.push(`/course/${marathonId}/exercises`);
  };

  const handleJoinCourse = async (courseId: string) => {
    try {
      // Create order first
      const order = await dispatch(createOrder(courseId));
      
      // For free/demo courses, immediately activate
      // For paid courses, would redirect to payment
      const isFree = demoCourses.some(c => c.id === courseId) || 
                     availableCourses.some(c => c.id === courseId && c.isFree);
      
      if (isFree) {
        await dispatch(
          purchaseCourseAction({
            orderNumber: (order as any).payload?.orderNumber,
            couponCode: null,
          })
        );
        alert('Курс успешно активирован!');
      } else {
        // TODO: Redirect to payment page
        console.log('Redirect to payment for course:', courseId);
      }
    } catch (error) {
      console.error('Failed to join course:', error);
      alert('Не удалось присоединиться к курсу');
    }
  };

  // Combine demo and available courses for display
  const allAvailableCourses = [...demoCourses, ...availableCourses];

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
          
          {loadingOrders ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Загрузка ваших курсов...</p>
            </div>
          ) : myCoursesWithProgress.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">У вас пока нет активных курсов</h3>
              <p className="text-gray-600">Выберите курс из доступных ниже</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myCoursesWithProgress.map((order) => {
                const isFree = order.cost === 0 || order.isFree;
                const dayText = order.days === 1 ? 'день' : order.days >= 2 && order.days <= 4 ? 'дня' : 'дней';
                const fallbackDescription = `${order.days || 0} ${dayText} обучения + курсы практики`;
                
                return (
                  <MyCourseCard
                    key={order.orderId || order.id}
                    course={{
                      id: order.marathonId,
                      title: order.title || order.marathonName || 'Курс без названия',
                      subtitle: order.subTitle,
                      description: order.courseDescription || order.description || fallbackDescription,
                      callToAction: isFree ? 'БЕСПЛАТНЫЙ КУРС!' : undefined,
                      imageUrl: order.imagePath || '/images/courses/default.jpg',
                      progress: order.progress || 0,
                      totalDays: order.totalDays || order.marathon?.totalDays || order.days || 0,
                      completedDays: order.completedDays || 0,
                      status: (order.orderStatus || order.status || 'active').toLowerCase(),
                      isFree: isFree,
                      isDemo: order.subscriptionType === 'Trial',
                      cost: order.cost,
                    }}
                    onStart={() => handleStartCourse(order.marathonId)}
                    onLearnMore={() => handleCourseDetails(order)}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Доступные курсы */}
        <section>
          <h2 className="text-3xl font-bold text-center text-[#1e3a8a] mb-8 uppercase tracking-wider">
            ДОСТУПНЫЕ КУРСЫ
          </h2>
          
          {loadingCourses ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Загрузка доступных курсов...</p>
            </div>
          ) : allAvailableCourses.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <p className="text-gray-600">Нет доступных курсов</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allAvailableCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={{
                    id: course.id,
                    title: course.title,
                    subtitle: course.isDemo ? 'Demo Course' : course.category || 'Course',
                    description: course.description,
                    priceFrom: 0, // Will be fetched from course plans
                    currency: '₽',
                    imageUrl: course.imageUrl || '/images/courses/default.jpg',
                    duration: course.duration,
                    level: course.level || 'beginner',
                    tags: course.tags || [],
                  }}
                  onJoin={() => handleJoinCourse(course.id)}
                  onDetails={() => handleCourseDetails(course)}
                />
              ))}
            </div>
          )}
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
