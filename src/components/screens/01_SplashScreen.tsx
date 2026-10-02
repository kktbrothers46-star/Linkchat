import React, { useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SplashScreen: React.FC = () => {
  const { navigateTo } = useApp();

  const handleNext = () => {
    try {
      const savedRole = localStorage.getItem('linkchat_role');
      const savedOwnerRaw = localStorage.getItem('linkchat_owner');
      const savedMemberId = localStorage.getItem('linkchat_member_id');
      const savedLoggedIn = localStorage.getItem('linkchat_logged_in') === 'true';

      // 1. Check if an Owner is logged in
      let hasValidOwner = false;
      if (savedOwnerRaw) {
        try {
          const parsed = JSON.parse(savedOwnerRaw);
          if (parsed && (parsed.id || parsed.phone) && parsed.role === 'owner') {
            hasValidOwner = true;
          }
        } catch {}
      }

      if (savedRole === 'owner' && (hasValidOwner || savedLoggedIn)) {
        navigateTo('05_OWNER_HOME');
        return;
      }

      // 2. Check if a Member is logged in
      if (savedRole === 'member' && (savedMemberId || savedLoggedIn)) {
        navigateTo('13_MEMBER_HOME');
        return;
      }

      // 3. Fallback: if linkchat_owner exists, restore Owner dashboard
      if (hasValidOwner) {
        localStorage.setItem('linkchat_role', 'owner');
        localStorage.setItem('linkchat_logged_in', 'true');
        navigateTo('05_OWNER_HOME');
        return;
      }
    } catch (e) {
      console.warn('Session restoration notice:', e);
    }

    // 4. If neither role is actively logged in, navigate to Welcome
    navigateTo('02_WELCOME');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleNext();
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      onClick={handleNext}
      className="relative flex flex-col items-center justify-between w-full h-full min-h-[640px] p-6 bg-[#F5F5EC] overflow-hidden cursor-pointer select-none"
    >
      {/* Decorative Botanical Leaf Silhouettes */}
      <svg
        className="absolute top-0 right-0 w-52 h-52 text-[#E2E6D5] -mr-12 -mt-12 opacity-60 pointer-events-none"
        viewBox="0 0 200 200"
        fill="currentColor"
      >
        <path d="M40 0C60 40 100 80 180 90C120 120 70 170 0 200C20 140 30 80 40 0Z" />
      </svg>
      <svg
        className="absolute bottom-0 left-0 w-64 h-64 text-[#E2E6D5] -ml-16 -mb-16 opacity-75 pointer-events-none"
        viewBox="0 0 200 200"
        fill="currentColor"
      >
        <path d="M0 80C50 60 120 70 180 160C110 180 60 150 0 80Z" />
        <path d="M20 180C70 130 140 110 200 130C130 180 80 195 20 180Z" />
      </svg>

      {/* Top spacing */}
      <div className="w-full pt-4" />

      {/* Center Logo & Title */}
      <div className="my-auto flex flex-col items-center text-center z-10">
        {/* Rounded green icon badge */}
        <div className="w-20 h-20 rounded-[26px] bg-[#CDEB5A] flex items-center justify-center shadow-xs mb-6 border border-[#BDE040]/30 transition-transform active:scale-95">
          <div className="w-11 h-11 bg-[#20221D] rounded-2xl flex items-center justify-center text-[#CDEB5A]">
            <MessageSquare className="w-6 h-6 fill-current stroke-none" />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-[#20221D]">LinkChat</h1>
        <p className="text-sm font-medium text-[#77796F] mt-2">Private Messages</p>
        <p className="text-sm font-medium text-[#77796F]">Made Simple</p>

        {/* Subtle pill loading indicator */}
        <div className="w-16 h-1.5 bg-[#E4E5D9] rounded-full mt-10 overflow-hidden">
          <div className="w-full h-full bg-[#CDEB5A] rounded-full animate-pulse" />
        </div>
      </div>

      {/* Subtle tap prompt */}
      <div className="pb-4 text-center z-10">
        <span className="text-xs text-[#77796F]/70 font-medium">Tap anywhere to continue</span>
      </div>
    </div>
  );
};
