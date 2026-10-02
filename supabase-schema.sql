-- ==============================================================================
-- LinkChat Supabase Database Schema & Storage Setup
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Owners Table (One persistent record per owner, keyed by Supabase auth id or UUID)
create table if not exists public.owners (
  id text primary key,
  phone text unique not null,
  name text not null,
  avatar text default 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  invite_code text,
  created_at timestamptz default now()
);

create index if not exists idx_owners_phone on public.owners(phone);

-- 3. Invitations Table (6-character invite codes linked to each owner)
create table if not exists public.invitations (
  code text primary key,
  owner_id text references public.owners(id) on delete cascade,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '30 days'),
  used_count integer default 0
);

create index if not exists idx_invitations_owner_id on public.invitations(owner_id);

-- 4. Members Table (Members connected to specific owners)
create table if not exists public.members (
  id text primary key,
  owner_id text references public.owners(id) on delete cascade,
  user_id text not null,
  name text not null,
  phone text default '',
  avatar text default '',
  status text default 'active',
  joined_at timestamptz default now(),
  last_active text default 'Online'
);

create index if not exists idx_members_owner_id on public.members(owner_id);
create index if not exists idx_members_user_id on public.members(user_id);

-- 5. Conversations Table (Private 1-to-1 conversations between owner and members)
create table if not exists public.conversations (
  id text primary key,
  owner_id text references public.owners(id) on delete cascade,
  member_id text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_message_text text default '',
  last_message_time text default 'Just now',
  last_message_type text default 'text',
  unread_count_for_owner integer default 0,
  unread_count_for_member integer default 0
);

create index if not exists idx_conversations_owner_id on public.conversations(owner_id);
create index if not exists idx_conversations_member_id on public.conversations(member_id);

-- 6. Broadcasts Table (Aggregate announcement records for owner analytics)
create table if not exists public.broadcasts (
  id text primary key,
  owner_id text references public.owners(id) on delete cascade,
  message_content text not null,
  media_url text,
  media_type text,
  recipient_count integer default 0,
  sent_count integer default 0,
  delivered_count integer default 0,
  read_count integer default 0,
  created_at timestamptz default now()
);

create index if not exists idx_broadcasts_owner_id on public.broadcasts(owner_id);

-- 7. Messages Table (Individual private messages delivered into 1-to-1 conversations)
create table if not exists public.messages (
  id text primary key,
  conversation_id text references public.conversations(id) on delete cascade,
  sender_id text not null,
  recipient_id text not null,
  type text default 'text',
  text text default '',
  media_url text,
  status text default 'delivered',
  broadcast_id text,
  created_at timestamptz default now(),
  delivered_at timestamptz default now(),
  read_at timestamptz
);

create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_messages_recipient_id on public.messages(recipient_id);

-- 8. Payments Table (Subscription & Membership records)
create table if not exists public.payments (
  id text primary key,
  owner_id text references public.owners(id) on delete cascade,
  member_id text references public.members(id) on delete set null,
  amount numeric(10, 2) not null default 0,
  currency text default 'USD',
  status text default 'completed',
  description text default '',
  created_at timestamptz default now()
);

create index if not exists idx_payments_owner_id on public.payments(owner_id);

-- 9. Automatic Owner Provisioning Trigger (Runs as SECURITY DEFINER upon Supabase Auth sign-up)
create or replace function public.handle_new_owner()
returns trigger as $$
declare
  raw_phone text;
  raw_name text;
  init_code text;
begin
  raw_phone := coalesce(new.raw_user_meta_data->>'phone', '');
  raw_name := coalesce(new.raw_user_meta_data->>'name', 'Owner');
  
  -- Generate 6-char random uppercase alphanumeric invite code
  init_code := upper(substring(md5(random()::text) from 1 for 6));

  -- Insert owner profile securely with owner's auth id
  insert into public.owners (id, phone, name, avatar, invite_code, created_at)
  values (
    new.id::text,
    case when raw_phone <> '' then raw_phone else 'phone_' || substring(new.id::text from 1 for 8) end,
    raw_name,
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    init_code,
    now()
  )
  on conflict (id) do update set
    name = excluded.name,
    phone = case when excluded.phone <> '' then excluded.phone else public.owners.phone end;

  -- Insert initial invitation code
  insert into public.invitations (code, owner_id, created_at, expires_at, used_count)
  values (
    init_code,
    new.id::text,
    now(),
    now() + interval '30 days',
    0
  )
  on conflict (code) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_owner();

-- 10. Secure Member Join via Invite Code RPC (Runs as SECURITY DEFINER with validation)
create or replace function public.join_by_invite(
  p_invite_code text,
  p_member_name text,
  p_member_phone text,
  p_avatar text default ''
)
returns json as $$
declare
  v_owner_id text;
  v_member_id text;
  v_user_id text;
  v_conv_id text;
