import React, { useState } from 'react';
import { Lock, Search, ShieldCheck, User } from 'lucide-react';
import { HeaderBar } from '../common/HeaderBar';
import { useApp } from '../../context/AppContext';

export const MemberHomeScreen: React.FC = () => {
  const {
    ownerUser,
    currentMember,
    conversations,
    openChatWithId,
    navigateTo,
  } = useApp();

  const [search, setSearch] = useState('');

  // Find the private conversation between current member and owner
  const myConversation = conversations.find(
    (c) => c.memberId === currentMember?.userId
  );

  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[640px] bg-[#F5F5EC] select-none">
      {/* Top Header */}
      <HeaderBar
        title="Messages"
        rightAction={
          <button
            type="button"
            onClick={() => navigateTo('17_MEMBER_PROFILE')}
            aria-label="Profile"
            className="w-9 h-9 rounded-full bg-white border border-[#E4E5D9] flex items-center justify-center text-[#20221D] hover:bg-black/5"
          >
            <User className="w-4 h-4 stroke-[2.2]" />
          </button>
        }
      />

      {/* Main List */}
      <div className="flex-1 overflow-y-auto px-5 pt-1 pb-6 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#77796F] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in messages"
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-[#E4E5D9] rounded-2xl text-xs font-medium text-[#20221D] placeholder-[#77796F] focus:outline-hidden focus:border-[#CDEB5A]"
          />
        </div>

        {/* Privacy reassurance pill */}
        <div className="bg-[#FAFBF6] border border-[#E4E5D9] rounded-2xl p-3 flex items-center space-x-2.5">
          <Lock className="w-4 h-4 text-[#77796F] flex-none" />
          <span className="text-xs text-[#77796F] leading-tight">
            Your conversation with the owner is private.
          </span>
        </div>

        {/* Primary Conversation Row (with Owner) */}
        {myConversation ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => openChatWithId(myConversation.conversationId)}
              className="w-full bg-white hover:bg-[#FAFBF6] active:scale-[0.99] p-4 rounded-3xl border border-[#E4E5D9] shadow-2xs flex items-center justify-between text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className="relative flex-none">
                  <img
                    src={ownerUser.avatar}
                    alt={ownerUser.name}
                    className="w-13 h-13 rounded-full object-cover border border-[#E4E5D9]"
                  />
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#4CAF50] border-2 border-white rounded-full" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <h3 className="text-sm font-bold text-[#20221D] truncate leading-tight">
                      {ownerUser.name}
                    </h3>
                    <span className="text-[10px] font-bold text-[#20221D] bg-[#CDEB5A] px-1.5 py-0.5 rounded-md">
                      Owner
                    </span>
                    {ownerUser.phone && (
                      <span className="text-[10px] text-[#77796F] font-mono">
                        {ownerUser.phone}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#77796F] truncate mt-1 leading-snug">
                    {myConversation.lastMessageText}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end space-y-1.5 flex-none ml-2">
                <span className="text-[11px] text-[#77796F] font-medium">
                  {myConversation.lastMessageTime}
                </span>
                {myConversation.unreadCountForMember > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#EF5350] text-white text-[11px] font-bold flex items-center justify-center shadow-2xs">
                    {myConversation.unreadCountForMember}
                  </span>
                )}
              </div>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 text-center border border-[#E4E5D9]">
            <p className="text-sm font-bold text-[#20221D]">No messages yet</p>
            <p className="text-xs text-[#77796F] mt-1">
              You will see messages from {ownerUser.name} here.
            </p>
          </div>
        )}
      </div>

      {/* Member Bottom Bar with Profile switch */}
      <div className="w-full bg-white border-t border-[#E4E5D9] px-6 py-3 flex items-center justify-between text-xs text-[#77796F]">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-[#4CAF50]" />
          <span>Logged in as <strong>{currentMember?.name}</strong></span>
        </div>
        <button
          type="button"
          onClick={() => navigateTo('17_MEMBER_PROFILE')}
          className="font-bold text-[#20221D] hover:underline"
        >
          My Profile
        </button>
      </div>
    </div>
  );
};
