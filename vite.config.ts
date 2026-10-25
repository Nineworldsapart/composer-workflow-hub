import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    watch: {
      ignored: ['**/release/**', '**/dist/**', '**/node_modules/**']
    }
  },
  build: {
    outDir: 'dist'
  }
});