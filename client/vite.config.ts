import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/pk/',
  server: {
    port: 3000,
    proxy: {
      '/pk/api': {
        target: 'http://localhost:3001',
        rewrite: (path) => path.replace(/^\/pk/, ''),
      },
      '/pk/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        rewrite: (path) => path.replace(/^\/pk/, ''),
      },
    },
  },
});
