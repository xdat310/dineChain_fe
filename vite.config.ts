import react from '@vitejs/plugin-react'
import { networkInterfaces } from 'node:os'
import { defineConfig } from 'vite'

// The table QR codes must open on guests' phones, so they point at this machine's Wi-Fi address, not localhost
const lanIp = Object.values(networkInterfaces()).flat()
  .find((n) => n && n.family === 'IPv4' && !n.internal)?.address

// The dev server forwards /api to the Spring Boot backend, so the browser never makes a cross-origin call
export default defineConfig({
  plugins: [react()],
  define: {
    __LAN_ORIGIN__: JSON.stringify(lanIp ? `http://${lanIp}:5173` : ''),
  },
  server: {
    port: 5173,
    // Reachable from phones on the same Wi-Fi and through ngrok
    host: true,
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app'],
    proxy: {
      // Phones open the app at the Wi-Fi IP or an ngrok URL; through the proxy the call is same-origin,
      // so drop Origin instead of listing every address in the backend's CORS whitelist
      '/api': {
        configure: (proxy) => proxy.on('proxyReq', (req) => req.removeHeader('origin')),
        target: 'http://localhost:8080', changeOrigin: true,
      },
    },
  },
})
