// Prioridad: config.js de runtime (editable en el hosting sin rebuild) →
// variable de build → mismo origen.
const API_ROOT =
  (typeof window !== 'undefined' && window.__L126_CONFIG__?.API_URL) ||
  import.meta.env.VITE_API_URL ||
  '';
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
