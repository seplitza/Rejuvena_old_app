/**
 * Exercise Detail Modal Component
 * Shows full exercise details with video and description
 */

import { useEffect } from 'react';
import type { Exercise } from '@/store/modules/day/slice';
import Image from 'next/image';

interface ExerciseDetailModalProps {
  exercise: Exercise;
  isOpen: boolean;
  onClose: () => void;
}

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

export default function ExerciseDetailModal({ exercise, isOpen, onClose }: ExerciseDetailModalProps) {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { exerciseName, marathonExerciseName, description, videoUrl, imageUrl, type, duration } = exercise;
  const { embedUrl, type: videoType } = getVideoEmbedUrl(videoUrl || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <h2 className="text-2xl font-bold mb-1">{exerciseName}</h2>
              <p className="text-purple-100">{marathonExerciseName}</p>
              
              {/* Exercise Meta */}
              <div className="flex items-center space-x-4 mt-3 text-sm">
                {type && (
                  <span className="flex items-center space-x-1 bg-white/20 px-3 py-1 rounded-full">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                    <span>{type === 'Video' ? 'Видео' : type === 'Reading' ? 'Теория' : 'Практика'}</span>
                  </span>
                )}
                
                {duration > 0 && (
                  <span className="flex items-center space-x-1 bg-white/20 px-3 py-1 rounded-full">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{Math.floor(duration / 60)} минут</span>
                  </span>
                )}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Закрыть"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Video */}
          {videoUrl && embedUrl && (
            <div className="aspect-video w-full bg-gray-900 rounded-lg overflow-hidden">
              {videoType === 'video' ? (
                <video
                  src={embedUrl}
                  controls
                  className="w-full h-full"
                  playsInline
                />
              ) : (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          )}

          {/* Image */}
          {!videoUrl && imageUrl && (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={imageUrl}
                alt={exerciseName}
                fill
                className="object-contain"
              />
            </div>
          )}

          {/* Description */}
          {description && (
            <div className="prose prose-sm max-w-none
              prose-headings:text-purple-900 prose-headings:font-bold
              prose-p:text-gray-700 prose-p:leading-relaxed
              prose-a:text-purple-600 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-900 prose-strong:font-semibold
              prose-ul:list-disc prose-ol:list-decimal
              prose-li:text-gray-700 prose-li:my-1
              prose-blockquote:border-l-4 prose-blockquote:border-purple-400 prose-blockquote:pl-4 prose-blockquote:italic"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
