import React from 'react';
import { Check, CheckCheck, Clock, Eye, Lock, Send, ShieldCheck } from 'lucide-react';
import { HeaderBar } from '../common/HeaderBar';
import { useApp } from '../../context/AppContext';

export const BroadcastDetailsScreen: React.FC = () => {
  const { broadcasts, activeBroadcastId, navigateTo, members } = useApp();

  const currentBroadcast =
    broadcasts.find((b) => b.broadcastId === activeBroadcastId) || broadcasts[0];

  if (!currentBroadcast) {
    return (
      <div className="flex flex-col justify-between w-full h-full min-h-[640px] bg-[#F5F5EC] select-none">
        <HeaderBar
          title="Broadcast Details"
          showBack
          onBack={() => navigateTo('05_OWNER_HOME')}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center my-auto">
          <div className="w-14 h-14 rounded-full bg-white border border-[#E4E5D9] flex items-center justify-center text-[#77796F] mb-3">
            <Send className="w-6 h-6 text-[#77796F]/70" />
          </div>
          <p className="text-sm font-bold text-[#20221D]">No broadcasts sent yet</p>
          <p className="text-xs text-[#77796F] mt-1 max-w-xs leading-relaxed">
            When you send a broadcast, individual delivery and read statistics will appear here.
          </p>
          <button
            type="button"
            onClick={() => navigateTo('08_BROADCAST_COMPOSER')}
            className="mt-5 px-5 py-3 bg-[#CDEB5A] hover:bg-[#bfe043] rounded-full text-xs font-bold text-[#20221D] shadow-xs"
          >
            Create Broadcast
          </button>
        </div>
      </div>
    );
  }

  const total = currentBroadcast?.recipientCount || members.length;
  const sent = currentBroadcast?.sentCount || total;
  const delivered = currentBroadcast?.deliveredCount || total;
  const read = currentBroadcast?.readCount || 0;

  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[640px] bg-[#F5F5EC] select-none">
      {/* Top Header */}
      <HeaderBar
        title="Broadcast Details"
        showBack
        onBack={() => navigateTo('05_OWNER_HOME')}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-1 pb-6 space-y-4">
        {/* Top Status Header */}
        <div className="flex flex-col items-center text-center pt-2 pb-2">
          <div className="w-14 h-14 rounded-full bg-[#4CAF50] flex items-center justify-center text-white shadow-xs mb-3">
            <Check className="w-7 h-7 stroke-[3]" />
          </div>
          <h1 className="text-xl font-bold text-[#20221D] tracking-tight">
            Broadcast Sent
          </h1>
          <span className="text-xs text-[#77796F] mt-0.5">
            {new Date(currentBroadcast?.createdAt || Date.now()).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Message Content Card */}
        <div className="bg-white rounded-3xl p-5 border border-[#E4E5D9] shadow-2xs space-y-3">
          <p className="text-sm font-medium text-[#20221D] leading-relaxed">
            {currentBroadcast?.messageContent}
          </p>

          {currentBroadcast?.mediaUrl && (
            <div className="rounded-2xl overflow-hidden border border-[#E4E5D9] max-h-48">
              {currentBroadcast.mediaType === 'video' ? (
                <video
                  src={currentBroadcast.mediaUrl}
                  className="w-full h-44 object-cover"
                  controls
                />
              ) : (
                <img
                  src={currentBroadcast.mediaUrl}
                  alt="Broadcast content"
                  className="w-full h-44 object-cover"
                />
              )}
            </div>
          )}
        </div>

        {/* Statistics Card (Strictly Owner Only!) */}
        <div className="bg-white rounded-3xl p-5 border border-[#E4E5D9] shadow-2xs">
          <h2 className="text-xs font-bold text-[#77796F] uppercase tracking-wider mb-4">
            Delivery Statistics
          </h2>

          <div className="space-y-4">
            {/* Sent */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-[#FAFBF6] border border-[#E4E5D9] flex items-center justify-center text-[#77796F]">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-[#20221D]">Sent</span>
              </div>
              <span className="text-sm font-bold text-[#20221D]">
                {sent} / {total}
              </span>
            </div>

            {/* Delivered */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-[#FAFBF6] border border-[#E4E5D9] flex items-center justify-center text-[#77796F]">
                  <CheckCheck className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-[#20221D]">Delivered</span>
              </div>
              <span className="text-sm font-bold text-[#20221D]">
                {delivered} / {total}
              </span>
            </div>

            {/* Read */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-[#EAF7ED] border border-[#C6ECCF] flex items-center justify-center text-[#4CAF50]">
                  <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-sm font-semibold text-[#20221D]">Read</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-[#4CAF50]">
                  {read} / {total}
                </span>
                <span className="text-[11px] text-[#77796F] font-semibold">
                  ({Math.round((read / Math.max(1, total)) * 100)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-[#F0F1E8] rounded-full mt-5 overflow-hidden">
            <div
              className="h-full bg-[#4CAF50] rounded-full transition-all duration-500"
              style={{ width: `${(read / Math.max(1, total)) * 100}%` }}
            />
          </div>
        </div>

        {/* Security & Privacy Disclaimer */}
        <div className="bg-[#FAFBF6] border border-[#E4E5D9] rounded-2xl p-3.5 flex items-start space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-[#4CAF50] flex-none mt-0.5" />
          <p className="text-xs text-[#77796F] leading-snug">
            <strong>Private Broadcast Guarantee:</strong> Individual messages were delivered to each member's private chat. Members cannot see each other or this statistics dashboard.
          </p>
        </div>

        {/* Action button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigateTo('05_OWNER_HOME')}
            className="w-full bg-[#CDEB5A] hover:bg-[#bfe043] active:scale-[0.98] text-[#20221D] font-bold text-sm py-4 rounded-full shadow-xs transition-all flex items-center justify-center"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};
