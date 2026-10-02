import React, { useRef } from 'react';
import { Image, Paperclip, Send, Users, Video, X } from 'lucide-react';
import { HeaderBar } from '../common/HeaderBar';
import { useApp } from '../../context/AppContext';

export const BroadcastComposerScreen: React.FC = () => {
  const { members, draftBroadcast, setDraftBroadcast, navigateTo, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleNext = () => {
    if (!draftBroadcast.text.trim() && !draftBroadcast.mediaUrl) {
      showToast('Message Required', 'Please enter text or attach media before proceeding.', 'info');
      return;
    }
    navigateTo('09_BROADCAST_PREVIEW');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size: 15MB for image, 50MB for video
      const maxMb = type === 'video' ? 50 : 15;
      if (file.size > maxMb * 1024 * 1024) {
        showToast('File Too Large', `${type === 'video' ? 'Video' : 'Image'} must be under ${maxMb}MB.`, 'error');
        return;
      }
      const url = URL.createObjectURL(file);
      setDraftBroadcast((prev) => ({
        ...prev,
        mediaUrl: url,
        mediaType: type,
        mediaFile: file,
      }));
    }
  };

  const handleRemoveMedia = () => {
    setDraftBroadcast((prev) => ({
      ...prev,
      mediaUrl: undefined,
      mediaType: undefined,
      mediaFile: undefined,
    }));
  };

  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[640px] bg-[#F5F5EC] select-none">
      {/* Top Header */}
      <HeaderBar
        title="New Broadcast"
        showBack
        onBack={() => navigateTo('05_OWNER_HOME')}
      />

      {/* Main Composer Area */}
      <div className="flex-1 overflow-y-auto px-5 pt-1 pb-6 flex flex-col">
        {/* Recipient Pill Banner (Automatic selection) */}
        <div className="bg-white/80 border border-[#E4E5D9] rounded-2xl p-3 flex items-center space-x-3 mb-4 shadow-2xs">
          <div className="w-8 h-8 rounded-full bg-[#E2F0A3] flex items-center justify-center text-[#20221D] flex-none">
            <Users className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-semibold text-[#77796F] uppercase tracking-wider block">
              Send to
            </span>
            <span className="text-xs font-bold text-[#20221D]">
              All {members.length} member{members.length === 1 ? '' : 's'}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-1 rounded-full">
            Private 1-on-1
          </span>
        </div>

        {/* Large Text Area */}
        <div className="flex-1 bg-white rounded-3xl p-4 border border-[#E4E5D9] shadow-2xs flex flex-col mb-4 min-h-[220px]">
          <textarea
            value={draftBroadcast.text}
            onChange={(e) =>
              setDraftBroadcast((prev) => ({ ...prev, text: e.target.value }))
            }
            placeholder="Type a message..."
            className="w-full flex-1 bg-transparent resize-none text-sm text-[#20221D] placeholder-[#77796F] focus:outline-hidden leading-relaxed"
          />

          {/* Attached Media Thumbnail Preview */}
          {draftBroadcast.mediaUrl && (
            <div className="relative mt-3 inline-block self-start">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border border-[#E4E5D9] relative group">
                {draftBroadcast.mediaType === 'video' ? (
                  <div className="w-full h-full bg-[#20221D] flex items-center justify-center">
                    <Video className="w-8 h-8 text-white/90" />
                  </div>
                ) : (
                  <img
                    src={draftBroadcast.mediaUrl}
                    alt="Attached media"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={handleRemoveMedia}
                aria-label="Remove media"
                className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#20221D] text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          )}
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileUpload(e, 'image')}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => handleFileUpload(e, 'video')}
        />

        {/* Media Action Row (Photo, Video, Attach) */}
        <div className="flex items-center justify-around py-3 px-2 bg-white rounded-2xl border border-[#E4E5D9] mb-5 shadow-2xs">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 text-xs font-semibold text-[#20221D] hover:text-[#77796F] px-3 py-1.5 rounded-xl hover:bg-black/5 transition-colors cursor-pointer"
          >
            <Image className="w-4 h-4 text-[#77796F]" />
            <span>Photo</span>
          </button>

          <div className="w-[1px] h-5 bg-[#E4E5D9]" />

          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center space-x-2 text-xs font-semibold text-[#20221D] hover:text-[#77796F] px-3 py-1.5 rounded-xl hover:bg-black/5 transition-colors cursor-pointer"
          >
            <Video className="w-4 h-4 text-[#77796F]" />
            <span>Video</span>
          </button>

          <div className="w-[1px] h-5 bg-[#E4E5D9]" />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 text-xs font-semibold text-[#20221D] hover:text-[#77796F] px-3 py-1.5 rounded-xl hover:bg-black/5 transition-colors cursor-pointer"
          >
            <Paperclip className="w-4 h-4 text-[#77796F]" />
            <span>Attach</span>
          </button>
        </div>

        {/* Primary CTA: Next */}
        <button
          type="button"
          onClick={handleNext}
          className="w-full bg-[#CDEB5A] hover:bg-[#bfe043] active:scale-[0.98] text-[#20221D] font-bold text-base py-4 rounded-full shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer border border-[#BDE040]/50"
        >
          <span>Next</span>
          <span className="font-bold">→</span>
        </button>
      </div>
    </div>
  );
};
