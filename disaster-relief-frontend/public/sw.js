const CACHE_NAME = "ai-disaster-shell-v2"
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/favicon.svg"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        APP_SHELL.map((asset) => cache.add(asset))
      )
    })
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    ))
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  const isNavigation = event.request.mode === "navigate"

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && !isNavigation) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        }
        return response
      })
      .catch(() => caches.match(event.request).then((cached) => {
        if (cached) return cached
        return isNavigation ? caches.match("/index.html") : Response.error()
      }))
  )
})
