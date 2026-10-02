export type UserRole = 'owner' | 'member';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  avatar: string;
  status: 'active' | 'offline';
  joinedAt: string;
}

export interface Member {
  memberId: string;
  ownerId: string;
  userId: string;
  name: string;
  phone: string;
  avatar: string;
  status: 'active' | 'offline';
  joinedAt: string;
  lastActive?: string;
}

export interface Invitation {
  inviteId: string;
  ownerId: string;
  code: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
  usedBy?: string;
}

export interface Conversation {
  conversationId: string;
  ownerId: string;
  memberId: string; // the member's user ID
  createdAt: string;
  updatedAt: string;
  lastMessageText: string;
  lastMessageTime: string;
  lastMessageType: 'text' | 'image' | 'video';
  unreadCountForOwner: number;
  unreadCountForMember: number;
}

export interface Message {
  messageId: string;
  conversationId: string;
  senderId: string; // ownerId or memberId
  recipientId: string;
  type: 'text' | 'image' | 'video';
  text: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  broadcastId?: string; // Optional: tagged if originated from a broadcast fan-out
}

export interface Broadcast {
  broadcastId: string;
  ownerId: string;
  messageContent: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  mediaType?: 'image' | 'video';
  createdAt: string;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
}

export type ScreenId =
  | '01_SPLASH'
  | '02_WELCOME'
  | '03_ACCOUNT_TYPE'
  | '04_OWNER_LOGIN'
  | '05_OWNER_HOME'
  | '06_MEMBERS'
  | '07_ADD_INVITE'
  | '08_BROADCAST_COMPOSER'
  | '09_BROADCAST_PREVIEW'
  | '10_BROADCAST_DETAILS'
  | '11_MEMBER_REGISTRATION'
  | '12_REGISTRATION_SUCCESS'
  | '13_MEMBER_HOME'
  | '14_CHAT'
  | '15_IMAGE_VIEWER'
  | '16_VIDEO_VIEWER'
  | '17_MEMBER_PROFILE'
  | '18_EMPTY_STATE'
  | '19_ERROR_STATE';
