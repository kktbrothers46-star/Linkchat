import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // Security guard: Ensure no host secret keys or misconfigured publishable keys leak into client bundle
  if (process.env.VITE_SUPABASE_ANON_KEY && (process.env.VITE_SUPABASE_ANON_KEY.includes('secret') || process.env.VITE_SUPABASE_ANON_KEY.includes('service_role'))) {
    delete process.env.VITE_SUPABASE_ANON_KEY;
  }
  if (process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.startsWith('http')) {
    delete process.env.VITE_SUPABASE_URL;
  }

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(''),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // The app runs Vite in Express middleware mode, which does not own the
      // WebSocket upgrade used by Vite HMR. Keep the client from opening a
      // socket that the backend cannot accept.
      hmr: false,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
