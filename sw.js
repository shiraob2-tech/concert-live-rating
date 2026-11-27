// Update cache version when deploying app changes.
const CACHE='concert-notes-v20261127-book2';
const ASSETS=['./','./index.html','./app.js','./app.js?v=20261126-calendarwrite4','./manifest.webmanifest','./book.js','./book.js?v=2'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('concert-notes-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(request,{cache:"no-store"}).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});}
    return response;
  }).catch(async()=>await caches.match(request)||Response.error()));
});
