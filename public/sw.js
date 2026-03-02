const CACHE_NAME = 'loan-tracker-v1'
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Some assets might fail, but the app should still work
        console.warn('Some assets failed to cache during install')
      })
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Fetch event - network first, then cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and API calls (let them fail gracefully offline)
  if (event.request.method !== 'GET') {
    return
  }

  // For HTML documents, try network first then cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
          return response
        })
        .catch(() => {
          // Fall back to cache if network fails
          return caches.match(event.request).then((response) => {
            return response || new Response('Offline - Page not cached', { status: 503 })
          })
        })
    )
    return
  }

  // For assets, use cache first then network
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response
      }
      return fetch(event.request)
        .then((response) => {
          // Cache successful responses
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
          return response
        })
        .catch(() => {
          return new Response('Resource not available offline', { status: 503 })
        })
    })
  )
})
