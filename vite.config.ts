import { defineConfig } from 'vite';

// BASE_PATH: where the site is served. Relative by default; `npm run build:local` uses /for-fun/hell/ (local Apache, see .htaccess).
export default defineConfig({
  base: process.env.BASE_PATH || './',
  server: { port: 5190, host: true },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: { output: { manualChunks: { pixi: ['pixi.js'], matter: ['matter-js'] } } },
  },
});
