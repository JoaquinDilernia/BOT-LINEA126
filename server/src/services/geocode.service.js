const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const UA = 'BotLinea126/1.0 (demo TechDI)';

export function parseNominatimResponse(json) {
  if (!Array.isArray(json) || json.length === 0) return null;
  const first = json[0];
  const lat = Number(first?.lat);
  const lng = Number(first?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export async function geocode(query) {
  try {
    const url = `${ENDPOINT}?format=json&limit=1&countrycodes=ar&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es' } });
    if (!res.ok) return null;
    return parseNominatimResponse(await res.json());
  } catch (err) {
    console.warn('[geocode] failed:', err.message);
    return null;
  }
}
