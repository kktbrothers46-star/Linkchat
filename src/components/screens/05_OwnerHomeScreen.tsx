import React, { useState } from 'react';
import { MessageSquare, Search, Send, Users, Radio } from 'lucide-react';
import { HeaderBar } from '../common/HeaderBar';
import { BottomNav } from '../common/BottomNav';
import { useApp } from '../../context/AppContext';

export const OwnerHomeScreen: React.FC = () => {
  const {
    ownerUser,
    members,
    broadcasts,
    conversations,
    openChatWithMember,
    navigateTo,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');

  // Filter conversations
  const filteredConversations = conversations
    .filter((conv) => {
      const member = members.find((m) => m.userId === conv.memberId);
      if (!member) return false;
      return (
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.phone.includes(searchQuery) ||
        conv.lastMessageText.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .slice(0, 10);

  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[640px] bg-[#F5F5EC] select-none">
      {/* Top Bar with System Status & Greeting */}
      <HeaderBar
        title=""
        showDots={false}
        rightAction={
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => navigateTo('17_MEMBER_PROFILE')}
              className="relative p-0.5"
            >
              <img
                src={ownerUser.avatar}
                alt={ownerUser.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-xs"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#4CAF50] border-2 border-white rounded-full" />
            </button>
          </div>
        }
      />

      {/* Main Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-5 pt-1 pb-6">
        {/* Personalized Greeting */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="text-xs font-medium text-[#77796F]">Welcome,</span>
            <h1 className="text-2xl font-bold tracking-tight text-[#20221D]">
              {ownerUser.name || 'Owner'}
            </h1>
            {ownerUser.phone && (
              <span className="text-xs text-[#77796F] font-mono mt-0.5 block">
                {ownerUser.phone}
              </span>
            )}
          </div>
        </div>

        {/* Stats Row: Members & Broadcasts */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Members card */}
          <button
            type="button"
            onClick={() => navigateTo('06_MEMBERS')}
            className="bg-white p-4 rounded-3xl border border-[#E4E5D9] shadow-2xs flex flex-col justify-center text-left hover:border-[#CDEB5A] transition-all cursor-pointer"
          >
            <span className="text-3xl font-bold text-[#3B82F6] tracking-tight">
              {members.length}
            </span>
            <span className="text-xs font-semibold text-[#77796F] mt-1 flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Members</span>
            </span>
          </button>

          {/* Broadcasts card */}
          <button
            type="button"
            onClick={() => {
              if (broadcasts.length > 0) {
                navigateTo('10_BROADCAST_DETAILS');
              } else {
                navigateTo('08_BROADCAST_COMPOSER');
              }
            }}
            className="bg-white p-4 rounded-3xl border border-[#E4E5D9] shadow-2xs flex flex-col justify-center text-left hover:border-[#CDEB5A] transition-all cursor-pointer"
          >
            <span className="text-3xl font-bold text-[#8B5CF6] tracking-tight">
              {broadcasts.length}
            </span>
            <span className="text-xs font-semibold text-[#77796F] mt-1 flex items-center space-x-1">
              <Radio className="w-3.5 h-3.5 text-[#8B5CF6]" />
              <span>Broadcasts</span>
            </span>
          </button>
        </div>

        {/* PRIMARY CTA: SEND BROADCAST (Must visually dominate the screen!) */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigateTo('08_BROADCAST_COMPOSER')}
            className="w-full bg-[#CDEB5A] hover:bg-[#bfe043] active:scale-[0.98] text-[#20221D] font-bold text-base py-4 px-6 rounded-3xl shadow-xs transition-all flex items-center justify-center space-x-2.5 group cursor-pointer border border-[#BDE040]/50"
          >
            <Send className="w-5 h-5 stroke-[2.4] group-hover:translate-x-0.5 transition-transform" />
            <span>Send Broadcast</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-5">
          <Search className="w-4 h-4 text-[#77796F] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations or members..."
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-[#E4E5D9] rounded-2xl text-xs font-medium text-[#20221D] placeholder-[#77796F] focus:outline-hidden focus:border-[#CDEB5A]"
          />
        </div>

        {/* Section: Recent Conversations */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#20221D] tracking-tight">
              Recent conversations
            </h2>
            <span className="text-[11px] font-semibold text-[#77796F]">
              Private 1-on-1
            </span>
          </div>

          {filteredConversations.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-[#E4E5D9] flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#FAFBF6] border border-[#E4E5D9] flex items-center justify-center text-[#77796F] mb-3">
                <MessageSquare className="w-5 h-5 text-[#77796F]/70" />
              </div>
              <p className="text-sm font-bold text-[#20221D]">No conversations yet</p>
              <p className="text-xs text-[#77796F] mt-1 max-w-xs leading-relaxed">
                Add members or send your first broadcast to start private individual conversations.
              </p>
              <button
                type="button"
                onClick={() => navigateTo('07_ADD_INVITE')}
                className="mt-4 px-4 py-2 bg-[#CDEB5A] hover:bg-[#bfe043] rounded-full text-xs font-bold text-[#20221D] shadow-2xs"
              >
                + Add or Invite Member
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredConversations.map((conv) => {
                const member = members.find((m) => m.userId === conv.memberId);
                if (!member) return null;

                return (
                  <button
                    key={conv.conversationId}
                    type="button"
                    onClick={() => openChatWithMember(member.userId)}
                    className="w-full bg-white hover:bg-[#FAFBF6] active:scale-[0.99] p-3.5 rounded-3xl border border-[#E4E5D9] flex items-center justify-between text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="relative flex-none">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-12 h-12 rounded-full object-cover border border-[#E4E5D9]"
                        />
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#4CAF50] border-2 border-white rounded-full" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-[#20221D] truncate leading-tight">
                          {member.name}
                        </h3>
                        <p className="text-xs text-[#77796F] truncate mt-0.5 leading-snug">
                          {conv.lastMessageText}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-1.5 flex-none ml-2">
                      <span className="text-[11px] text-[#77796F] font-medium">
                        {conv.lastMessageTime}
                      </span>
                      {conv.unreadCountForOwner > 0 && (
                        <span className="w-5 h-5 rounded-full bg-[#EF5350] text-white text-[11px] font-bold flex items-center justify-center shadow-2xs">
                          {conv.unreadCountForOwner}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Persistent Bottom Navigation for Owner */}
      <BottomNav />
    </div>
  );
};
