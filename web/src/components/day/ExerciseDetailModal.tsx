/**
 * Exercise Detail Modal Component
 * Shows full exercise details with video carousel and description
 * Features:
 * - Square video player (mobile-first)
 * - Multi-video carousel with navigation
 * - Error handling for unavailable videos
 * - Compact header
 * - Collapsible comments
 */

import { useEffect, useState } from 'react';
import type { Exercise } from '@/store/modules/day/slice';
import Image from 'next/image';

interface ExerciseDetailModalProps {
  exercise: Exercise;
  isOpen: boolean;
  onClose: () => void;
  onCheckboxChange?: (newStatus: boolean) => void;
  isDone?: boolean;
}

interface ContentItem {
  id: string;
  type: 'video' | 'image';
  contentPath: string;
  embedUrl?: string;
  videoType?: 'iframe' | 'video';
  loadError?: boolean;
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

  // Already embed URL - add privacy parameters if not present
  if (url.includes('player.vimeo.com/video/')) {
    const videoId = url.split('player.vimeo.com/video/')[1]?.split('?')[0];
    return { 
      embedUrl: `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&dnt=1&controls=1&transparent=0`, 
      type: 'iframe' 
    };
  }
  
  if (url.includes('youtube.com/embed/')) {
    const videoId = url.split('youtube.com/embed/')[1]?.split('?')[0];
    return { 
      embedUrl: `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&fs=1&controls=1&disablekb=0&iv_load_policy=3&cc_load_policy=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`, 
      type: 'iframe' 
    };
  }
  
  if (url.includes('rutube.ru/play/embed/') ||
      url.includes('vk.com/video_ext.php') ||
      url.includes('dzen.ru/embed/')) {
    return { embedUrl: url, type: 'iframe' };
  }

