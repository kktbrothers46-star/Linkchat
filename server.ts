import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = 3000;

// Universal CORS Middleware for Web and Median Android WebView
app.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Increase payload limit for images and videos
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Cryptographic Password Hashing Helpers (Node.js scrypt + salt)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash) return false;
  if (!storedHash.includes(':')) {
    // Backward compatibility for legacy test records
    return storedHash === password;
  }
  try {
    const [salt, key] = storedHash.split(':');
    const testKey = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(testKey, 'hex'));
  } catch {
    return false;
  }
}

// In-Memory Secure Backend Datastore
interface UserRecord {
  id: string; // Random internal user ID
  name: string;
  phone: string;
  password?: string;
  role: 'owner' | 'member';
  avatar: string;
  token: string;
  ownerId?: string; // Links member to their specific owner
  createdAt: string;
}

interface InvitationRecord {
  code: string;
  ownerId: string;
  createdAt: string;
  expiresAt: string;
  usedCount: number;
}

interface ConversationRecord {
  id: string; // conv_ownerId_memberId
  ownerId: string;
  memberId: string;
  createdAt: string;
  updatedAt: string;
}

interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  type: 'text' | 'image' | 'video';
  text: string;
  mediaId?: string; // Reference to secure media store
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
  status: 'sent' | 'delivered' | 'read';
  broadcastId?: string;
}

interface BroadcastRecord {
  id: string;
  ownerId: string;
  messageContent: string;
  mediaId?: string;
  mediaType?: 'image' | 'video';
  createdAt: string;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
}

interface MediaRecord {
  id: string;
  uploaderId: string;
  conversationId?: string;
  messageId?: string;
  mimeType: string;
  dataBase64: string; // Base64 data string
  fileSize: number;
  fileName: string;
  createdAt: string;
}

const users = new Map<string, UserRecord>();
const invitations = new Map<string, InvitationRecord>();
const conversations = new Map<string, ConversationRecord>();
const messages = new Map<string, MessageRecord>();
const broadcasts = new Map<string, BroadcastRecord>();
const mediaStore = new Map<string, MediaRecord>();

// Persistent Database Storage File
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function saveDb() {
  try {
    ensureDataDir();
    const data = {
      users: Array.from(users.values()),
      invitations: Array.from(invitations.values()),
      conversations: Array.from(conversations.values()),
      messages: Array.from(messages.values()),
      broadcasts: Array.from(broadcasts.values()),
      mediaStore: Array.from(mediaStore.values()),
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save db.json:', err);
  }
}

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.users)) {
        for (const u of data.users) users.set(u.id, u);
      }
      if (Array.isArray(data.invitations)) {
        for (const inv of data.invitations) invitations.set(inv.code, inv);
      }
      if (Array.isArray(data.conversations)) {
        for (const c of data.conversations) conversations.set(c.id, c);
      }
      if (Array.isArray(data.messages)) {
        for (const m of data.messages) messages.set(m.id, m);
      }
      if (Array.isArray(data.broadcasts)) {
        for (const b of data.broadcasts) broadcasts.set(b.id, b);
      }
      if (Array.isArray(data.mediaStore)) {
        for (const md of data.mediaStore) mediaStore.set(md.id, md);
      }
      console.log(`Database loaded: ${users.size} users, ${broadcasts.size} broadcasts, ${conversations.size} conversations`);
    }
  } catch (err) {
    console.error('Failed to load db.json:', err);
  }
}

// Initial load from disk
loadDb();

// Helper to generate unique 6-character random uppercase alphanumeric invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Authentication Middleware
function authenticateUser(req: Request): UserRecord | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  for (const user of users.values()) {
    if (user.token === token) {
      return user;
    }
  }
  return null;
}

// ---------------- API ROUTES ----------------

// 1. Owner Authentication & Dynamic Account Detection

// Helper to normalize phone numbers
function normalizePhone(phone: string): string {
  const trimmed = (phone || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.substring(1).replace(/[^0-9]/g, '');
  }
  return trimmed.replace(/[^0-9]/g, '') || trimmed;
}

