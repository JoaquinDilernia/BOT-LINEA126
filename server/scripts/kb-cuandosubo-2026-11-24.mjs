// La 126 está en Cuándo SUBO (app oficial de Nación, tiempo real). El bot la
// recomienda primero para "¿cuánto falta?" / "¿dónde viene?".
//
//   node scripts/kb-cuandosubo-2026-11-24.mjs           # muestra el cambio
//   node scripts/kb-cuandosubo-2026-11-24.mjs --apply
import 'dotenv/config';
import admin from 'firebase-admin';

const APPLY = process.argv.includes('--apply');
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});
const db = admin.firestore();

const VIEJO = 'Para ver cuánto falta para que llegue el colectivo a una parada se pueden usar las apps "Cuándo Llega", BA Cómo Llego, Moovit o Transit.';
const NUEVO = 'Para ver dónde viene el colectivo y cuánto falta para que llegue a una parada, recomendá la app oficial Cuándo SUBO (Ministerio de Transporte de la Nación, gratis para Android y iPhone; la 126 informa en tiempo real): se elige la línea 126 o la parada y se ven los colectivos en vivo. Más info: argentina.gob.ar/aplicaciones/cuandosubo. Nosotros no tenemos la ubicación en vivo de los colectivos: si preguntan "¿dónde viene?" o "¿cuánto falta?", dales la frecuencia de esa franja y recomendales Cuándo SUBO.';

const snap = await db.collection('bot-linea126_knowledge_base').get();
const doc = snap.docs.find((d) => d.data().title === 'Horarios y frecuencias');
if (!doc) throw new Error('no existe "Horarios y frecuencias"');
const antes = doc.data().content;
if (antes.includes('Cuándo SUBO')) { console.log('= ya estaba al día'); process.exit(0); }
if (!antes.includes(VIEJO)) throw new Error('no encontré el texto viejo de las apps');
const despues = antes.replace(VIEJO, NUEVO);
console.log(`--- antes\n${antes}\n+++ después\n${despues}`);
if (APPLY) await doc.ref.update({ content: despues, updatedAt: new Date() });
console.log(APPLY ? '\nAPLICADO' : '\n(dry-run: agregá --apply para guardar)');
