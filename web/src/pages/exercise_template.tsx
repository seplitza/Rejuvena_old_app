/**
 * Exercise Template Page
 * Template for individual exercise page with:
 * - Header with exercise name and completion checkbox
 * - Square video player (supports YouTube, Vimeo, RuTube, VK, Dzen, direct files)
 * - Exercise description (HTML from backend)
 * - Comments section
 * 
 * DATA SOURCE:
 * Real data comes from /usermarathon/getdayexercise API
 * Exercise data structure:
 * {
 *   id: string,
 *   marathonExerciseId: string,
 *   exerciseName: string, // Bold part (e.g., "Вращения")
 *   marathonExerciseName: string, // Regular part (e.g., "головой")
 *   description: string, // HTML content from backend exerciseDescription
 *   videoUrl: string, // From exerciseContents[0].contentPath
 *   type: 'Video' | 'Reading' | 'Practice',
 *   duration: number,
 *   isDone: boolean,
 *   isNew: boolean,
 *   blockExercise: boolean
 * }
 * 
 * Admin panel for editing exercises:
 * https://new-facelift-service-b8cta5hpgcgqf8c7.eastus-01.azurewebsites.net/#/dashboards/daily_exercise
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';

/**
 * Get video embed URL based on platform
 * Supports: YouTube, Vimeo, RuTube, VK Video, Dzen, direct video files
 */
function getVideoEmbedUrl(url: string): { embedUrl: string; type: 'iframe' | 'video' } {
  if (!url) return { embedUrl: '', type: 'iframe' };

  // Direct video file (mp4, webm, etc.)
  if (url.match(/\.(mp4|webm|ogg|mov)$/i)) {
    return { embedUrl: url, type: 'video' };
  }

  // YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = url.includes('youtu.be')
      ? url.split('youtu.be/')[1]?.split('?')[0]
      : new URL(url).searchParams.get('v');
    return { embedUrl: `https://www.youtube.com/embed/${videoId}`, type: 'iframe' };
  }

  // Vimeo
  if (url.includes('vimeo.com')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    return { embedUrl: `https://player.vimeo.com/video/${videoId}`, type: 'iframe' };
  }

  // RuTube
  if (url.includes('rutube.ru')) {
    let videoId = url.split('rutube.ru/video/')[1]?.split('?')[0];
    if (!videoId) {
      videoId = url.split('rutube.ru/play/embed/')[1]?.split('?')[0];
    }
    return { embedUrl: `https://rutube.ru/play/embed/${videoId}`, type: 'iframe' };
  }

  // VK Video
  if (url.includes('vk.com/video')) {
    const match = url.match(/video(-?\d+)_(\d+)/);
    if (match) {
      const [, oid, id] = match;
      return { embedUrl: `https://vk.com/video_ext.php?oid=${oid}&id=${id}`, type: 'iframe' };
    }
  }

  // Dzen (Яндекс.Дзен)
  if (url.includes('dzen.ru')) {
    const videoId = url.split('dzen.ru/video/watch/')[1]?.split('?')[0] || 
                    url.split('dzen.ru/embed/')[1]?.split('?')[0];
    if (videoId) {
      return { embedUrl: `https://dzen.ru/embed/${videoId}`, type: 'iframe' };
    }
  }

  // Telegram video
  if (url.includes('t.me')) {
    return { embedUrl: url, type: 'iframe' };
  }

  // Fallback - try as iframe
  return { embedUrl: url, type: 'iframe' };
}