// 1a. Check if Phone Number belongs to an existing owner
app.post('/api/auth/owner-check', (req: Request, res: Response) => {
  const { phone } = req.body || {};
  const cleanPhone = normalizePhone(phone) || (phone || '').trim();
  if (!cleanPhone) {
    res.status(400).json({ error: 'Phone number is required.' });
    return;
  }

  const owner = Array.from(users.values()).find(
    (u) => u.role === 'owner' && (normalizePhone(u.phone) === cleanPhone || u.phone === cleanPhone)
  );

  if (owner) {
    res.json({
      exists: true,
      phone: owner.phone,
      name: owner.name,
      hasCustomPassword: Boolean(owner.password),
    });
  } else {
    res.json({
      exists: false,
      phone: cleanPhone,
    });
  }
});

// 1b. Create Brand New Owner Account with hashed password
app.post('/api/auth/owner-register', (req: Request, res: Response) => {
  const { phone, password, name } = req.body || {};
  const cleanPhone = normalizePhone(phone) || (phone || '').trim();
  const cleanPassword = String(password || '').trim();
  const cleanName = (name || '').trim() || 'Owner';

  if (!cleanPhone) {
    res.status(400).json({ error: 'Phone number is required.' });
    return;
  }
  if (!cleanPassword || cleanPassword.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const existing = Array.from(users.values()).find(
    (u) => u.role === 'owner' && (normalizePhone(u.phone) === cleanPhone || u.phone === cleanPhone)
  );
  if (existing) {
    res.status(409).json({
      error: 'An owner account with this phone number already exists. Please log in with your password.',
      alreadyExists: true,
    });
    return;
  }

  const newOwnerId = 'usr_owner_' + crypto.randomBytes(6).toString('hex');
  const ownerToken = 'tok_owner_' + crypto.randomBytes(16).toString('hex');
  const owner: UserRecord = {
    id: newOwnerId,
    name: cleanName,
    phone: cleanPhone,
    password: hashPassword(cleanPassword),
    role: 'owner',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    token: ownerToken,
    createdAt: new Date().toISOString(),
  };
  users.set(newOwnerId, owner);

  const newInviteCode = generateInviteCode();
  invitations.set(newInviteCode, {
    code: newInviteCode,
    ownerId: newOwnerId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    usedCount: 0,
  });

  saveDb();

  res.json({
    user: {
      id: owner.id,
      name: owner.name,
      phone: owner.phone,
      role: owner.role,
      avatar: owner.avatar,
    },
    token: owner.token,
    isNewOwner: true,
    inviteCode: newInviteCode,
    message: `New owner account successfully created for ${owner.phone}`,
  });
});

// 1c. Owner Login (Strictly authenticates EXISTING owner with hashed password)
app.post('/api/auth/owner-login', (req: Request, res: Response) => {
  const { password, name, phone, mode } = req.body || {};
  const cleanPhone = normalizePhone(phone) || (phone || '').trim();
  const rawPassword = String(password || '').trim();

  if (!cleanPhone) {
    res.status(400).json({ error: 'Phone number is required for owner access.' });
    return;
  }
  if (!rawPassword) {
    res.status(400).json({ error: 'Password is required.' });
    return;
  }

  // Look for existing owner with this phone number
  const owner = Array.from(users.values()).find(
    (u) => u.role === 'owner' && (normalizePhone(u.phone) === cleanPhone || u.phone === cleanPhone)
  );

  // If owner does not exist, reject immediately: NEVER verify password on non-existent accounts
  if (!owner) {
    res.status(404).json({
      error: 'No owner account found with this phone number. Please switch to New Owner to create an account.',
      notFound: true,
    });
    return;
  }

  // Verify password using secure scrypt cryptographic hash verification
  const isPasswordValid = verifyPassword(rawPassword, owner.password);

  if (!isPasswordValid) {
    res.status(401).json({ error: 'Incorrect password for this owner account. Please try again.' });
    return;
  }

  if (name && typeof name === 'string' && name.trim()) {
    owner.name = name.trim();
  }
  if (!owner.token) {
    owner.token = 'tok_owner_' + crypto.randomBytes(16).toString('hex');
  }
  saveDb();

  // Find this owner's primary active invite code
  let primaryInviteCode = '';
  for (const inv of invitations.values()) {
    if (inv.ownerId === owner.id) {
      primaryInviteCode = inv.code;
      break;
    }
  }
  if (!primaryInviteCode) {
    primaryInviteCode = generateInviteCode();
    invitations.set(primaryInviteCode, {
      code: primaryInviteCode,
      ownerId: owner.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      usedCount: 0,
    });
    saveDb();
  }

  // Return owner info with session token and isNewOwner status
  res.json({
    user: {
      id: owner.id,
      name: owner.name,
      phone: owner.phone,
      role: owner.role,
      avatar: owner.avatar,
    },
    token: owner.token,
    isNewOwner: false,
    inviteCode: primaryInviteCode,
    message: `Owner authenticated successfully for phone ${owner.phone}`,
  });
});

// 2. Member Registration via Invitation Code/Link
app.post('/api/auth/register-member', (req: Request, res: Response) => {
  const { name, phone, inviteCode, avatar } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const cleanName = name.trim();
  const cleanPhone = (phone || '').trim();
  const cleanAvatar = (avatar && typeof avatar === 'string') ? avatar.trim() : '';

  // Validate Invitation Code to find owner
  const normalizedCode = (inviteCode || '').trim().toUpperCase();
  let validInvite = invitations.get(normalizedCode);
  let targetOwnerId: string | null = null;

  if (validInvite) {
    targetOwnerId = validInvite.ownerId;
    validInvite.usedCount += 1;
  } else {
    // Look up in any invitation
    for (const inv of invitations.values()) {
      if (inv.code === normalizedCode) {
        validInvite = inv;
        targetOwnerId = inv.ownerId;
        inv.usedCount += 1;
        break;
      }
    }
  }

  // If still no invite found, connect to the most recently created or available owner
  if (!targetOwnerId) {
    const allOwners = Array.from(users.values()).filter((u) => u.role === 'owner');
    if (allOwners.length > 0) {
      targetOwnerId = allOwners[allOwners.length - 1].id;
    }
  }

  if (!targetOwnerId) {
    res.status(400).json({ error: 'No active owner account available to join' });
    return;
  }

  const owner = users.get(targetOwnerId);

  // Check expiration if invite found
  if (validInvite && new Date(validInvite.expiresAt).getTime() < Date.now()) {
    res.status(400).json({ error: 'Invitation code has expired' });
    return;
  }

  // Create random unique internal Member ID
  const memberId = 'mem_' + crypto.randomBytes(8).toString('hex');
  const memberToken = 'tok_mem_' + crypto.randomBytes(16).toString('hex');

  const newMember: UserRecord = {
    id: memberId,
    name: cleanName,
    phone: cleanPhone,
    role: 'member',
    avatar: cleanAvatar,
    token: memberToken,
    ownerId: targetOwnerId,
    createdAt: new Date().toISOString(),
  };

  users.set(memberId, newMember);

  // Automatically create a private 1-to-1 conversation between THIS Owner and THIS Member
  const convId = `conv_${targetOwnerId}_${memberId}`;
  const now = new Date().toISOString();

  conversations.set(convId, {
    id: convId,
    ownerId: targetOwnerId,
    memberId: memberId,
    createdAt: now,
    updatedAt: now,
  });

  // Fan-in all previous broadcast activities for THIS OWNER only!
  const ownerBroadcasts = Array.from(broadcasts.values())
    .filter((bc) => bc.ownerId === targetOwnerId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (ownerBroadcasts.length === 0) {
    // Initial welcome message from owner
    const welcomeId = `msg_welcome_${memberId}`;
    messages.set(welcomeId, {
      id: welcomeId,
      conversationId: convId,
      senderId: targetOwnerId,
      recipientId: memberId,
      type: 'text',
      text: `Welcome to LinkChat ${cleanName}! You will receive all private announcements here from ${owner?.name || 'the Owner'}${owner?.phone ? ` (${owner.phone})` : ''}. You can reply directly to this chat at any time.`,
      createdAt: now,
      deliveredAt: now,
      status: 'delivered',
    });
  } else {
    // Deliver all prior broadcast activities for this owner
    for (const bc of ownerBroadcasts) {
      const bcMsgId = `msg_${bc.id}_${memberId}`;
      messages.set(bcMsgId, {
        id: bcMsgId,
        conversationId: convId,
        senderId: targetOwnerId,
        recipientId: memberId,
        type: bc.mediaType || (bc.mediaId ? 'image' : 'text'),
        text: bc.messageContent,
        mediaId: bc.mediaId,
        createdAt: bc.createdAt,
        deliveredAt: now,
        status: 'delivered',
        broadcastId: bc.id,
      });
      bc.recipientCount += 1;
      bc.sentCount += 1;
      bc.deliveredCount += 1;
    }
  }

  saveDb();

  res.json({
    user: {
      id: newMember.id,
      name: newMember.name,
      phone: newMember.phone,
      role: newMember.role,
      avatar: newMember.avatar,
    },
    token: memberToken,
  });
});

// Update User Profile (Avatar, Name, Phone)
app.post('/api/user/profile', (req: Request, res: Response) => {
  const user = authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { name, phone, avatar } = req.body || {};
  if (name && typeof name === 'string' && name.trim()) {
    user.name = name.trim();
  }
  if (phone && typeof phone === 'string' && phone.trim()) {
    user.phone = phone.trim();
  }
  if (avatar && typeof avatar === 'string') {
    user.avatar = avatar;
  }

  saveDb();

  res.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
    },
  });
});

