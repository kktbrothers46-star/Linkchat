import React from 'react';
import { Home, Users, Send, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BottomNav: React.FC = () => {
  const { activeScreen, navigateTo, role } = useApp();

  if (role !== 'owner') return null;

  const isHome = activeScreen === '05_OWNER_HOME';
  const isMembers = activeScreen === '06_MEMBERS' || activeScreen === '07_ADD_INVITE';
  const isBroadcasts =
    activeScreen === '08_BROADCAST_COMPOSER' ||
    activeScreen === '09_BROADCAST_PREVIEW' ||
    activeScreen === '10_BROADCAST_DETAILS';
  const isProfile = activeScreen === '17_MEMBER_PROFILE';

  return (
    <nav className="w-full z-30 flex-none bg-[#FFFFFF] border-t border-[#E4E5D9] px-4 py-2 flex items-center justify-around shadow-sm select-none">
      <button
        onClick={() => navigateTo('05_OWNER_HOME')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
          isHome ? 'text-[#20221D]' : 'text-[#77796F] hover:text-[#20221D]'
        }`}
      >
        <div
          className={`p-1 rounded-full transition-colors ${
            isHome ? 'bg-[#CDEB5A] text-[#20221D]' : ''
          }`}
        >
          <Home className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className={`text-[11px] font-semibold mt-0.5 ${isHome ? 'text-[#20221D]' : 'text-[#77796F]'}`}>
          Home
        </span>
      </button>

      <button
        onClick={() => navigateTo('06_MEMBERS')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
          isMembers ? 'text-[#20221D]' : 'text-[#77796F] hover:text-[#20221D]'
        }`}
      >
        <div
          className={`p-1 rounded-full transition-colors ${
            isMembers ? 'bg-[#CDEB5A] text-[#20221D]' : ''
          }`}
        >
          <Users className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className={`text-[11px] font-semibold mt-0.5 ${isMembers ? 'text-[#20221D]' : 'text-[#77796F]'}`}>
          Members
        </span>
      </button>

      <button
        onClick={() => navigateTo('08_BROADCAST_COMPOSER')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
          isBroadcasts ? 'text-[#20221D]' : 'text-[#77796F] hover:text-[#20221D]'
        }`}
      >
        <div
          className={`p-1 rounded-full transition-colors ${
            isBroadcasts ? 'bg-[#CDEB5A] text-[#20221D]' : ''
          }`}
        >
          <Send className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className={`text-[11px] font-semibold mt-0.5 ${isBroadcasts ? 'text-[#20221D]' : 'text-[#77796F]'}`}>
          Broadcasts
        </span>
      </button>

      <button
        onClick={() => navigateTo('17_MEMBER_PROFILE')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
          isProfile ? 'text-[#20221D]' : 'text-[#77796F] hover:text-[#20221D]'
        }`}
      >
        <div
          className={`p-1 rounded-full transition-colors ${
            isProfile ? 'bg-[#CDEB5A] text-[#20221D]' : ''
          }`}
        >
          <User className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className={`text-[11px] font-semibold mt-0.5 ${isProfile ? 'text-[#20221D]' : 'text-[#77796F]'}`}>
          Profile
        </span>
      </button>
    </nav>
  );
};
