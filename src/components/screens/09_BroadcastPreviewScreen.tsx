import React, { useState } from 'react';
import { Edit3, Lock, Send, Users, Video } from 'lucide-react';
import { HeaderBar } from '../common/HeaderBar';
import { useApp } from '../../context/AppContext';

export const BroadcastPreviewScreen: React.FC = () => {
  const {
    members,
    draftBroadcast,
    sendBroadcastMessage,
    navigateTo,
  } = useApp();

  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    await sendBroadcastMessage(
      draftBroadcast.text,
      draftBroadcast.mediaUrl,
      draftBroadcast.mediaType
    );
    setIsSending(false);
  };

  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[640px] bg-[#F5F5EC] select-none">
      {/* Top Header */}
      <HeaderBar
        title="Preview"
        showBack
        onBack={() => navigateTo('08_BROADCAST_COMPOSER')}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-1 pb-6 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Recipient Pill */}
          <div className="bg-white border border-[#E4E5D9] rounded-2xl p-3.5 flex items-center space-x-3 shadow-2xs">
            <div className="w-9 h-9 rounded-full bg-[#E2F0A3] flex items-center justify-center text-[#20221D] flex-none">
              <Users className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-[#77796F] uppercase tracking-wider block">
                Send to
              </span>
              <span className="text-sm font-bold text-[#20221D]">
                {members.length} members
              </span>
            </div>
          </div>

          {/* Message Preview Card */}
          <div className="bg-white rounded-3xl p-5 border border-[#E4E5D9] shadow-2xs space-y-4">
            <div>
              <span className="text-xs font-bold text-[#77796F] tracking-wide uppercase block mb-2">
                Message
              </span>
              <p className="text-sm text-[#20221D] font-medium leading-relaxed whitespace-pre-wrap">
                {draftBroadcast.text || '(No text content)'}
              </p>
            </div>

            {/* Attached Media Preview */}
            {draftBroadcast.mediaUrl && (
              <div className="pt-2 border-t border-[#E4E5D9]">
                <div className="rounded-2xl overflow-hidden border border-[#E4E5D9] max-h-52 bg-black relative">
                  {draftBroadcast.mediaType === 'video' ? (
                    <video
                      src={draftBroadcast.mediaUrl}
                      className="w-full h-44 object-cover"
                      controls
                    />
                  ) : (
                    <img
                      src={draftBroadcast.mediaUrl}
                      alt="Broadcast attachment preview"
                      className="w-full h-48 object-cover"
                    />
                  )}
                </div>
                <span className="text-[11px] font-semibold text-[#77796F] mt-2 block">
                  Media: 1 {draftBroadcast.mediaType === 'video' ? 'video (MP4)' : 'image (JPG)'}
                </span>
              </div>
            )}
          </div>

          {/* Privacy Guarantee Banner */}
          <div className="bg-[#FAFBF6] border border-[#E4E5D9] rounded-2xl p-3.5 flex items-center space-x-3">
            <Lock className="w-4 h-4 text-[#77796F] flex-none" />
            <p className="text-xs text-[#77796F] leading-snug">
              <strong className="text-[#20221D]">Sending privately to {members.length} members.</strong> Recipients cannot see each other or know this is a broadcast.
            </p>
          </div>
        </div>

        {/* Action Buttons: Edit & Send to Members */}
        <div className="space-y-3 pt-6">
          <button
            type="button"
            onClick={() => navigateTo('08_BROADCAST_COMPOSER')}
            className="w-full bg-white hover:bg-[#FAFBF6] active:scale-[0.98] border border-[#E4E5D9] text-[#20221D] font-bold text-sm py-3.5 rounded-full shadow-2xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit</span>
          </button>

          <button
            type="button"
            disabled={isSending}
            onClick={handleSend}
            className="w-full bg-[#CDEB5A] hover:bg-[#bfe043] active:scale-[0.98] text-[#20221D] font-bold text-base py-4 rounded-full shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#BDE040]/50"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-[#20221D] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 stroke-[2.4]" />
                <span>Send to Members</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
