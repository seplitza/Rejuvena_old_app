/**
 * Day Header Component
 * Displays course icon, name, day number, type (study/practice), date, and user avatar
 */

import { useRouter } from 'next/router';
import { useAppSelector } from '@/store/hooks';
import { selectMarathonDay, selectDayTitle } from '@/store/modules/day/selectors';
import { selectUserProfile } from '@/store/modules/auth/selectors';
import { selectUserOrders } from '@/store/modules/courses/selectors';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Image from 'next/image';

export default function DayHeader() {
  const router = useRouter();
  const { courseId } = router.query;
  
  const marathonDay = useAppSelector(selectMarathonDay);
  const dayTitle = useAppSelector(selectDayTitle);
  const userProfile = useAppSelector(selectUserProfile);
  const userOrders = useAppSelector(selectUserOrders);

  // Find current course from orders
  const currentCourse = userOrders.find(order => order.id === courseId || order.marathonId === courseId);

  if (!marathonDay || !currentCourse) {
    return null;
  }

  const { day, dayDate } = marathonDay;
  const formattedDate = dayDate ? format(new Date(dayDate), 'd MMMM \'yy', { locale: ru }) : '';
  
  // Determine if it's study or practice day
  // Check if day is in marathonDays (1-14) or in greatExtensionDays (15+)
  const isPracticeDay = day > 14;
  const dayType = isPracticeDay ? 'практика' : 'обучение';

  // User avatar - from profile or first photo diary image
  const userAvatar = userProfile?.profilePicture || userProfile?.avatar || '/images/default-avatar.png';

  return (
    <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Course Icon + Name + Menu */}
          <div className="flex items-center space-x-4 flex-1">
            {/* Back button */}
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Назад"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Course Icon */}
            {currentCourse.imagePath && (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/10">
                <Image
                  src={currentCourse.imagePath}
                  alt={currentCourse.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Course Name */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">{currentCourse.title}</h1>
            </div>

            {/* Menu Button */}
            <button
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Меню"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Day Info Bar */}
        <div className="mt-4 flex items-center justify-between bg-white/10 rounded-lg p-3 backdrop-blur-sm">
          {/* Left: Day Number + Type */}
          <div className="flex items-center space-x-3">
            <div className="text-center">
              <p className="text-sm font-medium opacity-90">день</p>
              <p className="text-3xl font-bold">{day}</p>
              <p className="text-sm font-medium opacity-90">{dayType}</p>
            </div>
          </div>

          {/* Right: Date + User Avatar */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium opacity-90">{formattedDate}</p>
            </div>
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/30 flex-shrink-0">
              <Image
                src={userAvatar}
                alt="User avatar"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