  // YouTube - hide branding and related videos
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = url.includes('youtu.be')
      ? url.split('youtu.be/')[1]?.split('?')[0]
      : new URL(url).searchParams.get('v');
    return { 
      embedUrl: `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&fs=1&controls=1&disablekb=0&iv_load_policy=3&cc_load_policy=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`, 
      type: 'iframe' 
    };
  }

  // Vimeo - hide title, author, avatar
  if (url.includes('vimeo.com') && !url.includes('player.vimeo.com')) {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    return { 
      embedUrl: `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&dnt=1&controls=1&transparent=0`, 
      type: 'iframe' 
    };
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

export default function ExerciseDetailModal({ exercise, isOpen, onClose, onCheckboxChange, isDone }: ExerciseDetailModalProps) {
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Build content items from exerciseContents
  useEffect(() => {
    if (!exercise) return;

    const exerciseData = exercise as any;
    const exerciseContents = exerciseData.exerciseContents || [];
    
    const items: ContentItem[] = exerciseContents
      .filter((c: any) => c.type === 'video' || c.type === 'image')
      .map((c: any) => {
        const item: ContentItem = {
          id: c.id || Math.random().toString(),
          type: c.type,
          contentPath: c.contentPath,
          loadError: false
        };

        if (c.type === 'video') {
          const { embedUrl, type: videoType } = getVideoEmbedUrl(c.contentPath);
          item.embedUrl = embedUrl;
          item.videoType = videoType;
        }

        return item;
      });

    setContentItems(items);
    setCurrentContentIndex(0);
  }, [exercise]);

  // Don't render if not open or no exercise data
  if (!isOpen || !exercise) {
    return null;
  }

  const exerciseData = exercise as any;
  const exerciseName = exercise.exerciseName || '';
  const marathonExerciseName = exercise.marathonExerciseName || '';
  let description = exerciseData.exerciseDescription || exercise.description || '';
  
  // Normalize emoji in description - fix multiple character emoji display bug
  if (description) {
    description = description.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}](?:\u{FE0F}|\u{200D}[\u{1F3FB}-\u{1F3FF}]?)?/gu, (match: string) => {
      // Remove variation selectors and zero-width joiners that cause duplication
      return match.replace(/[\uFE0F\u200D]/g, '');
    });
  }
  
  const type = exercise.type || '';
  const duration = exercise.duration || 0;

  const availableContent = contentItems.filter(item => !item.loadError);
  const currentContent = availableContent[currentContentIndex];

  const handlePrev = () => {
    setCurrentContentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentContentIndex((prev) => Math.min(availableContent.length - 1, prev + 1));
  };

  const handleContentError = (index: number) => {
    setContentItems(prev => prev.map((item, i) => 
      i === index ? { ...item, loadError: true } : item
    ));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm md:p-4">
      <div className="relative w-full h-full md:max-w-3xl md:max-h-[90vh] md:h-auto bg-white md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Compact Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 md:p-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-2">
              <h2 className="text-lg md:text-xl font-bold mb-0.5">{exerciseName}</h2>
              {marathonExerciseName && (
                <p className="text-sm text-purple-100">{marathonExerciseName}</p>
              )}
              
              {/* Exercise Meta */}
              {(type || duration > 0) && (
                <div className="flex items-center space-x-2 mt-2 text-xs">
                  {type && (
                    <span className="flex items-center space-x-1 bg-white/20 px-2 py-0.5 rounded-full">
                      <span>{type === 'Video' ? 'Видео' : type === 'Reading' ? 'Теория' : 'Практика'}</span>
                    </span>
                  )}
                  
                  {duration > 0 && (
                    <span className="flex items-center space-x-1 bg-white/20 px-2 py-0.5 rounded-full">
                      <span>{Math.floor(duration / 60)} мин</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Checkbox Button */}
            {onCheckboxChange && (
              <button
                onClick={() => onCheckboxChange(!isDone)}
                className="flex-shrink-0 w-6 h-6 rounded-md border-2 border-white/50 hover:border-white transition-colors flex items-center justify-center mr-2"
                aria-label={isDone ? 'Отметить как невыполненное' : 'Отметить как выполненное'}
              >
                {isDone && (
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Закрыть"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Video/Image Carousel */}
          {availableContent.length > 0 && (
            <div className="flex flex-col items-center bg-purple-50 py-4">
              
              {/* Video/Image Container - Max 400px width, flexible height */}
              <div className="w-full max-w-[400px] px-4 md:px-0">
                <div className="relative w-full">
                  {/* Hint for images (GIFs) - overlaid on content */}
                  {currentContent?.type === 'image' && (
                    <div className="absolute top-4 left-4 right-4 z-10">
                      <div className="bg-purple-600/95 text-white text-sm px-4 py-2.5 rounded-lg text-center shadow-lg">
                        <p className="font-semibold mb-1">💡 Основное движение</p>
                        <p className="text-xs opacity-90">
                          Ознакомьтесь с видео инструкцией{availableContent.length > 1 && ', нажмите на стрелочку вправо'}
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Current Content */}
                  {currentContent && (
                    <div key={currentContent.id} className="w-full">
                      {currentContent.type === 'video' ? (
                        currentContent.videoType === 'video' ? (
                          <video
                            src={currentContent.embedUrl}
                            controls
                            controlsList="nodownload nofullscreen noremoteplayback"
                            disablePictureInPicture
                            className="w-full aspect-square object-contain bg-white rounded-lg"
                            playsInline
                            onError={() => handleContentError(currentContentIndex)}
                            onContextMenu={(e) => e.preventDefault()}
                          />
                        ) : (
                          <div className="w-full aspect-square bg-white rounded-lg overflow-hidden relative">
                            <iframe
                              src={currentContent.embedUrl}
                              className="w-full h-full"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              onError={() => handleContentError(currentContentIndex)}
                            />
                            {/* Targeted overlays to block only clickable branding elements */}
                            {/* Top bar overlay - blocks title/channel name (first 20% of height) */}
                            <div 
                              className="absolute top-0 left-0 right-0 pointer-events-auto bg-transparent"
                              style={{ 
                                height: '20%',
                                zIndex: 10
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            
                            {/* Provider-specific logo overlays */}
                            {currentContent.embedUrl?.includes('youtube.com') ? (
                              /* YouTube logo overlay - rectangular, offset from right edge to avoid fullscreen button */
                              <div 
                                className="absolute bottom-0 pointer-events-auto bg-transparent"
                                style={{ 
                                  right: '48px', // Leave space for fullscreen button (mobile: 48px, desktop: 48px)
                                  width: '100px', // Cover YouTube logo width
                                  height: '48px', // Cover logo height in control bar
                                  zIndex: 10
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : currentContent.embedUrl?.includes('vimeo.com') ? (
                              /* Vimeo logo overlay - square in bottom-right corner */
                              <div 
                                className="absolute bottom-0 right-0 pointer-events-auto bg-transparent"
                                style={{ 
                                  width: '80px',
                                  height: '80px',
                                  zIndex: 10
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : null}
                            <style jsx global>{`
                              /* Hide Vimeo overlay elements */
                              .vp-sidedock,
                              .vp-title,
                              .vp-byline,
                              .vp-portrait,
                              .vp-badge,
                              .vp-sidedock-button {
                                display: none !important;
                                opacity: 0 !important;
                                visibility: hidden !important;
                              }
                              
                              /* Hide YouTube overlay elements */
                              iframe[src*="youtube.com"] .ytp-title,
                              iframe[src*="youtube.com"] .ytp-chrome-top,
                              iframe[src*="youtube.com"] .ytp-show-cards-title,
                              iframe[src*="youtube.com"] .ytp-watermark {
                                display: none !important;
                                pointer-events: none !important;
                              }
                            `}</style>
                          </div>
                        )
                      ) : (
                        <div className="w-full aspect-square flex items-center justify-center bg-white rounded-lg p-4">
                          <div className="relative w-1/2 h-1/2">
                            <Image
                              src={currentContent.contentPath}
                              alt={exerciseName}
                              fill
                              className="object-contain"
                              onError={() => handleContentError(currentContentIndex)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Navigation Arrows */}
                  {availableContent.length > 1 && (
                  <>
                    {currentContentIndex > 0 && (
                      <button
                        onClick={handlePrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all z-10"
                        aria-label="Предыдущее"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                    )}
                    
                    {currentContentIndex < availableContent.length - 1 && (
                      <button
                        onClick={handleNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all z-10"
                        aria-label="Следующее"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}

                    {/* Carousel Indicators */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
                      {availableContent.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentContentIndex(index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === currentContentIndex 
                              ? 'bg-white w-6' 
                              : 'bg-white/50 hover:bg-white/75'
                          }`}
                          aria-label={`Перейти к ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {description && (
            <div className="p-4 md:p-6">
              <div 
                className="prose prose-sm max-w-none
                  prose-headings:text-purple-900 prose-headings:font-bold
                  prose-p:text-gray-700 prose-p:leading-relaxed
                  prose-a:text-purple-600 prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-gray-900 prose-strong:font-semibold
                  prose-ul:list-disc prose-ol:list-decimal
                  prose-li:text-gray-700 prose-li:my-1
                  prose-blockquote:border-l-4 prose-blockquote:border-purple-400 prose-blockquote:pl-4 prose-blockquote:italic"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </div>
          )}

          {/* Comments Section - Collapsible */}
          <div className="border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setCommentsExpanded(!commentsExpanded)}
              className="w-full px-4 md:px-6 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-base font-semibold text-gray-900">Комментарии</span>
                <span className="text-sm text-gray-500">(скоро)</span>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-500 transition-transform ${commentsExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {commentsExpanded && (
              <div className="px-4 md:px-6 pb-6 pt-2">
                <div className="text-sm text-gray-500 text-center py-8 bg-white rounded-lg border border-gray-200">
                  📝 Раздел комментариев будет доступен в следующей версии
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 px-4 md:px-6 py-3 bg-white">
          <button
            onClick={onClose}
            className="w-full px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
