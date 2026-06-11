import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// envDir '..' lets the single repo-root .env feed VITE_* vars to the client
// while the server reads the same file via dotenv.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '..',
})
