import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCheck,
  Image as ImageIcon,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Play,
  Send,
  Smile,
  Video,
  X,
} from 'lucide-react';
import { HeaderBar } from '../common/HeaderBar';
import { Message } from '../../types';
import { useApp } from '../../context/AppContext';
import { uploadMediaFile } from '../../lib/supabase';

export const ChatScreen: React.FC = () => {
  const {
    role,
    ownerUser,
    currentMember,
    members,
    conversations,
    messages,
    activeConversationId,
    sendPrivateMessage,
    openMediaViewer,
    markConversationRead,
    navigateTo,
    goBack,
    showToast,
  } = useApp();

  const [text, setText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine current conversation
  const conv =
    conversations.find((c) => c.conversationId === activeConversationId) ||
    conversations.find((c) => c.memberId === currentMember?.userId) ||
    conversations[0];

  const convId = conv?.conversationId || '';
  const convMessages: Message[] = convId ? messages[convId] || [] : [];

  // Identify partner (Owner or Member)
  const isOwner = role === 'owner';
  const convMember = members.find((m) => m.userId === conv?.memberId);
  const partnerName = isOwner
    ? convMember?.name || 'Member'
    : `${ownerUser.name || 'Owner'}`;

  const partnerAvatar = isOwner
    ? convMember?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
    : ownerUser.avatar;

  // Mark as read whenever viewing this chat
  useEffect(() => {
    if (convId) {
      markConversationRead(convId);
    }
  }, [convId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convMessages.length]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    if (!convId) {
      showToast('No Conversation', 'Please start a conversation with a member first.', 'info');
      return;
    }

    sendPrivateMessage(convId, text.trim());
    setText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (file && convId) {
      const maxMb = type === 'video' ? 50 : 15;
      if (file.size > maxMb * 1024 * 1024) {
        showToast('File Too Large', `${type === 'video' ? 'Video' : 'Image'} must be under ${maxMb}MB.`, 'error');
        return;
      }
      setShowAttachMenu(false);
      let permanentUrl = URL.createObjectURL(file);
      try {
        const uploadRes = await uploadMediaFile(file, 'chats', ownerUser.id);
        permanentUrl = uploadRes.url;
      } catch (err) {
        console.warn('Storage chat upload fallback:', err);
      }
      sendPrivateMessage(convId, '', permanentUrl, type);
    }
  };

  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[640px] bg-[#F5F5EC] select-none">
      {/* Top Bar with Partner Profile & Call Action */}
      <HeaderBar
        title={partnerName}
        subtitle={
          !isOwner
            ? ownerUser.phone
              ? `${ownerUser.phone} • Verified Owner`
              : 'Private Channel'
            : convMember?.phone
            ? `${convMember.phone} • Member`
            : 'Private Conversation'
        }
        avatar={partnerAvatar}
        showBack
        onBack={goBack}
        rightAction={
          <button
            type="button"
            onClick={() => {
              const targetPhone = !isOwner ? ownerUser.phone : convMember?.phone;
              showToast(
                'Contact Info',
                targetPhone
                  ? `${partnerName}: ${targetPhone}`
                  : `${partnerName}: No phone number provided`,
                'info'
              );
            }}
            aria-label="Contact info"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#20221D] hover:bg-black/5"
          >
            <Phone className="w-4 h-4 stroke-[2.2]" />
          </button>
        }
      />

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {convMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
            <span className="bg-[#E9EADF] text-[#77796F] text-[11px] font-semibold px-3 py-1 rounded-full shadow-2xs mb-4">
              Private Conversation
            </span>
            <p className="text-xs text-[#77796F] leading-relaxed max-w-xs">
              This conversation is strictly private between you and {partnerName}. Send a message below to start chatting.
            </p>
          </div>
        ) : (
          <>
            {/* Date Pill: Today */}
            <div className="flex justify-center my-2">
              <span className="bg-[#E9EADF] text-[#77796F] text-[11px] font-semibold px-3 py-1 rounded-full shadow-2xs">
                Today
              </span>
            </div>

            {/* Message Bubbles */}
            {convMessages.map((msg) => {
              const isMe = isOwner
                ? msg.senderId === ownerUser.id
                : msg.senderId === currentMember?.userId;

              return (
                <div
                  key={msg.messageId}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] ${
                    isMe ? 'ml-auto' : 'mr-auto'
                  }`}
                >
                  <div
                    className={`p-3 rounded-2xl shadow-2xs text-sm relative group ${
                      isMe
                        ? 'bg-[#CDEB5A] text-[#20221D] rounded-br-xs'
                        : 'bg-white text-[#20221D] rounded-bl-xs border border-[#E4E5D9]'
                    }`}
                  >
                    {/* Media preview if message contains image or video */}
                    {msg.mediaUrl && (
                      <div className="mb-2 rounded-xl overflow-hidden cursor-pointer relative">
                        {msg.type === 'video' ? (
                          <div
                            onClick={() => openMediaViewer(msg.mediaUrl!, 'video', 'Video Message')}
                            className="relative w-48 h-32 bg-black flex items-center justify-center group"
                          >
                            <video src={msg.mediaUrl} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-[#20221D] shadow-md group-hover:scale-110 transition-transform">
                                <Play className="w-5 h-5 fill-current ml-0.5" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={msg.mediaUrl}
                            alt="Photo message"
                            onClick={() => openMediaViewer(msg.mediaUrl!, 'image', 'Photo')}
                            className="w-56 max-h-48 object-cover rounded-xl hover:opacity-95 transition-opacity"
                          />
                        )}
                      </div>
                    )}

                    {/* Message Text */}
                    {msg.text && (
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    )}

                    {/* Timestamp and Read Double Ticks */}
                    <div
                      className={`flex items-center space-x-1 justify-end mt-1 text-[10px] ${
                        isMe ? 'text-[#20221D]/70' : 'text-[#77796F]'
                      }`}
                    >
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {isMe && (
                        <span className="ml-0.5">
                          {msg.status === 'read' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-[#77796F] stroke-[2]" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-[#77796F]" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
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

      {/* Attachment popup sheet */}
      {showAttachMenu && (
        <div className="mx-4 mb-2 bg-white rounded-2xl p-4 border border-[#E4E5D9] shadow-lg animate-in fade-in slide-in-from-bottom duration-150">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#E4E5D9]">
            <span className="text-xs font-bold text-[#20221D]">Attach Media</span>
            <button
              type="button"
              onClick={() => setShowAttachMenu(false)}
              className="text-[#77796F]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-[#FAFBF6] hover:bg-[#F2F4E6] border border-[#E4E5D9] rounded-xl flex items-center justify-center space-x-2 text-xs font-bold text-[#20221D]"
            >
              <ImageIcon className="w-4 h-4 text-[#77796F]" />
              <span>Choose Photo</span>
            </button>
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="p-3 bg-[#FAFBF6] hover:bg-[#F2F4E6] border border-[#E4E5D9] rounded-xl flex items-center justify-center space-x-2 text-xs font-bold text-[#20221D]"
            >
              <Video className="w-4 h-4 text-[#77796F]" />
              <span>Choose Video</span>
            </button>
          </div>
        </div>
      )}

      {/* Message Composer Bottom Bar */}
      <div className="p-3 bg-[#F5F5EC] border-t border-[#E4E5D9]/80">
        <form onSubmit={handleSend} className="flex items-center space-x-2">
          {/* Input Box with embedded emoji & camera */}
          <div className="flex-1 bg-white rounded-full border border-[#E4E5D9] px-3.5 py-2 flex items-center space-x-2 shadow-2xs">
            <button
              type="button"
              onClick={() => setText((prev) => prev + ' 😊')}
              className="text-[#77796F] hover:text-[#20221D] p-0.5"
            >
              <Smile className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter a message..."
              className="flex-1 bg-transparent text-sm text-[#20221D] placeholder-[#77796F] focus:outline-hidden"
            />

            <button
              type="button"
              onClick={() => setShowAttachMenu((prev) => !prev)}
              className="text-[#77796F] hover:text-[#20221D] p-0.5"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Send / Mic Action Button */}
          {text.trim() ? (
            <button
              type="submit"
              className="w-11 h-11 rounded-full bg-[#CDEB5A] hover:bg-[#bfe043] active:scale-95 text-[#20221D] flex items-center justify-center shadow-xs transition-all flex-none cursor-pointer"
            >
              <Send className="w-5 h-5 stroke-[2.4] ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!convId) {
                  alert('Please select or add a member first.');
                  return;
                }
                setIsRecording(true);
                setTimeout(() => {
                  setIsRecording(false);
                  sendPrivateMessage(convId, '🎙️ Voice note (0:05)');
                }, 800);
              }}
              className={`w-11 h-11 rounded-full ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-[#CDEB5A] text-[#20221D]'
              } flex items-center justify-center shadow-xs transition-all flex-none`}
            >
              <Mic className="w-5 h-5 stroke-[2.2]" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
