import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The frontend is a standalone Vite SPA. `/api/*` is served by Vercel Functions
// (via `vercel dev` in development, and the platform in production), so there is
// no dev proxy here — `vercel dev` runs Vite and the functions on one origin.
export default defineConfig({
  plugins: [react()],
});
