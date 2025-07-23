const CACHE_NAME = "callapp-v1";
const urlsToCache = ["/", "/auth", "/dashboard", "/sounds/ringtone.mp3"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});

self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New notification",
    icon: "/icons/call-icon.png",
    badge: "/icons/call-badge.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "accept",
        title: "Accept",
        icon: "/icons/accept-icon.png",
      },
      {
        action: "decline",
        title: "Decline",
        icon: "/icons/decline-icon.png",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("CallApp", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "accept") {
    // Handle accept action
    event.waitUntil(
      clients.openWindow(
        "/dashboard?action=accept&callId=" + event.notification.tag
      )
    );
  } else if (event.action === "decline") {
    // Handle decline action
    event.waitUntil(
      clients.openWindow(
        "/dashboard?action=decline&callId=" + event.notification.tag
      )
    );
  } else {
    // Handle notification click
    event.waitUntil(clients.openWindow("/dashboard"));
  }
});
