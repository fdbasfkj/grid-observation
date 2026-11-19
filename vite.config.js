import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = `http://127.0.0.1:${env.PORT || 8787}`

  return {
    base: './',
    plugins: [vue()],
    server: { proxy: { '/api': backend } },
    preview: { proxy: { '/api': backend } },
  }
})
