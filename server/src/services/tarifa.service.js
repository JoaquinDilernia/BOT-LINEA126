import { getDb } from './firebase.service.js';

const COLLECTION = 'bot-linea126_tarifas';

// Cuadro tarifario estructurado — reemplaza a un párrafo de texto libre en
// la Knowledge Base. Es la fuente de verdad para precios: se edita desde
// el panel (Tarifario) y se inyecta ya formateada en el prompt del bot,
// así el precio que dice el bot siempre coincide con lo que carga la
// línea, sin depender de que el texto de la KB quede prolijo/actualizado.
// Tarifas de líneas nacionales del AMBA (la 126 cruza la Gral. Paz, es de
// jurisdicción nacional), vigentes desde oct/2026 según RedSUBE. El precio
// por tramo exacto de cada viaje sale de las secciones del Recorrido.
const SEED_TARIFAS = [
  { servicio: 'Boleto 0 a 3 km', tarifa: '$742,81', medioPago: 'SUBE registrada', notas: 'Sin registrar: $1.485,62', order: 1 },
  { servicio: 'Boleto 3 a 6 km', tarifa: '$861,66', medioPago: 'SUBE registrada', notas: 'Sin registrar: $1.723,32', order: 2 },
  { servicio: 'Boleto 6 a 12 km', tarifa: '$1.002,80', medioPago: 'SUBE registrada', notas: 'Sin registrar: $2.005,60', order: 3 },
  { servicio: 'Boleto 12 a 27 km', tarifa: '$1.151,36', medioPago: 'SUBE registrada', notas: 'Sin registrar: $2.302,72. Retiro ⇄ La Tablada completo entra en esta franja', order: 4 },
  { servicio: 'Boleto más de 27 km', tarifa: '$1.337,06', medioPago: 'SUBE registrada', notas: 'Sin registrar: $2.674,12', order: 5 },
  { servicio: 'Tarifa Social Federal', tarifa: '55% de descuento sobre el boleto', medioPago: 'SUBE registrada a nombre del titular con el beneficio', notas: 'Jubilados/as, pensionados/as, AUH, Progresar, personal de casas particulares y otros beneficiarios. Se tramita en argentina.gob.ar/redsube', order: 6 },
  { servicio: 'Pase libre (Certificado Único de Discapacidad)', tarifa: 'Sin cargo', medioPago: 'Presentando CUD o pase de discapacidad', notas: 'Titular y acompañante si el certificado lo indica', order: 7 },
  { servicio: 'Red SUBE (combinaciones)', tarifa: 'Descuento en el 2º y siguientes viajes', medioPago: 'SUBE registrada', notas: 'Aplica al combinar con otras líneas, tren o subte dentro de las 2 horas, según las reglas vigentes de Red SUBE', order: 8 },
];

export async function seedTarifasIfNeeded() {
  const db = getDb();
  const snap = await db.collection(COLLECTION).limit(1).get();
  if (!snap.empty) return;
  const batch = db.batch();
  for (const tarifa of SEED_TARIFAS) {
    const ref = db.collection(COLLECTION).doc();
    batch.set(ref, { ...tarifa, active: true, createdAt: new Date(), updatedAt: new Date() });
  }
  await batch.commit();
  console.log('[tarifas] Seed inicial completado');
}

export async function getAllTarifas() {
  const db = getDb();
  const snap = await db.collection(COLLECTION).get();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

// String ya formateado para inyectar directo en el system prompt del bot.
export async function getTarifarioPrompt() {
  const db = getDb();
  const snap = await db.collection(COLLECTION).where('active', '==', true).get();
  if (snap.empty) return '';
  const tarifas = snap.docs.map(d => d.data()).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  return tarifas
    .map(t => `- ${t.servicio}: ${t.tarifa} (${t.medioPago})${t.notas ? ` — ${t.notas}` : ''}`)
    .join('\n');
}

export async function createTarifa({ servicio, tarifa, medioPago = '', notas = '', active = true }) {
  const db = getDb();
  const snap = await db.collection(COLLECTION).orderBy('order', 'desc').limit(1).get();
  const lastOrder = snap.empty ? 0 : snap.docs[0].data().order ?? 0;
  const ref = await db.collection(COLLECTION).add({
    servicio, tarifa, medioPago, notas, active,
    order: lastOrder + 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
}

export async function updateTarifa(id, updates) {
  const db = getDb();
  await db.collection(COLLECTION).doc(id).update({ ...updates, updatedAt: new Date() });
  const doc = await db.collection(COLLECTION).doc(id).get();
  return { id: doc.id, ...doc.data() };
}

export async function deleteTarifa(id) {
  const db = getDb();
  await db.collection(COLLECTION).doc(id).delete();
}
