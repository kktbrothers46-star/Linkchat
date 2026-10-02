import React from 'react';
import { Download, MoreVertical, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ImageViewerScreen: React.FC = () => {
  const { activeMediaView, closeMediaViewer } = useApp();

  const currentImage = activeMediaView?.url;

  return (
    <div className="relative flex flex-col justify-between w-full h-full min-h-[640px] bg-black text-white select-none">
      {/* Top Header with Dark Style */}
      <div className="z-20 bg-gradient-to-b from-black/80 to-transparent pt-3 pb-4 px-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={closeMediaViewer}
            aria-label="Close image viewer"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>

          <div className="flex items-center space-x-2">
            {currentImage && (
              <a
                href={currentImage}
                download="linkchat_image.jpg"
                aria-label="Download image"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <Download className="w-5 h-5" />
              </a>
            )}
            <button
              type="button"
              onClick={() => {}}
              aria-label="Media details"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Center Main Image */}
      <div className="flex-1 flex items-center justify-center p-4">
        {currentImage ? (
          <img
            src={currentImage}
            alt="Full screen view"
            className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl transition-all duration-200"
          />
        ) : (
          <div className="text-white/60 text-sm">No image available</div>
        )}
      </div>

      {/* Bottom spacer */}
      <div className="z-20 p-4 text-center text-xs text-white/50">
        LinkChat Protected Media
      </div>
    </div>
  );
};
