import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// This repo publishes a library, not an app. The library build has its own
// config (vite.config.lib.ts); this root config exists only so Vitest picks up
// the React plugin to transform JSX in the .tsx test files.
export default defineConfig({
  plugins: [react()],
});
