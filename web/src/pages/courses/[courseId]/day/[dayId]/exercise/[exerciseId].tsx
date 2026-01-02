/**
 * Exercise Detail Page
 * Displays individual exercise with video, description, and comments
 * 
 * Route: /courses/[courseId]/day/[dayId]/exercise/[exerciseId]
 * Data: Loaded from Redux (getDayExercise already loads all exercises)
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectDayCategories, selectChangingStatusRequests, selectUpdatedExercisesStatus } from '@/store/modules/day/selectors';
import { changeExerciseStatus } from '@/store/modules/day/slice';
import { request, endpoints } from '@/api';
import Image from 'next/image';
import type { Exercise } from '@/store/modules/day/slice';

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

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userImage: string;
  comment: string;
  commentDate: string;
  likeCount: number;
  childCommentCount: number;
  isLike: boolean;
}

export default function ExerciseDetailPage() {
  const router = useRouter();
  const { courseId, dayId, exerciseId } = router.query;
  const dispatch = useAppDispatch();

  const dayCategories = useAppSelector(selectDayCategories);
  const changingStatusRequests = useAppSelector(selectChangingStatusRequests);
  const updatedExercisesStatus = useAppSelector(selectUpdatedExercisesStatus);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Find exercise from Redux state
  let exercise: Exercise | null = null;
  let uniqueId = '';
  
  if (dayCategories && exerciseId) {
    for (const category of dayCategories) {
      const index = category.exercises.findIndex(ex => ex.id === exerciseId);
      if (index !== -1) {
        exercise = category.exercises[index];
        uniqueId = `${index}-${category.id}-${exercise.id}`;
        break;
      }
    }
  }

  // Get current exercise status
  const isDone = exercise && uniqueId
    ? (updatedExercisesStatus[uniqueId] !== undefined 
        ? updatedExercisesStatus[uniqueId] 
        : exercise.isDone)
    : false;
  
  const isChangingStatus = exercise && uniqueId ? changingStatusRequests[uniqueId] : false;

  // Load comments
  useEffect(() => {
    if (!exerciseId || !courseId) return;

    const loadComments = async () => {
      try {
        setLoadingComments(true);
        const response: any = await request.get(endpoints.get_comments, {
          params: {
            exerciseId: exerciseId,
            marathonId: courseId, // Required by API
            pageNumber: 1,
            pageSize: 50,
          },
        });
        
        setComments(response.items || []);
      } catch (error) {
        console.error('Failed to load comments:', error);
        setComments([]);
      } finally {
        setLoadingComments(false);
      }
    };

    loadComments();
  }, [exerciseId, courseId]);

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
    if (!exercise || !uniqueId || isChangingStatus) return;

    dispatch(changeExerciseStatus({
      marathonExerciseId: exercise.marathonExerciseId,
      status: !isDone,
      dayId: dayId as string,
      uniqueId,
    }));
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim() || submittingComment || !exerciseId) return;

    try {
      setSubmittingComment(true);

      const response = await request.post(endpoints.post_comment, {
        exerciseId: exerciseId,
        comment: comment.trim(),
      });

      // Refresh comments after posting
      const updatedComments: any = await request.get(endpoints.get_comments, {
        params: {
          exerciseId: exerciseId,
          marathonId: courseId, // Required by API
          pageNumber: 1,
          pageSize: 50,
        },
      });

      setComments(updatedComments.items || []);
      setComment('');
    } catch (error) {
      console.error('Failed to post comment:', error);
      alert('Не удалось отправить комментарий. Попробуйте еще раз.');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!exercise) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Упражнение не найдено</h2>
          <p className="text-gray-600 mb-6">Вернитесь на страницу дня</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  const { embedUrl, type } = getVideoEmbedUrl(exercise.videoUrl || '');

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
              <p className="text-sm text-white/80">
                {Math.floor(exercise.duration / 60)} мин
              </p>
            </div>

            {/* Completion Checkbox */}
            <button
              onClick={handleCheckboxChange}
              disabled={isChangingStatus || exercise.blockExercise}
              className={`flex-shrink-0 w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                exercise.blockExercise
                  ? 'border-white/30 cursor-not-allowed opacity-50'
                  : isDone
                  ? 'bg-white border-white'
                  : 'border-white/50 hover:border-white hover:bg-white/10'
              }`}
              aria-label={isDone ? 'Отменить выполнение' : 'Отметить как выполненное'}
            >
              {isChangingStatus ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
              ) : isDone ? (
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
        {exercise.videoUrl && (
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
        )}

        {/* Exercise Description */}
        {exercise.description && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-4">
              <h2 className="text-xl font-bold text-purple-900">Описание упражнения</h2>
            </div>
            <div className="px-6 py-6">
              <div
                className="prose prose-purple max-w-none"
                dangerouslySetInnerHTML={{ __html: exercise.description }}
              />
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-4">
            <h2 className="text-xl font-bold text-purple-900">
              Комментарии {!loadingComments && `(${comments.length})`}
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
                disabled={submittingComment}
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={!comment.trim() || submittingComment}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {submittingComment ? 'Отправка...' : 'Отправить'}
                </button>
              </div>
            </form>
          </div>

          {/* Comments List */}
          <div className="divide-y divide-gray-200">
            {loadingComments ? (
              <div className="px-6 py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Загрузка комментариев...</p>
              </div>
            ) : comments.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                Комментариев пока нет. Будьте первым!
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="px-6 py-4">
                  <div className="flex items-start space-x-3">
                    {/* User Avatar */}
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-purple-100">
                      {comment.userImage ? (
                        <Image
                          src={comment.userImage}
                          alt={comment.userName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-purple-600 font-bold">
                          {comment.userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Comment Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold text-gray-900">{comment.userName}</p>
                        <span className="text-sm text-gray-500">
                          {new Date(comment.commentDate).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-gray-700">{comment.comment}</p>
                      
                      {/* Comment actions */}
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        {comment.likeCount > 0 && (
                          <span>❤️ {comment.likeCount}</span>
                        )}
                        {comment.childCommentCount > 0 && (
                          <span>💬 {comment.childCommentCount}</span>
                        )}
                      </div>
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
