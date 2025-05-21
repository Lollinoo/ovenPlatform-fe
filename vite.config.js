import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
/**
 * Vite configuration file.
 *
 * @param {Object} context - The context object provided by Vite.
 * @param {string} context.mode - The current mode (e.g., 'development', 'production').
 * @returns {import('vite').UserConfig} The Vite configuration object.
 *
 * @description
 * This configuration file sets up a Vite project with the following features:
 * - React plugin with automatic JSX runtime and styled-jsx Babel plugin.
 * - Server configuration with a custom port, strict port binding, and host settings.
 * - Proxy setup for API requests to redirect to a target URL.
 * - Preview server configuration with a custom port and strict port binding.
 * - Environment variable handling with a custom directory and prefix.
 * - Root directory specification for the application.
 *
 * Environment Variables:
 * - `VITE_HOST`: Specifies the allowed host for the development server.
 * - `VITE_API_URL`: Specifies the target URL for the API proxy. Defaults to 'http://localhost:3000' if not provided.
 */
export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react({
        jsxRuntime: 'automatic',
        jsxImportSource: 'react',
        babel: {
          plugins: ['styled-jsx/babel']
        }
      })
    ],
    server: {
      port: 8080,
      strictPort: true,
      host: true,
      allowedHosts: [
        `${env.VITE_HOST}`,
      ],
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    preview: {
      port: 4173,
      strictPort: true,
      host: true
    },
    // Adds the definition of how and where environment variables are read
    envDir: '.',          // Directory to look for .env files
    envPrefix: 'VITE_',   // Prefix for variables to expose to the client
    root: '.'             // Root directory of the application
  }
})