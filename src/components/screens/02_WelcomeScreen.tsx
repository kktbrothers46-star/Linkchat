import React from 'react';
import { Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const WelcomeScreen: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div className="flex flex-col items-center justify-between w-full h-full min-h-[640px] p-6 bg-[#F5F5EC] select-none">
      <div className="w-full pt-3" />

      {/* Center Illustration Area */}
      <div className="w-full flex-1 flex flex-col items-center justify-center my-auto max-w-xs">
        <div className="relative w-64 h-64 flex items-center justify-center mb-6">
          {/* Soft backdrop circle */}
          <div className="absolute inset-0 bg-[#E8EAD9] rounded-full opacity-80" />

          {/* Floating Speech Bubbles */}
          <div className="absolute top-4 right-4 bg-[#CDEB5A] p-3 rounded-2xl rounded-tr-xs shadow-xs animate-bounce duration-1000">
            <div className="flex space-x-1">
              <span className="w-1.5 h-1.5 bg-[#20221D] rounded-full" />
              <span className="w-1.5 h-1.5 bg-[#20221D] rounded-full" />
              <span className="w-1.5 h-1.5 bg-[#20221D] rounded-full" />
            </div>
          </div>

          <div className="absolute top-16 left-3 bg-white p-2.5 rounded-2xl rounded-tl-xs shadow-xs border border-[#E4E5D9]">
            <Sparkles className="w-4 h-4 text-[#CDEB5A]" />
          </div>

          {/* Clean Vector Character Graphic */}
          <svg className="w-48 h-48 z-10" viewBox="0 0 200 200" fill="none">
            {/* Person sitting with phone */}
            <circle cx="100" cy="70" r="28" fill="#F1C27D" />
            {/* Hair */}
            <path
              d="M75 66C75 48 85 40 100 40C115 40 125 48 125 66C125 68 122 70 120 68C115 62 108 58 100 58C92 58 85 62 80 68C78 70 75 68 75 66Z"
              fill="#20221D"
            />
            {/* Torso & Green Shirt */}
            <path
              d="M65 145C65 110 80 98 100 98C120 98 135 110 135 145C135 160 120 170 100 170C80 170 65 160 65 145Z"
              fill="#9DC035"
            />
            {/* Arms holding phone */}
            <path
              d="M75 120L95 135L110 128"
              stroke="#F1C27D"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Smartphone */}
            <rect x="105" y="115" width="22" height="34" rx="4" fill="#20221D" />
            <rect x="108" y="119" width="16" height="24" rx="2" fill="#CDEB5A" />
            {/* Legs */}
            <path
              d="M75 160C70 175 60 185 45 190M125 160C130 175 140 185 155 190"
              stroke="#20221D"
              strokeWidth="12"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Text Content */}
        <h2 className="text-2xl font-bold tracking-tight text-[#20221D] text-center">
          Stay Connected Easily
        </h2>
        <p className="text-sm text-[#77796F] text-center mt-3 leading-relaxed px-4">
          Send messages, photos and videos privately with one simple tap.
        </p>

        {/* Carousel Pagination Dots */}
        <div className="flex items-center space-x-2 mt-6">
          <div className="w-6 h-2 bg-[#CDEB5A] rounded-full" />
          <div className="w-2 h-2 bg-[#DEDFD3] rounded-full" />
          <div className="w-2 h-2 bg-[#DEDFD3] rounded-full" />
        </div>
      </div>

      {/* Primary CTA */}
      <div className="w-full max-w-sm pb-6">
        <button
          type="button"
          onClick={() => navigateTo('03_ACCOUNT_TYPE')}
          className="w-full bg-[#CDEB5A] hover:bg-[#bfe043] active:scale-[0.98] text-[#20221D] font-bold text-base py-4 rounded-full shadow-xs transition-all flex items-center justify-center"
        >
          Get Started
        </button>
      </div>
    </div>
  );
};
