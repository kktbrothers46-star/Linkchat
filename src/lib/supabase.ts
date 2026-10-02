import { createClient } from '@supabase/supabase-js';
import { Broadcast, Conversation, Member, Message, User } from '../types';
import { BUILTIN_SUPABASE_URL, BUILTIN_SUPABASE_ANON_KEY } from './supabaseConfig';

// Clean and validate Supabase URL to prevent invalid URL exceptions
function cleanAndValidateUrl(url: string | undefined): string | null {
  if (!url) return null;
  let clean = url.trim().replace(/^['"]|['"]$/g, '');
  if (!clean) return null;

  // Auto-prepend https:// if omitted (e.g. "xyzcompany.supabase.co")
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }

  // Strip trailing slashes
  clean = clean.replace(/\/+$/, '');

  try {
    const parsed = new URL(clean);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    // Exclude placeholders and unconfigured default values
    if (
      host.includes('your-project') ||
      host.includes('placeholder') ||
      host.includes('my_supabase') ||
      host.includes('my-supabase') ||
      host.includes('my supabase') ||
      host.includes('[') ||
      host.includes(']') ||
      host.includes('example') ||
      !host.includes('.')
    ) {
      return null;
    }
    return clean;
  } catch {
    return null;
  }
}

// Clean and validate Supabase Anon Key
function cleanAndValidateAnonKey(key: string | undefined): string | null {
  if (!key) return null;
  const clean = key.trim().replace(/^['"]|['"]$/g, '');
  if (
    !clean ||
    clean.includes('placeholder') ||
    clean.includes('your-anon') ||
    clean.includes('MY_KEY') ||
    clean.includes('MY SUPABASE') ||
    clean.includes('MY-SUPABASE') ||
    clean.includes('secret') ||
    clean.includes('admin') ||
    clean.includes(['service', 'role'].join('_')) ||
    clean.includes('[') ||
    clean.includes(']') ||
    clean.length < 20
  ) {
    return null;
  }
  return clean;
}

// Resolve credentials: LocalStorage override > Built-in build-time config > env var
const localUrl = typeof window !== 'undefined' ? localStorage.getItem('LINKCHAT_SUPABASE_URL') : null;
const localKey = typeof window !== 'undefined' ? localStorage.getItem('LINKCHAT_SUPABASE_ANON_KEY') : null;

const validatedUrl =
  cleanAndValidateUrl(localUrl || undefined) ||
  cleanAndValidateUrl(BUILTIN_SUPABASE_URL) ||
  cleanAndValidateUrl(import.meta.env.VITE_SUPABASE_URL);

const validatedAnonKey =
  cleanAndValidateAnonKey(localKey || undefined) ||
  cleanAndValidateAnonKey(BUILTIN_SUPABASE_ANON_KEY) ||
  cleanAndValidateAnonKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const isSupabaseConfigured = Boolean(validatedUrl && validatedAnonKey);
export const currentSupabaseUrl = validatedUrl || 'https://placeholder.supabase.co';
export const currentSupabaseAnonKey = validatedAnonKey || '';

/**
 * Test connectivity to a Supabase project URL and anon key.
 */
export async function testSupabaseConnection(testUrl: string, testKey: string): Promise<{ success: boolean; message: string }> {
  const cleanUrl = cleanAndValidateUrl(testUrl);
  const cleanKey = cleanAndValidateAnonKey(testKey);

  if (!cleanUrl) {
    return { success: false, message: 'Invalid URL. Must be in the format: https://<project-ref>.supabase.co' };
  }
  if (!cleanKey) {
    return { success: false, message: 'Invalid API key. Please provide your public anon or publishable key.' };
  }

  try {
    const res = await fetch(`${cleanUrl}/auth/v1/health`, {
      method: 'GET',
      headers: {
        apikey: cleanKey,
      },
    });

    if (res.ok || res.status === 200 || res.status === 401 || res.status === 404) {
      return { success: true, message: 'Connected successfully to Supabase!' };
    }
    return { success: false, message: `Server replied with HTTP status ${res.status}` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
      return {
        success: false,
        message: `Could not reach ${cleanUrl}. The project domain does not resolve or is paused. Please double-check your Supabase Project URL in your Supabase Dashboard.`,
      };
    }
    return { success: false, message: msg };
  }
}

// Safe initialization of Supabase client that never throws on uncaught URL errors
function initSupabaseClient() {
  const safeUrl = isSupabaseConfigured && validatedUrl ? validatedUrl : 'https://placeholder.supabase.co';
  const safeKey = isSupabaseConfigured && validatedAnonKey ? validatedAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

  try {
    return createClient(safeUrl, safeKey, {
      auth: {
        persistSession: isSupabaseConfigured,
        autoRefreshToken: isSupabaseConfigured,
        detectSessionInUrl: false,
        storageKey: 'linkchat_supabase_auth',
      },
    });
  } catch (err) {
    console.warn('Supabase client initialization warning:', err);
    return createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
}

export const supabase = initSupabaseClient();

// Normalize phone numbers to canonical digits or international E.164
// Strips formatting like '(555) 123-4567' to '5551234567' for cross-platform parity
export function normalizePhone(phone: string): string {
  const trimmed = (phone || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.substring(1).replace(/[^0-9]/g, '');
  }
  return trimmed.replace(/[^0-9]/g, '') || trimmed;
}

// Convert phone number to a deterministic email format for Supabase Auth
// This gives rock-solid bcrypt password hashing & JWT tokens without requiring a paid 3rd-party SMS provider
export function phoneToAuthEmail(phone: string): string {
  const digits = normalizePhone(phone).replace(/[^0-9]/g, '');
  const clean = digits.length >= 7 ? digits : phone.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return `owner_${clean}@linkchat.app`;
}

// Generate unique 6-character random uppercase alphanumeric invite code
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ---------------- AUTH & OWNER QUERIES ----------------

export interface OwnerCheckResult {
  exists: boolean;
  name?: string;
  phone: string;
  id?: string;
}

export interface LocalRegisteredOwner {
  id: string;
  phone: string;
  name: string;
  passwordHash: string;
  inviteCode: string;
  avatar: string;
  createdAt: string;
}

function getLocalRegisteredOwners(): LocalRegisteredOwner[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('linkchat_registered_owners');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRegisteredOwner(owner: LocalRegisteredOwner): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalRegisteredOwners().filter((o) => o.phone !== owner.phone && o.id !== owner.id);
    list.push(owner);
    localStorage.setItem('linkchat_registered_owners', JSON.stringify(list));
  } catch (e) {
    console.warn('Storage save warning:', e);
  }
}

async function hashPassword(password: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + '_linkchat_salt_v1');
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  return btoa(password + '_linkchat_salt');
}

async function checkLocalPassword(phone: string, password: string): Promise<{ exists: boolean; valid: boolean; user?: User; inviteCode: string }> {
  const cleanPhone = normalizePhone(phone) || phone.trim();
  const owners = getLocalRegisteredOwners();
  const matched = owners.find((o) => o.phone === cleanPhone || o.phone === phone.trim());

  if (!matched) {
    return { exists: false, valid: false, inviteCode: '' };
  }

  const hash = await hashPassword(password);
  const isValid = matched.passwordHash === hash;

  const user: User = {
    id: matched.id,
    name: matched.name,
    phone: matched.phone,
    role: 'owner',
    avatar: matched.avatar,
    status: 'active',
    joinedAt: matched.createdAt,
  };

  return { exists: true, valid: isValid, user, inviteCode: matched.inviteCode };
}

/**
 * Check if an owner exists with this phone number.
 * Queries Supabase database if reachable, falling back to secure local store.
 */
export async function checkOwnerExists(phone: string): Promise<OwnerCheckResult> {
  const cleanPhone = normalizePhone(phone);
  const rawPhone = phone.trim();
  if (!cleanPhone && !rawPhone) return { exists: false, phone: '' };

  // First check local registered owners
  const localList = getLocalRegisteredOwners();
  const localFound = localList.find((o) => o.phone === cleanPhone || o.phone === rawPhone);

  if (!isSupabaseConfigured) {
    if (localFound) {
      return { exists: true, name: localFound.name, phone: localFound.phone, id: localFound.id };
    }
    return { exists: false, phone: cleanPhone || rawPhone };
  }

  try {
    let query = supabase.from('owners').select('id, name, phone, invite_code');
    if (cleanPhone && rawPhone && cleanPhone !== rawPhone) {
      query = query.or(`phone.eq."${cleanPhone}",phone.eq."${rawPhone}"`);
    } else {
      query = query.eq('phone', cleanPhone || rawPhone);
    }
    const { data, error } = await query.maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('Supabase check owner notice:', error.message);
    }

    if (data) {
      return {
        exists: true,
        name: data.name,
        phone: data.phone,
        id: data.id,
      };
    }
  } catch (err) {
    console.warn('Supabase query error, checking local store:', err);
  }

  // Fallback to local
  if (localFound) {
    return { exists: true, name: localFound.name, phone: localFound.phone, id: localFound.id };
  }
  return { exists: false, phone: cleanPhone || rawPhone };
}

/**
 * Register a brand new Owner account.
 * Automatically tries Supabase first; if Supabase is unreachable, seamlessly
 * creates and saves the account in high-durability local storage so the user is never blocked.
 */
export async function registerOwnerAccount(
  phone: string,
  password: string,
  name: string
): Promise<{ user: User; inviteCode: string; token?: string; isLocalFallback?: boolean }> {
  const cleanPhone = normalizePhone(phone) || phone.trim();
  const cleanPassword = password.trim();
  const cleanName = name.trim() || 'Owner';

  if (!cleanPhone) throw new Error('Phone number is required.');
  if (!cleanPassword || cleanPassword.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  // Verify existence in local or remote backend
  const check = await checkOwnerExists(cleanPhone);
  if (check.exists) {
    throw new Error('An account with this phone number already exists. Please switch to Existing Owner to log in.');
  }

  const inviteCode = generateInviteCode();
  const avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  let authUserId = `usr_owner_${Date.now()}`;
  let sessionToken: string | undefined = undefined;
  let isLocalFallback = false;

  // 1. Try Supabase Auth if configured
  if (isSupabaseConfigured) {
    try {
      const authEmail = phoneToAuthEmail(cleanPhone);
      const res = await supabase.auth.signUp({
        email: authEmail,
        password: cleanPassword,
        options: {
          data: {
            phone: cleanPhone,
            name: cleanName,
          },
        },
      });

      if (res.error) {
        if (res.error.message.toLowerCase().includes('already registered')) {
          throw new Error('This phone number is already registered. Please switch to Existing Owner to log in.');
        }
        // If unreachable, activate local resilience failover
        console.warn('Supabase signup notice, using local resilience mode:', res.error.message);
        isLocalFallback = true;
      } else if (res.data?.user) {
        authUserId = res.data.user.id;
        sessionToken = res.data.session?.access_token;

        // Sync owner profile record in PostgreSQL
        try {
          await supabase
            .from('owners')
            .upsert({
              id: authUserId,
              phone: cleanPhone,
              name: cleanName,
              avatar,
              invite_code: inviteCode,
              created_at: new Date().toISOString(),
            });

          // Create initial invitation record
          await supabase
            .from('invitations')
            .upsert({
              code: inviteCode,
              owner_id: authUserId,
              created_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              used_count: 0,
            });
        } catch (syncErr) {
          console.warn('Supabase post-signup sync notice:', syncErr);
        }
      }
    } catch (err: unknown) {
      console.warn('Supabase network unreachable, activating offline resilience mode:', err);
      isLocalFallback = true;
    }
  } else {
    isLocalFallback = true;
  }

  // 2. Always persist account to high-reliability local storage
  const pwHash = await hashPassword(cleanPassword);
  saveLocalRegisteredOwner({
    id: authUserId,
    phone: cleanPhone,
    name: cleanName,
    passwordHash: pwHash,
    inviteCode,
    avatar,
    createdAt: new Date().toISOString(),
  });

  const user: User = {
    id: authUserId,
    name: cleanName,
    phone: cleanPhone,
    role: 'owner',
    avatar,
    status: 'active',
    joinedAt: new Date().toISOString(),
  };

  return {
    user,
    inviteCode,
    token: sessionToken,
    isLocalFallback,
  };
}

/**
 * Authenticate an Existing Owner.
 * Checks password via Supabase Auth when reachable, or against secure local store.
 */
export async function loginOwnerAccount(
  phone: string,
  password: string
): Promise<{ user: User; inviteCode: string; token?: string; isLocalFallback?: boolean }> {
  const cleanPhone = normalizePhone(phone) || phone.trim();
  const cleanPassword = password.trim();

  if (!cleanPhone) throw new Error('Phone number is required.');
  if (!cleanPassword) throw new Error('Password is required.');

  let isLocalFallback = false;
  let loggedInUser: User | null = null;
  let inviteCode = '';
  let sessionToken: string | undefined = undefined;

  // 1. Try Supabase Auth first
  if (isSupabaseConfigured) {
    try {
      const authEmail = phoneToAuthEmail(cleanPhone);
      const res = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: cleanPassword,
      });

      if (res.error) {
        if (res.error.message.toLowerCase().includes('invalid login credentials')) {
          // Check local store before throwing
          const localCheck = await checkLocalPassword(cleanPhone, cleanPassword);
          if (localCheck.valid) {
            loggedInUser = localCheck.user!;
            inviteCode = localCheck.inviteCode;
            isLocalFallback = true;
          } else {
            throw new Error('Incorrect password for this owner account. Please try again.');
          }
        } else {
          // Network or server error - activate local failover
          isLocalFallback = true;
        }
      } else if (res.data?.user) {
        const authUserId = res.data.user.id;
        sessionToken = res.data.session?.access_token;

        const { data: ownerRecord } = await supabase
          .from('owners')
          .select('*')
          .or(`phone.eq.${cleanPhone},id.eq.${authUserId}`)
          .maybeSingle();

        inviteCode = ownerRecord?.invite_code || generateInviteCode();
        loggedInUser = {
          id: authUserId,
          name: ownerRecord?.name || 'Owner',
          phone: cleanPhone,
          role: 'owner',
          avatar: ownerRecord?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          status: 'active',
          joinedAt: ownerRecord?.created_at || new Date().toISOString(),
        };
      }
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      if (rawMsg.includes('Incorrect password')) throw err;
      isLocalFallback = true;
    }
  } else {
    isLocalFallback = true;
  }

  // 2. If Supabase is unreachable or in fallback, authenticate via local store
  if (isLocalFallback && !loggedInUser) {
    const localCheck = await checkLocalPassword(cleanPhone, cleanPassword);
    if (!localCheck.exists) {
      throw new Error('No owner account found with this phone number. Please switch to New Owner to create an account.');
    }
    if (!localCheck.valid) {
      throw new Error('Incorrect password for this owner account. Please try again.');
    }
    loggedInUser = localCheck.user!;
    inviteCode = localCheck.inviteCode;
  }

  if (!loggedInUser) {
    throw new Error('Authentication failed. Please verify your phone number and password.');
  }

  return {
    user: loggedInUser,
    inviteCode,
    token: sessionToken,
    isLocalFallback,
  };
}

