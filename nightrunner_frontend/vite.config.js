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

    test: {
      globals: true,
      environment: 'jsdom',
    },

    //CUSTOM CONFIG
    define: {
      __API_BACKEND_URL__: JSON.stringify('http://localhost:8000'),
    },

    build: {
      cssMinify: 'esbuild',
    },

    // 3. Development Server Configurations
    server: {
      port: 3000, // Changes the default port from 5173 to 3000
      open: true, // Automatically opens the app in the browser on startup
      host: true, // Exposes the server to the local network
      proxy: {
        // Proxies NightRunner Backend API requests
        '/api/v1': {
          target: env.VITE_BACKEND_URL || 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/v1/, '/v1'),
        },
        // Proxies Authentik API requests (flows, brands, userinfo)
        '/api/v3': {
          target: 'http://localhost:9000',
          changeOrigin: true,
        },
        // Fallback for general /api requests to backend
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        // Proxies OIDC metadata & token requests to Authentik
        '/application': {
          target: 'http://localhost:9000',
          changeOrigin: true,
        },
        // Proxies Authentik interface flows (login UI & redirect flows)
        '/if': {
          target: 'http://localhost:9000',
          changeOrigin: true,
        },
        '/flows': {
          target: 'http://localhost:9000',
          changeOrigin: true,
        },
        // Proxies Authentik static assets (CSS, JS)
        '/static': {
          target: 'http://localhost:9000',
          changeOrigin: true,
        },
      },
    }
  }
})
