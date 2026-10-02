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
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
