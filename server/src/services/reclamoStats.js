// Estadísticas de reclamos para la "Gestión de reclamos" del panel: por
// chofer ("tal chofer no frenó 10 veces este mes"), por interno y por ramal
// (falta de frecuencia). Funciones puras: reciben los reclamos ya leídos.

const TZ = 'America/Argentina/Buenos_Aires';

function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v.toDate) return v.toDate();
  const secs = v._seconds ?? v.seconds;
  if (secs) return new Date(secs * 1000);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Fecha → "2026-10" en hora argentina (un reclamo del 31 a las 23 h es de ese mes). */
export function monthKey(value) {
  const d = toDate(value);
  if (!d) return null;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).formatToParts(d);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  return `${y}-${m}`;
}

function bump(map, key, categoria) {
  if (!key) return;
  const row = map.get(key) ?? { key, total: 0, categorias: {} };
  row.total += 1;
  row.categorias[categoria] = (row.categorias[categoria] ?? 0) + 1;
  map.set(key, row);
}

const ranking = (map) => [...map.values()]
  .map(r => ({ ...r, principal: Object.entries(r.categorias).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null }))
  .sort((a, b) => b.total - a.total || String(a.key).localeCompare(String(b.key), 'es', { numeric: true }));

export function aggregateReclamos(reclamos, { gravedadDe } = {}) {
  const porChofer = new Map();
  const porInterno = new Map();
  const porRamal = new Map();
  const porCategoria = {};
  const out = { total: 0, graves: 0, comunes: 0, automaticos: 0, deCarga: 0, sinChofer: 0, sinInterno: 0 };

  for (const r of reclamos) {
    const categoria = r.categoria ?? 'otro';
    const gravedad = r.gravedad ?? gravedadDe?.(r) ?? 'comun';
    out.total += 1;
    if (gravedad === 'grave') out.graves += 1; else out.comunes += 1;
    if ((r.respuestas ?? []).some(x => x.automatica)) out.automaticos += 1;
    if (r.origen === 'carga') out.deCarga += 1;
    porCategoria[categoria] = (porCategoria[categoria] ?? 0) + 1;

    const chofer = String(r.legajoChofer ?? '').trim();
    const interno = String(r.numeroUnidad ?? '').trim();
    const ramal = String(r.ramal ?? '').trim().toUpperCase();
    if (chofer) bump(porChofer, chofer, categoria); else out.sinChofer += 1;
    if (interno) bump(porInterno, interno, categoria); else out.sinInterno += 1;
    if (ramal) bump(porRamal, ramal, categoria);
  }

  return {
    ...out,
    porCategoria,
    porChofer: ranking(porChofer),
    porInterno: ranking(porInterno),
    porRamal: ranking(porRamal),
  };
}
