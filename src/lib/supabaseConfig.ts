/**
 * LinkChat Supabase Built-in Public Configuration
 * 
 * Configured directly inside the application at build time.
 * This allows LinkChat to automatically connect to your existing Supabase
 * cloud project without requiring runtime environment variables in Vercel
 * or the Median Android APK.
 * 
 * IMPORTANT SECURITY RULES:
 * - NEVER use or embed any admin secret or service key.
 * - NEVER put any secret/admin key in client-side code.
 * - Only embed your public Supabase Project URL and public anon/publishable key.
 * - PostgreSQL Row Level Security (RLS) protects all data server-side.
 */

// Built-in public Supabase Project URL
export const BUILTIN_SUPABASE_URL = 'https://cdskhrr6ltmbrdx0sqzklq.supabase.co';

// Built-in public Supabase Anon / Publishable Key
export const BUILTIN_SUPABASE_ANON_KEY = 'sb_publishable_CdsKHrR6ltMbrdX0SQZKLQ_MVn03SBg';
