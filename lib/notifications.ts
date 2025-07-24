class NotificationService {
  private registration: ServiceWorkerRegistration | null = null;

  async initialize(): Promise<void> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Push notifications not supported");
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered");
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.initialize();
    }

    if (!this.registration) {
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      await this.sendSubscriptionToServer(subscription);
      return subscription;
    } catch (error) {
      console.error("Push subscription failed:", error);
      return null;
    }
  }

  showIncomingCallNotification(callerName: string, callId: string): void {
    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification(
        `Incoming call from ${callerName}`,
        {
          icon: "/icons/call-icon.png",
          badge: "/icons/call-badge.png",
          tag: `call-${callId}`,
          requireInteraction: true,
        }
      );
      setTimeout(() => {
        notification.close();
      }, 2000);
    }
  }

  private async sendSubscriptionToServer(
    subscription: PushSubscription
  ): Promise<void> {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(subscription),
    });
  }
}

export const notificationService = new NotificationService();
