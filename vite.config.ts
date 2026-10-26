import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// GitHub Pages เสิร์ฟที่ https://<user>.github.io/southern-inspection-readiness/
// จึงต้องตั้ง base ให้ตรงชื่อ repository (เปลี่ยนได้ด้วยตัวแปร VITE_BASE)
export default defineConfig({
  base: process.env.VITE_BASE ?? '/southern-inspection-readiness/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: { environment: 'node' },
})
