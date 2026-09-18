// c:\Users\arunm\Downloads\Dent\dentine\frontend\vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false, // automatically try next port if 5173 is busy
  },
});

