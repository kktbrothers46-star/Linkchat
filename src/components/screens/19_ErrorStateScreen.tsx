import React, { useState } from 'react';
import { RefreshCw, Wifi, WifiOff, X } from 'lucide-react';
import { HeaderBar } from '../common/HeaderBar';
import { useApp } from '../../context/AppContext';

export const ErrorStateScreen: React.FC = () => {
  const { toggleOffline, goBack, isOffline } = useApp();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      setRetrying(false);
      if (isOffline) {
        toggleOffline(); // Turn back online
      }
      goBack();
    }, 600);
  };

  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[640px] bg-[#F5F5EC] select-none">
      {/* Top Header */}
      <HeaderBar
        title=""
        showBack
        onBack={goBack}
        showDots={false}
      />

      {/* Main Error Illustration and Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 my-auto max-w-xs mx-auto">
        {/* Circular Wifi with Red Offline Cross badge */}
        <div className="relative w-28 h-28 rounded-full bg-white border border-[#E4E5D9] shadow-xs flex items-center justify-center mb-6">
          <Wifi className="w-12 h-12 text-[#77796F] stroke-[1.5]" />
          <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-[#EF5350] text-white flex items-center justify-center border-2 border-white shadow-xs">
            <X className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#20221D]">
          No internet connection
        </h1>
        <p className="text-sm text-[#77796F] mt-2 leading-relaxed">
          Please check your connection and try again.
        </p>

        <p className="text-xs text-[#77796F]/80 mt-4 px-2">
          Your messages remain safe and will sync automatically once connected.
        </p>

        {/* Retry Button */}
        <div className="w-full mt-8">
          <button
            type="button"
            disabled={retrying}
            onClick={handleRetry}
            className="w-full bg-[#CDEB5A] hover:bg-[#bfe043] active:scale-[0.98] text-[#20221D] font-bold text-base py-4 rounded-full shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#BDE040]/50"
          >
            {retrying ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <span>Retry</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
