// Cambios que pasó la empresa el 2026-11-12: se dan de baja los viejos C y D
// (Caballito), los expresos E y F pasan a ser C y D, frecuencias nuevas con
// servicio 24 h, oficinas de 8 a 15 y texto del pase libre con CUD.
// Edita la KB del bot en Firestore (lo que la empresa ve en el panel).
//
//   node scripts/kb-cambios-2026-11-12.mjs           # muestra los cambios
//   node scripts/kb-cambios-2026-11-12.mjs --apply
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
const col = admin.firestore().collection('bot-linea126_knowledge_base');

const RAMALES = `La 126 tiene 4 ramales (letra en el cartel):
- Ramal A — Retiro ⇄ La Tablada (Av. D. A. Maradona 4920). Servicio común, todos los días, las 24 horas.
- Ramal B — Retiro ⇄ Cementerio de Villegas (Ambrosetti y Peribebuy / Pedro León Gallo y Peribebuy, Villegas). Servicio común, todos los días, las 24 horas.
- Ramal C — Retiro ⇄ La Tablada EXPRESO por Autopista 25 de Mayo (AU1) y Perito Moreno (AU6). Días hábiles: hacia Retiro de 7:40 a 9:40; hacia La Tablada de 17:30 a 19:30.
- Ramal D — Retiro ⇄ Cementerio de Villegas EXPRESO por autopista. Días hábiles: hacia Retiro de 7:00 a 9:00; hacia Cementerio de Villegas de 17:00 a 19:00.
En los expresos (C y D) no se puede subir ni bajar en el tramo por autopista: hacia provincia, entre Carlos Calvo (subida a la AU1) y Pitágoras y Av. Juan B. Alberdi; hacia Retiro, entre Av. Directorio y Dámaso Larrañaga y Bernardo de Irigoyen y Av. San Juan.
IMPORTANTE: ya NO existen los ramales que salían de Caballito (Av. Directorio y J. M. Moreno), ni los ramales E y F: los expresos que antes eran E y F ahora son el C y el D. Si alguien pregunta por el E o el F, aclarale que ahora se llaman C y D.
Cabecera Retiro: Av. de los Inmigrantes entre Cabo Pablo T. Fels y Av. Antártida Argentina, a pasos de las estaciones Retiro (Mitre, San Martín, Belgrano) y la terminal de ómnibus.`;

const HORARIOS = `La 126 funciona las 24 horas, todos los días. Frecuencias programadas:
- Días hábiles: de 0 a 3 h cada 30 min; de 3 a 4 h cada 15 a 20 min; de 4 a 5 h cada 8 min; de 5 a 20 h cada 4 min (la mejor frecuencia); de 20 a 21 h cada 5 min; de 21 a 24 h cada 10 min.
- Sábados: de 0 a 3 h cada 30 min; de 3 a 4 h cada 20 min; de 4 a 6 h cada 12 min; de 6 a 20 h cada 6 min; de 20 a 23 h cada 8 min; de 23 a 24 h cada 10 min.
- Domingos y feriados: de 0 a 3 h cada 30 min; de 3 a 4 h cada 20 min; de 4 a 6 h cada 15 min; de 6 a 20 h cada 8 min; de 20 a 24 h cada 10 min.
Tiempo de viaje Retiro ⇄ La Tablada: unos 100 minutos en hora pico y 82 en horario valle.
Los expresos C y D sólo funcionan en días hábiles, en las franjas indicadas en "Ramales y cabeceras".
Los horarios son programados: el tránsito puede generar demoras. Para ver cuánto falta para que llegue el colectivo a una parada se pueden usar las apps "Cuándo Llega", BA Cómo Llego, Moovit o Transit.`;

const CUD_VIEJO = 'Personas con Certificado Único de Discapacidad (CUD): viajan sin cargo presentando el certificado o el pase.';
const CUD_NUEVO = 'Pase libre con CUD: las personas con Certificado Único de Discapacidad viajan sin cargo, y un acompañante si el certificado lo indica. Se presenta el CUD ORIGINAL Y VIGENTE al chofer.';
const OFICINA_VIEJA = 'de lunes a viernes de 9 a 16.';
const OFICINA_NUEVA = 'de lunes a viernes de 8 a 15.';
const OFICINAS_EMPRESA = '\nOficinas (atención presencial en la sede): lunes a viernes de 8 a 15 h.';

const cambios = [
  { title: 'Ramales y cabeceras', fn: () => RAMALES },
  { title: 'Horarios y frecuencias', fn: () => HORARIOS },
  { title: 'Tarifa, SUBE y beneficios', fn: (c) => { if (!c.includes(CUD_VIEJO)) throw new Error('no encontré el texto viejo del CUD'); return c.replace(CUD_VIEJO, CUD_NUEVO); } },
  { title: 'Trabajá con nosotros y contacto institucional', fn: (c) => { if (!c.includes(OFICINA_VIEJA)) throw new Error('no encontré el horario viejo'); return c.replace(OFICINA_VIEJA, OFICINA_NUEVA); } },
  { title: 'La empresa', fn: (c) => (c.includes('Oficinas (atención presencial') ? c : c + OFICINAS_EMPRESA) },
];

const snap = await col.get();
for (const { title, fn } of cambios) {
  const doc = snap.docs.find((d) => d.data().title === title);
  if (!doc) { console.log(`!! no existe "${title}"`); continue; }
  const antes = doc.data().content;
  const despues = fn(antes);
  if (antes === despues) { console.log(`= "${title}" ya estaba al día`); continue; }
  console.log(`\n### ${title}\n--- antes\n${antes}\n+++ después\n${despues}`);
  if (APPLY) await doc.ref.update({ content: despues, updatedAt: new Date() });
}
console.log(APPLY ? '\nAPLICADO' : '\n(dry-run: agregá --apply para guardar)');
