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
  build: {
    outDir: 'dist/lib',
    lib: {
      entry: path.resolve(__dirname, 'src/lib/index.ts'),
      name: 'ReactRealtimeAvatar',
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'motion',
        'motion/react'
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          motion: 'Motion',
          'motion/react': 'MotionReact'
        }
      }
    }
  }
});
