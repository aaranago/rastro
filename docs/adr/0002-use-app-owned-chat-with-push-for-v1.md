# Use app-owned chat with push notifications for v1

Rastro v1 will store one-to-one report-linked chat messages in its own database and use Expo push notifications for new-message alerts. We will avoid third-party chat SaaS and always-on WebSocket or SSE infrastructure at launch because app-owned messages are cheaper, easier to moderate, and reliable enough for v1; real-time transport can be added later if usage proves polling and push are insufficient.
