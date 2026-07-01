// sw.js — NutriPed Service Worker
// الهدف: تأهيل الموقع كـ PWA قابل للتركيب (شرط أساسي لتغليفه كتطبيق TWA على جوجل بلاي)
// الاستراتيجية: network-first للصفحات (عشان التحديثات تظهر فورًا)، cache-first للأيقونات

const CACHE_NAME = 'nutriped-cache-v1'; // غيّر الرقم (v2, v3...) مع كل نشر مهم لإجبار تحديث الكاش

const APP_SHELL = [
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // ما توقفش التثبيت لو فشل تحميل ملف واحد
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // سيب طلبات Firebase/Google APIs والخطوط تروح للنت مباشرة (من غير كاش)
  if (url.origin !== self.location.origin) return;

  // التنقل بين الصفحات (HTML): network-first عشان آخر تحديث يظهر فورًا
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // باقي الملفات الثابتة (أيقونات...): cache-first مع تحديث في الخلفية
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