begin
  -- Validate invite code
  select owner_id into v_owner_id
  from public.invitations
  where code = upper(trim(p_invite_code))
  limit 1;

  if v_owner_id is null then
    select id into v_owner_id
    from public.owners
    where invite_code = upper(trim(p_invite_code))
    limit 1;
  end if;

  if v_owner_id is null then
    raise exception 'Invalid invite code';
  end if;

  v_user_id := 'usr_mem_' || substring(md5(random()::text) from 1 for 10);
  v_member_id := 'mem_' || extract(epoch from now())::bigint::text;
  v_conv_id := 'conv_' || v_owner_id || '_' || v_user_id;

  -- Insert member record
  insert into public.members (id, owner_id, user_id, name, phone, avatar, status, joined_at, last_active)
  values (v_member_id, v_owner_id, v_user_id, p_member_name, p_member_phone, p_avatar, 'active', now(), 'Online');

  -- Increment used_count on invitation
  update public.invitations
  set used_count = used_count + 1
  where code = upper(trim(p_invite_code));

  -- Insert 1-to-1 conversation
  insert into public.conversations (id, owner_id, member_id, last_message_text, last_message_time, last_message_type, unread_count_for_owner, unread_count_for_member, created_at, updated_at)
  values (v_conv_id, v_owner_id, v_user_id, 'Joined broadcast list', 'Just now', 'text', 1, 0, now(), now())
  on conflict (id) do nothing;

  return json_build_object(
    'owner_id', v_owner_id,
    'member_id', v_member_id,
    'user_id', v_user_id,
    'conversation_id', v_conv_id
  );
end;
$$ language plpgsql security definer;

-- 11. Row Level Security (RLS) Configuration with Strict Authenticated Tenant Isolation
alter table public.owners enable row level security;
alter table public.invitations enable row level security;
alter table public.members enable row level security;
alter table public.conversations enable row level security;
alter table public.broadcasts enable row level security;
alter table public.messages enable row level security;
alter table public.payments enable row level security;

-- Drop all previous policies
drop policy if exists "Allow owners access" on public.owners;
drop policy if exists "Public owners lookup" on public.owners;
drop policy if exists "Owners select lookup" on public.owners;
drop policy if exists "Owners insert own profile" on public.owners;
drop policy if exists "Owners insert profile" on public.owners;
drop policy if exists "Owners update own profile" on public.owners;
drop policy if exists "Owners delete own profile" on public.owners;

drop policy if exists "Allow invitations access" on public.invitations;
drop policy if exists "Public invitation code lookup" on public.invitations;
drop policy if exists "Invitations select lookup" on public.invitations;
drop policy if exists "Owners manage invitations" on public.invitations;

drop policy if exists "Allow members access" on public.members;
drop policy if exists "Members list access" on public.members;
drop policy if exists "Members owner isolation" on public.members;
drop policy if exists "Members owner insert" on public.members;
drop policy if exists "Members owner update" on public.members;
drop policy if exists "Members owner delete" on public.members;

drop policy if exists "Allow conversations access" on public.conversations;
drop policy if exists "Conversations access" on public.conversations;
drop policy if exists "Conversations isolation" on public.conversations;
drop policy if exists "Conversations isolation select" on public.conversations;
drop policy if exists "Conversations isolation insert" on public.conversations;
drop policy if exists "Conversations isolation update" on public.conversations;
drop policy if exists "Conversations isolation delete" on public.conversations;

drop policy if exists "Allow broadcasts access" on public.broadcasts;
drop policy if exists "Owners manage own broadcasts" on public.broadcasts;
drop policy if exists "Owners view own broadcasts" on public.broadcasts;
drop policy if exists "Owners insert own broadcasts" on public.broadcasts;
drop policy if exists "Owners update own broadcasts" on public.broadcasts;
drop policy if exists "Owners delete own broadcasts" on public.broadcasts;

drop policy if exists "Allow messages access" on public.messages;
drop policy if exists "Messages access" on public.messages;
drop policy if exists "Messages isolation" on public.messages;
drop policy if exists "Messages isolation select" on public.messages;
drop policy if exists "Messages isolation insert" on public.messages;
drop policy if exists "Messages isolation update" on public.messages;
drop policy if exists "Messages isolation delete" on public.messages;

drop policy if exists "Allow payments access" on public.payments;
drop policy if exists "Payments access" on public.payments;
drop policy if exists "Payments owner isolation" on public.payments;

-- A. Owners Table Policies:
-- Allow lookup by phone/id to verify account existence and validate invite codes
create policy "Owners select lookup" on public.owners
  for select using (true);

-- Allow authenticated owner to insert profile with matching auth UID
create policy "Owners insert profile" on public.owners
  for insert with check (auth.uid()::text = id);

