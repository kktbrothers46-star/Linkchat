import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  INITIAL_BROADCASTS,
  INITIAL_MEMBERS,
  OWNER_USER,
  generateInitialConversationsAndMessages,
} from '../data/mockData';
import { Broadcast, Conversation, Member, Message, ScreenId, User } from '../types';
import {
  checkOwnerExists,
  registerOwnerAccount,
  loginOwnerAccount,
  uploadMediaFile,
  loadOwnerDataFromSupabase,
  saveMemberToSupabase,
  findOwnerByInviteCode,
  updateProfileInSupabase,
  registerMemberViaInvite,
  normalizePhone,
  supabase,
  isSupabaseConfigured,
} from '../lib/supabase';

interface ToastInfo {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'broadcast' | 'error';
}

interface AppContextType {
  // Navigation & Screen
  activeScreen: ScreenId;
  navigateTo: (screen: ScreenId) => void;
  goBack: () => void;
  screenHistory: ScreenId[];

  // User & Persona
  role: 'owner' | 'member';
  currentUser: User;
  activeMemberId: string; // userId of active member when in member role
  currentMember: Member | null;
  switchRole: (newRole: 'owner' | 'member', memberUserId?: string) => void;
  ownerLogin: (password: string, name?: string, phone?: string, mode?: 'login' | 'register' | 'auto') => Promise<{ isNewOwner: boolean }>;
  ownerRegister: (phone: string, password: string, name: string) => Promise<{ isNewOwner: boolean }>;
  checkOwnerPhone: (phone: string) => Promise<{ exists: boolean; name?: string; phone: string; hasCustomPassword?: boolean }>;
  logout: () => void;

  // Data
  ownerUser: User;
  members: Member[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  broadcasts: Broadcast[];

  // Active Chat / Details
  activeConversationId: string | null;
  openChatWithMember: (memberUserId: string) => void;
  openChatWithId: (convId: string) => void;
  activeBroadcastId: string | null;
  openBroadcastDetails: (broadcastId: string) => void;

  // Actions
  sendBroadcastMessage: (text: string, mediaUrl?: string, mediaType?: 'image' | 'video') => Promise<void>;
  sendPrivateMessage: (conversationId: string, text: string, mediaUrl?: string, mediaType?: 'image' | 'video') => void;
  markConversationRead: (conversationId: string) => void;
  addNewMember: (name: string, phone: string) => string;
  registerMemberFromUI: (name: string, phone: string, inviteCode?: string, avatar?: string) => Promise<string> | string;
  updateProfilePicture: (avatarUrl: string) => Promise<void>;
  updateUserProfile: (updates: { name?: string; phone?: string; avatar?: string }) => Promise<void>;
  
  // Media Viewer
  activeMediaView: {
    url: string;
    type: 'image' | 'video';
    title?: string;
  } | null;
  openMediaViewer: (url: string, type: 'image' | 'video', title?: string) => void;
  closeMediaViewer: () => void;

  // Composer Draft state
  draftBroadcast: {
    text: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    mediaFile?: File;
  };
  setDraftBroadcast: React.Dispatch<React.SetStateAction<{
    text: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    mediaFile?: File;
  }>>;

  // Invite codes
  activeInviteCode: string;
  generateNewInviteCode: () => string;

  // System & Dev controls
  isOffline: boolean;
  toggleOffline: () => void;
  toast: ToastInfo | null;
  showToast: (title: string, message: string, type?: 'success' | 'info' | 'broadcast' | 'error') => void;
  dismissToast: () => void;
  sendingProgress: {
    active: boolean;
    current: number;
    total: number;
  };
  resetAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Generate random safe user id
function generateUserId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}

// Generate random invite code like K7P4X9
function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [activeScreen, setActiveScreen] = useState<ScreenId>('01_SPLASH');
  const [screenHistory, setScreenHistory] = useState<ScreenId[]>(['01_SPLASH']);