// 3. Current User Session Check
app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized session' });
    return;
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.role === 'owner' ? user.phone : user.phone,
      role: user.role,
      avatar: user.avatar,
    },
  });
});

// 4. Update Profile
app.patch('/api/auth/profile', (req: Request, res: Response) => {
  const user = authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { name, phone } = req.body;
  if (name && typeof name === 'string') user.name = name.trim();
  if (phone !== undefined) user.phone = String(phone).trim();

  res.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
    },
  });
});

// 5. OWNER ONLY: Get Members List
app.get('/api/owner/members', (req: Request, res: Response) => {
  const user = authenticateUser(req);
  if (!user || user.role !== 'owner') {
    res.status(403).json({ error: 'Forbidden: Only the owner can access the member list' });
    return;
  }

  const memberList = [];
  for (const u of users.values()) {
    if (u.role === 'member' && u.ownerId === user.id) {
      memberList.push({
        userId: u.id,
        name: u.name,
        phone: u.phone,
        joinedAt: u.createdAt,
      });
    }
  }

  res.json({ members: memberList });
});

// 6. OWNER ONLY: Add Member Manually
app.post('/api/owner/members', (req: Request, res: Response) => {
  const user = authenticateUser(req);
  if (!user || user.role !== 'owner') {
    res.status(403).json({ error: 'Forbidden: Only the owner can add members' });
    return;
  }

  const { name, phone } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }

  const memberId = 'mem_' + crypto.randomBytes(8).toString('hex');
  const memberToken = 'tok_mem_' + crypto.randomBytes(16).toString('hex');

  const newMember: UserRecord = {
    id: memberId,
    name: name.trim(),
    phone: (phone || '').trim(),
    role: 'member',
    avatar: '',
    token: memberToken,
    ownerId: user.id,
    createdAt: new Date().toISOString(),
  };

  users.set(memberId, newMember);

  // Create private conversation
  const convId = `conv_${user.id}_${memberId}`;
  const now = new Date().toISOString();
  conversations.set(convId, {
    id: convId,
    ownerId: user.id,
    memberId: memberId,
    createdAt: now,
    updatedAt: now,
  });

  res.json({
    member: {
      userId: newMember.id,
      name: newMember.name,
      phone: newMember.phone,
      joinedAt: newMember.createdAt,
    },
  });
});

