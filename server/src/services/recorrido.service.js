import { getDb } from './firebase.service.js';
import { geocode } from './geocode.service.js';
import { RECORRIDOS_126 } from '../data/linea126.js';

const COLLECTION = 'bot-linea126_recorridos';

const SECCION_HEADER = /^=*\s*secci[oó]n\s*(\d+)\s*[:.\-]?\s*(.*?)\s*=*$/i;

export function parsearParadas(texto) {
  const lineas = String(texto ?? '').split(/\r?\n/);
  const paradas = [];
  let seccionActual = 1;
  for (const raw of lineas) {
    const linea = raw.trim();
    if (!linea) continue;
    const m = linea.match(SECCION_HEADER);
    if (m) { seccionActual = Number(m[1]); continue; }
    paradas.push({ orden: paradas.length + 1, nombre: linea, seccion: seccionActual });
  }
  return paradas;
}

export function calcularTarifa(recorrido, seccionOrigen, seccionDestino) {
  const cuadro = recorrido?.cuadroTarifario ?? [];
  const o = Number(seccionOrigen), d = Number(seccionDestino);
  if (!cuadro.length || !Number.isFinite(o) || !Number.isFinite(d)) return null;
  const seccionesCruzadas = Math.max(1, Math.abs(d - o) + 1);
  const ordenado = [...cuadro].sort((a, b) => a.hastaSeccion - b.hastaSeccion);
  const fila = ordenado.find(f => f.hastaSeccion === seccionesCruzadas) ?? ordenado[ordenado.length - 1];
  return { seccionesCruzadas, precio: fila.precio };
}

