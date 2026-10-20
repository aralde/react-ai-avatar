import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// Serves the browser-test fixture straight from the library sources.
export default defineConfig({
  root: path.resolve(__dirname, 'fixture'),
  plugins: [react(), tailwindcss()],
  publicDir: false,
  server: { port: 5179, strictPort: true },
});
