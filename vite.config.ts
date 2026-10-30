import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // Never watch AI binaries/weights or uploaded media: locked DLLs crash the watcher with EBUSY.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/.ai_runtime/**', '**/models/**', '**/media_uploads/**', '**/logs/**'],
      },
      // Second layer behind server.ts's blockPrivateFiles: never serve data files from the dev server.
      // Setting deny replaces Vite's defaults, so they are repeated here.
      fs: {
        deny: [
          '.env', '.env.*', '*.{crt,pem}', '**/.git/**',
          '**/media_uploads/**', '**/library_index.json', '**/trash_index.json', '**/library_roots.json',
          '**/.ai_runtime/**', '**/models/**', '**/logs/**',
        ],
      },
    },
  };
});
