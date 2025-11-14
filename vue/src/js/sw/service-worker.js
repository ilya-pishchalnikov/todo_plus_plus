import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// Precache всех ресурсов сборки
precacheAndRoute(self.__WB_MANIFEST)

// api caching
// registerRoute(
//   ({url}) => url.pathname.startsWith('/api/'),
//   new StaleWhileRevalidate({
//     cacheName: 'api-cache',
//     plugins: [
//       new ExpirationPlugin({
//         maxEntries: 100,
//         maxAgeSeconds: 60 * 60 * 24 // 24 часа
//       })
//     ]
//   })
// )

// images caching
registerRoute(
  ({request}) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 30 // 30 дней
      })
    ]
  })
)

// Notifications
// self.addEventListener('push', (event) => {
//   const title = 'ToDo++'
//   const options = {
//     body: event.data.text(),
//     icon: '/img/icons/icon-192x192.png',
//     badge: '/img/icons/badge-72x72.png'
//   }
  
//   event.waitUntil(self.registration.showNotification(title, options))
// })

// self.addEventListener('notificationclick', (event) => {
//   event.notification.close()
//   event.waitUntil(
//     clients.openWindow('/')
//   )
// })