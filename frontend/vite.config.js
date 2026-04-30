import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

const commitDate = (() => {
  try {
    return execSync('git log -1 --format=%cd --date=format:"%m.%d.%y"', { cwd: '..' }).toString().trim();
  } catch {
    return '';
  }
})();

export default defineConfig({
  plugins: [react()],
  define: {
    __COMMIT_DATE__: JSON.stringify(commitDate),
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    }
  }
})