-- Allow authenticated owner to update only their own profile
create policy "Owners update own profile" on public.owners
  for update using (auth.uid()::text = id);

-- Allow authenticated owner to delete only their own profile
create policy "Owners delete own profile" on public.owners
  for delete using (auth.uid()::text = id);

-- B. Invitations Table Policies:
-- Allow anyone to look up invite codes to join
create policy "Invitations select lookup" on public.invitations
  for select using (true);

-- Allow only the owner to insert, update, or delete their invitations
create policy "Owners manage invitations" on public.invitations
  for all using (owner_id = auth.uid()::text)
  with check (owner_id = auth.uid()::text);

-- C. Broadcasts Table Policies (Strict Tenant Isolation):
-- An owner can ONLY view, insert, update, or delete their own broadcasts
create policy "Owners view own broadcasts" on public.broadcasts
  for select using (owner_id = auth.uid()::text);

create policy "Owners insert own broadcasts" on public.broadcasts
  for insert with check (owner_id = auth.uid()::text);

create policy "Owners update own broadcasts" on public.broadcasts
  for update using (owner_id = auth.uid()::text);

create policy "Owners delete own broadcasts" on public.broadcasts
  for delete using (owner_id = auth.uid()::text);

-- D. Members Table Policies (Strict Tenant Isolation):
create policy "Members owner select" on public.members
  for select using (owner_id = auth.uid()::text or user_id = auth.uid()::text);

create policy "Members owner insert" on public.members
  for insert with check (owner_id = auth.uid()::text);

create policy "Members owner update" on public.members
  for update using (owner_id = auth.uid()::text or user_id = auth.uid()::text);

create policy "Members owner delete" on public.members
  for delete using (owner_id = auth.uid()::text);

-- E. Conversations Table Policies (Strict Tenant Isolation):
create policy "Conversations isolation select" on public.conversations
  for select using (owner_id = auth.uid()::text or member_id = auth.uid()::text);

create policy "Conversations isolation insert" on public.conversations
  for insert with check (owner_id = auth.uid()::text);

create policy "Conversations isolation update" on public.conversations
  for update using (owner_id = auth.uid()::text or member_id = auth.uid()::text);

create policy "Conversations isolation delete" on public.conversations
  for delete using (owner_id = auth.uid()::text);

-- F. Messages Table Policies (Strict Tenant Isolation):
create policy "Messages isolation select" on public.messages
  for select using (
    sender_id = auth.uid()::text
    or recipient_id = auth.uid()::text
    or exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and c.owner_id = auth.uid()::text
    )
  );

create policy "Messages isolation insert" on public.messages
  for insert with check (
    sender_id = auth.uid()::text
    or exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and c.owner_id = auth.uid()::text
    )
  );

create policy "Messages isolation update" on public.messages
  for update using (
    recipient_id = auth.uid()::text
    or exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and c.owner_id = auth.uid()::text
    )
  );

create policy "Messages isolation delete" on public.messages
  for delete using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and c.owner_id = auth.uid()::text
    )
  );

-- G. Payments Table Policies:
create policy "Payments owner isolation" on public.payments
  for all using (owner_id = auth.uid()::text)
  with check (owner_id = auth.uid()::text);

-- 12. Supabase Storage Setup & Security Policies
-- Bucket: 'media' (PRIVATE bucket)
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do update set public = false;

drop policy if exists "Public Access to media" on storage.objects;
drop policy if exists "Public Upload to media" on storage.objects;
drop policy if exists "Public Update to media" on storage.objects;
drop policy if exists "Public Delete to media" on storage.objects;
drop policy if exists "Avatar public access" on storage.objects;
drop policy if exists "Avatar public select" on storage.objects;
drop policy if exists "Media upload access" on storage.objects;
drop policy if exists "Media owner read access" on storage.objects;
drop policy if exists "Media delete access" on storage.objects;
drop policy if exists "Owner isolated media upload" on storage.objects;
drop policy if exists "Owner private media select" on storage.objects;
drop policy if exists "Owner isolated media delete" on storage.objects;

-- Storage Policy 1: Avatars are publicly viewable
create policy "Avatar public select" on storage.objects
  for select using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'avatars'
  );

-- Storage Policy 2: Authenticated owner can select/browse only their own media or avatars
create policy "Owner private media select" on storage.objects
  for select using (
    bucket_id = 'media'
    and (
      (storage.foldername(name))[1] = 'avatars'
      or (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- Storage Policy 3: Authenticated owner can ONLY upload to their own owner_id directory or avatars
create policy "Owner isolated media upload" on storage.objects
  for insert with check (
    bucket_id = 'media'
    and (
      (storage.foldername(name))[1] = 'avatars'
      or (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- Storage Policy 4: Authenticated owner can ONLY delete files from their own owner_id directory
create policy "Owner isolated media delete" on storage.objects
  for delete using (
    bucket_id = 'media'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
