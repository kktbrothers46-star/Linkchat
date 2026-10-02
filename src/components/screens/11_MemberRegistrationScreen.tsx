import React, { useRef, useState } from 'react';
import { ArrowLeft, Camera, KeyRound, Phone, ShieldCheck, Upload, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { uploadMediaFile } from '../../lib/supabase';

export const MemberRegistrationScreen: React.FC = () => {
  const { registerMemberFromUI, navigateTo, showToast } = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Invalid File', 'Please select an image file (JPG, PNG, WebP).', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast('File Too Large', 'Avatar must be under 15MB.', 'error');
      return;
    }

    try {
      const uploadRes = await uploadMediaFile(file, 'avatars');
      setAvatar(uploadRes.url);
      showToast('Photo Selected', 'Profile picture set.', 'info');
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setAvatar(reader.result as string);
          showToast('Photo Selected', 'Profile picture set.', 'info');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await registerMemberFromUI(name.trim(), phone.trim(), inviteCode.trim(), avatar);
      navigateTo('12_REGISTRATION_SUCCESS');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col justify-between w-full h-full min-h-[640px] p-6 bg-[#F5F5EC] overflow-hidden select-none">
      {/* Top Status & Back */}
      <div className="z-10">
        <div className="w-full pt-3" />
        <button
          type="button"
          onClick={() => navigateTo('03_ACCOUNT_TYPE')}
          aria-label="Back"
          className="w-10 h-10 -ml-2 mt-1 rounded-full flex items-center justify-center text-[#20221D] hover:bg-black/5"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>
      </div>

      {/* Decorative Botanical Leaf Silhouettes */}
      <svg
        className="absolute top-0 right-0 w-48 h-48 text-[#E2E6D5] -mr-10 -mt-10 opacity-70 pointer-events-none"
        viewBox="0 0 200 200"
        fill="currentColor"
      >
        <path d="M40 0C60 40 100 80 180 90C120 120 70 170 0 200C20 140 30 80 40 0Z" />
      </svg>
      <svg
        className="absolute bottom-0 left-0 w-56 h-56 text-[#E2E6D5] -ml-12 -mb-12 opacity-80 pointer-events-none"
        viewBox="0 0 200 200"
        fill="currentColor"
      >
        <path d="M0 80C50 60 120 70 180 160C110 180 60 150 0 80Z" />
      </svg>

      {/* Main Registration Form */}
      <div className="w-full max-w-sm mx-auto my-auto flex flex-col z-10 pt-1">
        <h1 className="text-3xl font-bold tracking-tight text-[#20221D]">
          Join LinkChat
        </h1>
        <p className="text-xs text-[#77796F] mt-1 mb-3">
          Enter your details and photo to connect with the owner.
        </p>

        {error && (
          <div className="mb-3.5 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-3">
          {/* Profile Photo Upload Circle */}
          <div className="flex flex-col items-center mb-1">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative group cursor-pointer"
            >
              <div className="w-18 h-18 rounded-full border-2 border-dashed border-[#CDEB5A] bg-white flex items-center justify-center overflow-hidden shadow-2xs hover:border-[#20221D] transition-colors">
                {avatar ? (
                  <img src={avatar} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#77796F]">
                    <Camera className="w-5 h-5 text-[#20221D]" />
                    <span className="text-[9px] font-bold mt-0.5">Photo</span>
                  </div>
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-6 h-6 bg-[#CDEB5A] border-2 border-white rounded-full flex items-center justify-center text-[#20221D] shadow-xs">
                <Upload className="w-3 h-3 stroke-[2.5]" />
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <span className="text-[11px] text-[#77796F] mt-1">
              {avatar ? 'Tap to change photo' : 'Upload Profile Picture (Optional)'}
            </span>
          </div>

          {/* Name Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#77796F]">
              <User className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full pl-12 pr-4 py-3 bg-white border border-[#E4E5D9] rounded-2xl text-sm font-medium text-[#20221D] placeholder-[#77796F]/70 focus:outline-hidden focus:border-[#CDEB5A] focus:ring-2 focus:ring-[#CDEB5A]/20 transition-all shadow-2xs"
            />
          </div>

          {/* Phone Number Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#77796F]">
              <Phone className="w-5 h-5" />
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full pl-12 pr-4 py-3 bg-white border border-[#E4E5D9] rounded-2xl text-sm font-medium text-[#20221D] placeholder-[#77796F]/70 focus:outline-hidden focus:border-[#CDEB5A] focus:ring-2 focus:ring-[#CDEB5A]/20 transition-all shadow-2xs"
            />
          </div>

          {/* Invite Code Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#77796F]">
              <KeyRound className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Invitation code (e.g. K7P4X9)"
              maxLength={8}
              className="w-full pl-12 pr-4 py-3 bg-white border border-[#E4E5D9] rounded-2xl text-sm font-mono font-semibold tracking-wider text-[#20221D] placeholder-[#77796F]/70 focus:outline-hidden focus:border-[#CDEB5A] focus:ring-2 focus:ring-[#CDEB5A]/20 transition-all shadow-2xs uppercase"
            />
          </div>

          {/* Continue Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#CDEB5A] hover:bg-[#bfe043] active:scale-[0.98] text-[#20221D] font-bold text-base py-3.5 rounded-full shadow-xs transition-all flex items-center justify-center cursor-pointer border border-[#BDE040]/50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#20221D] border-t-transparent rounded-full animate-spin" />
              ) : (
                'Continue'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Footer Privacy Note */}
      <div className="w-full max-w-sm mx-auto pb-4 text-center z-10">
        <p className="text-xs text-[#77796F] flex items-center justify-center space-x-1.5 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-[#4CAF50] flex-none" />
          <span>Your information is used only to identify your account and connect you with the owner.</span>
        </p>
      </div>
    </div>
  );
};
