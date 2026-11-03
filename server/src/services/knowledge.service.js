import { getDb } from './firebase.service.js';

const COLLECTION = 'bot-linea126_knowledge_base';

// Información pública de la Línea 126 (Cárdenas S.A.), relevada en oct/2026
// del itinerario oficial de la Secretaría de Transporte, el Boletín Oficial
// y la diagramación Invierno 2026. Se siembra sólo si la KB está vacía; una
// vez que la empresa la edita desde el panel, esto no se vuelve a tocar.
// Precios: van en el Tarifario y en las secciones de Recorridos, no acá.
export const SEED_KNOWLEDGE = [
  {
    title: 'La empresa',
    order: 1,
    content: `La Línea 126 la opera Cárdenas S.A. Empresa de Transportes (CUIT 30-54634305-3), con permiso nacional desde 1997 (Disposición SSTM y LD N° 51/97, renovado; vence el 26/01/2027). Es una línea de jurisdicción nacional: une la Ciudad de Buenos Aires con el partido de La Matanza, cruzando la Av. General Paz.
Sede, terminal y cochera: Av. Diego Armando Maradona 4920 (ex Av. Monseñor Rodolfo Bufano, Ruta Provincial 4), La Tablada, La Matanza.
Atención telefónica: 0800-444-0273 (gratuito) o (011) 4482-1639.
Flota moderna con unidades con aire acondicionado y unidades accesibles (piso bajo y rampa) para personas con movilidad reducida. Colores de la empresa: rojo y blanco.`,
  },
  {
    title: 'Ramales y cabeceras',
    order: 2,
    content: `La 126 tiene 6 ramales (letra en el cartel):
- Ramal A — Retiro ⇄ La Tablada (Av. D. A. Maradona 4920). Servicio común, todos los días.
- Ramal B — Retiro ⇄ Cementerio de Villegas (Ambrosetti y Peribebuy / Pedro León Gallo y Peribebuy, Villegas). Servicio común, todos los días.
- Ramal C — Av. Directorio y Av. José María Moreno (Caballito/Parque Chacabuco) ⇄ La Tablada. Sólo días hábiles de 7:00 a 10:30.
- Ramal D — Av. Directorio y Av. José María Moreno ⇄ Cementerio de Villegas. Sólo días hábiles de 7:00 a 10:30.
- Ramal E — Retiro ⇄ La Tablada EXPRESO por Autopista 25 de Mayo (AU1) y Perito Moreno (AU6). Días hábiles: hacia Retiro de 7:40 a 9:40; hacia La Tablada de 17:30 a 19:30.
- Ramal F — Retiro ⇄ Cementerio de Villegas EXPRESO por autopista. Días hábiles: hacia Retiro de 7:00 a 9:00; hacia Cementerio de Villegas de 17:00 a 19:00.
En los expresos (E y F) no se puede subir ni bajar en el tramo por autopista: hacia provincia, entre Carlos Calvo (subida a la AU1) y Pitágoras y Av. Juan B. Alberdi; hacia Retiro, entre Av. Directorio y Dámaso Larrañaga y Bernardo de Irigoyen y Av. San Juan.
Cabecera Retiro: Av. de los Inmigrantes entre Cabo Pablo T. Fels y Av. Antártida Argentina, a pasos de las estaciones Retiro (Mitre, San Martín, Belgrano) y la terminal de ómnibus.`,
  },
  {
    title: 'Por dónde pasa',
    order: 3,
    content: `Recorrido principal según el listado oficial de paradas de la empresa (ramales A y B):
Hacia Retiro (ida): desde la terminal de La Tablada (Av. D. A. Maradona 4920) por Av. D. A. Maradona hasta la rotonda, Av. Crovara (La Tablada, Villa Madero), cruce de la Av. General Paz, Av. Eva Perón, Guaminí, Av. Cárdenas, Av. de los Corrales, Av. Lisandro de la Torre, Av. Directorio (Mataderos, Parque Avellaneda, Flores, Parque Chacabuco), Av. San Juan (Boedo, San Cristóbal, Constitución, San Telmo), Paseo Colón (Metrobús), Av. Belgrano, Av. Julio A. Roca, Hipólito Yrigoyen, Metrobús del Bajo por L. N. Alem, Gustavo Martínez Zuviría y Av. de los Inmigrantes (Retiro).
Hacia La Tablada (vuelta): desde Av. de los Inmigrantes, Av. Ramos Mejía, L. N. Alem (Metrobús), Av. Rivadavia, Av. Julio A. Roca, Av. Belgrano, Paseo Colón, Av. Independencia, Lima, Humberto 1º (Constitución, San Cristóbal, Boedo), Carlos Calvo, Av. Pedro Goyena (Caballito), Av. Juan B. Alberdi (Flores, Parque Avellaneda; Metrobús), Av. Bruix, Av. Directorio (Mataderos), Av. Cárdenas, Av. Eva Perón, Av. Crovara y Av. D. A. Maradona hasta la terminal.
Ramal B: en Av. Crovara sigue hacia Villegas por Crovara, Centenera, José C. Paz y Ambrosetti hasta Peribebuy (Cementerio de Villegas); desde Villegas sale por Pedro León Gallo, Ambrosetti, José C. Paz, Centenera y Av. Crovara.
Barrios: Retiro, San Nicolás, Monserrat, San Telmo, Constitución, San Cristóbal, Boedo, Caballito, Parque Chacabuco, Flores, Parque Avellaneda, Mataderos (CABA) y Villa Madero, La Tablada y Villegas (La Matanza).
Lugares a los que acerca (según la empresa): estaciones Retiro (trenes Mitre y San Martín, terminal de ómnibus), Tribunales de Retiro, Buquebus y Puerto Madero, Catalinas, Mercado de los Carruajes, Palacio Libertad, Luna Park, Plaza de Mayo, Cabildo, Banco Nación, Legislatura, Ministerio de Economía, Calle Florida, Manzana de las Luces, INDEC, Facultad de Ingeniería (UBA), UCA, Convento de Santo Domingo, Feria de San Telmo, Parque Lezama, ANSES y Registro Nacional de las Personas (Paseo Colón), Colegio Huergo, UADE, UAI, Plaza Constitución, Facultad de Ciencias Sociales, Hospital Santa Lucía, Hospital Milstein, Correo Argentino, Hospital del Quemado, AySA, Facultad de Filosofía y Letras, Parque Chacabuco, Asociación Amigos del Tranvía, Hospital Santa Isabel, UFLO, Escuela Técnica Hogar Naval, Parque Avellaneda, Hospital San Cayetano, Feria de Mataderos, Estadio y Polideportivo de Nueva Chicago, Cementerio Israelita, estación de tren La Tablada, Hiper ChangoMás, Cementerio de Villegas, Cementerio Islámico, Cementerio Armenio, Polideportivo San José y estación Justo Villegas.
Combinaciones: trenes Mitre y San Martín en Retiro; subte C (Constitución, Av. San Juan, Independencia), subte E (Av. San Juan, Directorio y J. M. Moreno, Av. Belgrano), subte H (Av. Jujuy), subtes A y E cerca de Plaza de Mayo; Metrobús del Bajo y de Paseo Colón; Transbus T1 en Senillosa.
El recorrido completo parada por parada y las secciones de tarifa están en el bloque de RECORRIDOS.`,
  },
  {
    title: 'Horarios y frecuencias',
    order: 4,
    content: `Ramal A (Retiro ⇄ La Tablada), diagramación Invierno 2026:
- Días hábiles: servicio de 00:45 a 23:55 (nocturno incluido). De 00:45 a 3:55 pasa cada 20 a 60 minutos; de 3:55 a 6:10 cada 10 a 15; de 6:10 a 10 cada 9-10 minutos; de 10 a 19:30 cada 6 minutos (la mejor frecuencia); de 19:30 a 21:30 cada 10; y de 21:30 a 23:55 cada 15 a 20. Unos 158 servicios por día hacia Retiro y 156 hacia La Tablada.
- Sábados: de 4:00 a 24:00. Cada 30 min de 4 a 5, cada 15 min de 5 a 6, cada 10 min de 6 a 19 y cada 15 min hasta medianoche (107 servicios por sentido).
- Domingos y feriados: de 6:00 a 24:00. Cada 15 min de 6 a 8, cada 12 min de 8 a 20 y cada 15 min hasta medianoche (86 servicios por sentido).
Tiempo de viaje Retiro ⇄ La Tablada: unos 100 minutos en hora pico y 82 en horario valle.
Los ramales C, D, E y F sólo funcionan en días hábiles, en las franjas indicadas en "Ramales y cabeceras".
Los horarios son programados: el tránsito puede generar demoras. Para ver cuánto falta para que llegue el colectivo a una parada se pueden usar las apps "Cuándo Llega", BA Cómo Llego, Moovit o Transit.`,
  },
  {
    title: 'Tarifa, SUBE y beneficios',
    order: 5,
    content: `Se paga sólo con tarjeta SUBE (no se aceptan efectivo ni otros medios). Al subir, el pasajero le dice al chofer hasta dónde viaja y el chofer marca el boleto según la distancia; los valores por tramo están en el CUADRO TARIFARIO y en las secciones de RECORRIDOS.
La SUBE tiene que estar registrada a nombre del pasajero: sin registrar el boleto cuesta el doble. Se registra en argentina.gob.ar/sube o en la app SUBE.
Tarifa Social Federal: 55% de descuento para jubilados, pensionados, AUH y otros beneficiarios, con la SUBE registrada a su nombre.
Personas con Certificado Único de Discapacidad (CUD): viajan sin cargo presentando el certificado o el pase.
Saldo negativo: se puede viajar con saldo negativo hasta el límite que fija SUBE.
Para reclamos por cobros de la tarjeta SUBE (no del chofer): 0800-777-7823 o argentina.gob.ar/sube.`,
  },
  {
    title: 'Reclamos, sugerencias y objetos perdidos',
    order: 6,
    content: `Todo reclamo (demora, frecuencia, mal trato, manejo peligroso, unidad en mal estado, cobro indebido, no paró en la parada) u objeto perdido se registra por este mismo chat — no hace falta ir a ninguna oficina ni llamar. Cada reclamo recibe un número (formato R126-000000) para hacerle seguimiento desde la sección "Seguí tu reclamo" del sitio web o preguntando acá.
Datos que ayudan: lugar o parada, horario aproximado, ramal (letra del cartel), sentido, y si los tiene, el número de interno de la unidad (está pintado en el frente, el costado y adentro) o la patente.
Objetos perdidos: se guardan en la terminal de La Tablada (Av. D. A. Maradona 4920). Primero se registra el pedido por acá con la descripción del objeto, el día, el horario y el ramal; la empresa avisa si aparece.
Si el pasajero prefiere, también puede llamar al 0800-444-0273. Reclamos ante el organismo de control: CNRT, 0800-333-0300 o argentina.gob.ar/cnrt.`,
  },
  {
    title: 'Accesibilidad, mascotas y normas de viaje',
    order: 7,
    content: `Unidades accesibles: la flota incluye colectivos de piso bajo con rampa y espacio para silla de ruedas; los asientos de adelante son prioritarios para personas con discapacidad, embarazadas, personas mayores y con niños en brazos.
Mascotas: se permiten mascotas pequeñas dentro de un transportador o bolso cerrado que el pasajero lleve en la falda; perros de asistencia siempre pueden viajar.
Equipaje: sólo bultos que el pasajero pueda llevar sin molestar ni ocupar asientos; cochecitos de bebé plegados en horario pico.
No se puede fumar, comer ni viajar en el estribo. Se sube por adelante y se baja por la puerta trasera tocando el timbre con anticipación.`,
  },
  {
    title: 'Trabajá con nosotros y contacto institucional',
    order: 8,
    content: `Búsquedas laborales (choferes con licencia profesional D1/D2, mecánicos, administrativos): se puede dejar el CV en la sección "Trabajá con nosotros" del sitio web o personalmente en Av. D. A. Maradona 4920, La Tablada, de lunes a viernes de 9 a 16.
Prensa, empresas e instituciones: contactar por el formulario del sitio web o al (011) 4482-1639.`,
  },
];

