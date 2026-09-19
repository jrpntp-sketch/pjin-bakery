/* Service worker แบบง่าย — cache ไฟล์แอปไว้ให้เปิดใช้ได้ตอนไม่มีเน็ต
   ข้อมูลผู้ใช้อยู่ใน IndexedDB ไม่เกี่ยวกับ cache นี้ */
const CACHE = "pjin-bakery-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // network-first: ได้ของใหม่เสมอเมื่อมีเน็ต ไม่มีเน็ตค่อยใช้ของที่ cache ไว้
  e.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(request).then((hit) => hit ?? caches.match("./")),
      ),
  );
});
