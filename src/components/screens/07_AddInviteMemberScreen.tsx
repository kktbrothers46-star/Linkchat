import React, { useState } from 'react';
import { Copy, Check, Info, Share2, UserPlus, RefreshCw } from 'lucide-react';
import { HeaderBar } from '../common/HeaderBar';
import { useApp } from '../../context/AppContext';
import { copyToClipboard } from '../../lib/clipboard';

export const AddInviteMemberScreen: React.FC = () => {
  const {
    activeInviteCode,
    generateNewInviteCode,
    addNewMember,
    openChatWithMember,
    navigateTo,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'invite' | 'manual'>('invite');
  const [copied, setCopied] = useState(false);

  // Manual entry fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleCopy = async () => {
    const success = await copyToClipboard(activeInviteCode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join my LinkChat list',
          text: `Join my private LinkChat broadcast list! Use invite code: ${activeInviteCode}`,
        });
      } catch (err: unknown) {
        // If user cancelled the share dialog (AbortError), do nothing
        const isAbort = err instanceof Error && err.name === 'AbortError';
        if (!isAbort) {
          await handleCopy();
        }
      }
    } else {
      await handleCopy();
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    const newUserId = addNewMember(name, phone);
    setName('');
    setPhone('');
    openChatWithMember(newUserId);
  };

  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[640px] bg-[#F5F5EC] select-none">
      {/* Top Header */}
      <HeaderBar
        title="Invite Member"
        showBack
        onBack={() => navigateTo('06_MEMBERS')}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-6">
        {/* Segmented Control / Tabs */}
        <div className="flex items-center bg-[#E6E8D8] p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('invite')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'invite'
                ? 'bg-[#CDEB5A] text-[#20221D] shadow-2xs'
                : 'text-[#77796F] hover:text-[#20221D]'
            }`}
          >
            Invite Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'manual'
                ? 'bg-white text-[#20221D] shadow-2xs'
                : 'text-[#77796F] hover:text-[#20221D]'
            }`}
          >
            Add Manually
          </button>
        </div>

        {activeTab === 'invite' ? (
          <div className="flex flex-col items-center">
            {/* Invite Code Card */}
            <div className="w-full bg-white rounded-3xl p-6 border border-[#E4E5D9] shadow-2xs text-center mb-5">
              <span className="text-xs font-bold text-[#77796F] tracking-wide uppercase">
                Your Invite Code
              </span>

              {/* Code Display Box */}
              <div
                onClick={handleCopy}
                className="my-5 py-4 px-6 bg-[#FAFBF6] border-2 border-dashed border-[#CDEB5A] rounded-2xl flex items-center justify-center space-x-3 cursor-pointer hover:bg-[#F4F8E5] transition-colors"
              >
                <span className="text-3xl font-mono font-black text-[#20221D] tracking-widest">
                  {activeInviteCode}
                </span>
                <button
                  type="button"
                  aria-label="Copy invite code"
                  className="p-1.5 rounded-full hover:bg-black/5 text-[#20221D]"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-[#77796F] px-2">
                <span>Expires in 7 days</span>
                <button
                  type="button"
                  onClick={generateNewInviteCode}
                  className="flex items-center space-x-1 font-semibold text-[#20221D] hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Generate New</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-3 mb-6">
              <button
                type="button"
                onClick={handleShare}
                className="w-full bg-[#CDEB5A] hover:bg-[#bfe043] active:scale-[0.98] text-[#20221D] font-bold text-sm py-4 rounded-2xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4 stroke-[2.4]" />
                <span>Share Invite</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="w-full bg-white hover:bg-[#FAFBF6] active:scale-[0.98] border border-[#E4E5D9] text-[#20221D] font-bold text-sm py-3.5 rounded-2xl shadow-2xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Info Callout */}
            <div className="w-full bg-[#EBF3FC] border border-[#BFDBFE] rounded-2xl p-4 flex items-start space-x-3 text-left">
              <Info className="w-5 h-5 text-[#2563EB] flex-none mt-0.5" />
              <p className="text-xs text-[#1E3A8A] leading-relaxed">
                Share this code with the person. They can register and join your list. They will only see their own private chat with you.
              </p>
            </div>
          </div>
        ) : (
          /* Manual Add Form */
          <form onSubmit={handleManualAdd} className="bg-white rounded-3xl p-6 border border-[#E4E5D9] shadow-2xs">
            <h3 className="text-sm font-bold text-[#20221D] mb-1">
              Add Member Directly
            </h3>
            <p className="text-xs text-[#77796F] mb-5">
              Add a member manually without needing an invite code.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#20221D] mb-1.5">
                  Member Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maya Patel"
                  required
                  className="w-full px-4 py-3 bg-[#FAFBF6] border border-[#E4E5D9] rounded-2xl text-xs font-medium text-[#20221D] focus:outline-hidden focus:border-[#CDEB5A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#20221D] mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43299"
                  required
                  className="w-full px-4 py-3 bg-[#FAFBF6] border border-[#E4E5D9] rounded-2xl text-xs font-medium text-[#20221D] focus:outline-hidden focus:border-[#CDEB5A]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#CDEB5A] hover:bg-[#bfe043] active:scale-[0.98] text-[#20221D] font-bold text-sm py-3.5 rounded-2xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 stroke-[2.2]" />
                  <span>Add Member</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
