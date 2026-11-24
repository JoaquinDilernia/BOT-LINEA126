// La empresa pasó el 2026-11-20 el cartel con los horarios de los expresos
// por autopista (turno mañana hacia Retiro, turno tarde desde Retiro). Las
// franjas viejas (7:40–9:40, 17:30–19:30, etc.) eran de internet y no van más.
//
// - Crea/actualiza la KB "Horarios de los expresos C y D" con la tabla entera
//   (sale de web/src/data/linea.js, la misma que muestra la web).
// - Corrige las franjas en "Ramales y cabeceras" y "Por dónde pasa".
// - Recorridos A y B: descripción desde src/data/linea126.js.
//
//   node scripts/kb-expresos-2026-11-24.mjs           # muestra los cambios
//   node scripts/kb-expresos-2026-11-24.mjs --apply
import 'dotenv/config';
import admin from 'firebase-admin';
import { RECORRIDOS_126 } from '../src/data/linea126.js';
import { HORARIOS_EXPRESOS, CABECERA_EXPRESO } from '../../web/src/data/linea.js';

const APPLY = process.argv.includes('--apply');
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});
const db = admin.firestore();

const sinCero = (h) => h.replace(/^0/, '');
const { manana, tarde } = HORARIOS_EXPRESOS;
const lineasManana = manana.salidas.map(([r, ...h]) =>
  `- ${r} desde ${CABECERA_EXPRESO[r]}: sale ${sinCero(h[0])} · ${manana.puntos.slice(1).map((p, i) => `${p} ${sinCero(h[i + 1])}`).join(' · ')}`);
const lineasTarde = tarde.salidas.map(([r, ...h]) =>
  `- ${r} hacia ${CABECERA_EXPRESO[r]}: sale de Retiro ${sinCero(h[0])} · ${tarde.puntos.slice(1).map((p, i) => `${p} ${sinCero(h[i + 1])}`).join(' · ')}`);

const TITULO = 'Horarios de los expresos C y D';
const TABLA = `Horarios oficiales de los expresos por autopista (cartel de la empresa, "Horarios del servicio por autopista"). SÓLO DÍAS HÁBILES (lunes a viernes, no feriados). El C sale de / va a La Tablada y el D sale de / va a Cementerio de Villegas. Son horarios programados: el tránsito puede generar demoras.

TURNO MAÑANA — hacia Retiro. Pasan por la Rotonda de La Tablada, Formosa (Av. Crovara), Gral. Paz, Larrazábal y Escalada (Av. Directorio). En el tramo por autopista, entre Av. Directorio y Dámaso Larrañaga y Bernardo de Irigoyen y Av. San Juan, no levantan ni bajan pasajeros.
${lineasManana.join('\n')}

TURNO TARDE — desde Retiro hacia provincia. Pasan por Diagonal Sur y Bolívar y por Tacuarí. En el tramo por autopista, entre Carlos Calvo y Pitágoras y Av. Juan B. Alberdi, no levantan ni bajan pasajeros.
${lineasTarde.join('\n')}

Cómo responder: si preguntan "a qué hora pasa el expreso" por alguno de esos puntos, dales el horario de esa columna (y el siguiente o los siguientes 2-3 según la hora que mencionen). Si la parada no está en la lista, aclarales que estos son los horarios de los puntos de control y que en las paradas intermedias pasa unos minutos después del punto anterior. Fuera de estos horarios, y sábados, domingos y feriados, no hay expresos: tienen que tomar el A (La Tablada) o el B (Villegas), que funcionan las 24 horas.`;

const C_VIEJO = 'Días hábiles: hacia Retiro de 7:40 a 9:40; hacia La Tablada de 17:30 a 19:30.';
const C_NUEVO = 'Días hábiles: sale de La Tablada hacia Retiro de 6:17 a 8:26; sale de Retiro hacia La Tablada de 16:26 a 18:20 (horarios exactos en "Horarios de los expresos C y D").';
const D_VIEJO = 'Días hábiles: hacia Retiro de 7:00 a 9:00; hacia Cementerio de Villegas de 17:00 a 19:00.';
const D_NUEVO = 'Días hábiles: sale de Villegas hacia Retiro de 5:48 a 7:50; sale de Retiro hacia Villegas de 16:51 a 18:35 (horarios exactos en "Horarios de los expresos C y D").';
const PD_VIEJO_C = 'hacia Retiro de 7:40 a 9:40 y hacia La Tablada de 17:30 a 19:30';
const PD_NUEVO_C = 'sale de La Tablada hacia Retiro de 6:17 a 8:26 y de Retiro hacia La Tablada de 16:26 a 18:20';
const PD_VIEJO_D = 'hacia Retiro de 7:00 a 9:00 y hacia Villegas de 17:00 a 19:00';
const PD_NUEVO_D = 'sale de Villegas hacia Retiro de 5:48 a 7:50 y de Retiro hacia Villegas de 16:51 a 18:35';

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
const kbCol = db.collection('bot-linea126_knowledge_base');
const kbSnap = await kbCol.get();
const kb = (title) => kbSnap.docs.find((d) => d.data().title === title);

const ramales = kb('Ramales y cabeceras');
if (!ramales) throw new Error('no existe "Ramales y cabeceras"');
cambios.push({ label: 'KB Ramales y cabeceras', ref: ramales.ref, campo: 'content', antes: ramales.data().content,
  despues: reemplazar(ramales.data().content, [[C_VIEJO, C_NUEVO], [D_VIEJO, D_NUEVO]], 'Ramales') });

const porDonde = kb('Por dónde pasa');
if (porDonde) {
  cambios.push({ label: 'KB Por dónde pasa', ref: porDonde.ref, campo: 'content', antes: porDonde.data().content,
    despues: reemplazar(porDonde.data().content, [[PD_VIEJO_C, PD_NUEVO_C], [PD_VIEJO_D, PD_NUEVO_D]], 'Por dónde pasa') });
}

const recSnap = await db.collection('bot-linea126_recorridos').get();
for (const seed of RECORRIDOS_126) {
  const doc = recSnap.docs.find((d) => d.data().nombre === seed.nombre);
  if (!doc) { console.log(`!! no existe el recorrido "${seed.nombre}"`); continue; }
  cambios.push({ label: `Recorrido ${seed.nombre}`, ref: doc.ref, campo: 'descripcion', antes: doc.data().descripcion, despues: seed.descripcion });
}

for (const { label, ref, campo, antes, despues } of cambios) {
  if (antes === despues) { console.log(`= ${label} ya estaba al día`); continue; }
  console.log(`\n### ${label}\n--- antes\n${antes}\n+++ después\n${despues}`);
  if (APPLY) await ref.update({ [campo]: despues, updatedAt: new Date() });
}

const tabla = kb(TITULO);
const horarios = kb('Horarios y frecuencias');
const order = (horarios?.data().order ?? 3) + 0.5;
if (tabla && tabla.data().content === TABLA) console.log(`= KB ${TITULO} ya estaba al día`);
else {
  console.log(`\n### KB ${TITULO} (${tabla ? 'actualiza' : 'nueva'}, order ${order})\n${TABLA}`);
  if (APPLY) {
    if (tabla) await tabla.ref.update({ content: TABLA, updatedAt: new Date() });
    else await kbCol.add({ title: TITULO, content: TABLA, order, active: true, createdAt: new Date(), updatedAt: new Date() });
  }
}
console.log(APPLY ? '\nAPLICADO' : '\n(dry-run: agregá --apply para guardar)');
