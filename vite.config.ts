import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

const rootDir = import.meta.dirname;
const pkgJson = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'package.json'), 'utf-8')) as {
  version?: string;
};
const appVersion = `v${pkgJson.version || '1.0.1'}`;
const buildDate = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

export default defineConfig(() => {
  return {
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __BUILD_DATE__: JSON.stringify(buildDate),
    },
    build: {
      target: 'es2020',
      sourcemap: false,
      rolldownOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
          codeSplitting: {
            groups: [
              {
                name: 'vendor-three',
                test: /node_modules[\\/]three[\\/]/,
                priority: 30,
              },
              {
                name: 'vendor-peer',
                test: /node_modules[\\/](peerjs|webrtc-adapter|eventemitter3|js-binarypack)[\\/]/,
                priority: 25,
              },
              {
                name: 'vendor-react',
                test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                priority: 20,
              },
            ],
          },
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['icon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Bodycam Vanguard — Tactical FPS',
          short_name: 'Vanguard',
          description: 'Tactical Bodycam FPS with 1v1 & 2v2 P2P Multiplayer and Training Mode',
          theme_color: '#070b12',
          background_color: '#070b12',
          display: 'fullscreen',
          display_override: ['fullscreen', 'standalone'],
          orientation: 'landscape',
          start_url: './',
          scope: './',
          id: './',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          globIgnores: ['**/ads/**'],
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /\/ads\/.*\.(?:jpg|jpeg|webp|png)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'vanguard-ad-media-v1',
                expiration: {
                  maxEntries: 16,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
      // Dev-only safeguard for Vite 8 @vite/client: when the HMR WebSocket cannot connect
      // (e.g. behind a proxy or with HMR disabled), ws stays undefined while connect() resolves.
      // Guarding ws.send prevents `TypeError: Cannot read properties of undefined (reading 'send')`.
      {
        name: 'guard-vite-client-ws-send',
        apply: 'serve' as const,
        transform(code: string, id: string) {
          if (id.includes('vite/dist/client/client.mjs') && code.includes('ws.send(JSON.stringify(data))')) {
            return {
              code: code.replace(
                'ws.send(JSON.stringify(data))',
                'if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(data))',
              ),
              map: null,
            };
          }
          return null;
        },
      },
      // Copies src/assets into dist/ and generates dist/404.html for GitHub Pages static SPA hosting.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build' as const,
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(rootDir, 'dist');
          const srcAssets = path.resolve(rootDir, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
          const indexHtml = path.resolve(distDir, 'index.html');
          const notFoundHtml = path.resolve(distDir, '404.html');
          if (fs.existsSync(indexHtml)) {
            fs.copyFileSync(indexHtml, notFoundHtml);
          }
          // Prevent GitHub Pages Jekyll processing so static assets always resolve
          const noJekyllFile = path.resolve(distDir, '.nojekyll');
          fs.writeFileSync(noJekyllFile, '');
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
