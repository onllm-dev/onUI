import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@onui/core': resolve(__dirname, '../core/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/content/index.ts'),
      formats: ['es'],
      fileName: () => 'content-script.js',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'content-script.js',
      },
    },
    sourcemap: process.env.NODE_ENV === 'development',
  },
});
