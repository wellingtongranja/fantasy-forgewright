// const CACHE_NAME = 'fantasy-editor-v1' // Reserved for future use
const STATIC_CACHE = 'static-v1'
const DYNAMIC_CACHE = 'dynamic-v1'

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/app.js',
  '/src/styles/base.css',
  '/src/styles/variables.css',
  '/manifest.json'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map((name) => caches.delete(name))
        )
      )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (url.origin === location.origin) {
    event.respondWith(
      caches
        .match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }

          return fetch(request).then((networkResponse) => {
            if (request.method === 'GET' && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone()
              caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, responseToCache)
              })
            }
            return networkResponse
          })
        })
        .catch(() => {
          if (request.destination === 'document') {
            return caches.match('/index.html')
          }
        })
    )
  } else if (url.hostname === 'api.github.com') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseToCache = response.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseToCache)
          })
          return response
        })
        .catch(() => caches.match(request))
    )
  } else {
    event.respondWith(fetch(request))
  }
})

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-documents') {
    event.waitUntil(syncDocuments())
  }
})

async function syncDocuments() {
  const cache = await caches.open('pending-sync')
  const requests = await cache.keys()

  return Promise.all(
    requests.map(async (request) => {
      try {
        const response = await fetch(request)
        if (response.ok) {
          await cache.delete(request)
        }
      } catch (error) {
        console.error('Sync failed for:', request.url)
      }
    })
  )
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
