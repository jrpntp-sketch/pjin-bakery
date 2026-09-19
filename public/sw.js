/* Service worker — ทำให้เปิดแอปได้แม้ไม่มีเน็ต
   ข้อมูลผู้ใช้อยู่ใน IndexedDB ไม่เกี่ยวกับ cache นี้ */
const CACHE = "pjin-bakery-v2";

// เส้นทางทุกหน้าของแอป (relative กับ scope ของ service worker)
const SHELL = [
  "./",
  "./batches/",
  "./batches/new/",
  "./channels/",
  "./expenses/",
  "./products/",
  "./reports/",
  "./sales/",
  "./settings/",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  // โหลดหน้าทั้งหมดเก็บไว้ตั้งแต่ติดตั้ง ไม่ต้องรอให้ผู้ใช้เดินเข้าไปเอง
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // ใช้ทีละไฟล์ เพื่อให้ไฟล์เดียวพังแล้วไม่ล้มทั้งชุด
      Promise.all(
        SHELL.map((path) =>
          fetch(new Request(path, { cache: "reload" }))
            .then((res) => (res.ok ? c.put(path, res) : null))
            .catch(() => null),
        ),
      ),
    ).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  e.respondWith(
    // มีเน็ต: เอาของใหม่เสมอ แล้วอัปเดต cache ไว้ใช้ตอนออฟไลน์
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        // ไม่มีเน็ต: หาจาก cache ถ้าเป็นการเปิดหน้าให้ตกกลับไปหน้าแรก
        const hit = await caches.match(request, { ignoreSearch: true });
        if (hit) return hit;
        if (request.mode === "navigate") {
          const root = await caches.match("./");
          if (root) return root;
        }
        return new Response("ออฟไลน์ และยังไม่มีข้อมูลที่เก็บไว้", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }),
  );
});
