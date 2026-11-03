// Remove responses retained by the legacy worker, including authenticated REST
// queries. New workers precache app assets only; API responses stay out of CacheStorage.
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.delete("supabase-rest"));
});
