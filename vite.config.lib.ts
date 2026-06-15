import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  // Never copy the demo's public/ assets (third-party VRM models) into the package
  publicDir: false,
  build: {
    outDir: 'dist/lib',
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/lib/index.ts'),
        vrm: path.resolve(__dirname, 'src/lib/vrm.ts'),
      },
      name: 'ReactAiAvatar',
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
      cssFileName: 'react-ai-avatar',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      // Everything heavy stays out of the bundle: required peers (react, motion)
      // and optional peers (the three.js stack, only needed for variant="vrm").
      external: [
        /^react($|\/)/,
        /^react-dom($|\/)/,
        /^motion($|\/)/,
        /^three($|\/)/,
        /^@react-three\//,
        /^@pixiv\/three-vrm($|\/)/,
        /^@dicebear\//,
      ],
    },
  },
});
