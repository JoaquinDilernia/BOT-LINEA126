// "¿Cómo llego?" del sitio: convierte lo que escribe el pasajero (calle y
// altura, esquina "X y Y", o un lugar) en coordenadas. Prueba en orden:
//  1. USIG (normalizador oficial de CABA) — entiende esquinas y alturas.
//  2. Georef (datos.gob.ar) en La Matanza — direcciones de provincia.
//  3. Nominatim (OSM) dentro del área de la línea — lugares (hospitales,
//     facultades, plazas) y lo que no entendieron los anteriores.
// Todo acotado a la zona que recorre la 126.

const UA = 'Linea126Web/1.0 (linea126.techdi.com.ar)';
// Caja que contiene todo el recorrido (Retiro ⇄ La Tablada / Villegas) con margen.
const BBOX = { minLat: -34.78, maxLat: -34.53, minLng: -58.62, maxLng: -58.33 };
const TIMEOUT_MS = 8000;

export const dentroDeZona = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng)
  && lat >= BBOX.minLat && lat <= BBOX.maxLat && lng >= BBOX.minLng && lng <= BBOX.maxLng;

const titulo = (s) => String(s ?? '').toLowerCase().replace(/(^|[\s(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/ Y /g, ' y ').trim();

export function parseUsig(json) {
  const d = json?.direccionesNormalizadas?.[0];
  const lat = Number(d?.coordenadas?.y);
  const lng = Number(d?.coordenadas?.x);
  if (!dentroDeZona(lat, lng)) return null;
  return { nombre: titulo(String(d.direccion).replace(/, CABA$/i, '')) + ', CABA', lat, lng };
}

export function parseGeoref(json) {
  const d = json?.direcciones?.[0];
  const lat = Number(d?.ubicacion?.lat);
  const lng = Number(d?.ubicacion?.lon);
  if (!dentroDeZona(lat, lng)) return null;
  return { nombre: titulo(String(d.nomenclatura).split(',')[0]) + ', La Matanza', lat, lng };
}

export function parseNominatim(json) {
  const d = Array.isArray(json) ? json[0] : null;
  const lat = Number(d?.lat);
  const lng = Number(d?.lon);
  if (!dentroDeZona(lat, lng)) return null;
  const partes = String(d.display_name ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return { nombre: d.name || partes.slice(0, 2).join(', '), lat, lng };
}

async function getJson(url, headers = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es', ...headers }, signal: ctrl.signal });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const q = encodeURIComponent;
const PROVEEDORES = [
  (txt) => getJson(`https://servicios.usig.buenosaires.gob.ar/normalizar/?direccion=${q(txt)}&geocodificar=true&srid=4326&maxOptions=1`).then(parseUsig),
  (txt) => getJson(`https://apis.datos.gob.ar/georef/api/direcciones?direccion=${q(txt)}&provincia=06&departamento=${q('La Matanza')}&max=1`).then(parseGeoref),
  (txt) => getJson(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ar&bounded=1&viewbox=${BBOX.minLng},${BBOX.maxLat},${BBOX.maxLng},${BBOX.minLat}&q=${q(txt)}`).then(parseNominatim),
];

// Cache en memoria: la misma búsqueda ("Hospital Santa Lucía") se repite
// mucho y Nominatim pide no abusar.
const cache = new Map();
const CACHE_MAX = 2000;

export async function buscarLugar(texto, proveedores = PROVEEDORES) {
  const txt = String(texto ?? '').trim().replace(/\s+/g, ' ');
  if (txt.length < 3) return null;
  const key = txt.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  let found = null;
  for (const p of proveedores) {
    found = await p(txt).catch(() => null);
    if (found) break;
  }
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, found);
  return found;
}