  // Role & Session
  const [role, setRole] = useState<'owner' | 'member'>(() => {
    const savedRole = localStorage.getItem('linkchat_role');
    return savedRole === 'member' ? 'member' : 'owner';
  });
  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    return localStorage.getItem('linkchat_member_id') || '';
  });

  // Data Store initialized cleanly without sample data
  const [ownerUser, setOwnerUser] = useState<User>(() => {
    const saved = localStorage.getItem('linkchat_owner');
    return saved ? JSON.parse(saved) : OWNER_USER;
  });

  const [members, setMembers] = useState<Member[]>(() => {
    const saved = localStorage.getItem('linkchat_members');
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('linkchat_conversations');
    if (saved) return JSON.parse(saved);
    return generateInitialConversationsAndMessages().conversations;
  });

  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    const saved = localStorage.getItem('linkchat_messages');
    if (saved) return JSON.parse(saved);
    return generateInitialConversationsAndMessages().messages;
  });

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(() => {
    const saved = localStorage.getItem('linkchat_broadcasts');
    return saved ? JSON.parse(saved) : INITIAL_BROADCASTS;
  });

  // Active view states
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeBroadcastId, setActiveBroadcastId] = useState<string | null>(null);
  const [activeMediaView, setActiveMediaView] = useState<{
    url: string;
    type: 'image' | 'video';
    title?: string;
  } | null>(null);

  // Draft broadcast starts empty
  const [draftBroadcast, setDraftBroadcast] = useState<{
    text: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    mediaFile?: File;
  }>({
    text: '',
    mediaUrl: undefined,
    mediaType: undefined,
    mediaFile: undefined,
  });

  // Invite code
  const [activeInviteCode, setActiveInviteCode] = useState<string>('K7P4X9');

  // Offline simulation
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Feedback
  const [toast, setToast] = useState<ToastInfo | null>(null);
  const [sendingProgress, setSendingProgress] = useState<{
    active: boolean;
    current: number;
    total: number;
  }>({
    active: false,
    current: 0,
    total: 0,
  });

  // Supabase Initial Cloud Sync on Mount / App Open
  useEffect(() => {
    if (isSupabaseConfigured) {
      // 1. Verify and restore active Supabase Auth session if present
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const authUserId = session.user.id;
          (async () => {
            try {
              const { data: ownerData } = await supabase
                .from('owners')
                .select('*')
                .eq('id', authUserId)
                .maybeSingle();

              if (ownerData) {
                const restoredOwner: User = {
                  id: ownerData.id,
                  name: ownerData.name,
                  phone: ownerData.phone,
                  avatar: ownerData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                  role: 'owner',
                  status: 'active',
                  joinedAt: ownerData.created_at || new Date().toISOString(),
                };
                setOwnerUser(restoredOwner);
                localStorage.setItem('linkchat_owner', JSON.stringify(restoredOwner));
                if (ownerData.invite_code) {
                  setActiveInviteCode(ownerData.invite_code);
                }
              }
            } catch (err) {
              console.warn('Owner profile fetch error:', err);
            }
          })();

          loadOwnerDataFromSupabase(authUserId)
            .then((cloudData) => {
              setBroadcasts(cloudData.broadcasts);
              setMembers(cloudData.members);
              setConversations(cloudData.conversations);
              setMessages(cloudData.messages);
              if (cloudData.inviteCode) setActiveInviteCode(cloudData.inviteCode);
            })
            .catch((err) => {
              console.warn('Initial Supabase sync notice:', err);
            });
        } else if (role === 'owner' && ownerUser.id) {
          loadOwnerDataFromSupabase(ownerUser.id)
            .then((cloudData) => {
              setBroadcasts(cloudData.broadcasts);
              setMembers(cloudData.members);
              setConversations(cloudData.conversations);
              setMessages(cloudData.messages);
              if (cloudData.inviteCode) setActiveInviteCode(cloudData.inviteCode);
            })
            .catch((err) => {
              console.warn('Initial Supabase sync notice:', err);
            });
        }
      });
    }
  }, [role]);

  // Persist critical state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('linkchat_owner', JSON.stringify(ownerUser));
      localStorage.setItem('linkchat_members', JSON.stringify(members));
      localStorage.setItem('linkchat_conversations', JSON.stringify(conversations));
      localStorage.setItem('linkchat_messages', JSON.stringify(messages));
      localStorage.setItem('linkchat_broadcasts', JSON.stringify(broadcasts));
    } catch (e) {
      console.warn('Storage quota exceeded', e);
    }
  }, [ownerUser, members, conversations, messages, broadcasts]);

  // Current active member object
  const currentMember = members.find((m) => m.userId === activeMemberId) || null;

  // Current user object depending on active role
  const currentUser: User =
    role === 'owner'
      ? ownerUser
      : {
          id: currentMember?.userId || activeMemberId || 'guest_member',
          name: currentMember?.name || 'Member',
          phone: currentMember?.phone || '',
          role: 'member',
          avatar: currentMember?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          status: 'active',
          joinedAt: currentMember?.joinedAt || new Date().toISOString(),
        };

  // Sound feedback
  const playSound = (type: 'send' | 'receive' | 'broadcast') => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'send') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } else if (type === 'broadcast') {
        osc.frequency.setValueAtTime(520, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1040, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else {
        osc.frequency.setValueAtTime(660, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      }
    } catch {
      // Audio context might be restricted before user interaction
    }
  };

  // Show toast notification
  const showToast = (title: string, message: string, type: 'success' | 'info' | 'broadcast' | 'error' = 'info') => {
    setToast({ id: Date.now().toString(), title, message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.title === title ? null : prev));
    }, 4000);
  };

  const dismissToast = () => setToast(null);

  // Navigation handlers
  const navigateTo = (screen: ScreenId) => {
    setScreenHistory((prev) => [...prev, screen]);
    setActiveScreen(screen);
  };

  const goBack = () => {
    if (screenHistory.length > 1) {
      const nextHistory = [...screenHistory];
      nextHistory.pop();
      const prevScreen = nextHistory[nextHistory.length - 1];
      setScreenHistory(nextHistory);
      setActiveScreen(prevScreen);
    } else {
      // Fallback
      if (role === 'owner') {
        setActiveScreen('05_OWNER_HOME');
      } else {
        setActiveScreen('13_MEMBER_HOME');
      }
    }
  };

  const switchRole = (newRole: 'owner' | 'member', memberUserId?: string) => {
    setRole(newRole);
    if (memberUserId) {
      setActiveMemberId(memberUserId);
    } else if (members.length > 0) {
      setActiveMemberId(members[0].userId);
    }
    if (newRole === 'owner') {
      setActiveScreen('05_OWNER_HOME');
      showToast('Switched to Owner Mode', `Logged in as Owner`, 'info');
    } else {
      const mem = members.find((m) => m.userId === (memberUserId || activeMemberId)) || members[0];
      if (mem) {
        setActiveMemberId(mem.userId);
        const convId = `conv_${ownerUser.id}_${mem.userId}`;

        // Ensure member conversation includes all previous activities and broadcasts done before
        if (broadcasts.length > 0) {
          setMessages((prevMsgs) => {
            const currentMsgs = prevMsgs[convId] || [];
            const existingBcIds = new Set(currentMsgs.map((m) => m.broadcastId).filter(Boolean));
            const missingBcMsgs: Message[] = [];
            const sortedBc = [...broadcasts].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            sortedBc.forEach((bc) => {
              if (!existingBcIds.has(bc.broadcastId)) {
                missingBcMsgs.push({
                  messageId: `msg_${bc.broadcastId}_${mem.userId}`,
                  conversationId: convId,
                  senderId: ownerUser.id,
                  recipientId: mem.userId,
                  type: bc.mediaType || (bc.mediaUrl ? 'image' : 'text'),
                  text: bc.messageContent,
                  mediaUrl: bc.mediaUrl,
                  thumbnailUrl: bc.thumbnailUrl,
                  createdAt: bc.createdAt,
                  deliveredAt: new Date().toISOString(),
                  status: 'delivered',
                  broadcastId: bc.broadcastId,
                });
              }
            });
            if (missingBcMsgs.length > 0) {
              return {
                ...prevMsgs,
                [convId]: [...currentMsgs, ...missingBcMsgs],
              };
            }
            return prevMsgs;
          });
        }

        showToast('Switched to Member Mode', `Viewing private chats as ${mem.name}`, 'info');
        setActiveScreen('13_MEMBER_HOME');
      } else {
        // No members yet, open registration
        setActiveScreen('11_MEMBER_REGISTRATION');
      }
    }
  };

  // Check owner phone directly via Supabase / backend
  const checkOwnerPhone = async (
    phone: string
  ): Promise<{ exists: boolean; name?: string; phone: string; hasCustomPassword?: boolean }> => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) return { exists: false, phone: '' };
    try {
      const res = await checkOwnerExists(cleanPhone);
      return { exists: res.exists, name: res.name, phone: cleanPhone };
    } catch (e) {
      console.warn('Check owner phone network warning', e);
      return { exists: false, phone: cleanPhone };
    }
  };

  // Dedicated New Owner Registration
  const ownerRegister = async (
    phone: string,
    password: string,
    name: string
  ): Promise<{ isNewOwner: boolean }> => {
    const cleanPhone = phone.trim();
    const cleanPassword = password.trim();
    const cleanName = name.trim() || 'Owner';

    if (!cleanPhone) throw new Error('Phone number is required.');
    if (!cleanPassword || cleanPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    if (!cleanName) throw new Error('Please enter your Owner or Organization name.');

    const result = await registerOwnerAccount(cleanPhone, cleanPassword, cleanName);

    setOwnerUser(result.user);
    setActiveInviteCode(result.inviteCode);
    setBroadcasts([]);
    setMembers([]);
    setConversations([]);
    setMessages({});
    setActiveConversationId(null);
    setActiveBroadcastId(null);

    setRole('owner');
    localStorage.setItem('linkchat_role', 'owner');
    localStorage.setItem('linkchat_owner', JSON.stringify(result.user));
    localStorage.setItem('linkchat_logged_in', 'true');
    localStorage.setItem('linkchat_invite_code', result.inviteCode);
    localStorage.setItem('linkchat_broadcasts', JSON.stringify([]));
    localStorage.setItem('linkchat_members', JSON.stringify([]));
    localStorage.setItem('linkchat_conversations', JSON.stringify([]));
    localStorage.setItem('linkchat_messages', JSON.stringify({}));
    localStorage.setItem('linkchat_token', result.token || `tok_owner_${result.user.id}`);

    showToast('New Owner Account Created', `Fresh account initialized for ${cleanPhone}. Welcome!`, 'success');
    return { isNewOwner: true };
  };

  // Existing Owner Authentication
  const ownerLogin = async (
    password: string,
    name?: string,
    phone?: string,
    mode: 'login' | 'register' | 'auto' = 'auto'
  ): Promise<{ isNewOwner: boolean }> => {
    const cleanPhone = (phone || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanPhone) {
      throw new Error('Please enter your phone number to access your owner account.');
    }
    if (!cleanPassword) {
      throw new Error('Please enter your owner password.');
    }

    // If explicit registration requested, route to ownerRegister
    if (mode === 'register') {
      return await ownerRegister(cleanPhone, cleanPassword, name || 'Owner');
    }

    // STRICT EXISTING OWNER LOGIN
    const result = await loginOwnerAccount(cleanPhone, cleanPassword);

    setOwnerUser(result.user);
    if (result.inviteCode) setActiveInviteCode(result.inviteCode);
    localStorage.setItem('linkchat_token', result.token || `tok_owner_${result.user.id}`);

    // Sync persistent owner records from Supabase
    if (isSupabaseConfigured) {
      try {
        const cloudData = await loadOwnerDataFromSupabase(result.user.id);
        setBroadcasts(cloudData.broadcasts);
        setMembers(cloudData.members);
        setConversations(cloudData.conversations);
        setMessages(cloudData.messages);
        if (cloudData.inviteCode) setActiveInviteCode(cloudData.inviteCode);
      } catch (err) {
        console.warn('Error loading owner data from Supabase:', err);
      }
    } else {
      // Local fallback restore
      const cached = localStorage.getItem(`linkchat_owner_data_${cleanPhone}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.broadcasts)) setBroadcasts(parsed.broadcasts);
          if (Array.isArray(parsed.members)) setMembers(parsed.members);
          if (Array.isArray(parsed.conversations)) setConversations(parsed.conversations);
          if (parsed.messages) setMessages(parsed.messages);
          if (parsed.inviteCode) setActiveInviteCode(parsed.inviteCode);
        } catch {}
      }
    }

    setRole('owner');
    localStorage.setItem('linkchat_role', 'owner');
    localStorage.setItem('linkchat_owner', JSON.stringify(result.user));
    localStorage.setItem('linkchat_logged_in', 'true');

    showToast('Welcome Back', `Logged in to owner account (${cleanPhone})`, 'success');
    return { isNewOwner: false };
  };


  const logout = () => {
    // Save current owner data before logging out so it is safe
    if (ownerUser.phone) {
      try {
        localStorage.setItem(`linkchat_owner_data_${ownerUser.phone}`, JSON.stringify({
          owner: ownerUser,
          broadcasts,
          members,
          conversations,
          messages,
          inviteCode: activeInviteCode,
        }));
      } catch (e) {
        console.warn('Storage quota warning', e);
      }
    }
    if (isSupabaseConfigured) {
      supabase.auth.signOut().catch(() => {});
    }
    localStorage.removeItem('linkchat_token');
    localStorage.removeItem('linkchat_role');
    localStorage.removeItem('linkchat_owner');
    localStorage.removeItem('linkchat_logged_in');
    localStorage.removeItem('linkchat_member_id');
    setActiveMemberId('');
    setActiveScreen('03_ACCOUNT_TYPE');
    showToast('Logged out', 'Returned to account selection');
  };

  // Open chat with member
  const openChatWithMember = (memberUserId: string) => {
    const convId = `conv_${ownerUser.id}_${memberUserId}`;
    setActiveConversationId(convId);
    markConversationRead(convId);
    navigateTo('14_CHAT');
  };

  const openChatWithId = (convId: string) => {
    setActiveConversationId(convId);
    markConversationRead(convId);
    navigateTo('14_CHAT');
  };

  const openBroadcastDetails = (broadcastId: string) => {
    setActiveBroadcastId(broadcastId);
    navigateTo('10_BROADCAST_DETAILS');
  };

  const openMediaViewer = (url: string, type: 'image' | 'video', title?: string) => {
    setActiveMediaView({ url, type, title });
    if (type === 'image') {
      navigateTo('15_IMAGE_VIEWER');
    } else {
      navigateTo('16_VIDEO_VIEWER');
    }
  };

  const closeMediaViewer = () => {
    setActiveMediaView(null);
    goBack();
  };

  // Mark conversation read
  const markConversationRead = (convId: string) => {
    const isOwnerViewing = role === 'owner';

    // Update conversation unread counts
    setConversations((prev) =>
      prev.map((c) => {
        if (c.conversationId === convId) {
          return {
            ...c,
            unreadCountForOwner: isOwnerViewing ? 0 : c.unreadCountForOwner,
            unreadCountForMember: !isOwnerViewing ? 0 : c.unreadCountForMember,
          };
        }
        return c;
      })
    );

    // Update message status in the conversation to 'read'
    setMessages((prev) => {
      const convMessages = prev[convId] || [];
      const updatedMessages = convMessages.map((m) => {
        // If owner is viewing, messages sent by member become read
        if (isOwnerViewing && m.senderId !== ownerUser.id && m.status !== 'read') {
          return { ...m, status: 'read' as const, readAt: new Date().toISOString() };
        }
        // If member is viewing, messages sent by owner become read
        if (!isOwnerViewing && m.senderId === ownerUser.id && m.status !== 'read') {
          return { ...m, status: 'read' as const, readAt: new Date().toISOString() };
        }
        return m;
      });

      return {
        ...prev,
        [convId]: updatedMessages,
      };
    });

    // If member just read messages that originated from a broadcast, increment read count on that broadcast
    if (!isOwnerViewing) {
      const convMsgs = messages[convId] || [];
      const broadcastIdsRead = new Set<string>();
      convMsgs.forEach((m) => {
        if (m.senderId === ownerUser.id && m.broadcastId && m.status !== 'read') {
          broadcastIdsRead.add(m.broadcastId);
        }
      });

      if (broadcastIdsRead.size > 0) {
        setBroadcasts((prev) =>
          prev.map((bc) => {
            if (broadcastIdsRead.has(bc.broadcastId)) {
              return {
                ...bc,
                readCount: Math.min(bc.recipientCount, bc.readCount + 1),
              };
            }
            return bc;
          })
        );
      }
    }
  };

  // Send a private 1-on-1 message in an active conversation
  const sendPrivateMessage = (
    convId: string,
    text: string,
    mediaUrl?: string,
    mediaType: 'image' | 'video' = 'text' as 'image'
  ) => {
    if (isOffline) {
      navigateTo('19_ERROR_STATE');
      return;
    }

    const conv = conversations.find((c) => c.conversationId === convId);
    if (!conv) return;

    const isSenderOwner = role === 'owner';
    const senderId = isSenderOwner ? ownerUser.id : currentUser.id;
    const recipientId = isSenderOwner ? conv.memberId : ownerUser.id;

    const newMsg: Message = {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      conversationId: convId,
      senderId,
      recipientId,
      type: mediaUrl ? (mediaType || 'image') : 'text',
      text,
      mediaUrl,
      thumbnailUrl: mediaUrl,
      createdAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
      status: 'delivered',
    };

    playSound('send');

    // Add message
    setMessages((prev) => ({
      ...prev,
      [convId]: [...(prev[convId] || []), newMsg],
    }));

    // Update conversation summary
    setConversations((prev) =>
      prev.map((c) => {
        if (c.conversationId === convId) {
          return {
            ...c,
            updatedAt: new Date().toISOString(),
            lastMessageText: text || (mediaUrl ? `📷 ${mediaType}` : 'Message'),
            lastMessageTime: 'Just now',
            lastMessageType: newMsg.type,
            unreadCountForOwner: !isSenderOwner ? c.unreadCountForOwner + 1 : c.unreadCountForOwner,
            unreadCountForMember: isSenderOwner ? c.unreadCountForMember + 1 : c.unreadCountForMember,
          };
        }
        return c;
      })
    );

    // Sync message to Supabase PostgreSQL if configured
    if (isSupabaseConfigured) {
      (async () => {
        try {
          await supabase.from('messages').insert({
            id: newMsg.messageId,
            conversation_id: convId,
            sender_id: newMsg.senderId,
            recipient_id: newMsg.recipientId,
            type: newMsg.type,
            text: newMsg.text,
            media_url: newMsg.mediaUrl,
            status: 'delivered',
            created_at: newMsg.createdAt,
            delivered_at: newMsg.deliveredAt,
          });

          await supabase.from('conversations').upsert({
            id: convId,
            owner_id: ownerUser.id,
            member_id: conv.memberId,
            updated_at: new Date().toISOString(),
            last_message_text: text || (mediaUrl ? `📷 ${mediaType}` : 'Message'),
            last_message_time: 'Just now',
            last_message_type: newMsg.type,
            unread_count_for_owner: !isSenderOwner ? conv.unreadCountForOwner + 1 : conv.unreadCountForOwner,
            unread_count_for_member: isSenderOwner ? conv.unreadCountForMember + 1 : conv.unreadCountForMember,
          });
        } catch (err) {
          console.warn('Supabase private message sync notice:', err);
        }
      })();
    }

    // If sent by owner to member, show toast
    if (isSenderOwner) {
      const recipientMember = members.find((m) => m.userId === recipientId);
      showToast('Message Delivered', `Privately delivered to ${recipientMember?.name || 'Member'}`);
    } else {
      showToast('Reply Sent', `Sent privately to ${ownerUser.name || 'Owner'}`);
    }
  };

  // SEND BROADCAST: FAN-OUT TO INDIVIDUAL PRIVATE CONVERSATIONS
  const sendBroadcastMessage = async (
    text: string,
    mediaUrl?: string,
    mediaType: 'image' | 'video' = 'image'
  ): Promise<void> => {
    if (isOffline) {
      navigateTo('19_ERROR_STATE');
      return;
    }

    // If a media file was attached, upload it to Supabase Storage first
    let permanentMediaUrl = mediaUrl;
    if (draftBroadcast.mediaFile) {
      try {
        const uploadResult = await uploadMediaFile(draftBroadcast.mediaFile, 'broadcasts', ownerUser.id);
        permanentMediaUrl = uploadResult.url;
      } catch (uploadErr) {
        console.warn('Supabase storage upload error, using local url:', uploadErr);
      }
    }

    const totalMembers = members.length;
    setSendingProgress({ active: true, current: 0, total: Math.max(totalMembers, 1) });

    const broadcastId = `bc_${Date.now()}`;
    const timestamp = new Date().toISOString();

    if (totalMembers > 0) {
      let currentProgress = 0;
      for (let i = 0; i < totalMembers; i++) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        currentProgress++;
        setSendingProgress({ active: true, current: currentProgress, total: totalMembers });
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setSendingProgress({ active: true, current: 1, total: 1 });
    }

    // Create the master Broadcast record for Owner stats
    const newBroadcast: Broadcast = {
      broadcastId,
      ownerId: ownerUser.id,
      messageContent: text,
      mediaUrl: permanentMediaUrl,
      thumbnailUrl: permanentMediaUrl,
      mediaType,
      createdAt: timestamp,
      recipientCount: totalMembers,
      sentCount: totalMembers,
      deliveredCount: totalMembers,
      readCount: 0,
    };

    // Update broadcasts list
    setBroadcasts((prev) => [newBroadcast, ...prev]);

    // Fan-out: create individual private delivery for each member
    setMessages((prev) => {
      const nextMessages = { ...prev };

      members.forEach((member) => {
        const convId = `conv_${ownerUser.id}_${member.userId}`;
        const individualMessage: Message = {
          messageId: `msg_${broadcastId}_${member.userId}`,
          conversationId: convId,
          senderId: ownerUser.id,
          recipientId: member.userId,
          type: permanentMediaUrl ? mediaType : 'text',
          text,
          mediaUrl: permanentMediaUrl,
          thumbnailUrl: permanentMediaUrl,
          createdAt: timestamp,
          deliveredAt: timestamp,
          status: 'delivered',
          broadcastId,
        };

        nextMessages[convId] = [...(nextMessages[convId] || []), individualMessage];
      });

      return nextMessages;
    });

    // Update conversation previews for all members
    setConversations((prev) => {
      const existingConvMap = new Map(prev.map((c) => [c.memberId, c]));

      const updated = members.map((member) => {
        const convId = `conv_${ownerUser.id}_${member.userId}`;
        const existing = existingConvMap.get(member.userId);

        if (existing) {
          return {
            ...existing,
            updatedAt: timestamp,
            lastMessageText: text || (permanentMediaUrl ? `📷 Photo` : 'Broadcast message'),
            lastMessageTime: 'Just now',
            lastMessageType: (permanentMediaUrl ? mediaType : 'text') as 'text' | 'image' | 'video',
            unreadCountForMember: existing.unreadCountForMember + 1,
          };
        } else {
          return {
            conversationId: convId,
            ownerId: ownerUser.id,
            memberId: member.userId,
            createdAt: timestamp,
            updatedAt: timestamp,
            lastMessageText: text || (permanentMediaUrl ? `📷 Photo` : 'Broadcast message'),
            lastMessageTime: 'Just now',
            lastMessageType: (permanentMediaUrl ? mediaType : 'text') as 'text' | 'image' | 'video',
            unreadCountForOwner: 0,
            unreadCountForMember: 1,
          };
        }
      });

      return updated;
    });

    // Persist Broadcast and Fan-Out Messages to Supabase PostgreSQL if configured
    if (isSupabaseConfigured) {
      try {
        await supabase.from('broadcasts').insert({
          id: broadcastId,
          owner_id: ownerUser.id,
          message_content: text,
          media_url: permanentMediaUrl,
          media_type: mediaType,
          recipient_count: totalMembers,
          sent_count: totalMembers,
          delivered_count: totalMembers,
          read_count: 0,
          created_at: timestamp,
        });

        if (totalMembers > 0) {
          const msgsToInsert = members.map((member) => ({
            id: `msg_${broadcastId}_${member.userId}`,
            conversation_id: `conv_${ownerUser.id}_${member.userId}`,
            sender_id: ownerUser.id,
            recipient_id: member.userId,
            type: permanentMediaUrl ? mediaType : 'text',
            text,
            media_url: permanentMediaUrl,
            status: 'delivered',
            broadcast_id: broadcastId,
            created_at: timestamp,
            delivered_at: timestamp,
          }));
          await supabase.from('messages').insert(msgsToInsert);
        }
      } catch (err) {
        console.warn('Supabase broadcast sync error:', err);
      }
    }

    playSound('broadcast');
    setSendingProgress({ active: false, current: totalMembers, total: totalMembers });
    setActiveBroadcastId(broadcastId);

    // Clear draft broadcast
    setDraftBroadcast({ text: '', mediaUrl: undefined, mediaType: undefined, mediaFile: undefined });

    // Show toast
    showToast(
      totalMembers > 0 ? 'Broadcast Sent!' : 'Activity Saved!',
      totalMembers > 0
        ? `Privately delivered to all ${totalMembers} member(s).`
        : 'Announcement stored. All members who join will see this activity.',
      'broadcast'
    );

    // Transition to Screen 10 (Broadcast Details)
    navigateTo('10_BROADCAST_DETAILS');
  };


  // Add Member Manually
  const addNewMember = (name: string, phone: string): string => {
    const newUserId = generateUserId('usr_mem');
    const newMemberId = `mem_${Date.now()}`;
    const newMember: Member = {
      memberId: newMemberId,
      ownerId: ownerUser.id,
      userId: newUserId,
      name,
      phone,
      avatar: `https://images.unsplash.com/photo-${1530000000000 + Math.floor(Math.random() * 50000000)}?w=150&auto=format&fit=crop&q=80`,
      status: 'active',
      joinedAt: new Date().toISOString(),
      lastActive: 'Online',
    };

    setMembers((prev) => [newMember, ...prev]);

    // Create initial private conversation with owner
    const convId = `conv_${ownerUser.id}_${newUserId}`;
    const newConv: Conversation = {
      conversationId: convId,
      ownerId: ownerUser.id,
      memberId: newUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageText: `Connected with ${ownerUser.name || 'Owner'}`,
      lastMessageTime: 'Just now',
      lastMessageType: 'text',
      unreadCountForOwner: 0,
      unreadCountForMember: 0,
    };
    setConversations((prev) => [newConv, ...prev]);

    showToast('Member Added', `${name} has been added to your broadcast list.`);

    // Sync member and conversation to Supabase if configured
    if (isSupabaseConfigured) {
      saveMemberToSupabase(ownerUser.id, newMember, newConv);
    }

    return newUserId;
  };

  // Member Registration from UI
  const registerMemberFromUI = async (name: string, phone: string, inviteCode?: string, avatar?: string): Promise<string> => {
    let newUserId = generateUserId('usr_mem');
    let memberToken = `tok_${Date.now()}`;
    const cleanAvatar = avatar?.trim() || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

    // Resolve owner if inviteCode provided
    let targetOwnerId = ownerUser.id;
    if (inviteCode && isSupabaseConfigured) {
      const rpcResult = await registerMemberViaInvite(inviteCode, name, phone, cleanAvatar);
      if (rpcResult) {
        targetOwnerId = rpcResult.ownerId;
        newUserId = rpcResult.userId;
      } else {
        const resolvedOwnerId = await findOwnerByInviteCode(inviteCode);
        if (resolvedOwnerId) targetOwnerId = resolvedOwnerId;
      }
    }

    localStorage.setItem('linkchat_token', memberToken);
    localStorage.setItem('linkchat_role', 'member');
    localStorage.setItem('linkchat_member_id', newUserId);
    localStorage.setItem('linkchat_logged_in', 'true');

    const newMemberId = `mem_${Date.now()}`;
    const newMember: Member = {
      memberId: newMemberId,
      ownerId: targetOwnerId,
      userId: newUserId,
      name: name.trim() || 'New Member',
      phone: phone.trim() || '',
      avatar: cleanAvatar,
      status: 'active',
      joinedAt: new Date().toISOString(),
      lastActive: 'Online',
    };

    setMembers((prev) => {
      const filtered = prev.filter((m) => m.userId !== newUserId);
      return [newMember, ...filtered];
    });

    // Create private 1-on-1 conversation with the owner
    const convId = `conv_${targetOwnerId}_${newUserId}`;
    const welcomeMsg: Message = {
      messageId: `msg_welcome_${newUserId}`,
      conversationId: convId,
      senderId: targetOwnerId,
      recipientId: newUserId,
      type: 'text',
      text: `Welcome to LinkChat ${newMember.name}! You will receive private announcements here from me. You can reply directly to this chat at any time.`,
      createdAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString(),
      status: 'delivered',
    };

    // Gather all previous activities and broadcasts done before so the new member can see everything!
    const activityMessages: Message[] = [];
    if (broadcasts.length > 0) {
      const sortedBc = [...broadcasts].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      sortedBc.forEach((bc) => {
        activityMessages.push({
          messageId: `msg_${bc.broadcastId}_${newUserId}`,
          conversationId: convId,
          senderId: targetOwnerId,
          recipientId: newUserId,
          type: bc.mediaType || (bc.mediaUrl ? 'image' : 'text'),
          text: bc.messageContent,
          mediaUrl: bc.mediaUrl,
          thumbnailUrl: bc.thumbnailUrl,
          createdAt: bc.createdAt,
          deliveredAt: new Date().toISOString(),
          status: 'delivered',
          broadcastId: bc.broadcastId,
        });
      });
    } else {
      activityMessages.push(welcomeMsg);
    }

    const lastMsg = activityMessages[activityMessages.length - 1];

    const newConv: Conversation = {
      conversationId: convId,
      ownerId: targetOwnerId,
      memberId: newUserId,
      createdAt: new Date().toISOString(),
      updatedAt: lastMsg.createdAt || new Date().toISOString(),
      lastMessageText: lastMsg.text || (lastMsg.mediaUrl ? '📷 Media' : 'Announcement'),
      lastMessageTime: 'Just now',
      lastMessageType: lastMsg.type,
      unreadCountForOwner: 0,
      unreadCountForMember: activityMessages.length,
    };

    setConversations((prev) => [
      newConv,
      ...prev.filter((c) => c.conversationId !== convId),
    ]);

    setMessages((prev) => ({
      ...prev,
      [convId]: activityMessages,
    }));

    // Persist to Supabase if configured
    if (isSupabaseConfigured) {
      saveMemberToSupabase(targetOwnerId, newMember, newConv, activityMessages).catch((err) => {
        console.warn('Supabase member persistence notice:', err);
      });
    }

    // Switch active session to this new member
    setRole('member');
    setActiveMemberId(newUserId);

    showToast('Registration Complete', `Signed in as ${newMember.name}`, 'success');
    return newUserId;
  };

  // Update Profile Picture
  const updateProfilePicture = async (avatarUrl: string): Promise<void> => {
    await updateUserProfile({ avatar: avatarUrl });
  };

  // Update User Profile (Avatar, Name, Phone)
  const updateUserProfile = async (updates: { name?: string; phone?: string; avatar?: string }): Promise<void> => {
    if (role === 'owner') {
      const updated: User = {
        ...ownerUser,
        name: updates.name !== undefined ? updates.name.trim() : ownerUser.name,
        phone: updates.phone !== undefined ? updates.phone.trim() : ownerUser.phone,
        avatar: updates.avatar !== undefined ? updates.avatar : ownerUser.avatar,
      };
      setOwnerUser(updated);
      localStorage.setItem('linkchat_owner', JSON.stringify(updated));

      if (isSupabaseConfigured) {
        updateProfileInSupabase('owner', ownerUser.id, updates).catch(() => {});
      }
    } else {
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === activeMemberId
            ? {
                ...m,
                name: updates.name !== undefined ? updates.name.trim() : m.name,
                phone: updates.phone !== undefined ? updates.phone.trim() : m.phone,
                avatar: updates.avatar !== undefined ? updates.avatar : m.avatar,
              }
            : m
        )
      );

      if (isSupabaseConfigured) {
        updateProfileInSupabase('member', activeMemberId, updates).catch(() => {});
      }
    }

    showToast('Profile Updated', 'Your profile details have been saved.', 'success');
  };

  const generateNewInviteCode = (): string => {
    const code = generateRandomCode();
    setActiveInviteCode(code);

    if (isSupabaseConfigured && ownerUser.id) {
      (async () => {
        try {
          await supabase.from('invitations').insert({
            code,
            owner_id: ownerUser.id,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            used_count: 0,
          });

          await supabase
            .from('owners')
            .update({ invite_code: code })
            .eq('id', ownerUser.id);
        } catch (err) {
          console.warn('Supabase invite code save notice:', err);
        }
      })();
    }

    showToast('New Invite Code Generated', `Code: ${code} (Expires in 7 days)`, 'success');
    return code;
  };

  const toggleOffline = () => {
    setIsOffline((prev) => {
      const next = !prev;
      if (next) {
        showToast('Network Disconnected', 'Simulating offline mode. Messages will be queued.', 'info');
      } else {
        showToast('Back Online', 'Reconnected to LinkChat server.', 'success');
      }
      return next;
    });
  };

  const resetAllData = () => {
    localStorage.removeItem('linkchat_owner');
    localStorage.removeItem('linkchat_members');
    localStorage.removeItem('linkchat_conversations');
    localStorage.removeItem('linkchat_messages');
    localStorage.removeItem('linkchat_broadcasts');
    setMembers([]);
    setConversations([]);
    setMessages({});
    setBroadcasts([]);
    setActiveConversationId(null);
    setActiveBroadcastId(null);
    setActiveMemberId('');
    setDraftBroadcast({ text: '', mediaUrl: undefined, mediaType: undefined });
    showToast('Data Cleared', 'All mock records have been completely reset.');
  };

  return (
    <AppContext.Provider
      value={{
        activeScreen,
        navigateTo,
        goBack,
        screenHistory,
        role,
        currentUser,
        activeMemberId,
        currentMember,
        switchRole,
        ownerLogin,
        ownerRegister,
        checkOwnerPhone,
        logout,
        ownerUser,
        members,
        conversations,
        messages,
        broadcasts,
        activeConversationId,
        openChatWithMember,
        openChatWithId,
        activeBroadcastId,
        openBroadcastDetails,
        sendBroadcastMessage,
        sendPrivateMessage,
        markConversationRead,
        addNewMember,
        registerMemberFromUI,
        updateProfilePicture,
        updateUserProfile,
        activeMediaView,
        openMediaViewer,
        closeMediaViewer,
        draftBroadcast,
        setDraftBroadcast,
        activeInviteCode,
        generateNewInviteCode,
        isOffline,
        toggleOffline,
        toast,
        showToast,
        dismissToast,
        sendingProgress,
        resetAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
