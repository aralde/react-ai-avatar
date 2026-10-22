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
      // One entry per public path in package.json `exports`.
      entry: {
        index: path.resolve(__dirname, 'src/lib/index.ts'),
        characters: path.resolve(__dirname, 'src/lib/characters.ts'),
        dicebear: path.resolve(__dirname, 'src/lib/dicebear-entry.ts'),
        '3d': path.resolve(__dirname, 'src/lib/three.ts'),
        vrm: path.resolve(__dirname, 'src/lib/vrm.ts'),
      },
      name: 'ReactAiAvatar',
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
      cssFileName: 'react-ai-avatar',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      // Peers stay out of the bundle: react, and the optional three.js and
      // DiceBear stacks (only loaded by the variants that need them).
      external: [
        /^react($|\/)/,
        /^react-dom($|\/)/,
        /^three($|\/)/,
        /^@react-three\//,
        /^@pixiv\/three-vrm($|\/)/,
        /^@dicebear\//,
      ],
      // One output file per source module, so a consumer's bundler drops
      // whatever it doesn't import (one big file defeats tree-shaking).
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
  },
});
