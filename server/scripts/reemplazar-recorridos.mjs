// Reemplaza los recorridos A y B que ya están en Firestore por los del listado
// oficial de paradas de la empresa (src/data/paradas126.json), y actualiza en
// la base de conocimiento las entradas que describían el recorrido.
//
// Uso:
//   node scripts/reemplazar-recorridos.mjs            # dry-run: solo muestra qué haría
//   node scripts/reemplazar-recorridos.mjs --apply    # aplica los cambios
//
// Conserva el id del documento, el cuadro tarifario (por si se editó desde el
// panel), "activo" y el orden. Reemplaza nombre, descripción, secciones y
// paradas. En la KB pisa "Por dónde pasa" con la versión nueva y en
// "Ramales y cabeceras" sólo corrige la cabecera del ramal B.

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const APPLY = process.argv.includes('--apply');
const REC_COLLECTION = 'bot-linea126_recorridos';
const KB_COLLECTION = 'bot-linea126_knowledge_base';

const { FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL } = process.env;
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: FIREBASE_PROJECT_ID,
    privateKey: FIREBASE_PRIVATE_KEY?.replace(/\n/g, '\n'),
    clientEmail: FIREBASE_CLIENT_EMAIL,
  }),
});
const db = admin.firestore();

const { RECORRIDOS_126 } = await import('../src/data/linea126.js');
const { SEED_KNOWLEDGE } = await import('../src/services/knowledge.service.js');

const letra = (nombre) => String(nombre ?? '').match(/Ramal (\w)/)?.[1];
const snap = await db.collection(REC_COLLECTION).get();
const existentes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

for (const nuevo of RECORRIDOS_126) {
  const actual = existentes.find((r) => letra(r.nombre) === letra(nuevo.nombre));
  const cambios = {
    nombre: nuevo.nombre,
    lineaNombre: nuevo.lineaNombre,
    descripcion: nuevo.descripcion,
    secciones: nuevo.secciones,
    paradas: nuevo.paradas,
    updatedAt: new Date(),
  };
  console.log(`\n[${nuevo.nombre}]`);
  if (actual) {
    console.log(`  doc ${actual.id}: "${actual.nombre}"`);
    console.log(`  paradas ida ${actual.paradas?.ida?.length ?? 0} → ${nuevo.paradas.ida.length}, vuelta ${actual.paradas?.vuelta?.length ?? 0} → ${nuevo.paradas.vuelta.length}`);
    console.log(`  cuadro tarifario: se conserva el actual (${(actual.cuadroTarifario ?? []).length} filas)`);
    if (APPLY) await db.collection(REC_COLLECTION).doc(actual.id).set(cambios, { merge: true });
  } else {
    console.log('  no existe: se crea');
    if (APPLY) await db.collection(REC_COLLECTION).add({ ...nuevo, createdAt: new Date(), updatedAt: new Date() });
  }
}

const kbSnap = await db.collection(KB_COLLECTION).get();
const kb = kbSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
const seedPorDonde = SEED_KNOWLEDGE.find((k) => k.title === 'Por dónde pasa');
const porDonde = kb.find((k) => k.title === 'Por dónde pasa');
console.log('\n[KB] Por dónde pasa:', porDonde ? `se reemplaza (doc ${porDonde.id})` : 'no existe: se crea');
if (APPLY) {
  if (porDonde) await db.collection(KB_COLLECTION).doc(porDonde.id).update({ content: seedPorDonde.content, updatedAt: new Date() });
  else await db.collection(KB_COLLECTION).add({ ...seedPorDonde, active: true, createdAt: new Date(), updatedAt: new Date() });
}
const ramales = kb.find((k) => k.title === 'Ramales y cabeceras');
const viejoB = '(Peribebuy y Mocoretá, San Justo)';
const nuevoB = '(Ambrosetti y Peribebuy / Pedro León Gallo y Peribebuy, Villegas)';
if (ramales?.content?.includes(viejoB)) {
  console.log(`[KB] Ramales y cabeceras: se corrige la cabecera del ramal B (doc ${ramales.id})`);
  if (APPLY) await db.collection(KB_COLLECTION).doc(ramales.id).update({ content: ramales.content.replace(viejoB, nuevoB), updatedAt: new Date() });
} else {
  console.log('[KB] Ramales y cabeceras: no tiene el texto viejo del ramal B, no se toca');
}

console.log(APPLY ? '\nListo: cambios aplicados.' : '\nDry-run: no se escribió nada. Corré con --apply para aplicar.');
process.exit(0);