// 7. OWNER ONLY: Generate / Get Invite Code
app.get('/api/owner/invitations', (req: Request, res: Response) => {
  const user = authenticateUser(req);
  if (!user || user.role !== 'owner') {
    res.status(403).json({ error: 'Forbidden: Only the owner can manage invitations' });
    return;
  }

  const list = Array.from(invitations.values()).filter((i) => i.ownerId === user.id);
  res.json({ invitations: list });
});

app.post('/api/owner/invitations', (req: Request, res: Response) => {
  const user = authenticateUser(req);
  if (!user || user.role !== 'owner') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const code = generateInviteCode();

  const newInvite: InvitationRecord = {
    code,
    ownerId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    usedCount: 0,
  };

  invitations.set(code, newInvite);
  res.json({ invitation: newInvite });
});

// 8. Conversations: Get Authorized Conversations
// For OWNER: returns all private 1-on-1 chats with member names
// For MEMBER: returns ONLY their single private conversation with the owner. NEVER other members!
app.get('/api/conversations', (req: Request, res: Response) => {
  const user = authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const result = [];

  if (user.role === 'owner') {
    // Return all private conversations for THIS owner
    for (const conv of conversations.values()) {
      if (conv.ownerId !== user.id) continue;
      const member = users.get(conv.memberId);
      if (!member) continue;

      // Find last message
      const convMsgs = Array.from(messages.values())
        .filter((m) => m.conversationId === conv.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const lastMsg = convMsgs[convMsgs.length - 1];
      const unreadCount = convMsgs.filter(
        (m) => m.senderId !== user.id && m.status !== 'read'
      ).length;

      result.push({
        conversationId: conv.id,
        memberId: member.id,
        memberName: member.name,
        memberPhone: member.phone,
        updatedAt: conv.updatedAt,
        lastMessageText: lastMsg ? lastMsg.text || (lastMsg.type !== 'text' ? `[${lastMsg.type}]` : '') : 'No messages yet',
        lastMessageTime: lastMsg ? lastMsg.createdAt : conv.createdAt,
        lastMessageType: lastMsg ? lastMsg.type : 'text',
        unreadCount,
      });
    }
  } else {
    // Member only gets their OWN conversation with the owner
    const targetOwnerId = user.ownerId || Array.from(users.values()).find((u) => u.role === 'owner')?.id;
    if (targetOwnerId) {
      const convId = `conv_${targetOwnerId}_${user.id}`;
      let conv = conversations.get(convId);

      if (!conv) {
        const now = new Date().toISOString();
        conv = {
          id: convId,
          ownerId: targetOwnerId,
          memberId: user.id,
          createdAt: now,
          updatedAt: now,
        };
        conversations.set(convId, conv);
      }

      const owner = users.get(targetOwnerId);
      const convMsgs = Array.from(messages.values())
        .filter((m) => m.conversationId === conv!.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const lastMsg = convMsgs[convMsgs.length - 1];
      const unreadCount = convMsgs.filter(
        (m) => m.senderId === targetOwnerId && m.status !== 'read'
      ).length;

      result.push({
        conversationId: conv.id,
        ownerId: targetOwnerId,
        ownerName: owner?.name || 'Owner',
        updatedAt: conv.updatedAt,
        lastMessageText: lastMsg ? lastMsg.text || (lastMsg.type !== 'text' ? `[${lastMsg.type}]` : '') : 'No messages yet',
        lastMessageTime: lastMsg ? lastMsg.createdAt : conv.createdAt,
        lastMessageType: lastMsg ? lastMsg.type : 'text',
        unreadCount,
      });
    }
  }

  res.json({ conversations: result });
});

// 9. Messages: Get Messages for a Conversation (Strict Authorization Check)
app.get('/api/conversations/:conversationId/messages', (req: Request, res: Response) => {
  const user = authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { conversationId } = req.params;
  const conv = conversations.get(conversationId);
  if (!conv) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  // Authorization check: User must be owner OR the assigned member of this conversation
  if (user.role !== 'owner' && conv.memberId !== user.id) {
    res.status(403).json({ error: 'Forbidden: You cannot access another user conversation' });
    return;
  }

  // Filter messages
  const convMsgs = Array.from(messages.values())
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Mark messages sent to this user as read
  const now = new Date().toISOString();
  let updatedRead = false;
  for (const m of convMsgs) {
    if (m.recipientId === user.id && m.status !== 'read') {
      m.status = 'read';
      m.readAt = now;
      updatedRead = true;

      // If this message was part of a broadcast, update read count
      if (m.broadcastId) {
        const bc = broadcasts.get(m.broadcastId);
        if (bc) {
          bc.readCount = Math.min(bc.recipientCount, bc.readCount + 1);
        }
      }
    }
  }

  // Sanitize message: mediaUrl is through the protected endpoint
  const sanitized = convMsgs.map((m) => ({
    messageId: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    recipientId: m.recipientId,
    type: m.type,
    text: m.text,
    mediaUrl: m.mediaId ? `/api/media/${m.mediaId}` : undefined,
    createdAt: m.createdAt,
    deliveredAt: m.deliveredAt,
    readAt: m.readAt,
    status: m.status,
    // BroadcastId is kept on backend, not revealing other recipients
  }));

  res.json({ messages: sanitized });
});

// 10. Send a Private 1-on-1 Message
app.post('/api/conversations/:conversationId/messages', (req: Request, res: Response) => {
  const user = authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { conversationId } = req.params;
  const conv = conversations.get(conversationId);
  if (!conv) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  // Authorization Check
  if (user.role !== 'owner' && conv.memberId !== user.id) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const { text, mediaId, type } = req.body;
  const isOwner = user.role === 'owner';
  const recipientId = isOwner ? conv.memberId : conv.ownerId;
  const msgId = 'msg_' + crypto.randomBytes(8).toString('hex');
  const now = new Date().toISOString();

  // If mediaId is provided, verify media belongs to this user/conversation
  if (mediaId) {
    const media = mediaStore.get(mediaId);
    if (!media || media.uploaderId !== user.id) {
      res.status(400).json({ error: 'Invalid or unauthorized media' });
      return;
    }
    media.conversationId = conversationId;
    media.messageId = msgId;
  }

  const newMsg: MessageRecord = {
    id: msgId,
    conversationId,
    senderId: user.id,
    recipientId,
    type: type || (mediaId ? 'image' : 'text'),
    text: (text || '').trim(),
    mediaId: mediaId || undefined,
    createdAt: now,
    deliveredAt: now,
    status: 'delivered',
  };

  messages.set(msgId, newMsg);
  conv.updatedAt = now;
  saveDb();

  res.json({
    message: {
      messageId: newMsg.id,
      conversationId: newMsg.conversationId,
      senderId: newMsg.senderId,
      recipientId: newMsg.recipientId,
      type: newMsg.type,
      text: newMsg.text,
      mediaUrl: newMsg.mediaId ? `/api/media/${newMsg.mediaId}` : undefined,
      createdAt: newMsg.createdAt,
      deliveredAt: newMsg.deliveredAt,
      status: newMsg.status,
    },
  });
});

// 11. OWNER ONLY: One-Tap Broadcast Fan-Out
app.post('/api/owner/broadcast', (req: Request, res: Response) => {
  const user = authenticateUser(req);
  if (!user || user.role !== 'owner') {
    res.status(403).json({ error: 'Forbidden: Only the owner can broadcast' });
    return;
  }

  const { text, mediaId, mediaType } = req.body;
  if (!text?.trim() && !mediaId) {
    res.status(400).json({ error: 'Broadcast must contain text or media' });
    return;
  }

  // Get members belonging to THIS owner
  const memberList = Array.from(users.values()).filter((u) => u.role === 'member' && u.ownerId === user.id);
  const recipientCount = memberList.length;

  const broadcastId = 'bc_' + crypto.randomBytes(8).toString('hex');
  const now = new Date().toISOString();

  // Create aggregate broadcast record (visible only to this Owner)
  const broadcastRecord: BroadcastRecord = {
    id: broadcastId,
    ownerId: user.id,
    messageContent: (text || '').trim(),
    mediaId: mediaId || undefined,
    mediaType: mediaType || (mediaId ? 'image' : undefined),
    createdAt: now,
    recipientCount,
    sentCount: recipientCount,
    deliveredCount: recipientCount,
    readCount: 0,
  };
  broadcasts.set(broadcastId, broadcastRecord);

  // FAN-OUT: Create an INDIVIDUAL private message delivery for each member!
  // No member receives a group chat or recipient list
  for (const member of memberList) {
    const convId = `conv_${user.id}_${member.id}`;
    let conv = conversations.get(convId);
    if (!conv) {
      conv = {
        id: convId,
        ownerId: user.id,
        memberId: member.id,
        createdAt: now,
        updatedAt: now,
      };
      conversations.set(convId, conv);
    } else {
      conv.updatedAt = now;
    }

    const indMsgId = `msg_${broadcastId}_${member.id}`;
    const individualMsg: MessageRecord = {
      id: indMsgId,
      conversationId: convId,
      senderId: user.id,
      recipientId: member.id,
      type: mediaType || (mediaId ? 'image' : 'text'),
      text: (text || '').trim(),
      mediaId: mediaId || undefined,
      createdAt: now,
      deliveredAt: now,
      status: 'delivered',
      broadcastId,
    };
    messages.set(indMsgId, individualMsg);
  }

  saveDb();

  res.json({
    broadcast: {
      broadcastId: broadcastRecord.id,
      messageContent: broadcastRecord.messageContent,
      createdAt: broadcastRecord.createdAt,
      recipientCount: broadcastRecord.recipientCount,
      sentCount: broadcastRecord.sentCount,
      deliveredCount: broadcastRecord.deliveredCount,
      readCount: broadcastRecord.readCount,
    },
  });
});

// 12. OWNER ONLY: Get Broadcasts and Statistics
app.get('/api/owner/broadcasts', (req: Request, res: Response) => {
  const user = authenticateUser(req);
  if (!user || user.role !== 'owner') {
    res.status(403).json({ error: 'Forbidden: Broadcast statistics are strictly owner-only' });
    return;
  }

  const list = Array.from(broadcasts.values())
    .filter((bc) => bc.ownerId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((bc) => ({
      broadcastId: bc.id,
      messageContent: bc.messageContent,
      mediaUrl: bc.mediaId ? `/api/media/${bc.mediaId}` : undefined,
      mediaType: bc.mediaType,
      createdAt: bc.createdAt,
      recipientCount: bc.recipientCount,
      sentCount: bc.sentCount,
      deliveredCount: bc.deliveredCount,
      readCount: bc.readCount,
    }));

  res.json({ broadcasts: list });
});

// 13. SECURE MEDIA UPLOAD (Direct endpoint with validation)
app.post('/api/media/upload', (req: Request, res: Response) => {
  const user = authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: Media upload requires authenticated session' });
    return;
  }

  const { dataBase64, mimeType, fileName } = req.body;

  if (!dataBase64 || !mimeType) {
    res.status(400).json({ error: 'Invalid media upload payload' });
    return;
  }

  // Validate allowed MIME types (Images & Android-supported videos)
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/3gpp',
  ];

  if (!allowedTypes.includes(mimeType.toLowerCase())) {
    res.status(400).json({ error: `Unsupported media format: ${mimeType}. Only images and MP4/WebM videos are supported.` });
    return;
  }

  // Validate file size limit (50MB)
  const estimatedSize = Math.round((dataBase64.length * 3) / 4);
  if (estimatedSize > 50 * 1024 * 1024) {
    res.status(400).json({ error: 'File size exceeds 50MB limit' });
    return;
  }

  const mediaId = 'med_' + crypto.randomBytes(12).toString('hex');
  const mediaRecord: MediaRecord = {
    id: mediaId,
    uploaderId: user.id,
    mimeType,
    dataBase64,
    fileSize: estimatedSize,
    fileName: fileName || 'media_file',
    createdAt: new Date().toISOString(),
  };

  mediaStore.set(mediaId, mediaRecord);

  res.json({
    mediaId,
    url: `/api/media/${mediaId}`,
    mimeType,
  });
});

// 14. PROTECTED MEDIA ACCESS (Authorization verification)
// Never publicly accessible! Checks session & conversation/message authorization
app.get('/api/media/:mediaId', (req: Request, res: Response) => {
  const user = authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: Authentication required to view media' });
    return;
  }

  const { mediaId } = req.params;
  const media = mediaStore.get(mediaId);
  if (!media) {
    res.status(404).json({ error: 'Media not found' });
    return;
  }

  // Authorization check:
  // 1. If owner, owner can view all media uploaded or sent within the owner platform
  // 2. If member, member can view if they uploaded it, OR if it is attached to their conversation
  if (user.role === 'owner') {
    // Permitted
  } else {
    let authorized = false;
    if (media.uploaderId === user.id) {
      authorized = true;
    } else if (media.conversationId) {
      const conv = conversations.get(media.conversationId);
      if (conv && conv.memberId === user.id) {
        authorized = true;
      }
    } else {
      // Check if media is part of a message where recipient is this user
      for (const msg of messages.values()) {
        if (msg.mediaId === mediaId && (msg.recipientId === user.id || msg.senderId === user.id)) {
          authorized = true;
          break;
        }
      }
    }

    if (!authorized) {
      res.status(403).json({ error: 'Forbidden: You are not authorized to view this media' });
      return;
    }
  }

  // Return binary media buffer with appropriate Content-Type
  const cleanBase64 = media.dataBase64.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');

  res.setHeader('Content-Type', media.mimeType);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.send(buffer);
});

// Vite Middleware & Static Serving for Frontend
async function startServer() {
  loadDb();

  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(process.cwd(), 'dist');

  if (isProduction && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch {
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (req: Request, res: Response, next) => {
          if (req.path.startsWith('/api')) return next();
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LinkChat server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
