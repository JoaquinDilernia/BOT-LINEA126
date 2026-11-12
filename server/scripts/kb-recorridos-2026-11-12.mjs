// Segunda pasada del 2026-11-12: los recorridos A y B (bloque RECORRIDOS del
// bot) pasan a decir "las 24 horas" y nombran su expreso (C y D); la KB
// "Por dónde pasa" suma los expresos y "Mascotas" la excepción de los perros
// de asistencia (igual que la web).
//
//   node scripts/kb-recorridos-2026-11-12.mjs           # muestra los cambios
//   node scripts/kb-recorridos-2026-11-12.mjs --apply
import 'dotenv/config';
import admin from 'firebase-admin';
import { RECORRIDOS_126 } from '../src/data/linea126.js';

const APPLY = process.argv.includes('--apply');
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});
const db = admin.firestore();

const EXPRESOS = `Expresos (sólo días hábiles, por Autopista 25 de Mayo y Perito Moreno): el C hace la traza del A (La Tablada ⇄ Retiro), hacia Retiro de 7:40 a 9:40 y hacia La Tablada de 17:30 a 19:30; el D hace la traza del B (Cementerio de Villegas ⇄ Retiro), hacia Retiro de 7:00 a 9:00 y hacia Villegas de 17:00 a 19:00. En el tramo por autopista no se puede subir ni bajar: hacia provincia entre Carlos Calvo y Pitágoras y Av. Juan B. Alberdi; hacia Retiro entre Av. Directorio y Dámaso Larrañaga y Bernardo de Irigoyen y Av. San Juan. Ya no hay ramales desde Caballito ni ramales E y F.`;
const MASCOTAS_VIEJO = 'Mascotas: no se permiten mascotas.';
const MASCOTAS_NUEVO = 'Mascotas: por el momento no se permiten mascotas a bordo. Los perros de asistencia (como los perros guía) pueden viajar siempre, como lo indica la ley.';

const cambios = [];

// Recorridos: sólo la descripción, por nombre (no toca paradas ni secciones).
const recSnap = await db.collection('bot-linea126_recorridos').get();
for (const seed of RECORRIDOS_126) {
  const doc = recSnap.docs.find((d) => d.data().nombre === seed.nombre);
  if (!doc) { console.log(`!! no existe el recorrido "${seed.nombre}"`); continue; }
  cambios.push({ label: `Recorrido ${seed.nombre}`, ref: doc.ref, campo: 'descripcion', antes: doc.data().descripcion, despues: seed.descripcion });
}

const kbSnap = await db.collection('bot-linea126_knowledge_base').get();
const kb = (title) => kbSnap.docs.find((d) => d.data().title === title);
const porDonde = kb('Por dónde pasa');
if (porDonde) {
  const c = porDonde.data().content;
  const ancla = 'Barrios: ';
  if (!c.includes(ancla)) throw new Error('no encontré "Barrios:" en Por dónde pasa');
  const despues = c.includes('Expresos (sólo días hábiles') ? c : c.replace(ancla, `${EXPRESOS}\n${ancla}`);
  cambios.push({ label: 'KB Por dónde pasa', ref: porDonde.ref, campo: 'content', antes: c, despues });
}
const normas = kb('Accesibilidad, mascotas y normas de viaje');
if (normas) {
  const c = normas.data().content;
  const despues = c.includes('perros de asistencia') ? c : c.replace(MASCOTAS_VIEJO, MASCOTAS_NUEVO);
  if (!c.includes('perros de asistencia') && despues === c) throw new Error('no encontré el texto viejo de mascotas');
  cambios.push({ label: 'KB Accesibilidad, mascotas y normas', ref: normas.ref, campo: 'content', antes: c, despues });
}

for (const { label, ref, campo, antes, despues } of cambios) {
  if (antes === despues) { console.log(`= ${label} ya estaba al día`); continue; }
  console.log(`\n### ${label}\n--- antes\n${antes}\n+++ después\n${despues}`);
  if (APPLY) await ref.update({ [campo]: despues, updatedAt: new Date() });
}
console.log(APPLY ? '\nAPLICADO' : '\n(dry-run: agregá --apply para guardar)');
