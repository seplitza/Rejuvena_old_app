import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import {
  fetchMyOrders,
  fetchAvailableCourses,
  fetchDemoCourses,
  fetchCourseDetails,
  fetchMarathon,
  setSelectedLanguage,
  createOrder,
} from '../store/modules/courses/slice';
import {
  selectCoursesWithProgress,
  selectAvailableCoursesByLanguage,
  selectDemoCoursesByLanguage,
  selectLoadingOrders,
  selectLoadingCourses,
  selectSelectedCourse,
  selectSelectedLanguage,
  selectActivatingOrderId,
} from '../store/modules/courses/selectors';
import MyCourseCard from '../components/courses/MyCourseCard';
import CourseCard from '../components/courses/CourseCard';
import CourseDetailModal from '../components/courses/CourseDetailModal';
import LanguageSelector from '../components/common/LanguageSelector';
import { translations, getCurrency, getDurationDescription, type LanguageCode } from '../utils/i18n';

const CoursesPage: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOwnedCourse, setIsOwnedCourse] = useState(false);
  const [pendingNavigationTo, setPendingNavigationTo] = useState<string | null>(null);

  // Redux selectors
  const myCoursesWithProgress = useAppSelector(selectCoursesWithProgress);
  const availableCourses = useAppSelector(selectAvailableCoursesByLanguage);
  const demoCourses = useAppSelector(selectDemoCoursesByLanguage);
  const loadingOrders = useAppSelector(selectLoadingOrders);
  const loadingCourses = useAppSelector(selectLoadingCourses);
  const courseDetails = useAppSelector(selectSelectedCourse);
  const selectedLanguage = useAppSelector(selectSelectedLanguage);
  const activatingOrderId = useAppSelector(selectActivatingOrderId);
  
  // Get translations
  const t = translations[selectedLanguage];
  const currency = getCurrency(selectedLanguage);

  // Fetch data on mount
  useEffect(() => {
    dispatch(fetchMyOrders());
    dispatch(fetchAvailableCourses());
    dispatch(fetchDemoCourses());
  }, [dispatch]);

  // Watch for activation completion and navigate
  useEffect(() => {
    // If activation just finished (activatingOrderId was set, now null) and we have pending navigation
    if (!activatingOrderId && pendingNavigationTo) {
      console.log('✅ Activation complete, navigating to:', pendingNavigationTo);
      router.push(pendingNavigationTo);
      setPendingNavigationTo(null);
    }
  }, [activatingOrderId, pendingNavigationTo, router]);

  // Don't auto-fetch marathons - they need activation first if orderNumber is null
  // Fetch will happen when user clicks on course

  const handleCourseDetails = (course: any, isOwned: boolean = false) => {
    setSelectedCourse(course);
    setIsOwnedCourse(isOwned);
    setIsModalOpen(true);
    // Fetch detailed info from API
    // For owned courses: order.id is the language-specific course ID from currentCourses
    // For available courses: use course.id directly
    const courseId = isOwned 
      ? (course.id || course.wpMarathonId || course.marathonId)
      : (course.id || course.wpMarathonId || course.marathonId);
    
    if (courseId) {
      console.log('Fetching course details for:', courseId, 'isOwned:', isOwned, 'course:', course);
      dispatch(fetchCourseDetails(courseId));
    }
  };

  const handleStartCourse = (courseId: string) => {
    // Check if this course needs activation first
    // courseId is order.id from the backend
    const course = myCoursesWithProgress.find(c => 
      c.id === courseId || c.wpMarathonId === courseId
    );
    
    console.log('🎯 handleStartCourse called with courseId:', courseId, 'course:', course);
    
    // CRITICAL: Only activate if orderStatus is NOT "Approved"
    // Course with orderStatus="Approved" are already activated in backend
    const needsActivation = course && course.orderNumber === null && course.orderStatus !== 'Approved';
    
    if (needsActivation && course.wpMarathonId) {
      console.log('🚀 Course needs activation before starting:', course.title);
      
      // Set pending navigation destination - saga will resolve current day
      setPendingNavigationTo(`/courses/${courseId}/day/current`);
      
      // Create order and auto-activate in background
      // When saga completes, useEffect will trigger navigation
      dispatch(createOrder(course.wpMarathonId));
      return;
    }
    
    console.log('✅ Course already activated (orderStatus:', course?.orderStatus, '), navigating directly');
    
    // Check rules acceptance by calling startmarathon API
    // This API returns isAcceptCourseTerm field
    try {
      const marathonData: any = await request.get(endpoints.get_start_marathon, {
        params: {
          marathonId: courseId,
          timeZoneOffset: new Date().getTimezoneOffset(),
        },
      });
      
      const hasAcceptedRules = marathonData?.isAcceptCourseTerm === true;
      
      console.log('📋 Checking rules acceptance from API:', {
        hasAcceptedRules,
        isAcceptCourseTerm: marathonData?.isAcceptCourseTerm,
        courseId,
      });
      
      if (!hasAcceptedRules) {
        console.log('📋 Rules not accepted, redirecting to /start with courseId:', courseId);
        router.push(`/courses/${courseId}/start`);
        return;
      }
      
      // Already activated and rules accepted - navigate to current day
      // Get current day from marathon data
      const allDays = [
        ...(marathonData.marathonDays || []),
        ...(marathonData.greatExtensionDays || []),
      ];
      const currentDay = allDays[allDays.length - 1]; // Last published day
      
      if (currentDay?.id) {
        console.log('📍 Navigating to current day:', currentDay.day, 'with ID:', currentDay.id);
        router.push(`/courses/${courseId}/day/${currentDay.id}`);
      } else {
        // Fallback to 'current' if no day ID found
        router.push(`/courses/${courseId}/day/current`);
      }
    } catch (error) {
      console.error('❌ Failed to check marathon status:', error);
      // On error, redirect to start page
      router.push(`/courses/${courseId}/start`);
    }
  };

  const handleJoinCourse = (courseId: string) => {
    // Find course in my courses (they already have wpMarathonId)
    const myCourse = myCoursesWithProgress.find(c => 
      c.id === courseId || c.wpMarathonId === courseId || c.marathonId === courseId
    );
    
    // If found in my courses and it's free (cost=0), activate and navigate
    if (myCourse && myCourse.isFree && myCourse.orderNumber === null && myCourse.wpMarathonId) {
      console.log('🚀 Free course needs activation:', myCourse.title);
      
      // Set pending navigation destination - will fetch current day after activation
      setPendingNavigationTo(`/courses/${courseId}/current`);
      setPendingNavigationTo(`/courses/${myCourse.wpMarathonId || courseId}/day/day-1`);
      
      // Create order and auto-activate in background
      // When saga completes, useEffect will trigger navigation
      dispatch(createOrder(myCourse.wpMarathonId));
      
      // Close modal immediately
      setIsModalOpen(false);
      return;
    }
    
    // If in my courses and already activated, navigate
    if (myCourse && myCourse.orderNumber !== null) {
      setIsModalOpen(false);
      handleStartCourse(myCourse.id || courseId);
      return;
    }
    
    // Not owned or paid course - show modal with payment details
    console.log('Fetching course details for:', courseId, 'isOwned:', !!myCourse, 'course:', myCourse);
    const availableCourse = [...availableCourses, ...demoCourses].find(c => 
      c.id === courseId || c.wpMarathonId === courseId
    );
    
    if (availableCourse) {
      dispatch(fetchCourseDetails(availableCourse.wpMarathonId || courseId));
      setSelectedCourse(availableCourse);
      setIsOwnedCourse(false);
      setIsModalOpen(true);
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
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <LanguageSelector />
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              ← {selectedLanguage === 'ru' ? 'Назад к панели' : selectedLanguage === 'en' ? 'Back to Dashboard' : 'Volver al Panel'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Мои курсы - секция активных курсов */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-center text-[#1e3a8a] mb-8 uppercase tracking-wider">
            {t.myCourses}
          </h2>
          
          {loadingOrders ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">{t.loadingMyCourses}</p>
            </div>
          ) : myCoursesWithProgress.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t.noCourses}</h3>
              <p className="text-gray-600">{t.selectCourse}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myCoursesWithProgress.map((order) => {
                const isFree = order.cost === 0 || order.isFree;
                const fallbackDescription = getDurationDescription(order.days || 0, selectedLanguage);
                
                return (
                  <MyCourseCard
                    key={order.id}
                    course={{
                      id: order.id,
                      title: order.title || order.marathonName || 'Курс без названия',
                      subtitle: order.subTitle,
                      description: fallbackDescription,
                      imageUrl: order.imagePath || '/images/courses/default.jpg',
                      progress: order.progress || 0,
                      totalDays: order.totalDays || order.marathon?.totalDays || order.days || 0,
                      completedDays: order.completedDays || 0,
                      status: (order.orderStatus || order.status || 'active').toLowerCase(),
                      isFree: isFree,
                      isDemo: order.subscriptionType === 'Trial',
                      cost: order.cost,
                      productType: order.productType || order.courseType,
                      currency: currency,
                    }}
                    language={selectedLanguage}
                    onStart={() => handleStartCourse(order.id)}
                    onLearnMore={() => handleCourseDetails(order, true)}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Доступные курсы */}
        <section>
          <h2 className="text-3xl font-bold text-center text-[#1e3a8a] mb-8 uppercase tracking-wider">
            {t.availableCourses}
          </h2>
          
          {loadingCourses ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">{t.loadingAvailableCourses}</p>
            </div>
          ) : allAvailableCourses.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <p className="text-gray-600">{t.noAvailableCourses}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allAvailableCourses.map((course) => {
                const isFree = course.cost === 0 || course.isFree;
                const durationDescription = getDurationDescription(course.days || 0, selectedLanguage);
                
                return (
                  <CourseCard
                    key={course.id}
                    course={{
                      id: course.id,
                      title: course.title,
                      subtitle: course.subTitle,
                      description: durationDescription,
                      priceFrom: course.cost || 0,
                      currency: currency,
                      imageUrl: course.imagePath || '/images/courses/default.jpg',
                      duration: course.days || 0,
                      level: 'beginner',
                      tags: [],
                      isFree: isFree,
                      productType: course.productType || course.courseType,
                    }}
                    language={selectedLanguage}
                    onJoin={() => handleJoinCourse(course.id)}
                    onDetails={() => handleCourseDetails(course, false)}
                  />
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Модальное окно с деталями курса */}
      {isModalOpen && selectedCourse && (
        <CourseDetailModal
          course={{
            ...selectedCourse,
            ...courseDetails, // Merge course details from API
          }}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onJoin={() => {
            const courseId = selectedCourse.wpMarathonId || selectedCourse.marathonId || selectedCourse.id;
            handleJoinCourse(courseId);
          }}
          isOwnedCourse={isOwnedCourse}
          language={selectedLanguage}
        />
      )}
    </div>
  );
};

export default CoursesPage;
