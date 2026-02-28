import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { devApiProxy } from './src/server/devApiProxy'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    devApiProxy(),
  ],
})
