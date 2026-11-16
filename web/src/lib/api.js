// Prioridad: config.js de runtime (editable en el hosting sin rebuild) →
// variable de build → mismo origen.
// Un config.js viejo cacheado por el navegador (Hostinger lo sirve con 7 días
// de caché) apuntaba a localhost y todo el sitio daba "Failed to fetch": un
// localhost sólo vale si la página también corre en localhost.
const PROD_API = 'https://bot-linea126-production.up.railway.app';
const esLocal = (u) => /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(u ?? '');
const paginaLocal = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const configurada = (typeof window !== 'undefined' && window.__L126_CONFIG__?.API_URL) || import.meta.env.VITE_API_URL || '';
const API_ROOT = esLocal(configurada) && !paginaLocal ? PROD_API : configurada;
const BASE = API_ROOT.replace(/\/$/, '') + '/api/public';

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export function apiGet(path) {
  return fetch(BASE + path).then(handle);
}

export function apiPost(path, body) {
  return fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle);
}

// Para formularios con archivo (FormData): el navegador arma el multipart.
export function apiPostForm(path, formData) {
  return fetch(BASE + path, { method: 'POST', body: formData }).then(handle);
}
