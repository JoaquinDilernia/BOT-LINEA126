import { getDb } from './firebase.service.js';

const COLLECTION = 'bot-linea126_unidades';

// Flota de la línea: el número de interno pintado en cada colectivo. Sin un
// interno válido el bot no toma un reclamo de viaje — es lo que permite
// después cruzar el reclamo con el chofer y armar estadísticas por unidad.
// El doc id ES el interno (normalizado), así cargar dos veces el mismo
// número no duplica nada.

/** "036" → "36"; descarta lo que no sea un número de 1 a 4 dígitos. */
export function normalizeInterno(value) {
  const digits = String(value ?? '').trim().replace(/^(interno|int\.?|n[°º]?)\s*/i, '');
  if (!/^\d{1,4}$/.test(digits)) return null;
  return String(Number(digits));
}

/**
 * Parsea lo que se pega en el panel: "1-150, 201, 205 210" → ['1', …, '150', '201', '205', '210'].
 * Acepta comas, espacios, saltos de línea y rangos con guión. Tope de 2000
 * por carga para que un rango mal tipeado ("1-99999") no llene la base.
 */
export function parseInternos(text) {
  const out = new Set();
  for (const token of String(text ?? '').split(/[\s,;]+/).filter(Boolean)) {
    const range = token.match(/^(\d{1,4})-(\d{1,4})$/);
    if (range) {
      let [a, b] = [Number(range[1]), Number(range[2])];
      if (a > b) [a, b] = [b, a];
      for (let n = a; n <= b && out.size < 2000; n++) out.add(String(n));
      continue;
    }
    const n = normalizeInterno(token);
    if (n && out.size < 2000) out.add(n);
  }
  return [...out];
}

export async function getAllUnidades() {
  const snap = await getDb().collection(COLLECTION).get();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => Number(a.interno) - Number(b.interno));
}

export async function getInternosSet() {
  const unidades = await getAllUnidades();
  return new Set(unidades.filter(u => u.activo !== false).map(u => u.interno));
}

export async function addUnidades(internos) {
  const db = getDb();
  // Firestore admite hasta 500 escrituras por batch.
  for (let i = 0; i < internos.length; i += 450) {
    const batch = db.batch();
    for (const interno of internos.slice(i, i + 450)) {
      batch.set(db.collection(COLLECTION).doc(interno), { interno, activo: true, updatedAt: new Date() }, { merge: true });
    }
    await batch.commit();
  }
  return internos.length;
}

export async function updateUnidad(interno, { patente, notas, activo } = {}) {
  const update = { updatedAt: new Date() };
  if (patente !== undefined) update.patente = String(patente).trim().toUpperCase();
  if (notas !== undefined) update.notas = String(notas).trim();
  if (activo !== undefined) update.activo = !!activo;
  await getDb().collection(COLLECTION).doc(interno).set(update, { merge: true });
}

export async function deleteUnidad(interno) {
  await getDb().collection(COLLECTION).doc(interno).delete();
}

/** "1, 2, 3, 5, 7, 8, 9" → "1-3, 5, 7-9" — para pasarle la flota al bot sin gastar tokens. */
export function compactInternos(internos) {
  const nums = [...internos].map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  const parts = [];
  for (let i = 0; i < nums.length; i++) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    parts.push(j > i ? `${nums[i]}-${nums[j]}` : String(nums[i]));
    i = j;
  }
  return parts.join(', ');
}

/**
 * Chequeo final antes de crear un reclamo del bot (el prompt ya le pide a
 * Claude que valide, esto es la red de seguridad). Devuelve el interno
 * normalizado o el motivo por el que no se puede tomar.
 */
export function validarInternoReclamo({ interno, categoria }, { internos, categoriasSinInterno = [] }) {
  const n = normalizeInterno(interno);
  const opcional = categoriasSinInterno.includes(categoria);
  if (!n) return opcional ? { ok: true, interno: '' } : { ok: false, motivo: 'falta' };
  if (internos?.size && !internos.has(n)) return opcional ? { ok: true, interno: '' } : { ok: false, motivo: 'invalido', interno: n };
  return { ok: true, interno: n };
}
