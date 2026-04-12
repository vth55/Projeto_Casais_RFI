import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logotipo_2024_azul.svg', 'logo_casais.png'],
      manifest: {
        name: 'CASAIS Fleet Intelligence',
        short_name: 'CASAIS Fleet',
        description: 'Sistema de Gestão Inteligente de Frotas para Grupo Casais',
        theme_color: '#005EB8',
        background_color: '#f1f5f9',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        lang: 'pt-PT',
        categories: ['business', 'productivity', 'utilities'],
        icons: [
          {
            src: 'logo_casais.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'logo_casais.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Ativa o novo SW imediatamente sem esperar tabs antigas fecharem
        skipWaiting: true,
        clientsClaim: true,
        // Cache apenas de assets estáticos com hash (são imutáveis)
        globPatterns: ['**/*.{js,css,ico,png,svg,woff,woff2}'],
        // SEM navigateFallback — o SW vai à rede para qualquer
        // pedido de navegação que não tenha em cache (evita o offline.html)
        runtimeCaching: [
          {
            // index.html sempre fresh da rede (nunca cache)
            urlPattern: /^https:\/\/casais-rfid\.web\.app\/(index\.html)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Assets estáticos com hash — CacheFirst é seguro
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 24 * 60 * 60,
              },
            },
          },
          {
            // Firebase Firestore — Network first com fallback de 10s
            urlPattern: /^https:\/\/firestore\.googleapis\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
      manifest: false,
    }),
  ],
  build: {
    // Aumentar limite de aviso para 600KB
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Separar vendor libraries em chunks próprios
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom'],
          // Firebase (maior dependência)
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // Gráficos
          'vendor-charts': ['recharts'],
          // Utilitários
          'vendor-utils': ['zustand', 'qrcode.react'],
        },
      },
    },
    // Minificação otimizada
    minify: 'esbuild',
    // Source maps apenas em dev
    sourcemap: false,
  },
  // Otimização de dependências
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'recharts'],
  },
  server: {
    allowedHosts: true,
  },
})
