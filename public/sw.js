self.addEventListener("push", (event) => {
  const data = event.data
    ? event.data.json()
    : {
        title: "LifeQuest",
        body: "Bạn có mission cần kiểm tra hôm nay.",
        url: "/dashboard",
      };

  event.waitUntil(
    self.registration.showNotification(data.title || "LifeQuest", {
      body: data.body || "Bạn có mission cần kiểm tra hôm nay.",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: {
        url: data.url || "/dashboard",
      },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients.find((item) => item.url === targetUrl);

      if (client) {
        return client.focus();
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});
