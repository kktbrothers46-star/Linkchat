// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import path from "path";
import fs from "fs";
var app = express();
var PORT = 3e3;
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});
app.use(express.json({ limit: "60mb" }));
app.use(express.urlencoded({ extended: true, limit: "60mb" }));
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  if (!storedHash.includes(":")) {
    return storedHash === password;
  }
  try {
    const [salt, key] = storedHash.split(":");
    const testKey = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(testKey, "hex"));
  } catch {
    return false;
  }
}
var users = /* @__PURE__ */ new Map();
var invitations = /* @__PURE__ */ new Map();
var conversations = /* @__PURE__ */ new Map();
var messages = /* @__PURE__ */ new Map();
var broadcasts = /* @__PURE__ */ new Map();
var mediaStore = /* @__PURE__ */ new Map();
var DATA_DIR = path.resolve(process.cwd(), "data");
var DB_FILE = path.join(DATA_DIR, "db.json");
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
      mediaStore: Array.from(mediaStore.values())
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save db.json:", err);
  }
}
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
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
    console.error("Failed to load db.json:", err);
  }
}
loadDb();
function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
function authenticateUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  for (const user of users.values()) {
    if (user.token === token) {
      return user;
    }
  }
  return null;
}
function normalizePhone(phone) {
  const trimmed = (phone || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) {
    return "+" + trimmed.substring(1).replace(/[^0-9]/g, "");
  }
  return trimmed.replace(/[^0-9]/g, "") || trimmed;
}
app.post("/api/auth/owner-check", (req, res) => {
  const { phone } = req.body || {};
  const cleanPhone = normalizePhone(phone) || (phone || "").trim();
  if (!cleanPhone) {
    res.status(400).json({ error: "Phone number is required." });
    return;
  }
  const owner = Array.from(users.values()).find(
    (u) => u.role === "owner" && (normalizePhone(u.phone) === cleanPhone || u.phone === cleanPhone)
  );
  if (owner) {
    res.json({
      exists: true,
      phone: owner.phone,
      name: owner.name,
      hasCustomPassword: Boolean(owner.password)
    });
  } else {
    res.json({
      exists: false,
      phone: cleanPhone
    });
  }
});
app.post("/api/auth/owner-register", (req, res) => {
  const { phone, password, name } = req.body || {};
  const cleanPhone = normalizePhone(phone) || (phone || "").trim();
  const cleanPassword = String(password || "").trim();
  const cleanName = (name || "").trim() || "Owner";
  if (!cleanPhone) {
    res.status(400).json({ error: "Phone number is required." });
    return;
  }
  if (!cleanPassword || cleanPassword.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }
  const existing = Array.from(users.values()).find(
    (u) => u.role === "owner" && (normalizePhone(u.phone) === cleanPhone || u.phone === cleanPhone)
  );
  if (existing) {
    res.status(409).json({
      error: "An owner account with this phone number already exists. Please log in with your password.",
      alreadyExists: true
    });
    return;
  }
  const newOwnerId = "usr_owner_" + crypto.randomBytes(6).toString("hex");
  const ownerToken = "tok_owner_" + crypto.randomBytes(16).toString("hex");
  const owner = {
    id: newOwnerId,
    name: cleanName,
    phone: cleanPhone,
    password: hashPassword(cleanPassword),
    role: "owner",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    token: ownerToken,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  users.set(newOwnerId, owner);
  const newInviteCode = generateInviteCode();
  invitations.set(newInviteCode, {
    code: newInviteCode,
    ownerId: newOwnerId,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString(),
    usedCount: 0
  });
  saveDb();
  res.json({
    user: {
      id: owner.id,
      name: owner.name,
      phone: owner.phone,
      role: owner.role,
      avatar: owner.avatar
    },
    token: owner.token,
    isNewOwner: true,
    inviteCode: newInviteCode,
    message: `New owner account successfully created for ${owner.phone}`
  });
});
app.post("/api/auth/owner-login", (req, res) => {
  const { password, name, phone, mode } = req.body || {};
  const cleanPhone = normalizePhone(phone) || (phone || "").trim();
  const rawPassword = String(password || "").trim();
  if (!cleanPhone) {
    res.status(400).json({ error: "Phone number is required for owner access." });
    return;
  }
  if (!rawPassword) {
    res.status(400).json({ error: "Password is required." });
    return;
  }
  const owner = Array.from(users.values()).find(
    (u) => u.role === "owner" && (normalizePhone(u.phone) === cleanPhone || u.phone === cleanPhone)
  );
  if (!owner) {
    res.status(404).json({
      error: "No owner account found with this phone number. Please switch to New Owner to create an account.",
      notFound: true
    });
    return;
  }
  const isPasswordValid = verifyPassword(rawPassword, owner.password);
  if (!isPasswordValid) {
    res.status(401).json({ error: "Incorrect password for this owner account. Please try again." });
    return;
  }
  if (name && typeof name === "string" && name.trim()) {
    owner.name = name.trim();
  }
  if (!owner.token) {
    owner.token = "tok_owner_" + crypto.randomBytes(16).toString("hex");
  }
  saveDb();
  let primaryInviteCode = "";
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
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString(),
      usedCount: 0
    });
    saveDb();
  }
  res.json({
    user: {
      id: owner.id,
      name: owner.name,
      phone: owner.phone,
      role: owner.role,
      avatar: owner.avatar
    },
    token: owner.token,
    isNewOwner: false,
    inviteCode: primaryInviteCode,
    message: `Owner authenticated successfully for phone ${owner.phone}`
  });
});
app.post("/api/auth/register-member", (req, res) => {
  const { name, phone, inviteCode, avatar } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const cleanName = name.trim();
  const cleanPhone = (phone || "").trim();
  const cleanAvatar = avatar && typeof avatar === "string" ? avatar.trim() : "";
  const normalizedCode = (inviteCode || "").trim().toUpperCase();
  let validInvite = invitations.get(normalizedCode);
  let targetOwnerId = null;
  if (validInvite) {
    targetOwnerId = validInvite.ownerId;
    validInvite.usedCount += 1;
  } else {
    for (const inv of invitations.values()) {
      if (inv.code === normalizedCode) {
        validInvite = inv;
        targetOwnerId = inv.ownerId;
        inv.usedCount += 1;
        break;
      }
    }
  }
  if (!targetOwnerId) {
    const allOwners = Array.from(users.values()).filter((u) => u.role === "owner");
    if (allOwners.length > 0) {
      targetOwnerId = allOwners[allOwners.length - 1].id;
    }
  }
  if (!targetOwnerId) {
    res.status(400).json({ error: "No active owner account available to join" });
    return;
  }
  const owner = users.get(targetOwnerId);
  if (validInvite && new Date(validInvite.expiresAt).getTime() < Date.now()) {
    res.status(400).json({ error: "Invitation code has expired" });
    return;
  }
  const memberId = "mem_" + crypto.randomBytes(8).toString("hex");
  const memberToken = "tok_mem_" + crypto.randomBytes(16).toString("hex");
  const newMember = {
    id: memberId,
    name: cleanName,
    phone: cleanPhone,
    role: "member",
    avatar: cleanAvatar,
    token: memberToken,
    ownerId: targetOwnerId,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  users.set(memberId, newMember);
  const convId = `conv_${targetOwnerId}_${memberId}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  conversations.set(convId, {
    id: convId,
    ownerId: targetOwnerId,
    memberId,
    createdAt: now,
    updatedAt: now
  });
  const ownerBroadcasts = Array.from(broadcasts.values()).filter((bc) => bc.ownerId === targetOwnerId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (ownerBroadcasts.length === 0) {
    const welcomeId = `msg_welcome_${memberId}`;
    messages.set(welcomeId, {
      id: welcomeId,
      conversationId: convId,
      senderId: targetOwnerId,
      recipientId: memberId,
      type: "text",
      text: `Welcome to LinkChat ${cleanName}! You will receive all private announcements here from ${owner?.name || "the Owner"}${owner?.phone ? ` (${owner.phone})` : ""}. You can reply directly to this chat at any time.`,
      createdAt: now,
      deliveredAt: now,
      status: "delivered"
    });
  } else {
    for (const bc of ownerBroadcasts) {
      const bcMsgId = `msg_${bc.id}_${memberId}`;
      messages.set(bcMsgId, {
        id: bcMsgId,
        conversationId: convId,
        senderId: targetOwnerId,
        recipientId: memberId,
        type: bc.mediaType || (bc.mediaId ? "image" : "text"),
        text: bc.messageContent,
        mediaId: bc.mediaId,
        createdAt: bc.createdAt,
        deliveredAt: now,
        status: "delivered",
        broadcastId: bc.id
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
      avatar: newMember.avatar
    },
    token: memberToken
  });
});
app.post("/api/user/profile", (req, res) => {
  const user = authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { name, phone, avatar } = req.body || {};
  if (name && typeof name === "string" && name.trim()) {
    user.name = name.trim();
  }
  if (phone && typeof phone === "string" && phone.trim()) {
    user.phone = phone.trim();
  }
  if (avatar && typeof avatar === "string") {
    user.avatar = avatar;
  }
  saveDb();
  res.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar
    }
  });
});
app.get("/api/auth/me", (req, res) => {
  const user = authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized session" });
    return;
  }
  res.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.role === "owner" ? user.phone : user.phone,
      role: user.role,
      avatar: user.avatar
    }
  });
});
app.patch("/api/auth/profile", (req, res) => {
  const user = authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { name, phone } = req.body;
  if (name && typeof name === "string") user.name = name.trim();
  if (phone !== void 0) user.phone = String(phone).trim();
  res.json({
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role
    }
  });
});
app.get("/api/owner/members", (req, res) => {
  const user = authenticateUser(req);
  if (!user || user.role !== "owner") {
    res.status(403).json({ error: "Forbidden: Only the owner can access the member list" });
    return;
  }
  const memberList = [];
  for (const u of users.values()) {
    if (u.role === "member" && u.ownerId === user.id) {
      memberList.push({
        userId: u.id,
        name: u.name,
        phone: u.phone,
        joinedAt: u.createdAt
      });
    }
  }
  res.json({ members: memberList });
});
app.post("/api/owner/members", (req, res) => {
  const user = authenticateUser(req);
  if (!user || user.role !== "owner") {
    res.status(403).json({ error: "Forbidden: Only the owner can add members" });
    return;
  }
  const { name, phone } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const memberId = "mem_" + crypto.randomBytes(8).toString("hex");
  const memberToken = "tok_mem_" + crypto.randomBytes(16).toString("hex");
  const newMember = {
    id: memberId,
    name: name.trim(),
    phone: (phone || "").trim(),
    role: "member",
    avatar: "",
    token: memberToken,
    ownerId: user.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  users.set(memberId, newMember);
  const convId = `conv_${user.id}_${memberId}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  conversations.set(convId, {
    id: convId,
    ownerId: user.id,
    memberId,
    createdAt: now,
    updatedAt: now
  });
  res.json({
    member: {
      userId: newMember.id,
      name: newMember.name,
      phone: newMember.phone,
      joinedAt: newMember.createdAt
    }
  });
});
app.get("/api/owner/invitations", (req, res) => {
  const user = authenticateUser(req);
  if (!user || user.role !== "owner") {
    res.status(403).json({ error: "Forbidden: Only the owner can manage invitations" });
    return;
  }
  const list = Array.from(invitations.values()).filter((i) => i.ownerId === user.id);
  res.json({ invitations: list });
});
app.post("/api/owner/invitations", (req, res) => {
  const user = authenticateUser(req);
  if (!user || user.role !== "owner") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const code = generateInviteCode();
  const newInvite = {
    code,
    ownerId: user.id,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString(),
    usedCount: 0
  };
  invitations.set(code, newInvite);
  res.json({ invitation: newInvite });
});
app.get("/api/conversations", (req, res) => {
  const user = authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const result = [];
  if (user.role === "owner") {
    for (const conv of conversations.values()) {
      if (conv.ownerId !== user.id) continue;
      const member = users.get(conv.memberId);
      if (!member) continue;
      const convMsgs = Array.from(messages.values()).filter((m) => m.conversationId === conv.id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const lastMsg = convMsgs[convMsgs.length - 1];
      const unreadCount = convMsgs.filter(
        (m) => m.senderId !== user.id && m.status !== "read"
      ).length;
      result.push({
        conversationId: conv.id,
        memberId: member.id,
        memberName: member.name,
        memberPhone: member.phone,
        updatedAt: conv.updatedAt,
        lastMessageText: lastMsg ? lastMsg.text || (lastMsg.type !== "text" ? `[${lastMsg.type}]` : "") : "No messages yet",
        lastMessageTime: lastMsg ? lastMsg.createdAt : conv.createdAt,
        lastMessageType: lastMsg ? lastMsg.type : "text",
        unreadCount
      });
    }
  } else {
    const targetOwnerId = user.ownerId || Array.from(users.values()).find((u) => u.role === "owner")?.id;
    if (targetOwnerId) {
      const convId = `conv_${targetOwnerId}_${user.id}`;
      let conv = conversations.get(convId);
      if (!conv) {
        const now = (/* @__PURE__ */ new Date()).toISOString();
        conv = {
          id: convId,
          ownerId: targetOwnerId,
          memberId: user.id,
          createdAt: now,
          updatedAt: now
        };
        conversations.set(convId, conv);
      }
      const owner = users.get(targetOwnerId);
      const convMsgs = Array.from(messages.values()).filter((m) => m.conversationId === conv.id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const lastMsg = convMsgs[convMsgs.length - 1];
      const unreadCount = convMsgs.filter(
        (m) => m.senderId === targetOwnerId && m.status !== "read"
      ).length;
      result.push({
        conversationId: conv.id,
        ownerId: targetOwnerId,
        ownerName: owner?.name || "Owner",
        updatedAt: conv.updatedAt,
        lastMessageText: lastMsg ? lastMsg.text || (lastMsg.type !== "text" ? `[${lastMsg.type}]` : "") : "No messages yet",
        lastMessageTime: lastMsg ? lastMsg.createdAt : conv.createdAt,
        lastMessageType: lastMsg ? lastMsg.type : "text",
        unreadCount
      });
    }
  }
  res.json({ conversations: result });
});
app.get("/api/conversations/:conversationId/messages", (req, res) => {
  const user = authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { conversationId } = req.params;
  const conv = conversations.get(conversationId);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  if (user.role !== "owner" && conv.memberId !== user.id) {
    res.status(403).json({ error: "Forbidden: You cannot access another user conversation" });
    return;
  }
  const convMsgs = Array.from(messages.values()).filter((m) => m.conversationId === conversationId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let updatedRead = false;
  for (const m of convMsgs) {
    if (m.recipientId === user.id && m.status !== "read") {
      m.status = "read";
      m.readAt = now;
      updatedRead = true;
      if (m.broadcastId) {
        const bc = broadcasts.get(m.broadcastId);
        if (bc) {
          bc.readCount = Math.min(bc.recipientCount, bc.readCount + 1);
        }
      }
    }
  }
  const sanitized = convMsgs.map((m) => ({
    messageId: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    recipientId: m.recipientId,
    type: m.type,
    text: m.text,
    mediaUrl: m.mediaId ? `/api/media/${m.mediaId}` : void 0,
    createdAt: m.createdAt,
    deliveredAt: m.deliveredAt,
    readAt: m.readAt,
    status: m.status
    // BroadcastId is kept on backend, not revealing other recipients
  }));
  res.json({ messages: sanitized });
});
app.post("/api/conversations/:conversationId/messages", (req, res) => {
  const user = authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { conversationId } = req.params;
  const conv = conversations.get(conversationId);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  if (user.role !== "owner" && conv.memberId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { text, mediaId, type } = req.body;
  const isOwner = user.role === "owner";
  const recipientId = isOwner ? conv.memberId : conv.ownerId;
  const msgId = "msg_" + crypto.randomBytes(8).toString("hex");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (mediaId) {
    const media = mediaStore.get(mediaId);
    if (!media || media.uploaderId !== user.id) {
      res.status(400).json({ error: "Invalid or unauthorized media" });
      return;
    }
    media.conversationId = conversationId;
    media.messageId = msgId;
  }
  const newMsg = {
    id: msgId,
    conversationId,
    senderId: user.id,
    recipientId,
    type: type || (mediaId ? "image" : "text"),
    text: (text || "").trim(),
    mediaId: mediaId || void 0,
    createdAt: now,
    deliveredAt: now,
    status: "delivered"
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
      mediaUrl: newMsg.mediaId ? `/api/media/${newMsg.mediaId}` : void 0,
      createdAt: newMsg.createdAt,
      deliveredAt: newMsg.deliveredAt,
      status: newMsg.status
    }
  });
});
app.post("/api/owner/broadcast", (req, res) => {
  const user = authenticateUser(req);
  if (!user || user.role !== "owner") {
    res.status(403).json({ error: "Forbidden: Only the owner can broadcast" });
    return;
  }
  const { text, mediaId, mediaType } = req.body;
  if (!text?.trim() && !mediaId) {
    res.status(400).json({ error: "Broadcast must contain text or media" });
    return;
  }
  const memberList = Array.from(users.values()).filter((u) => u.role === "member" && u.ownerId === user.id);
  const recipientCount = memberList.length;
  const broadcastId = "bc_" + crypto.randomBytes(8).toString("hex");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const broadcastRecord = {
    id: broadcastId,
    ownerId: user.id,
    messageContent: (text || "").trim(),
    mediaId: mediaId || void 0,
    mediaType: mediaType || (mediaId ? "image" : void 0),
    createdAt: now,
    recipientCount,
    sentCount: recipientCount,
    deliveredCount: recipientCount,
    readCount: 0
  };
  broadcasts.set(broadcastId, broadcastRecord);
  for (const member of memberList) {
    const convId = `conv_${user.id}_${member.id}`;
    let conv = conversations.get(convId);
    if (!conv) {
      conv = {
        id: convId,
        ownerId: user.id,
        memberId: member.id,
        createdAt: now,
        updatedAt: now
      };
      conversations.set(convId, conv);
    } else {
      conv.updatedAt = now;
    }
    const indMsgId = `msg_${broadcastId}_${member.id}`;
    const individualMsg = {
      id: indMsgId,
      conversationId: convId,
      senderId: user.id,
      recipientId: member.id,
      type: mediaType || (mediaId ? "image" : "text"),
      text: (text || "").trim(),
      mediaId: mediaId || void 0,
      createdAt: now,
      deliveredAt: now,
      status: "delivered",
      broadcastId
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
      readCount: broadcastRecord.readCount
    }
  });
});
app.get("/api/owner/broadcasts", (req, res) => {
  const user = authenticateUser(req);
  if (!user || user.role !== "owner") {
    res.status(403).json({ error: "Forbidden: Broadcast statistics are strictly owner-only" });
    return;
  }
  const list = Array.from(broadcasts.values()).filter((bc) => bc.ownerId === user.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((bc) => ({
    broadcastId: bc.id,
    messageContent: bc.messageContent,
    mediaUrl: bc.mediaId ? `/api/media/${bc.mediaId}` : void 0,
    mediaType: bc.mediaType,
    createdAt: bc.createdAt,
    recipientCount: bc.recipientCount,
    sentCount: bc.sentCount,
    deliveredCount: bc.deliveredCount,
    readCount: bc.readCount
  }));
  res.json({ broadcasts: list });
});
app.post("/api/media/upload", (req, res) => {
  const user = authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized: Media upload requires authenticated session" });
    return;
  }
  const { dataBase64, mimeType, fileName } = req.body;
  if (!dataBase64 || !mimeType) {
    res.status(400).json({ error: "Invalid media upload payload" });
    return;
  }
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/3gpp"
  ];
  if (!allowedTypes.includes(mimeType.toLowerCase())) {
    res.status(400).json({ error: `Unsupported media format: ${mimeType}. Only images and MP4/WebM videos are supported.` });
    return;
  }
  const estimatedSize = Math.round(dataBase64.length * 3 / 4);
  if (estimatedSize > 50 * 1024 * 1024) {
    res.status(400).json({ error: "File size exceeds 50MB limit" });
    return;
  }
  const mediaId = "med_" + crypto.randomBytes(12).toString("hex");
  const mediaRecord = {
    id: mediaId,
    uploaderId: user.id,
    mimeType,
    dataBase64,
    fileSize: estimatedSize,
    fileName: fileName || "media_file",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  mediaStore.set(mediaId, mediaRecord);
  res.json({
    mediaId,
    url: `/api/media/${mediaId}`,
    mimeType
  });
});
app.get("/api/media/:mediaId", (req, res) => {
  const user = authenticateUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized: Authentication required to view media" });
    return;
  }
  const { mediaId } = req.params;
  const media = mediaStore.get(mediaId);
  if (!media) {
    res.status(404).json({ error: "Media not found" });
    return;
  }
  if (user.role === "owner") {
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
      for (const msg of messages.values()) {
        if (msg.mediaId === mediaId && (msg.recipientId === user.id || msg.senderId === user.id)) {
          authorized = true;
          break;
        }
      }
    }
    if (!authorized) {
      res.status(403).json({ error: "Forbidden: You are not authorized to view this media" });
      return;
    }
  }
  const cleanBase64 = media.dataBase64.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  res.setHeader("Content-Type", media.mimeType);
  res.setHeader("Content-Length", buffer.length);
  res.setHeader("Cache-Control", "private, max-age=86400");
  res.send(buffer);
});
async function startServer() {
  loadDb();
  const isProduction = process.env.NODE_ENV === "production";
  const distPath = path.resolve(process.cwd(), "dist");
  if (isProduction && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch {
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get("*", (req, res, next) => {
          if (req.path.startsWith("/api")) return next();
          res.sendFile(path.join(distPath, "index.html"));
        });
      }
    }
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LinkChat server running at http://0.0.0.0:${PORT}`);
  });
}
startServer();
