import react from '@vitejs/plugin-react';
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// This repo publishes a library, not an app. The library build has its own
// config (vite.config.lib.ts); this root config exists only so Vitest picks up
// the React plugin to transform JSX in the .tsx test files.
export default defineConfig({
  plugins: [react()],
  test: {
    // e2e/ holds the Playwright browser tests (`npm run test:e2e`).
    exclude: ['**/node_modules/**', 'e2e/**'],
  },
});
