import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': path.resolve(root, 'packages/shared'),
      '@xsight': path.resolve(root, 'apps/xsight/src'),
      '@xcup': path.resolve(root, 'apps/xcup/src'),
      '@hook': path.resolve(root, 'apps/hook/src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      // OKX DEX aggregator direct calls (used when VITE_OKX_* env vars are set)
      '/okxdex': {
        target: 'https://web3.okx.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/okxdex/, '/api/v5/dex/aggregator'),
      },
    },
  },
});
