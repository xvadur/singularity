import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/chat/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': process.env.ALFRED_URL || `http://127.0.0.1:${process.env.ALFRED_PORT || '3030'}`,
      '/health': process.env.ALFRED_URL || `http://127.0.0.1:${process.env.ALFRED_PORT || '3030'}`
    }
  }
}));