// $742,81 — como lo dice un pasajero (y la tarifa oficial tiene centavos).
export function formatPrecio(precio) {
  return `$${Number(precio).toLocaleString('es-AR', { minimumFractionDigits: Number.isInteger(Number(precio)) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

// Parada con detalle (listado oficial): "Av Directorio y Puan (Av Directorio 1310) · Parque Chacabuco · cerca: Fac Filosofia"
export function formatParadaDetalle(p) {
  const partes = [p.nombre];
  if (p.direccion && p.direccion !== p.nombre) partes[0] += ` (${p.direccion})`;
  if (p.barrio) partes.push(p.barrio);
  if (p.metrobus) partes.push('Metrobús');
  if (p.cercania) partes.push(`cerca: ${p.cercania}`);
  return partes.join(' · ');
}

const tieneDetalle = (paradas) => paradas.some(p => p.barrio || p.cercania || p.direccion);

// Etiqueta de cada sentido a partir del nombre "Ramal X — Origen ⇄ Destino":
// ida = hacia el destino, vuelta = hacia el origen.
function nombresSentidos(nombre = '') {
  const m = String(nombre).match(/—\s*(.+?)\s*⇄\s*(.+)$/);
  return m ? { ida: `hacia ${m[2]}`, vuelta: `hacia ${m[1]}` } : { ida: 'ida', vuelta: 'vuelta' };
}

// yaListadas: paradas (por sentido + nombre) que ya se listaron en un ramal
// anterior — el B comparte casi todo el recorrido con el A y no tiene
// sentido repetirlas en el prompt.
export function formatRecorridoParaPrompt(recorrido, yaListadas = new Set()) {
  const ida = recorrido?.paradas?.ida ?? [];
  const vuelta = recorrido?.paradas?.vuelta ?? [];
  if (ida.length === 0 && vuelta.length === 0) return '';

  const lineas = [];
  lineas.push(`RECORRIDO: ${recorrido.lineaNombre ?? ''} — ${recorrido.nombre ?? ''}`.trim());
  if (recorrido.descripcion) lineas.push(recorrido.descripcion);

  lineas.push('\nSecciones y tarifa (precio = hasta esa sección, acumulativo):');
  for (const s of recorrido.secciones ?? []) {
    const fila = (recorrido.cuadroTarifario ?? []).find(f => f.hastaSeccion === s.numero);
    lineas.push(`  Sección ${s.numero} (${s.nombre}): hasta acá ${fila ? formatPrecio(fila.precio) : '$?'}`);
  }

  if (tieneDetalle([...ida, ...vuelta])) {
    // Listado oficial: paradas en orden por sentido, con dirección, barrio y lugares cercanos.
    const sentidos = nombresSentidos(recorrido.nombre);
    lineas.push('\nParadas en orden por sentido (S = sección; "cerca:" = lugares a los que deja cerca esa parada):');
    for (const sentido of ['ida', 'vuelta']) {
      const lista = sentido === 'ida' ? ida : vuelta;
      if (!lista.length) continue;
      lineas.push(`  ${sentidos[sentido][0].toUpperCase()}${sentidos[sentido].slice(1)}:`);
      let omitidas = 0;
      for (const p of lista) {
        const clave = `${sentidos[sentido]}|${p.nombre}`;
        if (yaListadas.has(clave)) { omitidas++; continue; }
        yaListadas.add(clave);
        if (omitidas) { lineas.push(`    (… ${omitidas} paradas iguales a las del ramal anterior en este sentido …)`); omitidas = 0; }
        lineas.push(`    S${p.seccion} · ${formatParadaDetalle(p)}`);
      }
      if (omitidas) lineas.push(`    (… sigue igual que el ramal anterior en este sentido: ${omitidas} paradas …)`);
    }
  } else {
    lineas.push('\nParadas por sección (para ubicar de/hasta dónde viaja el pasajero):');
    const porSeccion = new Map();
    for (const p of [...ida, ...vuelta]) {
      if (!porSeccion.has(p.seccion)) porSeccion.set(p.seccion, new Set());
      porSeccion.get(p.seccion).add(p.nombre);
    }
    for (const num of [...porSeccion.keys()].sort((a, b) => a - b)) {
      lineas.push(`  S${num}: ${[...porSeccion.get(num)].join(', ')}`);
    }
  }

  lineas.push('\nPara "¿dónde me bajo para ir a X?" o "¿pasa cerca de X?": buscá X entre las referencias "cerca:" y los barrios de las paradas, y respondé con la parada (esquina), el sentido y el ramal. Ojo: hacia Retiro y hacia provincia el colectivo va por calles distintas, así que la parada para subir y la para bajar dependen del sentido. Si X no aparece en la lista, no inventes: pedí una dirección o esquina cercana.');
  lineas.push('\nPara "¿cuánto sale de X a Y?": cada parada de la lista pertenece a UNA sola sección, nunca a un límite entre dos. Ubicá la parada de la lista que mejor matchea X y la que mejor matchea Y (el pasajero puede nombrar un barrio o un lugar conocido en vez de la esquina exacta — elegí la parada de ese barrio o la que lo tiene en "cerca:", no promedies ni inventes un "límite" entre secciones). Contá cuántas secciones abarca el viaje (mínimo 1) y devolvé el precio de "hasta" esa cantidad de secciones. Si el pasajero nombra un barrio que tiene paradas en dos secciones, respondé igual con el rango ("entre $X y $Y según dónde bajes") y ofrecé precisarlo si te dice la esquina. Si el nombre no matchea ninguna parada de la lista, pedí una referencia más precisa (esquina o punto conocido) en vez de adivinar. Aclarale siempre que el precio es con SUBE registrada (sin registrar es el doble). El precio sale de este cuadro por secciones, no de la tabla de tarifas por km: no la mezcles. Respondé directo con el resultado (cuántas secciones y el precio), sin mostrar el razonamiento ni corregirte en el mensaje.');
  return lineas.join('\n');
}

function normalizarParadas(data) {
  const desdeTexto = (txt) => parsearParadas(txt).map(p => ({ ...p, direccion: '', lat: null, lng: null }));
  const ida    = data.paradasIdaTexto    != null ? desdeTexto(data.paradasIdaTexto)
               : (data.paradas?.ida    ?? []).map((p, i) => ({ direccion: '', lat: null, lng: null, ...p, orden: i + 1 }));
  const vuelta = data.paradasVueltaTexto != null ? desdeTexto(data.paradasVueltaTexto)
               : (data.paradas?.vuelta ?? []).map((p, i) => ({ direccion: '', lat: null, lng: null, ...p, orden: i + 1 }));
  return { ida, vuelta };
}

function limpiar(data) {
  return {
    nombre: (data.nombre ?? '').trim(),
    lineaNombre: (data.lineaNombre ?? '').trim(),
    descripcion: (data.descripcion ?? '').trim(),
    activo: data.activo !== false,
    secciones: Array.isArray(data.secciones) ? data.secciones.map((s, i) => ({ numero: i + 1, nombre: (s.nombre ?? '').trim() })) : [],
    cuadroTarifario: Array.isArray(data.cuadroTarifario) ? data.cuadroTarifario.map((f, i) => ({ hastaSeccion: i + 1, precio: Number(f.precio) || 0 })) : [],
    paradas: normalizarParadas(data),
  };
}

export async function getAllRecorridos() {
  const db = getDb();
  const snap = await db.collection(COLLECTION).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

export async function getRecorridoById(id) {
  const db = getDb();
  const doc = await db.collection(COLLECTION).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function createRecorrido(data) {
  const db = getDb();
  const snap = await db.collection(COLLECTION).orderBy('order', 'desc').limit(1).get();
  const order = snap.empty ? 1 : (snap.docs[0].data().order ?? 0) + 1;
  const doc = { ...limpiar(data), order, createdAt: new Date(), updatedAt: new Date() };
  const ref = await db.collection(COLLECTION).add(doc);
  return { id: ref.id, ...doc };
}

// Al editar las paradas como texto en el panel sólo viaja el nombre: cada
// parada que ya existía conserva su dirección, barrio, lugares cercanos y
// coordenadas (match por nombre dentro del mismo sentido).
export function conservarDetalle(nuevas, anteriores = []) {
  const porNombre = new Map(anteriores.map(p => [p.nombre, p]));
  return nuevas.map(p => {
    const prev = porNombre.get(p.nombre);
    if (!prev) return p;
    const { orden, nombre, seccion, ...detalle } = prev;
    return { ...p, ...detalle };
  });
}

export async function updateRecorrido(id, data) {
  const db = getDb();
  const doc = limpiar(data);
  if (data.paradasIdaTexto != null || data.paradasVueltaTexto != null) {
    const actual = await getRecorridoById(id);
    for (const sentido of ['ida', 'vuelta']) {
      doc.paradas[sentido] = conservarDetalle(doc.paradas[sentido], actual?.paradas?.[sentido]);
    }
  }
  await db.collection(COLLECTION).doc(id).set({ ...doc, updatedAt: new Date() }, { merge: true });
  return getRecorridoById(id);
}

export async function deleteRecorrido(id) {
  await getDb().collection(COLLECTION).doc(id).delete();
}

export async function seedRecorridosIfNeeded() {
  const db = getDb();
  const snap = await db.collection(COLLECTION).limit(1).get();
  if (!snap.empty) return;
  const batch = db.batch();
  for (const recorrido of RECORRIDOS_126) {
    batch.set(db.collection(COLLECTION).doc(), { ...recorrido, createdAt: new Date(), updatedAt: new Date() });
  }
  await batch.commit();
  console.log(`[recorridos] Seed inicial completado (${RECORRIDOS_126.length} ramales de la Línea 126)`);
}

export async function getRecorridosPrompt() {
  const recorridos = (await getAllRecorridos()).filter(r => r.activo);
  const yaListadas = new Set();
  return recorridos.map(r => formatRecorridoParaPrompt(r, yaListadas)).filter(Boolean).join('\n\n');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function geocodeRecorrido(id) {
  const recorrido = await getRecorridoById(id);
  if (!recorrido) throw new Error('Recorrido no encontrado');
  const fallidas = [];
  let ok = 0;
  for (const sentido of ['ida', 'vuelta']) {
    for (const p of recorrido.paradas?.[sentido] ?? []) {
      if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) continue;
      const query = `${p.direccion || p.nombre}, Buenos Aires, Argentina`; // CABA y La Matanza
      const coords = await geocode(query);
      await sleep(1100); // Nominatim: máx 1 req/s
      if (coords) { p.lat = coords.lat; p.lng = coords.lng; ok++; }
      else fallidas.push(p.nombre);
    }
  }
  await updateRecorrido(id, recorrido);
  return { ok, fallidas };
}
