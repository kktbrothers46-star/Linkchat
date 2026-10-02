import React, { useRef, useState } from 'react';
import {
  Bell,
  Camera,
  Check,
  ChevronRight,
  Edit2,
  HelpCircle,
  Info,
  LogOut,
  Phone,
  ShieldCheck,
  Upload,
  User as UserIcon,
  X,
} from 'lucide-react';
import { HeaderBar } from '../common/HeaderBar';
import { useApp } from '../../context/AppContext';
import { uploadMediaFile } from '../../lib/supabase';

export const MemberProfileScreen: React.FC = () => {
  const { currentUser, role, logout, goBack, updateProfilePicture, updateUserProfile, showToast } = useApp();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editPhone, setEditPhone] = useState(currentUser.phone);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  ];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Invalid File', 'Please select an image file (JPG, PNG, WebP).', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast('File Too Large', 'Profile photo must be under 15MB.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const uploadRes = await uploadMediaFile(file, 'avatars');
      await updateProfilePicture(uploadRes.url);
      showToast('Photo Updated', 'Profile picture updated successfully.', 'success');
    } catch (err) {
      // Fallback to local FileReader if storage is offline
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        if (result) {
          await updateProfilePicture(result);
          showToast('Photo Updated', 'Profile picture set.', 'info');
        }
      };
      reader.onerror = () => {
        showToast('Upload Failed', 'Could not read the selected image.', 'error');
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      showToast('Validation Error', 'Name cannot be blank.', 'error');
      return;
    }
    await updateUserProfile({ name: editName.trim(), phone: editPhone.trim() });
    setIsEditingProfile(false);
  };

  return (
    <div className="flex flex-col justify-between w-full h-full min-h-[640px] bg-[#F5F5EC] select-none">
      {/* Top Header */}
      <HeaderBar
        title="Profile"
        showBack
        onBack={goBack}
        showDots={false}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-6 flex flex-col items-center">
        {/* Large Avatar with Upload Action */}
        <div className="relative mb-3 group">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md relative cursor-pointer group-hover:opacity-90 transition-all bg-[#FAFBF6]"
          >
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#E2E6D5] text-[#20221D] font-bold text-2xl">
                {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
              </div>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Camera Upload Badge Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload profile picture"
            className="absolute bottom-0 right-0 w-8 h-8 bg-[#CDEB5A] hover:bg-[#bfe043] border-2 border-white rounded-full flex items-center justify-center text-[#20221D] shadow-sm cursor-pointer transition-transform hover:scale-105"
          >
            <Camera className="w-4 h-4 stroke-[2.4]" />
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Change Photo Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs font-bold text-[#20221D] bg-white border border-[#E4E5D9] hover:bg-[#FAFBF6] px-3.5 py-1.5 rounded-full shadow-2xs flex items-center space-x-1.5 cursor-pointer mb-2 transition-colors"
        >
          <Upload className="w-3.5 h-3.5 stroke-[2.2]" />
          <span>Upload New Photo</span>
        </button>

        {/* Quick Avatar Presets */}
        <div className="flex items-center space-x-2 my-2 py-1 overflow-x-auto max-w-full">
          <span className="text-[10px] font-semibold text-[#77796F] mr-0.5">Presets:</span>
          {PRESET_AVATARS.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => updateProfilePicture(url)}
              aria-label={`Select preset avatar ${idx + 1}`}
              className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all cursor-pointer flex-none ${
                currentUser.avatar === url ? 'border-[#20221D] scale-110 shadow-xs' : 'border-white opacity-80 hover:opacity-100'
              }`}
            >
              <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>

        {/* User Info & Edit Toggle */}
        {!isEditingProfile ? (
          <div className="flex flex-col items-center mt-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-[#20221D]">{currentUser.name}</h1>
              <button
                type="button"
                onClick={() => {
                  setEditName(currentUser.name);
                  setEditPhone(currentUser.phone || '');
                  setIsEditingProfile(true);
                }}
                aria-label="Edit name and phone"
                className="w-7 h-7 rounded-full bg-white border border-[#E4E5D9] flex items-center justify-center text-[#77796F] hover:text-[#20221D] cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-[#77796F] mt-0.5">{currentUser.phone || 'No phone number'}</p>
            <span className="mt-2 text-[11px] font-bold text-[#20221D] bg-[#CDEB5A] px-2.5 py-0.5 rounded-full capitalize">
              {role === 'owner' ? 'Owner Account' : 'Member Account'}
            </span>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="w-full bg-white rounded-2xl p-4 border border-[#E4E5D9] shadow-2xs mt-2 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#20221D]">Edit Profile Info</span>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="text-[#77796F] hover:text-[#20221D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#77796F] mb-1">Display Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#FAFBF6] border border-[#E4E5D9] rounded-xl text-xs font-semibold text-[#20221D] focus:outline-hidden focus:border-[#CDEB5A]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#77796F] mb-1">Phone Number</label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAFBF6] border border-[#E4E5D9] rounded-xl text-xs font-semibold text-[#20221D] focus:outline-hidden focus:border-[#CDEB5A]"
              />
            </div>
            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="flex-1 py-2 rounded-xl border border-[#E4E5D9] text-xs font-bold text-[#77796F] hover:bg-[#FAFBF6]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-[#CDEB5A] text-xs font-bold text-[#20221D] hover:bg-[#bfe043]"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* Settings List */}
        <div className="w-full mt-5 space-y-2.5">
          {/* Notifications switch */}
          <div className="bg-white rounded-2xl p-4 border border-[#E4E5D9] flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-[#FAFBF6] border border-[#E4E5D9] flex items-center justify-center text-[#77796F]">
                <Bell className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[#20221D]">Notifications</span>
            </div>

            {/* Toggle switch */}
            <button
              type="button"
              onClick={() => setNotificationsEnabled((prev) => !prev)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                notificationsEnabled ? 'bg-[#4CAF50]' : 'bg-[#D1D5DB]'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Privacy & Security */}
          <div className="bg-white rounded-2xl p-4 border border-[#E4E5D9] flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-[#FAFBF6] border border-[#E4E5D9] flex items-center justify-center text-[#77796F]">
                <ShieldCheck className="w-4 h-4 text-[#4CAF50]" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#20221D] block">End-to-End Private</span>
                <span className="text-[11px] text-[#77796F]">Strictly 1-on-1 private messaging</span>
              </div>
            </div>
          </div>

          {/* Help & Support */}
          <button
            type="button"
            onClick={() => showToast('Support', 'Contact: support@linkchat.io', 'info')}
            className="w-full bg-white hover:bg-[#FAFBF6] rounded-2xl p-4 border border-[#E4E5D9] flex items-center justify-between shadow-2xs transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-[#FAFBF6] border border-[#E4E5D9] flex items-center justify-center text-[#77796F]">
                <HelpCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[#20221D]">Help & Support</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#77796F]" />
          </button>

          {/* About */}
          <button
            type="button"
            onClick={() => showToast('About LinkChat', 'LinkChat v1.0.0 — Private Broadcast Messaging', 'info')}
            className="w-full bg-white hover:bg-[#FAFBF6] rounded-2xl p-4 border border-[#E4E5D9] flex items-center justify-between shadow-2xs transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-[#FAFBF6] border border-[#E4E5D9] flex items-center justify-center text-[#77796F]">
                <Info className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[#20221D]">About LinkChat</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#77796F]" />
          </button>
        </div>

        {/* Logout Button */}
        <div className="w-full mt-6">
          <button
            type="button"
            onClick={logout}
            className="w-full bg-white hover:bg-red-50 active:scale-[0.98] text-[#EF5350] border border-[#EF5350] font-bold text-sm py-3.5 rounded-2xl transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
