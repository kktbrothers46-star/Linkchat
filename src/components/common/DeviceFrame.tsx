import React, { useState } from 'react';
import { Maximize2, Minimize2, Smartphone, Monitor } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DeviceFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeScreen } = useApp();
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'responsive'>('mobile');

  return (
    <div className="min-h-screen w-full bg-[#E8E8DC] text-[#20221D] flex flex-col items-center justify-center py-0 sm:py-6 px-0 sm:px-4">
      {/* Top Desktop Helper Bar (visible on sm+ screens) */}
      <div className="hidden sm:flex items-center justify-between w-full max-w-[440px] mb-3 px-3">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#CDEB5A] border border-[#20221D]" />
          <span className="text-xs font-bold text-[#20221D] tracking-tight">LinkChat</span>
          <span className="text-[11px] text-[#77796F] font-mono">
            {activeScreen.replace('_', ' ')}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 bg-white/60 backdrop-blur-xs p-1 rounded-full border border-[#D5D7C7]">
          <button
            type="button"
            onClick={() => setDeviceMode('mobile')}
            aria-label="Mobile preview mode"
            className={`p-1.5 rounded-full text-xs transition-colors ${
              deviceMode === 'mobile' ? 'bg-[#CDEB5A] text-[#20221D]' : 'text-[#77796F]'
            }`}
            title="Mobile phone frame (412px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDeviceMode('responsive')}
            aria-label="Expanded preview mode"
            className={`p-1.5 rounded-full text-xs transition-colors ${
              deviceMode === 'responsive' ? 'bg-[#CDEB5A] text-[#20221D]' : 'text-[#77796F]'
            }`}
            title="Expanded desktop view"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div
        className={`w-full transition-all duration-300 flex flex-col ${
          deviceMode === 'mobile'
            ? 'sm:max-w-[420px] sm:h-[844px] sm:rounded-[44px] sm:shadow-2xl sm:border-[8px] sm:border-[#1E201B] sm:ring-1 sm:ring-black/20 overflow-hidden'
            : 'max-w-md sm:max-w-2xl sm:h-[860px] sm:rounded-3xl sm:shadow-xl sm:border border-[#D5D7C7] overflow-hidden'
        } h-screen bg-[#F5F5EC] relative`}
      >
        {children}
      </div>
    </div>
  );
};
