/**
 * Day Description Component
 * Displays day description with embedded videos, images, and rich HTML content
 * Fixed height with internal scrolling
 */

import { useAppSelector } from '@/store/hooks';
import { selectMarathonDay } from '@/store/modules/day/selectors';
import { useMemo } from 'react';

// Video URL patterns
const YOUTUBE_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
const VIMEO_REGEX = /vimeo\.com\/(\d+)/;
const VK_VIDEO_REGEX = /vk\.com\/video(-?\d+_\d+)/;

interface VideoEmbed {
  type: 'youtube' | 'vimeo' | 'vk' | 'mp4' | 'telegram';
  url: string;
  id?: string;
}

function extractVideos(html: string): VideoEmbed[] {
  const videos: VideoEmbed[] = [];
  
  // Extract YouTube videos
  const youtubeMatches = html.matchAll(new RegExp(YOUTUBE_REGEX, 'g'));
  for (const match of youtubeMatches) {
    const origin = typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : 'https://seplitza.github.io';
    videos.push({
      type: 'youtube',
      url: `https://www.youtube.com/embed/${match[1]}?modestbranding=1&rel=0&showinfo=0&fs=1&controls=1&disablekb=0&iv_load_policy=3&cc_load_policy=0&playsinline=1&origin=${origin}`,
      id: match[1],
    });
  }
  
  // Extract Vimeo videos
  const vimeoMatches = html.matchAll(new RegExp(VIMEO_REGEX, 'g'));
  for (const match of vimeoMatches) {
    videos.push({
      type: 'vimeo',
      url: `https://player.vimeo.com/video/${match[1]}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&dnt=1&controls=1&transparent=0`,
      id: match[1],
    });
  }
  
  // Extract VK videos
  const vkMatches = html.matchAll(new RegExp(VK_VIDEO_REGEX, 'g'));
  for (const match of vkMatches) {
    videos.push({
      type: 'vk',
      url: `https://vk.com/video_ext.php?oid=${match[1].split('_')[0]}&id=${match[1].split('_')[1]}`,
      id: match[1],
    });
  }
  
  // Extract direct MP4 links
  const mp4Matches = html.matchAll(/(?:src|href)=["']([^"']+\.mp4)["']/g);
  for (const match of mp4Matches) {
    videos.push({
      type: 'mp4',
      url: match[1],
    });
  }
  
  // Extract Telegram videos (t.me links)
  const telegramMatches = html.matchAll(/(?:src|href)=["'](https?:\/\/t\.me\/[^"']+)["']/g);
  for (const match of telegramMatches) {
    videos.push({
      type: 'telegram',
      url: match[1],
    });
  }
  
  return videos;
}

function VideoPlayer({ video }: { video: VideoEmbed }) {
  switch (video.type) {
    case 'youtube':
    case 'vimeo':
    case 'vk':
      return (
        <div className="flex justify-center mb-4">
          <div className="w-full max-w-[400px] aspect-square relative overflow-hidden rounded-none md:rounded-lg">
            <iframe
              src={video.url}
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            {/* Overlay to block clicks on top portion but allow controls */}
            <div 
              className="absolute top-0 left-0 right-0"
              style={{ 
                height: 'calc(100% - 60px)',
                pointerEvents: 'none',
                zIndex: 1
              }}
            />
            <style jsx>{`
              iframe {
                pointer-events: auto;
              }
              /* Hide Vimeo overlays */
              :global(.vp-sidedock),
              :global(.vp-title),
              :global(.vp-byline),
              :global(.vp-portrait),
              :global(.vp-badge) {
                display: none !important;
              }
              /* Block YouTube overlay clicks */
              :global(iframe[src*="youtube.com"]) {
                position: relative;
              }
            `}</style>
          </div>
        </div>
      );
    
    case 'mp4':
      return (
        <div className="flex justify-center mb-4">
          <video
            src={video.url}
            controls
            className="w-full max-w-[400px] aspect-square object-contain rounded-none md:rounded-lg"
          />
        </div>
      );
    
    case 'telegram':
      return (
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-600 mb-2">Видео из Telegram:</p>
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#F79700] hover:underline break-all"
          >
            {video.url}
          </a>
        </div>
      );
    
    default:
      return null;
  }
}

export default function DayDescription() {
  const marathonDay = useAppSelector(selectMarathonDay);

  const { videos, cleanedHtml } = useMemo(() => {
    if (!marathonDay?.description) {
      return { videos: [], cleanedHtml: '' };
    }

    const extractedVideos = extractVideos(marathonDay.description);
    
    // Remove Froala watermark and clean HTML
    let cleaned = marathonDay.description
      .replace(/<a[^>]*href=".*?froala.*?"[^>]*>.*?<\/a>/gi, '')
      .replace(/<div[^>]*data-f-id[^>]*>.*?<\/div>/gi, '')
      .replace(/Powered by Froala Editor/gi, '');

    return {
      videos: extractedVideos,
      cleanedHtml: cleaned,
    };
  }, [marathonDay?.description]);

  if (!marathonDay) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* Fixed height container with scroll */}
      <div 
        className="overflow-y-auto pr-2"
        style={{ 
          height: '400px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E0 #F7FAFC'
        }}
      >
        {/* Videos */}
        {videos.length > 0 && (
          <div className="mb-6 space-y-4">
            {videos.map((video, index) => (
              <VideoPlayer key={`${video.type}-${video.id || index}`} video={video} />
            ))}
          </div>
        )}

        {/* HTML Content */}
        <div 
          className="prose prose-sm max-w-none
            prose-headings:text-purple-900 prose-headings:font-bold
            prose-p:text-gray-700 prose-p:leading-relaxed
            prose-a:text-purple-600 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-gray-900 prose-strong:font-semibold
            prose-ul:list-disc prose-ol:list-decimal
            prose-li:text-gray-700 prose-li:my-1
            prose-img:rounded-lg prose-img:shadow-md
            prose-blockquote:border-l-4 prose-blockquote:border-purple-400 prose-blockquote:pl-4 prose-blockquote:italic"
          dangerouslySetInnerHTML={{ __html: cleanedHtml }}
        />
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        div::-webkit-scrollbar {
          width: 8px;
        }
        div::-webkit-scrollbar-track {
          background: #F7FAFC;
          border-radius: 4px;
        }
        div::-webkit-scrollbar-thumb {
          background: #CBD5E0;
          border-radius: 4px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #A0AEC0;
        }
      `}</style>
    </div>
  );
}
