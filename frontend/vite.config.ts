import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  // sockjs-client references the Node global `global`, which Vite doesn't
  // polyfill in the browser; without this the app throws "global is not
  // defined" at load time (before it ever renders).
  define: {
    global: 'globalThis',
  },
})
