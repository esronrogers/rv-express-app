// RV Express — guarda uma cópia do app no aparelho.
// Se a internet cair na hora em que o app abrir/reiniciar, ele abre
// com a cópia guardada em vez de ficar travado na tela com a logo.
// Com internet, SEMPRE pega a versão mais nova do site.
const CACHE = 'rv-express-v2';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icon-192x192.png', './icon-512x512.png'];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE)
            .then(c => Promise.all(ARQUIVOS.map(a => c.add(a).catch(() => {}))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;
    if (new URL(req.url).origin !== self.location.origin) return; // backend e Mercado Pago passam direto
    // Se a internet travar (não cai, mas não responde), depois de 6s
    // usa a cópia guardada em vez de ficar esperando.
    const limite = new Promise((_, rej) => setTimeout(() => rej(new Error('demorou')), 6000));
    e.respondWith(
        Promise.race([fetch(req), limite])
            .then(resp => {
                if (resp && resp.ok) {
                    const copia = resp.clone();
                    caches.open(CACHE).then(c => c.put(req, copia));
                }
                return resp;
            })
            .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
});
