import React from 'react';
import { Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const RegistrationSuccessScreen: React.FC = () => {
  const { navigateTo, currentMember, ownerUser } = useApp();

  return (
    <div className="flex flex-col items-center justify-between w-full h-full min-h-[640px] p-6 bg-[#F5F5EC] select-none">
      <div className="w-full pt-3" />

      {/* Center Success Badge & Text */}
      <div className="w-full max-w-sm flex-1 flex flex-col items-center justify-center text-center my-auto px-4">
        {/* Cloud-like soft backdrop with green check */}
        <div className="relative w-40 h-40 flex items-center justify-center mb-6">
          <div className="absolute inset-0 bg-[#E8EAD9] rounded-full scale-110 opacity-60" />
          <div className="w-20 h-20 rounded-full bg-[#4CAF50] flex items-center justify-center text-white shadow-md z-10 transition-transform animate-in zoom-in-50 duration-300">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#20221D]">
          You're Connected!
        </h1>

        <p className="text-sm text-[#77796F] mt-3 leading-relaxed max-w-xs">
          Welcome <strong className="text-[#20221D]">{currentMember?.name || 'there'}</strong>! You can now receive private messages from {ownerUser.name || 'the Owner'}.
        </p>

        <div className="mt-6 p-3.5 bg-white border border-[#E4E5D9] rounded-2xl flex items-center space-x-2.5 text-left">
          <div className="w-2.5 h-2.5 rounded-full bg-[#4CAF50] animate-pulse flex-none" />
          <p className="text-xs text-[#77796F] leading-relaxed">
            Your conversation with the owner is completely private. Other members will never see you.
          </p>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="w-full max-w-sm pb-6">
        <button
          type="button"
          onClick={() => navigateTo('13_MEMBER_HOME')}
          className="w-full bg-[#CDEB5A] hover:bg-[#bfe043] active:scale-[0.98] text-[#20221D] font-bold text-base py-4 rounded-full shadow-xs transition-all flex items-center justify-center cursor-pointer border border-[#BDE040]/50"
        >
          Go to Chats
        </button>
      </div>
    </div>
  );
};
