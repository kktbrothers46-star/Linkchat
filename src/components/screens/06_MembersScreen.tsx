import React, { useState } from 'react';
import { Plus, Search, UserPlus } from 'lucide-react';
import { HeaderBar } from '../common/HeaderBar';
import { BottomNav } from '../common/BottomNav';
import { useApp } from '../../context/AppContext';

export const MembersScreen: React.FC = () => {
  const { members, openChatWithMember, navigateTo } = useApp();
  const [search, setSearch] = useState('');

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search)
  );

  return (
    <div className="relative flex flex-col justify-between w-full h-full min-h-[640px] bg-[#F5F5EC] select-none">
      {/* Top Header */}
      <HeaderBar
        title="Members"
        showBack
        onBack={() => navigateTo('05_OWNER_HOME')}
        rightAction={
          <button
            type="button"
            onClick={() => navigateTo('07_ADD_INVITE')}
            aria-label="Add or invite member"
            className="w-9 h-9 rounded-full bg-[#CDEB5A] flex items-center justify-center text-[#20221D] hover:bg-[#bfe043] transition-colors"
          >
            <UserPlus className="w-4 h-4 stroke-[2.2]" />
          </button>
        }
      />

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto px-5 pt-1 pb-20">
        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-[#77796F] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members"
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-[#E4E5D9] rounded-2xl text-xs font-medium text-[#20221D] placeholder-[#77796F] focus:outline-hidden focus:border-[#CDEB5A]"
          />
        </div>

        {/* Member Count badge */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold text-[#77796F]">
            Saved Broadcast List ({filteredMembers.length})
          </span>
          <span className="text-[11px] text-[#77796F]">
            {members.filter((m) => m.status === 'active').length} active
          </span>
        </div>

        {/* Member List */}
        {filteredMembers.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-[#E4E5D9] mt-2 flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-[#FAFBF6] border border-[#E4E5D9] flex items-center justify-center text-[#77796F] mb-3">
              <UserPlus className="w-6 h-6 text-[#77796F]/70" />
            </div>
            <p className="text-sm font-bold text-[#20221D]">No members yet</p>
            <p className="text-xs text-[#77796F] mt-1 max-w-xs leading-relaxed">
              Generate an invite code or add members manually to build your private broadcast list.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMembers.map((member) => (
              <button
                key={member.memberId}
                type="button"
                onClick={() => openChatWithMember(member.userId)}
                className="w-full bg-white hover:bg-[#FAFBF6] active:scale-[0.99] p-3 rounded-2xl border border-[#E4E5D9] flex items-center justify-between text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-11 h-11 rounded-full object-cover border border-[#E4E5D9] flex-none"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#20221D] truncate leading-tight">
                      {member.name}
                    </h3>
                    <p className="text-xs text-[#77796F] truncate mt-0.5">
                      {member.phone}
                    </p>
                  </div>
                </div>

                {/* Status indicator dot */}
                <div className="flex items-center space-x-2 flex-none ml-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4CAF50] ring-4 ring-[#4CAF50]/15" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating Sticky Add Member Pill (Screen 06 style) */}
      <div className="absolute bottom-16 left-0 right-0 px-6 pointer-events-none flex justify-center z-20">
        <button
          type="button"
          onClick={() => navigateTo('07_ADD_INVITE')}
          className="pointer-events-auto bg-[#CDEB5A] hover:bg-[#bfe043] active:scale-95 text-[#20221D] font-bold text-sm py-3 px-6 rounded-full shadow-lg border border-[#BDE040]/60 flex items-center space-x-2 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Member</span>
        </button>
      </div>

      <BottomNav />
    </div>
  );
};
