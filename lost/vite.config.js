import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  envDir: './src',
  plugins: [
    tailwindcss(),
    react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/testSetup.js',
    pool: 'threads',
    maxWorkers: 1,
    restoreMocks: true,
  },
})