export default function ExerciseTemplatePage() {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [comment, setComment] = useState('');
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [comments, setComments] = useState([
    {
      id: '1',
      userName: 'Елена В.',
      userAvatar: 'https://ui-avatars.com/api/?name=Elena+V&background=9333ea&color=fff',
      text: 'После выполнения этого упражнения чувствую легкость в шее и голове. Очень помогает при работе за компьютером!',
      date: '28 декабря 2025',
    },
    {
      id: '2',
      userName: 'Ирина М.',
      userAvatar: 'https://ui-avatars.com/api/?name=Irina+M&background=ec4899&color=fff',
      text: 'Делаю это упражнение каждое утро. Главное не торопиться и делать все плавно.',
      date: '27 декабря 2025',
    },
  ]);

  // Mock exercise data - Structure from backend API
  // In production this will come from: /usermarathon/getdayexercise
  // Real data structure matches Exercise interface from Redux
  const exercise = {
    id: 'real-exercise-id', // From backend
    marathonExerciseId: 'marathon-exercise-id', // From backend
    exerciseName: 'Вращения', // Bold part - from backend exerciseName
    marathonExerciseName: 'головой', // Regular part - from backend marathonExerciseName
    description: 'HTML описание упражнения из базы данных будет здесь', // From backend exerciseDescription (HTML)
    category: 'Разминка',
    duration: 180, // seconds - from backend
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // From backend exerciseContents[0].contentPath
    type: 'Video' as const, // From backend exerciseContents[0].type
    isDone: false,
    isNew: false,
    blockExercise: false,
    commentsCount: 2,
  };

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!videoContainerRef.current) return;

    try {
      if (!isFullscreen) {
        await videoContainerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const handleCheckboxChange = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setIsCompleted(!isCompleted);

      // TODO: Call API to save completion status
      // await api.changeExerciseStatus({ exerciseId, status: !isCompleted })

      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      console.log('✅ Exercise completion status updated:', !isCompleted);
    } catch (error) {
      console.error('❌ Failed to update exercise status:', error);
      // Revert on error
      setIsCompleted(!isCompleted);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) return;

    const newComment = {
      id: Date.now().toString(),
      userName: 'Вы',
      userAvatar: 'https://ui-avatars.com/api/?name=You&background=3b82f6&color=fff',
      text: comment,
      date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
    };

    setComments([newComment, ...comments]);
    setComment('');

    // TODO: Call API to save comment
    // await api.addExerciseComment({ exerciseId, comment })
  };

  const { embedUrl, type } = getVideoEmbedUrl(exercise.videoUrl);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* Header with Exercise Name and Checkbox */}
      <header className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            {/* Back button */}
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
              aria-label="Назад"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Exercise Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">
                <span className="font-bold">{exercise.exerciseName}</span> {exercise.marathonExerciseName}
              </h1>
              <p className="text-sm text-white/80">{exercise.category}</p>
            </div>

            {/* Completion Checkbox */}
            <button
              onClick={handleCheckboxChange}
              disabled={isSubmitting}
              className={`flex-shrink-0 w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                isCompleted
                  ? 'bg-white border-white'
                  : 'border-white/50 hover:border-white hover:bg-white/10'
              }`}
              aria-label={isCompleted ? 'Отменить выполнение' : 'Отметить как выполненное'}
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
              ) : isCompleted ? (
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Video Player - Square 400x400 */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div 
            ref={videoContainerRef}
            className={`relative w-full max-w-[400px] mx-auto ${isFullscreen ? 'max-w-full' : ''}`} 
            style={{ paddingBottom: isFullscreen ? '56.25%' : 'min(100%, 400px)' }}
          >
            {type === 'video' ? (
              // Direct video file
              <video
                className="absolute top-0 left-0 w-full h-full rounded-lg object-cover"
                src={embedUrl}
                controls
                playsInline
                title={`${exercise.exerciseName} ${exercise.marathonExerciseName}`}
              />
            ) : (
              // Embedded iframe (YouTube, Vimeo, RuTube, etc.)
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={embedUrl}
                title={`${exercise.exerciseName} ${exercise.marathonExerciseName}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            )}
            
            {/* Fullscreen Toggle Button */}
            <button
              onClick={toggleFullscreen}
              className="absolute bottom-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg transition-all z-10"
              aria-label={isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'}
            >
              {isFullscreen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Exercise Description */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-4">
            <h2 className="text-xl font-bold text-purple-900">Описание упражнения</h2>
          </div>
          <div className="px-6 py-6">
            {/* Description will be HTML from backend exerciseDescription field */}
            <div
              className="prose prose-purple max-w-none"
              dangerouslySetInnerHTML={{ __html: exercise.description }}
            />
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-4">
            <h2 className="text-xl font-bold text-purple-900">
              Комментарии ({comments.length})
            </h2>
          </div>

          {/* Add Comment Form */}
          <div className="px-6 py-4 border-b border-gray-200">
            <form onSubmit={handleCommentSubmit}>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Поделитесь своими впечатлениями об упражнении..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
                rows={3}
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={!comment.trim()}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Отправить
                </button>
              </div>
            </form>
          </div>

          {/* Comments List */}
          <div className="divide-y divide-gray-200">
            {comments.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                Комментариев пока нет. Будьте первым!
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="px-6 py-4">
                  <div className="flex items-start space-x-3">
                    {/* User Avatar */}
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={comment.userAvatar}
                        alt={comment.userName}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Comment Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold text-gray-900">{comment.userName}</p>
                        <span className="text-sm text-gray-500">{comment.date}</span>
                      </div>
                      <p className="mt-1 text-gray-700">{comment.text}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
