import React, { useRef, useState } from 'react';
import { Maximize, MoreVertical, Pause, Play, Volume2, VolumeX, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const VideoViewerScreen: React.FC = () => {
  const { activeMediaView, closeMediaViewer } = useApp();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoSrc = activeMediaView?.url;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <div className="relative flex flex-col justify-between w-full h-full min-h-[640px] bg-black text-white select-none">
      {/* Top Controls Overlay */}
      <div className="z-20 bg-gradient-to-b from-black/80 to-transparent pt-3 pb-4 px-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={closeMediaViewer}
            aria-label="Close video player"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              aria-label="More options"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Video View with Center Play/Pause Button */}
      <div className="relative flex-1 flex items-center justify-center cursor-pointer" onClick={togglePlay}>
        {videoSrc ? (
          <>
            <video
              ref={videoRef}
              src={videoSrc}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              muted={isMuted}
              playsInline
              className="w-full max-h-[75vh] object-cover"
            />

            {/* Center Play Button Overlay */}
            <button
              type="button"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className={`absolute w-16 h-16 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white shadow-2xl transition-all ${
                isPlaying ? 'opacity-0 hover:opacity-80' : 'opacity-100 scale-105'
              }`}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 fill-current" />
              ) : (
                <Play className="w-8 h-8 fill-current ml-1" />
              )}
            </button>
          </>
        ) : (
          <div className="text-white/60 text-sm">No video source available</div>
        )}
      </div>

      {/* Bottom Video Controls */}
      {videoSrc && (
        <div className="z-20 bg-gradient-to-t from-black/90 to-transparent p-5 space-y-2">
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-[#CDEB5A] rounded-full transition-all"
              style={{ width: `${(currentTime / Math.max(1, duration)) * 100}%` }}
            />
          </div>

          {/* Time, Volume & Fullscreen row */}
          <div className="flex items-center justify-between text-xs text-white/90 pt-1">
            <span className="font-mono font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted((prev) => !prev);
                }}
                aria-label="Toggle mute"
                className="p-1 hover:text-[#CDEB5A] transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  videoRef.current?.requestFullscreen?.();
                }}
                aria-label="Fullscreen"
                className="p-1 hover:text-[#CDEB5A] transition-colors"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
