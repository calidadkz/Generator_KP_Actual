import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  // Accept VITE_GEMINI_API_KEY from .env (local dev)
  // OR GEMINI_API_KEY from process.env (Docker build-arg / Cloud Build)
  const geminiKey = env.VITE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? '';
  return {
    plugins: [react()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
      // Single injected constant readable from app code without TypeScript process issues
      '__GEMINI_KEY__': JSON.stringify(geminiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'esnext',
    },
    esbuild: {
      supported: {
        'top-level-await': true,
      },
    },
    optimizeDeps: {
      include: ['pdfjs-dist'],
      esbuildOptions: {
        target: 'esnext',
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
