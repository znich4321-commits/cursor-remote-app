/* Сервис-воркер пульта: офлайн-оболочка и push-уведомления. */
const CACHE = 'ocr-v1';
const SHELL = ['./', 'index.html', 'style.css', 'util.js', 'app.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Оболочка: сначала сеть (чтобы обновления доходили сразу), при отсутствии сети - кэш. Данные и url.json не кэшируются.
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (/\/(url\.json|br\/|api\/|admin\/)/.test(url.pathname)) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json(); } catch { d = { title: 'OpenCode', body: e.data?.text() || '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'OpenCode', {
    body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png',
    tag: (d.sessionID || 'oc') + ':' + (d.kind || ''), renotify: true, data: { sessionID: d.sessionID || '', url: d.url || '' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const { sessionID, url } = e.notification.data || {};
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) { await c.focus(); if (sessionID) c.postMessage({ openSession: sessionID }); return; }
    }
    await self.clients.openWindow(url || './');
  })());
});