export async function seedKnowledgeIfNeeded() {
  const db = getDb();
  const snap = await db.collection(COLLECTION).limit(1).get();
  if (!snap.empty) return;
  const batch = db.batch();
  for (const item of SEED_KNOWLEDGE) {
    const ref = db.collection(COLLECTION).doc();
    batch.set(ref, { ...item, active: true, createdAt: new Date(), updatedAt: new Date() });
  }
  await batch.commit();
  console.log('[knowledge] Seed inicial completado');
}

/**
 * Obtiene toda la knowledge base activa como string para inyectar al prompt.
 * @returns {Promise<string>}
 */
export async function getKnowledgeBasePrompt() {
  const db = getDb();
  const snapshot = await db
    .collection(COLLECTION)
    .where('active', '==', true)
    .get();

  if (snapshot.empty) return '';

  const sections = snapshot.docs
    .map(doc => doc.data())
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .map(d => `### ${d.title}\n${d.content}`);

  return sections.join('\n\n');
}

/**
 * Obtiene el contenido de un item activo de la knowledge base por título exacto.
 * Usado por respuestas de menú guiado que necesitan un dato puntual sin pasar por Claude.
 * @param {string} title
 * @returns {Promise<string|null>}
 */
export async function getKnowledgeItemByTitle(title) {
  const db = getDb();
  const snapshot = await db
    .collection(COLLECTION)
    .where('active', '==', true)
    .where('title', '==', title)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data().content;
}

/**
 * Obtiene todos los items de la knowledge base (para el dashboard).
 * @returns {Promise<Array>}
 */
export async function getAllKnowledgeItems() {
  const db = getDb();
  const snapshot = await db.collection(COLLECTION).get();
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}

/**
 * Crea un nuevo item en la knowledge base.
 * @param {object} item - { title, content, category, order, active }
 * @returns {Promise<object>}
 */
export async function createKnowledgeItem(item) {
  const db = getDb();
  const ref = await db.collection(COLLECTION).add({
    ...item,
    active: item.active ?? true,
    order: item.order ?? 99,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { id: ref.id, ...item };
}

/**
 * Actualiza un item de la knowledge base.
 * @param {string} id
 * @param {object} updates
 * @returns {Promise<void>}
 */
export async function updateKnowledgeItem(id, updates) {
  const db = getDb();
  await db.collection(COLLECTION).doc(id).update({ ...updates, updatedAt: new Date() });
}

/**
 * Elimina un item de la knowledge base.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteKnowledgeItem(id) {
  const db = getDb();
  await db.collection(COLLECTION).doc(id).delete();
}
