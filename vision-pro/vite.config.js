import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API requests to the FastAPI backend
      '/api': {
        target: 'http://127.0.0.1:8000', // FastAPI server URL
        changeOrigin: true,
      },
    },
  },
});
