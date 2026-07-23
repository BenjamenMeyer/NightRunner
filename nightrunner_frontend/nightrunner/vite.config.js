import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // 3. Development Server Configurations
    server: {
      port: 3000, // Changes the default port from 5173 to 3000
      open: true, // Automatically opens the app in the browser on startup
      host: true, // Exposes the server to the local network
      proxy: {
        // Proxies API requests to avoid CORS issues
        '/api': {
          target: env.VITE_BACKEND_URL, // Correctly references your variable
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    }
  }
})
