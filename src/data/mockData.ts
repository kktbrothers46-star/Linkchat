import { Broadcast, Conversation, Member, Message, User } from '../types';

export const OWNER_USER: User = {
  id: 'usr_owner_main',
  name: 'Owner',
  phone: '',
  email: '',
  role: 'owner',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  status: 'active',
  joinedAt: new Date().toISOString(),
};

// Clean empty member list
export const INITIAL_MEMBERS: Member[] = [];

// Clean empty broadcast list
export const INITIAL_BROADCASTS: Broadcast[] = [];

// Clean empty conversations and messages
export function generateInitialConversationsAndMessages(): {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
} {
  return {
    conversations: [],
    messages: {},
  };
}
