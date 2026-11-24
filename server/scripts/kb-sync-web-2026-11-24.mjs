// Auditoría web ↔ bot del 2026-11-24: el bot pasa a decir lo mismo que la web
// en reclamos (sin "o la patente", CNRT), retiro de objetos perdidos (horario
// y DNI) y Red SUBE (50% / 75%).
//
//   node scripts/kb-sync-web-2026-11-24.mjs           # muestra los cambios
//   node scripts/kb-sync-web-2026-11-24.mjs --apply
import 'dotenv/config';
import admin from 'firebase-admin';

const APPLY = process.argv.includes('--apply');
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});
const db = admin.firestore();

const reemplazar = (c, pares, label) => {
  let out = c;
  for (const [viejo, nuevo] of pares) {
    if (out.includes(nuevo)) continue;
    if (!out.includes(viejo)) throw new Error(`${label}: no encontré "${viejo}"`);
    out = out.replace(viejo, nuevo);
  }
  return out;
};

const cambios = [];

const kbSnap = await db.collection('bot-linea126_knowledge_base').get();
const rec = kbSnap.docs.find((d) => d.data().title === 'Reclamos, sugerencias y objetos perdidos');
if (!rec) throw new Error('no existe la KB de reclamos');
const OBJ_VIEJO = 'Primero se registra el pedido por acá con la descripción del objeto, el día, el horario y el ramal; la empresa avisa si aparece.';
cambios.push({
  label: 'KB Reclamos, sugerencias y objetos perdidos', ref: rec.ref, campo: 'content', antes: rec.data().content,
  despues: (() => {
    const c = reemplazar(rec.data().content, [
      ['(está pintado en el frente, el costado y adentro) o la patente obligatorio.', '(está pintado en el frente, el costado y adentro), que es obligatorio, y un email, porque la respuesta le llega por mail.'],
      [OBJ_VIEJO, `${OBJ_VIEJO} Si aparece, se retira en la terminal de La Tablada de lunes a viernes de 8 a 15 h, presentando DNI.`],
    ], 'Reclamos');
    return c.includes('CNRT') ? c : `${c.trimEnd()}\nCNRT: la 126 es una línea de jurisdicción nacional, fiscalizada por la Comisión Nacional de Regulación del Transporte. Si el reclamo no fue resuelto, el pasajero puede presentarlo ante la CNRT en argentina.gob.ar/cnrt.`;
  })(),
});

const tarSnap = await db.collection('bot-linea126_tarifas').get();
const red = tarSnap.docs.find((d) => d.data().servicio === 'Red SUBE (combinaciones)');
if (!red) throw new Error('no existe la tarifa Red SUBE');
cambios.push({ label: 'Tarifa Red SUBE', ref: red.ref, campo: 'tarifa', antes: red.data().tarifa,
  despues: '50% de descuento en el 2º viaje y 75% del 3º en adelante' });

for (const { label, ref, campo, antes, despues } of cambios) {
  if (antes === despues) { console.log(`= ${label} ya estaba al día`); continue; }
  console.log(`\n### ${label}\n--- antes\n${antes}\n+++ después\n${despues}`);
  if (APPLY) await ref.update({ [campo]: despues, updatedAt: new Date() });
}
console.log(APPLY ? '\nAPLICADO' : '\n(dry-run: agregá --apply para guardar)');
