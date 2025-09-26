import { defineConfig, loadEnv } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig(({ command, mode }) => {
  // SECURITY: Only load safe environment variables, prevent OAuth secrets in bundle
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'
  
  return {
  publicDir: 'public',
  base: env.VITE_BASE_PATH || '/',
  plugins: [
    // Disable PWA in development to prevent service worker HTTPS upgrade issues
    ...(isProduction ? [
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "apple-touch-icon.png"],
        filename: "sw.js",
        strategies: "generateSW",
        manifest: {
          name: "Fantasy Editor",
          short_name: "Fantasy",
          description: "A distraction-free markdown editor for fantasy writers",
          theme_color: "#2c3e50",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "icons/icon-192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "icons/icon-512.png",
              sizes: "512x512",
              type: "image/png"
            }
          ]
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          skipWaiting: isProduction,
          clientsClaim: isProduction,
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.github\.com\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "github-api",
                networkTimeoutSeconds: 10,
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 24 * 60 * 60
                }
              }
            },
            {
              urlPattern: /^https:\/\/gutendex\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gutenberg-api",
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 7 * 24 * 60 * 60
                }
              }
            }
          ]
        }
      })
    ] : [])
  ],
  build: {
    target: "es2020",
    minify: isProduction ? "esbuild" : false,
    sourcemap: isDevelopment,
    cssMinify: isProduction,
    rollupOptions: {
      output: {
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
            const name = facadeModuleId.split('/').pop().replace(/\.[^.]+$/, '')
            return `assets/${name}-[hash].js`
          }
          return 'assets/[name]-[hash].js'
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/\.(png|jpe?g|gif|svg|ico|webp)$/i.test(assetInfo.name)) {
            return `assets/img/[name]-[hash].${ext}`
          } else if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash].${ext}`
          } else if (ext === 'css') {
            return `assets/css/[name]-[hash].${ext}`
          }
          return `assets/[name]-[hash].${ext}`
        },
        manualChunks: {
          // PDF export functionality - loaded only when needed
          'pdf-export': ['jspdf', 'html2canvas'],
          // CodeMirror core - essential for editor
          'codemirror': [
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/commands',
            '@codemirror/lang-markdown',
            '@codemirror/search',
            '@codemirror/autocomplete',
            '@codemirror/language',
            '@codemirror/merge'
          ],
          // Search functionality - loaded when needed
          'search-utils': ['lunr'],
          // Security utilities
          'security': ['dompurify']
        }
      },
      external: isProduction ? [] : []
    },
    reportCompressedSize: !isProduction,
    chunkSizeWarningLimit: 1000,
    ...(isProduction && {
      minify: 'esbuild',
      target: 'es2020',
      cssMinify: 'esbuild'
    })
  },
  server: {
    port: 3000,
    host: true,
    open: isDevelopment,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    },
    ...(isDevelopment && {
      hmr: {
        overlay: true
      },
      watch: {
        usePolling: process.env.VITE_USE_POLLING === 'true'
      }
    })
  },
  
  optimizeDeps: {
    include: [
      '@codemirror/state',
      '@codemirror/view', 
      '@codemirror/commands',
      '@codemirror/lang-markdown',
      '@codemirror/search',
      '@codemirror/autocomplete',
      '@codemirror/language',
      'dompurify',
      'lunr'
    ],
    exclude: ['@vite/client', '@vite/env']
  },
  
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.1'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __DEV__: isDevelopment,
    __PROD__: isProduction,
    __ENABLE_DEVTOOLS__: isDevelopment || env.VITE_ENABLE_DEVTOOLS === 'true'
  },

  // SECURITY: Explicitly prevent any OAuth/secret environment variables from being bundled
  envPrefix: ['VITE_'],
  envDir: process.cwd(),
  
  css: {
    devSourcemap: isDevelopment,
    preprocessorOptions: {
      css: {
        charset: false
      }
    }
  },
  
  preview: {
    port: 4173,
    host: true,
    cors: true
  }
  }
})