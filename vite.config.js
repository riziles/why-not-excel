import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/why-not-excel/',
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        playground: resolve(__dirname, 'playground.html'),
        python: resolve(__dirname, 'python.html'),
      },
    },
  },
});
