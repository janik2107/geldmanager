const VERSION='gm-v12';
const SHELL=['./','./index.html','./styles.css','./app.js','./clock.js','./manifest.json','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./vendor/tesseract.min.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==VERSION&&x!=='gm-vendor').map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
const C=new URL(r.url).pathname.includes('/vendor/')?'gm-vendor':VERSION;
e.respondWith(caches.open(C).then(async c=>{const hit=await c.match(r,{ignoreSearch:true});const net=fetch(r).then(x=>{if(x.ok)c.put(r,x.clone());return x}).catch(()=>hit);return hit||net}))});
