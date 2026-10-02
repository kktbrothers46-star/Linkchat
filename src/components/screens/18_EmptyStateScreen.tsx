import React from 'react';
import { ArrowLeft, MessageSquare, Send, Users } from 'lucide-react';
import { HeaderBar } from '../common/HeaderBar';
import { useApp } from '../../context/AppContext';

export const EmptyStateScreen: React.FC = () => {
  const { navigateTo, role, goBack } = useApp();

  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[640px] bg-[#F5F5EC] select-none">
      {/* Top Header */}
      <HeaderBar
        title=""
        showBack
        onBack={goBack}
        showDots={false}
      />

      {/* Center Empty State Graphic and Content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 my-auto max-w-xs mx-auto">
        {/* Soft Organic Speech Bubbles Graphic */}
        <div className="relative w-44 h-44 flex items-center justify-center mb-6">
          <div className="absolute inset-0 bg-[#E8EAD9] rounded-full opacity-60 scale-90" />
          
          {/* Main Bubble */}
          <div className="w-24 h-20 bg-[#E2F0A3] rounded-3xl rounded-br-xs flex items-center justify-center shadow-xs z-10">
            <div className="flex space-x-1.5">
              <span className="w-2 h-2 bg-[#20221D]/70 rounded-full" />
              <span className="w-2 h-2 bg-[#20221D]/70 rounded-full" />
              <span className="w-2 h-2 bg-[#20221D]/70 rounded-full" />
            </div>
          </div>

          {/* Overlapping Small Bubble */}
          <div className="absolute bottom-4 right-4 w-16 h-14 bg-white border border-[#E4E5D9] rounded-2xl rounded-tl-xs flex items-center justify-center shadow-2xs z-20">
            <div className="flex space-x-1">
              <span className="w-1.5 h-1.5 bg-[#77796F] rounded-full" />
              <span className="w-1.5 h-1.5 bg-[#77796F] rounded-full" />
            </div>
          </div>
        </div>

        <h1 className="text-xl font-bold tracking-tight text-[#20221D]">
          No messages yet
        </h1>
        <p className="text-sm text-[#77796F] mt-2 leading-relaxed">
          {role === 'owner'
            ? 'You have not sent any broadcasts or messages to members yet.'
            : 'You will see private messages from the owner here.'}
        </p>

        {/* Action button */}
        <div className="w-full mt-8">
          {role === 'owner' ? (
            <button
              type="button"
              onClick={() => navigateTo('08_BROADCAST_COMPOSER')}
              className="w-full bg-[#CDEB5A] hover:bg-[#bfe043] active:scale-[0.98] text-[#20221D] font-bold text-sm py-3.5 rounded-full shadow-xs transition-all flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4 stroke-[2.2]" />
              <span>Send First Broadcast</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigateTo('13_MEMBER_HOME')}
              className="w-full bg-[#CDEB5A] hover:bg-[#bfe043] active:scale-[0.98] text-[#20221D] font-bold text-sm py-3.5 rounded-full shadow-xs transition-all flex items-center justify-center"
            >
              Back to Messages
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
