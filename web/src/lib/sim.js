// Simulación de la flota del ramal A a partir del horario programado
// (diagramación Invierno 2026): salidas por franja, tiempos de marcha por
// tramo en pico/valle y el trazado real. No es GPS: es dónde DEBERÍA estar
// cada colectivo según el horario. Si la línea más adelante pasa posiciones
// reales (API de Transporte de BA), se reemplaza busesEn() y listo.
import trazado from '../data/trazado126.json';
import { FRECUENCIAS, SECCIONADOS } from '../data/linea.js';

export const TOTAL_KM = SECCIONADOS[SECCIONADOS.length - 1].km;

// Sentidos con la terminal de origen. haciaRetiro sale de La Tablada.
export const SENTIDOS = {
  haciaRetiro: { label: 'Hacia Retiro', origen: 'La Tablada', destino: 'Retiro', polyline: trazado.haciaRetiro, idxFrecuencia: 0 },
  haciaTablada: { label: 'Hacia La Tablada', origen: 'Retiro', destino: 'La Tablada', polyline: trazado.haciaTablada, idxFrecuencia: 1 },
};

// ---------- geometría ----------
const RAD = Math.PI / 180;
export function distKm([a, b], [c, d]) {
  const x = (d - b) * Math.cos(((a + c) / 2) * RAD) * 111.32;
  const y = (c - a) * 110.57;
  return Math.hypot(x, y);
}

function prepararRuta(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + distKm(points[i - 1], points[i]));
  return { points, cum, total: cum[cum.length - 1] };
}
const RUTAS = Object.fromEntries(Object.entries(SENTIDOS).map(([k, v]) => [k, prepararRuta(v.polyline)]));

// Punto y rumbo (grados, 0 = este, sentido horario en pantalla) a una
// fracción del recorrido.
export function puntoEnRuta(sentido, frac) {
  const r = RUTAS[sentido];
  const target = Math.min(Math.max(frac, 0), 1) * r.total;
  let i = 1;
  while (i < r.cum.length - 1 && r.cum[i] < target) i++;
  const [a, b] = [r.points[i - 1], r.points[i]];
  const seg = r.cum[i] - r.cum[i - 1] || 1;
  const t = (target - r.cum[i - 1]) / seg;
  const lat = a[0] + (b[0] - a[0]) * t;
  const lng = a[1] + (b[1] - a[1]) * t;
  const dx = (b[1] - a[1]) * Math.cos(a[0] * RAD);
  const dy = b[0] - a[0];
  const angle = Math.atan2(-dy, dx) / RAD;
  return { latlng: [lat, lng], angle };
}

