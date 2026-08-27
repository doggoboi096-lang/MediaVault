import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { MediaItem } from '../types';

interface SmartMediaProps {
  item?: MediaItem | null;
  className?: string;
  useFullUrl?: boolean;
}





export const SmartMedia: React.FC<SmartMediaProps> = ({ item, className = '', useFullUrl = false }) => {
  if (!item) {
    return (
      <div className={`flex items-center justify-center bg-zinc-800 text-zinc-500 ${className}`}>
        <ImageIcon className="w-8 h-8" />
      </div>
    );
  }

  if (item.type === 'video') {
    const videoSrc = item.url ? (item.url.includes('#') ? item.url : `${item.url}#t=0.1`) : '';
    return (
      <video
        src={videoSrc}
        poster={item.previewUrl || item.thumbnailUrl}
        preload="metadata"
        className={className}
        muted
        playsInline
      />
    );
  }

  const orientationVal = (item as any).orientation || (item as any).exifData?.Orientation || 1;
  let rotationStyle = {};
  if (orientationVal === 6) rotationStyle = { transform: 'rotate(90deg)' };
  else if (orientationVal === 8) rotationStyle = { transform: 'rotate(-90deg)' };
  else if (orientationVal === 3) rotationStyle = { transform: 'rotate(180deg)' };

  return (
    <img
      src={item.previewUrl || item.url}
      alt={item.title || item.filename || 'media'}
      loading="lazy"
      className={className}
      style={{ ...rotationStyle, objectFit: 'contain' }}
    />
  );
};