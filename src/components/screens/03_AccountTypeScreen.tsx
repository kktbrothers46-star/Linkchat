import React from 'react';
import { ChevronRight, Crown, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AccountTypeScreen: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[640px] p-6 bg-[#F5F5EC] select-none">
      <div className="w-full pt-3" />

      {/* Content Area */}
      <div className="w-full max-w-sm mx-auto my-auto flex flex-col pt-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#20221D] leading-tight mb-8">
          How will you use<br />LinkChat?
        </h1>

        {/* Option 1: I'm the Owner */}
        <button
          type="button"
          onClick={() => navigateTo('04_OWNER_LOGIN')}
          className="w-full bg-white hover:bg-[#FAFBF6] active:scale-[0.98] rounded-3xl p-5 border border-[#E4E5D9] shadow-xs flex items-center justify-between text-left transition-all mb-4 group cursor-pointer"
        >
          <div className="flex items-center space-x-4 min-w-0">
            <div className="w-12 h-12 rounded-full bg-[#CDEB5A] flex items-center justify-center text-[#20221D] flex-none shadow-xs group-hover:scale-105 transition-transform">
              <Crown className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#20221D] tracking-tight">
                I'm the Owner
              </h2>
              <p className="text-xs text-[#77796F] mt-0.5 truncate">
                Send messages to your members
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#77796F] flex-none ml-2 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Option 2: I'm a Member */}
        <button
          type="button"
          onClick={() => navigateTo('11_MEMBER_REGISTRATION')}
          className="w-full bg-white hover:bg-[#FAFBF6] active:scale-[0.98] rounded-3xl p-5 border border-[#E4E5D9] shadow-xs flex items-center justify-between text-left transition-all group cursor-pointer"
        >
          <div className="flex items-center space-x-4 min-w-0">
            <div className="w-12 h-12 rounded-full bg-[#CDEB5A] flex items-center justify-center text-[#20221D] flex-none shadow-xs group-hover:scale-105 transition-transform">
              <User className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#20221D] tracking-tight">
                I'm a Member
              </h2>
              <p className="text-xs text-[#77796F] mt-0.5 truncate">
                Receive messages from the owner
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#77796F] flex-none ml-2 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-sm mx-auto pb-6 text-center">
        <p className="text-xs text-[#77796F]">
          Private broadcast messaging • No public profiles • No groups
        </p>
      </div>
    </div>
  );
};
