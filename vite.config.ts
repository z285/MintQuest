import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), nodePolyfills({
    // Whether to polyfill specific globals.
    globals: {
      Buffer: true, 
      global: true,
      process: true,
    },
  }), cloudflare()],
})