// Planificador "¿Cómo llego?": elige ramal y sentido con las paradas reales
// (las mismas del panel / del bot) minimizando la caminata.
import { distKm } from './sim.js';

export const normalizar = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const conCoords = (paradas = []) => paradas.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

// Paradas únicas por nombre (ida y vuelta de todos los ramales) para el buscador.
export function opcionesParadas(recorridos = []) {
  const vistas = new Map();
  for (const r of recorridos) {
    for (const sentido of ['ida', 'vuelta']) {
      for (const p of conCoords(r.paradas?.[sentido])) {
        if (!vistas.has(p.nombre)) vistas.set(p.nombre, { nombre: p.nombre, latlng: [p.lat, p.lng] });
      }
    }
  }
  return [...vistas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function buscarParada(opciones, texto) {
  const n = normalizar(texto);
  if (!n) return null;
  return opciones.find((o) => normalizar(o.nombre) === n)
    ?? opciones.find((o) => normalizar(o.nombre).includes(n))
    ?? null;
}

const CAMINATA_MAX_KM = 1.2;
const MIN_POR_KM_CAMINANDO = 12.5;

export function planificar(recorridos, origen, destino) {
  let mejor = null;
  for (const r of recorridos) {
    const esB = /ramal b\b/i.test(r.nombre);
    for (const sentido of ['ida', 'vuelta']) {
      const stops = conCoords(r.paradas?.[sentido]);
      if (stops.length < 2) continue;
      const cerca = (ll) => stops.reduce((best, p, i) => {
        const d = distKm(ll, [p.lat, p.lng]);
        return d < best.d ? { i, d } : best;
      }, { i: -1, d: Infinity });
      const o = cerca(origen);
      const d = cerca(destino);
      if (o.i >= d.i || o.d > CAMINATA_MAX_KM || d.d > CAMINATA_MAX_KM) continue;
      const cum = [0];
      for (let i = 1; i < stops.length; i++) cum.push(cum[i - 1] + distKm([stops[i - 1].lat, stops[i - 1].lng], [stops[i].lat, stops[i].lng]));
      const tramoKm = cum[d.i] - cum[o.i];
      // Caminar "cuesta" ~4 veces más que viajar; el B suma un poco para preferir el A si empatan.
      const score = (o.d + d.d) * MIN_POR_KM_CAMINANDO + tramoKm * 3 + (esB ? 0.5 : 0);
      if (!mejor || score < mejor.score) {
        mejor = {
          score, recorrido: r, sentido, stops, o: o.i, d: d.i,
          caminataOrigenKm: o.d, caminataDestinoKm: d.d, tramoKm,
          fracOrigen: cum[o.i] / cum[cum.length - 1],
          fracDestino: cum[d.i] / cum[cum.length - 1],
        };
      }
    }
  }
  return mejor;
}

// Secciones que abarca el viaje y precio según el cuadro del ramal.
export function tarifaPlan(plan) {
  const so = plan.stops[plan.o].seccion;
  const sd = plan.stops[plan.d].seccion;
  if (!Number.isFinite(so) || !Number.isFinite(sd)) return null;
  const tramos = Math.abs(sd - so) + 1;
  const fila = (plan.recorrido.cuadroTarifario ?? []).slice().sort((a, b) => a.hastaSeccion - b.hastaSeccion).find((c) => c.hastaSeccion >= tramos);
  return fila ? { tramos, precio: fila.precio } : null;
}

export const minutosCaminando = (km) => Math.max(1, Math.round(km * MIN_POR_KM_CAMINANDO));
