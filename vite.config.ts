import { defineConfig, type Plugin } from 'vite';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Dev-only: lets src/tools/icons.ts (run in the browser) save the PNG icons it renders from the
 * critter rigs into public/. POST /__save-public?name=icon-512.png with a base64 PNG body.
 * Only plain *.png names are accepted, and it does not exist in production builds.
 */
function savePublicIcons(): Plugin {
  return {
    name: 'save-public-icons',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save-public', (req, res) => {
        const name = new URL(req.url ?? '', 'http://x').searchParams.get('name') ?? '';
        if (req.method !== 'POST' || !/^[a-z0-9-]+\.png$/.test(name)) {
          res.statusCode = 400;
          res.end('bad request');
          return;
        }
        let body = '';
        req.on('data', (c) => (body += c));
        req.on('end', () => {
          writeFileSync(resolve(__dirname, 'public', name), Buffer.from(body, 'base64'));
          res.end('saved ' + name);
        });
      });
    },
  };
}

/**
 * Cache busting, a fresh id on every build:
 *  · JS/CSS already get content hashes from Vite (assets/index-AbC123.js).
 *  · Files copied from public/ keep fixed names, so their URLs get ?v=<build id>:
 *    the favicons, apple-touch-icon and manifest in index.html, and the icons inside the manifest.
 *  · The service worker's cache is named after the build, so each deploy throws the old cache away.
 *  · The id is also available to app code as __BUILD_ID__ (and in dist/version.json).
 */
function cacheBust(): Plugin {
  let git = 'nogit';
  try { git = execSync('git rev-parse --short HEAD', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* not a repo */ }
  const id = `${git}-${Date.now().toString(36)}`;
  let outDir = 'dist';
  return {
    name: 'cache-bust',
    apply: 'build',
    config: () => ({ define: { __BUILD_ID__: JSON.stringify(id) } }),
    configResolved(c) { outDir = resolve(c.root, c.build.outDir); },
    transformIndexHtml(html) {
      // version the public files the page links to (hashed bundles are left alone)
      return html.replace(/(href="[^"?#]*\/?(?:favicon-\d+\.png|apple-touch-icon\.png|manifest\.webmanifest))"/g, `$1?v=${id}"`);
    },
    closeBundle() {
      const sw = resolve(outDir, 'sw.js');
      if (existsSync(sw)) writeFileSync(sw, readFileSync(sw, 'utf8').replace(/__BUILD_ID__/g, id));
      const mf = resolve(outDir, 'manifest.webmanifest');
      if (existsSync(mf)) writeFileSync(mf, readFileSync(mf, 'utf8').replace(/("src": "[^"?]+\.png)"/g, `$1?v=${id}"`));
      writeFileSync(resolve(outDir, 'version.json'), JSON.stringify({ build: id, at: new Date().toISOString() }) + '\n');
    },
  };
}

// BASE_PATH: where the site is served. Relative by default; `npm run build:local` uses /for-fun/hell/ (local Apache, see .htaccess).
export default defineConfig({
  base: process.env.BASE_PATH || './',
  server: { port: 5190, host: true },
  define: { __BUILD_ID__: JSON.stringify('dev') },
  plugins: [savePublicIcons(), cacheBust()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: { output: { manualChunks: { pixi: ['pixi.js'], matter: ['matter-js'] } } },
  },
});
