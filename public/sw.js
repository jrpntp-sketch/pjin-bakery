/* Service worker — ทำให้เปิดแอปได้แม้ไม่มีเน็ต
   ข้อมูลผู้ใช้อยู่ใน IndexedDB ไม่เกี่ยวกับ cache นี้ */
const CACHE = "pjin-bakery-v3";

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

/** ดึง URL ของไฟล์ JS/CSS ที่หน้านั้นต้องใช้ ออกมาจาก HTML */
function assetsIn(html) {
  const found = new Set();
  const re = /["'(]([^"'()]*\/_next\/static\/[^"'()]+?\.(?:js|css))["')]/g;
  let m;
  while ((m = re.exec(html))) found.add(m[1]);
  return [...found];
}

self.addEventListener("install", (e) => {
  // โหลดทุกหน้า + ไฟล์ JS/CSS ที่หน้านั้นต้องใช้ เก็บไว้ตั้งแต่ติดตั้ง
  // ไม่ง้นแอปจะเปิดออฟไลน์ไม่ขึ้นถ้าผู้ใช้ยังไม่เคยเปิดออนไลน์มาก่อน
  e.waitUntil(
    (async () => {
      const c = await caches.open(CACHE);
      const assets = new Set();

      // ใช้ทีละไฟล์ เพื่อให้ไฟล์เดียวพังแล้วไม่ล้มทั้งชุด
      await Promise.all(
        SHELL.map(async (path) => {
          try {
            const res = await fetch(new Request(path, { cache: "reload" }));
            if (!res.ok) return;
            if (res.headers.get("content-type")?.includes("text/html")) {
              assetsIn(await res.clone().text()).forEach((a) => assets.add(a));
            }
            await c.put(path, res);
          } catch {}
        }),
      );

      await Promise.all(
        [...assets].map(async (url) => {
          try {
            const res = await fetch(new Request(url, { cache: "reload" }));
            if (res.ok) await c.put(url, res);
          } catch {}
        }),
      );
    })().then(() => self.skipWaiting()),
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
