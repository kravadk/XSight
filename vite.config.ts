import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