// ---------- horario ----------
// "9 a 10 min" → 9.5 · "6,5 min" → 6.5 · "cada 15 min" → 15
export function parseCada(txt) {
  const nums = String(txt).replace(/,/g, '.').match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export const aMinutos = (hhmm) => {
  const [h, m] = hhmm.trim().split(':').map(Number);
  return h * 60 + m;
};

export function tipoDia(date) {
  const w = date.getDay();
  return w === 0 ? 'domingo' : w === 6 ? 'sabado' : 'habil';
}

const cacheSalidas = new Map();
// Minutos del día en que sale cada colectivo desde la terminal de origen.
export function salidas(dia, sentido) {
  const key = `${dia}:${sentido}`;
  if (cacheSalidas.has(key)) return cacheSalidas.get(key);
  const out = [];
  for (const f of FRECUENCIAS[dia].franjas) {
    const [desde, hasta] = f.horario.split('–').map(aMinutos);
    const fin = hasta === 0 ? 1440 : hasta;
    const cada = parseCada(Array.isArray(f.cada) ? f.cada[SENTIDOS[sentido].idxFrecuencia] : f.cada);
    for (let t = desde; t < fin; t += cada) out.push(Math.round(t * 10) / 10);
  }
  cacheSalidas.set(key, out);
  return out;
}

export const esPico = (min) => {
  const m = ((min % 1440) + 1440) % 1440;
  return (m >= 420 && m < 600) || (m >= 1020 && m < 1200);
};

// Tramos del viaje en distancia desde el origen, con su duración.
function perfil(sentido, pico) {
  const tramos = SECCIONADOS.slice(0, -1).map((p, i) => ({
    desde: p.km, hasta: SECCIONADOS[i + 1].km, min: pico ? p.pico : p.valle,
  }));
  const orden = sentido === 'haciaRetiro'
    ? tramos
    : tramos.slice().reverse().map((t) => ({ desde: TOTAL_KM - t.hasta, hasta: TOTAL_KM - t.desde, min: t.min }));
  let acc = 0;
  return orden.map((t) => { const r = { ...t, t0: acc, t1: acc + t.min }; acc += t.min; return r; });
}
const PERFILES = {
  haciaRetiro: { pico: perfil('haciaRetiro', true), valle: perfil('haciaRetiro', false) },
  haciaTablada: { pico: perfil('haciaTablada', true), valle: perfil('haciaTablada', false) },
};
const perfilDe = (sentido, salida) => PERFILES[sentido][esPico(salida) ? 'pico' : 'valle'];
export const duracionViaje = (sentido, salida) => perfilDe(sentido, salida).at(-1).t1;

// Distancia recorrida (km desde el origen) a los `min` minutos de salir.
export function kmTras(sentido, salida, min) {
  const p = perfilDe(sentido, salida);
  if (min < 0 || min > p.at(-1).t1) return null;
  const t = p.find((x) => min <= x.t1) ?? p.at(-1);
  return t.desde + ((min - t.t0) / t.min) * (t.hasta - t.desde);
}
// Minutos que tarda en llegar desde el origen hasta `km`.
export function minutosHasta(sentido, salida, km) {
  const p = perfilDe(sentido, salida);
  const t = p.find((x) => km <= x.hasta + 1e-9) ?? p.at(-1);
  return t.t0 + ((km - t.desde) / (t.hasta - t.desde)) * t.min;
}

// ---------- reloj ----------
// Para la demo: ?hora=03:10 fija la hora simulada y ?dia=sabado el día.
export function relojDemo() {
  try {
    const q = new URLSearchParams(window.location.search);
    return { hora: q.get('hora'), dia: q.get('dia') };
  } catch {
    return {};
  }
}
export function ahoraSim(base = new Date()) {
  const { hora, dia } = relojDemo();
  const d = new Date(base);
  if (hora && /^\d{1,2}:\d{2}$/.test(hora)) {
    const [h, m] = hora.split(':').map(Number);
    d.setHours(h, m, d.getSeconds(), 0);
  }
  return { date: d, dia: FRECUENCIAS[dia] ? dia : tipoDia(d) };
}
export function diaAnterior(dia, date) {
  const ayer = new Date(date); ayer.setDate(ayer.getDate() - 1);
  if (relojDemo().dia) return dia === 'domingo' ? 'sabado' : 'habil';
  return tipoDia(ayer);
}

// Salidas relevantes alrededor de `m` (incluye las de ayer que siguen viajando
// pasada la medianoche y las primeras de mañana para los próximos arribos).
function salidasCerca(dia, diaAyer, sentido) {
  return [
    ...salidas(diaAyer, sentido).map((s) => s - 1440),
    ...salidas(dia, sentido),
  ];
}

// ---------- API para la UI ----------
// Colectivos en circulación en el minuto `m` (minutos desde las 00 de hoy, con decimales).
export function busesEn(m, dia, diaAyer) {
  const out = [];
  for (const sentido of Object.keys(SENTIDOS)) {
    for (const s of salidasCerca(dia, diaAyer, sentido)) {
      const transcurrido = m - s;
      if (transcurrido < 0) break;
      const km = kmTras(sentido, s, transcurrido);
      if (km == null) continue;
      const frac = km / TOTAL_KM;
      out.push({ id: `${sentido}:${s}`, sentido, frac, ...puntoEnRuta(sentido, frac), salida: s });
    }
  }
  return out;
}

// Próximos arribos a un punto a `km` del origen del sentido.
export function proximosKm(m, dia, diaAyer, sentido, km, n = 3) {
  const res = [];
  for (const s of salidasCerca(dia, diaAyer, sentido)) {
    const llegada = s + minutosHasta(sentido, s, km);
    if (llegada >= m) res.push(llegada);
    if (res.length >= n) break;
  }
  return res.map((ll) => ({ en: ll - m, hora: ll }));
}

// Próximos arribos a un punto de control (índice en SECCIONADOS).
export function proximos(m, dia, diaAyer, sentido, idxPunto, n = 3) {
  const km = sentido === 'haciaRetiro' ? SECCIONADOS[idxPunto].km : TOTAL_KM - SECCIONADOS[idxPunto].km;
  return proximosKm(m, dia, diaAyer, sentido, km, n);
}

// Primera salida del día (para "fuera de servicio").
export const primeraSalida = (dia, sentido) => salidas(dia, sentido)[0];

export const fmtHora = (min) => {
  const t = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

export const minutoDelDia = (d) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

export function esNoche(d) {
  try {
    const q = new URLSearchParams(window.location.search).get('noche');
    if (q === '1') return true;
    if (q === '0') return false;
  } catch { /* sin window */ }
  const h = d.getHours();
  return h >= 22 || h < 6;
}