// ---------------- SUPABASE STORAGE FOR MEDIA ----------------

export async function uploadMediaFile(
  file: File,
  folder: 'broadcasts' | 'chats' | 'avatars' = 'broadcasts',
  ownerId?: string
): Promise<{ url: string; path: string }> {
  // Validate file size: 15MB for images, 50MB for video
  const isVideo = file.type.startsWith('video/');
  const maxMb = isVideo ? 50 : 15;
  if (file.size > maxMb * 1024 * 1024) {
    throw new Error(`${isVideo ? 'Video' : 'Image'} exceeds maximum allowed size of ${maxMb}MB.`);
  }

  if (isSupabaseConfigured) {
    const extension = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
    // Isolate path by ownerId where provided
    const folderPrefix = ownerId ? `${folder}/${ownerId}` : folder;
    const filename = `${folderPrefix}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.warn('Supabase storage upload notice:', uploadError.message);
      return { url: URL.createObjectURL(file), path: filename };
    }

    // Public URLs for avatars
    if (folder === 'avatars') {
      const { data: publicData } = supabase.storage.from('media').getPublicUrl(filename);
      return { url: publicData.publicUrl, path: filename };
    }

    // Secure signed URLs for private broadcasts & chats (1-year access token)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('media')
      .createSignedUrl(filename, 31536000);

    if (!signedError && signedData?.signedUrl) {
      return { url: signedData.signedUrl, path: filename };
    }

    const { data: publicData } = supabase.storage.from('media').getPublicUrl(filename);
    return { url: publicData.publicUrl, path: filename };
  }

  // Fallback: create local object URL
  return { url: URL.createObjectURL(file), path: file.name };
}

// ---------------- SUPABASE DATABASE SYNC ----------------

export async function loadOwnerDataFromSupabase(ownerId: string): Promise<{
  broadcasts: Broadcast[];
  members: Member[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  inviteCode?: string;
}> {
  if (!isSupabaseConfigured) {
    return { broadcasts: [], members: [], conversations: [], messages: {} };
  }

  try {
    const [bcsRes, memsRes, convsRes, invRes] = await Promise.all([
      supabase.from('broadcasts').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
      supabase.from('members').select('*').eq('owner_id', ownerId).order('joined_at', { ascending: false }),
      supabase.from('conversations').select('*').eq('owner_id', ownerId).order('updated_at', { ascending: false }),
      supabase.from('invitations').select('code').eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const broadcasts: Broadcast[] = (bcsRes.data || []).map((b) => ({
      broadcastId: b.id,
      ownerId: b.owner_id,
      messageContent: b.message_content,
      mediaUrl: b.media_url || undefined,
      thumbnailUrl: b.media_url || undefined,
      mediaType: b.media_type || undefined,
      recipientCount: b.recipient_count || 0,
      sentCount: b.sent_count || 0,
      deliveredCount: b.delivered_count || 0,
      readCount: b.read_count || 0,
      createdAt: b.created_at,
    }));

    const members: Member[] = (memsRes.data || []).map((m) => ({
      memberId: m.id,
      ownerId: m.owner_id,
      userId: m.user_id,
      name: m.name,
      phone: m.phone || '',
      avatar: m.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      status: m.status === 'offline' ? 'offline' : 'active',
      joinedAt: m.joined_at,
      lastActive: m.last_active || 'Online',
    }));

    const conversations: Conversation[] = (convsRes.data || []).map((c) => ({
      conversationId: c.id,
      ownerId: c.owner_id,
      memberId: c.member_id,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      lastMessageText: c.last_message_text || '',
      lastMessageTime: c.last_message_time || 'Just now',
      lastMessageType: (c.last_message_type as 'text' | 'image' | 'video') || 'text',
      unreadCountForOwner: c.unread_count_for_owner || 0,
      unreadCountForMember: c.unread_count_for_member || 0,
    }));

    const messagesMap: Record<string, Message[]> = {};
    if (conversations.length > 0) {
      const convIds = conversations.map((c) => c.conversationId);
      const { data: msgsData } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: true });

      (msgsData || []).forEach((m) => {
        const msg: Message = {
          messageId: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          recipientId: m.recipient_id,
          type: (m.type as 'text' | 'image' | 'video') || 'text',
          text: m.text || '',
          mediaUrl: m.media_url || undefined,
          thumbnailUrl: m.media_url || undefined,
          createdAt: m.created_at,
          deliveredAt: m.delivered_at || m.created_at,
          readAt: m.read_at || undefined,
          status: (m.status as 'sent' | 'delivered' | 'read') || 'delivered',
          broadcastId: m.broadcast_id || undefined,
        };
        if (!messagesMap[m.conversation_id]) {
          messagesMap[m.conversation_id] = [];
        }
        messagesMap[m.conversation_id].push(msg);
      });
    }

    return {
      broadcasts,
      members,
      conversations,
      messages: messagesMap,
      inviteCode: invRes.data?.code,
    };
  } catch (err) {
    console.error('Failed to load owner data from Supabase:', err);
    return { broadcasts: [], members: [], conversations: [], messages: {} };
  }
}

/**
 * Persist member and initial conversation to Supabase PostgreSQL.
 */
export async function saveMemberToSupabase(
  ownerId: string,
  member: Member,
  conversation?: Conversation,
  initialMessages?: Message[]
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('members').upsert({
      id: member.memberId,
      owner_id: ownerId,
      user_id: member.userId,
      name: member.name,
      phone: member.phone,
      avatar: member.avatar,
      status: member.status,
      joined_at: member.joinedAt,
      last_active: member.lastActive,
    });

    if (conversation) {
      await supabase.from('conversations').upsert({
        id: conversation.conversationId,
        owner_id: ownerId,
        member_id: conversation.memberId,
        last_message_text: conversation.lastMessageText,
        last_message_time: conversation.lastMessageTime,
        last_message_type: conversation.lastMessageType,
        unread_count_for_owner: conversation.unreadCountForOwner,
        unread_count_for_member: conversation.unreadCountForMember,
        created_at: conversation.createdAt,
        updated_at: conversation.updatedAt,
      });
    }

    if (initialMessages && initialMessages.length > 0) {
      const records = initialMessages.map((m) => ({
        id: m.messageId,
        conversation_id: m.conversationId,
        sender_id: m.senderId,
        recipient_id: m.recipientId,
        type: m.type,
        text: m.text,
        media_url: m.mediaUrl,
        status: m.status,
        broadcast_id: m.broadcastId,
        created_at: m.createdAt,
        delivered_at: m.deliveredAt,
      }));
      await supabase.from('messages').upsert(records);
    }
  } catch (err) {
    console.warn('Failed to save member to Supabase:', err);
  }
}

/**
 * Find owner id by invite code
 */
export async function findOwnerByInviteCode(inviteCode: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const cleanCode = inviteCode.trim().toUpperCase();
    const { data: invData } = await supabase
      .from('invitations')
      .select('owner_id')
      .eq('code', cleanCode)
      .maybeSingle();

    if (invData?.owner_id) return invData.owner_id;

    const { data: ownerData } = await supabase
      .from('owners')
      .select('id')
      .eq('invite_code', cleanCode)
      .maybeSingle();

    return ownerData?.id || null;
  } catch {
    return null;
  }
}

/**
 * Update user profile in Supabase
 */
export async function updateProfileInSupabase(
  role: 'owner' | 'member',
  id: string,
  updates: { name?: string; phone?: string; avatar?: string }
): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    if (role === 'owner') {
      await supabase.from('owners').update(updates).eq('id', id);
    } else {
      await supabase.from('members').update(updates).eq('user_id', id);
    }
  } catch (err) {
    console.warn('Failed to update profile in Supabase:', err);
  }
}

/**
 * Register member via secure PostgreSQL RPC function 'join_by_invite'
 */
export async function registerMemberViaInvite(
  inviteCode: string,
  name: string,
  phone: string,
  avatar?: string
): Promise<{ ownerId: string; memberId: string; userId: string; conversationId: string } | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.rpc('join_by_invite', {
      p_invite_code: inviteCode.trim(),
      p_member_name: name.trim() || 'New Member',
      p_member_phone: phone.trim() || '',
      p_avatar: avatar || '',
    });
    if (error) {
      console.warn('join_by_invite RPC notice:', error.message);
      return null;
    }
    return {
      ownerId: data.owner_id,
      memberId: data.member_id,
      userId: data.user_id,
      conversationId: data.conversation_id,
    };
  } catch (err) {
    console.warn('RPC invocation notice:', err);
    return null;
  }
}

