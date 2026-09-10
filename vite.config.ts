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
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');
            if (normalizedId.includes('node_modules/@mediapipe/tasks-vision')) {
              return 'mediapipe-tasks-vision';
            }
            if (normalizedId.includes('node_modules/three')) {
              return 'vendor-three';
            }
            if (
              normalizedId.includes('node_modules/react') ||
              normalizedId.includes('node_modules/react-dom')
            ) {
              return 'vendor-react';
            }
            if (normalizedId.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            if (normalizedId.includes('node_modules/canvas-confetti')) {
              return 'vendor-confetti';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
