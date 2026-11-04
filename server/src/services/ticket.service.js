import { getDb } from './firebase.service.js';
import { listUsers } from './auth.service.js';
import { getAllTemplates } from './template.service.js';
import { sendWhatsAppTemplate, sendWhatsAppMessage, sendInstagramMessage } from './meta.service.js';
import { DEFAULT_RESPUESTA_COMUN, DEFAULT_DEMORA_HORAS, programarRespuestaAt, renderRespuesta } from './reclamoRespuesta.js';
import { appendMessage } from './conversation.service.js';
import { monthKey } from './reclamoStats.js';

const COLLECTION = 'bot-linea126_reclamos';
const COUNTER_COLLECTION = 'bot-linea126_counters';
const RESOLVED_TEMPLATE_NAME = 'ticket_resuelto';

// Categorías fijas — el bot categoriza solo al crear el reclamo (ver
// claude.service.js), y un agente puede corregirla desde el panel. Fijas
// (no un CRUD como Áreas) porque lo que importa acá es que sea siempre el
// mismo set chico para que las estadísticas por categoría tengan sentido.
export const CATEGORIAS_RECLAMO = [
  { id: 'demora', label: 'Demora / falta de frecuencia' },
  { id: 'mal_trato', label: 'Mal trato' },
  { id: 'manejo_peligroso', label: 'Manejo peligroso' },
  { id: 'unidad_mal_estado', label: 'Unidad en mal estado' },
  { id: 'cobro_indebido', label: 'Cobro indebido' },
  { id: 'objeto_perdido', label: 'Objeto perdido' },
  { id: 'no_realizo_parada', label: 'No realizó la parada' },
  { id: 'accidente', label: 'Accidente o seguridad' },
  { id: 'otro', label: 'Otro' },
];
const CATEGORIA_IDS = CATEGORIAS_RECLAMO.map(c => c.id);

const isWebContact = (contactId) => String(contactId ?? '').startsWith('web:');

// --- Reclamos graves vs. comunes ----------------------------------------------
// Pedido de la línea: los reclamos comunes se responden solos (quedan
// registrados igual, con todos los datos, para las estadísticas) y sólo los
// graves llegan a la bandeja del panel para que alguien los responda a mano.
// Qué categorías cuentan como graves se configura desde el panel.
const CONFIG_REF = () => getDb().collection('bot-linea126_config').doc('reclamos');

export const DEFAULT_RECLAMOS_CONFIG = {
  categoriasGraves: ['mal_trato', 'manejo_peligroso', 'accidente'],
  respuestaAutomatica: '¡Gracias por avisarnos! Tu reclamo quedó registrado con los datos de la unidad y entra en el control mensual del servicio: lo revisamos con el área de tráfico para corregir lo que haga falta. No tenés que hacer nada más.',
  // Sin interno el reclamo no se puede atribuir a una unidad ni a un chofer.
  // Objeto perdido y sugerencias quedan afuera: muchas veces el pasajero no
  // lo vio y igual queremos registrar el caso.
  categoriasSinInterno: ['objeto_perdido', 'otro'],
  // Plantilla de la respuesta diferida de los comunes (ver reclamoRespuesta.js).
  // `respuestaAutomatica` queda sólo para reclamos sin contacto (cargados
  // desde el panel), que se resuelven al instante como antes.
  respuestaComun: DEFAULT_RESPUESTA_COMUN,
  demoraRespuestaHoras: DEFAULT_DEMORA_HORAS,
};

export async function getReclamosConfig() {
  const doc = await CONFIG_REF().get();
  return { ...DEFAULT_RECLAMOS_CONFIG, ...(doc.exists ? doc.data() : {}) };
}

export async function updateReclamosConfig({ categoriasGraves, respuestaAutomatica, categoriasSinInterno, respuestaComun, demoraRespuestaHoras } = {}) {
  const update = { updatedAt: new Date() };
  if (Array.isArray(categoriasGraves)) update.categoriasGraves = categoriasGraves.filter(c => CATEGORIA_IDS.includes(c));
  if (Array.isArray(categoriasSinInterno)) update.categoriasSinInterno = categoriasSinInterno.filter(c => CATEGORIA_IDS.includes(c));
  if (typeof respuestaAutomatica === 'string' && respuestaAutomatica.trim()) update.respuestaAutomatica = respuestaAutomatica.trim().slice(0, 1500);
  if (typeof respuestaComun === 'string' && respuestaComun.trim()) update.respuestaComun = respuestaComun.trim().slice(0, 1500);
  if (demoraRespuestaHoras !== undefined && demoraRespuestaHoras !== '' && Number.isFinite(Number(demoraRespuestaHoras))) update.demoraRespuestaHoras = Math.min(Math.max(Number(demoraRespuestaHoras), 0), 20);
  await CONFIG_REF().set(update, { merge: true });
  return getReclamosConfig();
}

/** Un reclamo urgente siempre es grave, aunque su categoría no lo sea. */
export function gravedadDe({ categoria, prioridad }, config = DEFAULT_RECLAMOS_CONFIG) {
  return prioridad === 'urgente' || config.categoriasGraves.includes(categoria) ? 'grave' : 'comun';
}

/** "Mal trato" / "mal_trato" / "MAL TRATO" → 'mal_trato'. Lo no reconocido → 'otro'. */
export function normalizeCategoria(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (CATEGORIA_IDS.includes(v)) return v;
  const plain = (x) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
  const pv = plain(v);
  const match = CATEGORIAS_RECLAMO.find(c => plain(c.label) === pv || plain(c.id) === pv || plain(c.label).startsWith(pv) && pv.length >= 4);
  return match?.id ?? 'otro';
}

// Lo que puede ver cualquiera que tenga el número de reclamo desde el sitio
// ("Seguí tu reclamo"): estado y respuestas, nunca el contacto, el legajo
// del chofer ni las notas internas.
export async function getPublicReclamoByNumero(numero) {
  const db = getDb();
  const snap = await db.collection(COLLECTION).where('numero', '==', numero).limit(1).get();
  if (snap.empty) return null;
  const t = snap.docs[0].data();
  const toIso = (v) => (v?.toDate ? v.toDate() : v ? new Date(v._seconds ? v._seconds * 1000 : v) : null);
  return {
    numero: t.numero,
    titulo: t.titulo,
    categoria: CATEGORIAS_RECLAMO.find(c => c.id === t.categoria)?.label ?? 'Otro',
    estado: t.estado,
    createdAt: toIso(t.createdAt),
    resolvedAt: toIso(t.resolvedAt),
    respuestas: (t.respuestas ?? []).map(r => ({ texto: r.texto, createdAt: toIso(r.createdAt) })),
  };
}

// Número de reclamo correlativo y legible (R126-000001) — mucho más fácil
// de anotar/repetir por teléfono para un pasajero que un ID de Firestore.
// Transacción atómica sobre un doc contador para que dos reclamos
// simultáneos nunca puedan pisarse el mismo número.
async function nextReclamoNumero() {
  const db = getDb();
  const counterRef = db.collection(COUNTER_COLLECTION).doc('reclamos');
  const value = await db.runTransaction(async tx => {
    const doc = await tx.get(counterRef);
    const current = doc.exists ? (doc.data().value ?? 0) : 0;
    const next = current + 1;
    tx.set(counterRef, { value: next }, { merge: true });
    return next;
  });
  return `R126-${String(value).padStart(6, '0')}`;
}

// Filtra en memoria en vez de con `.where()` encadenados: el volumen esperado
// de reclamos es bajo y así se evita necesitar un índice compuesto para
// cada combinación de estado+prioridad+orderBy.
// Reclamos anteriores a la separación grave/común no tienen `gravedad`
// guardada: se calcula al vuelo con la config actual.
export async function getAllTickets({ estado, prioridad, categoria, gravedad, origen, mes } = {}) {
  const db = getDb();
  const [snap, config] = await Promise.all([
    db.collection(COLLECTION).orderBy('createdAt', 'desc').get(),
    getReclamosConfig(),
  ]);
  let tickets = snap.docs.map(d => {
    const t = { id: d.id, ...d.data() };
    return { ...t, gravedad: t.gravedad ?? gravedadDe(t, config) };
  });
  if (estado) tickets = tickets.filter(t => t.estado === estado);
  if (prioridad) tickets = tickets.filter(t => t.prioridad === prioridad);
  if (categoria) tickets = tickets.filter(t => t.categoria === categoria);
  if (gravedad) tickets = tickets.filter(t => t.gravedad === gravedad);
  if (origen) tickets = tickets.filter(t => (t.origen ?? (t.createdBy === 'bot' ? 'bot' : 'panel')) === origen);
  if (mes) tickets = tickets.filter(t => monthKey(t.fechaHecho ?? t.createdAt) === mes);
  return tickets;
}

export async function getTicketById(id) {
  const db = getDb();
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

// Reclamo sin asignación explícita cae en el primer agente admin — resuelto
// dinámicamente (nunca un email hardcodeado) para no romper si cambia quién
// es el admin.
export async function getDefaultAssignee() {
  const users = await listUsers();
  const admin = users.find(u => u.role === 'admin');
  return admin?.email ?? null;
}

// Los graves quedan abiertos en la bandeja. Los comunes con un pasajero a
// quien contestarle quedan "en progreso" con la respuesta programada para
// unas horas después (la manda enviarRespuestasProgramadas); los que no
// tienen contacto nacen resueltos como antes. `numeroUnidad` es el interno.
export async function createTicket({ titulo, descripcion, contactId = null, prioridad = 'media', categoria = 'otro', imagenes = [], createdBy, numeroUnidad = '', ramal = '', lugarHecho = '', horaHecho = '', canal = null, origen }) {
  const db = getDb();
  const [assignedTo, numero, config] = await Promise.all([getDefaultAssignee(), nextReclamoNumero(), getReclamosConfig()]);
  const cat = CATEGORIA_IDS.includes(categoria) ? categoria : 'otro';
  const gravedad = gravedadDe({ categoria: cat, prioridad }, config);
  const now = new Date();
  const programada = gravedad === 'comun' && !!contactId;
  const auto = gravedad === 'comun' && !contactId;
  const ticket = {
    numero,
    titulo,
    descripcion,
    contactId,
    conversationId: contactId,
    prioridad,
    categoria: cat,
    gravedad,
    origen: origen ?? (createdBy === 'bot' ? 'bot' : 'panel'),
    legajoChofer: '',
    numeroUnidad: String(numeroUnidad ?? '').trim(),
    ramal: String(ramal ?? '').trim().toUpperCase().slice(0, 2),
    lugarHecho: String(lugarHecho ?? '').trim().slice(0, 150),
    horaHecho: String(horaHecho ?? '').trim().slice(0, 60),
    canal: canal ?? (isWebContact(contactId) ? 'web' : contactId ? 'whatsapp' : null),
    estado: auto ? 'resuelto' : programada ? 'en_progreso' : 'abierto',
    imagenes,
    createdBy,
    assignedTo,
    comentarios: [],
    respuestas: auto ? [{ autor: 'Respuesta automática', texto: config.respuestaAutomatica, automatica: true, createdAt: now }] : [],
    ...(auto && { notificationStatus: 'auto' }),
    ...(programada && { notificationStatus: 'scheduled', respuestaProgramadaAt: programarRespuestaAt(now, config.demoraRespuestaHoras) }),
    createdAt: now,
    updatedAt: now,
    resolvedAt: auto ? now : null,
  };
  const ref = await db.collection(COLLECTION).add(ticket);
  return { id: ref.id, ...ticket };
}

// Carga mensual para estadísticas: la línea completa chofer/interno/ramal de
// cada reclamo (o carga reclamos que le llegaron por otros medios). Estos
// registros NO tienen contacto ni número público: nunca se le responde a
// nadie desde acá, sólo alimentan las estadísticas.
export async function createCargaBatch(rows, createdBy) {
  const db = getDb();
  const config = await getReclamosConfig();
  const errores = [];
  const docs = [];
  rows.slice(0, 500).forEach((row, i) => {
    const fecha = row.fecha ? new Date(row.fecha) : null;
    if (!fecha || Number.isNaN(fecha.getTime())) { errores.push({ fila: i + 1, error: 'Fecha inválida' }); return; }
    const categoria = normalizeCategoria(row.categoria);
    const now = new Date();
    docs.push({
      numero: null,
      titulo: CATEGORIAS_RECLAMO.find(c => c.id === categoria)?.label ?? 'Reclamo',
      descripcion: String(row.descripcion ?? '').trim().slice(0, 1000),
      contactId: null,
      conversationId: null,
      prioridad: 'media',
      categoria,
      gravedad: gravedadDe({ categoria }, config),
      origen: 'carga',
      legajoChofer: String(row.legajoChofer ?? '').trim().slice(0, 60),
      numeroUnidad: String(row.numeroUnidad ?? '').trim().slice(0, 10),
      ramal: String(row.ramal ?? '').trim().toUpperCase().slice(0, 2),
      fechaHecho: fecha,
      estado: 'cerrado',
      imagenes: [],
      createdBy,
      assignedTo: null,
      comentarios: [],
      respuestas: [],
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    });
  });
  for (let i = 0; i < docs.length; i += 450) {
    const batch = db.batch();
    for (const d of docs.slice(i, i + 450)) batch.set(db.collection(COLLECTION).doc(), d);
    await batch.commit();
  }
  return { creados: docs.length, errores };
}

export async function updateTicket(id, { titulo, descripcion, prioridad, categoria, legajoChofer, numeroUnidad, ramal, lugarHecho, horaHecho, gravedad, estado, assignedTo, imagenes } = {}) {
  const db = getDb();
  const docRef = db.collection(COLLECTION).doc(id);
  const before = await docRef.get();
  if (!before.exists) throw new Error('Reclamo no encontrado');
  const beforeData = before.data();

  const update = { updatedAt: new Date() };
  if (titulo !== undefined) update.titulo = titulo;
  if (descripcion !== undefined) update.descripcion = descripcion;
  if (prioridad !== undefined) update.prioridad = prioridad;
  if (categoria !== undefined) update.categoria = CATEGORIA_IDS.includes(categoria) ? categoria : 'otro';
  if (legajoChofer !== undefined) update.legajoChofer = legajoChofer;
  if (numeroUnidad !== undefined) update.numeroUnidad = numeroUnidad;
  if (ramal !== undefined) update.ramal = String(ramal).trim().toUpperCase().slice(0, 2);
  if (lugarHecho !== undefined) update.lugarHecho = String(lugarHecho).trim().slice(0, 150);
  if (horaHecho !== undefined) update.horaHecho = String(horaHecho).trim().slice(0, 60);
  if (gravedad === 'grave' || gravedad === 'comun') update.gravedad = gravedad;
  if (assignedTo !== undefined) update.assignedTo = assignedTo;
  if (imagenes !== undefined) update.imagenes = imagenes;

  const justResolved = estado === 'resuelto' && beforeData.estado !== 'resuelto';
  if (estado !== undefined) {
    update.estado = estado;
    if (justResolved) {
      update.resolvedAt = new Date();
      update.notificationStatus = 'pending';
    }
  }

  await docRef.update(update);
  const after = await docRef.get();
  const ticket = { id: after.id, ...after.data() };

  if (justResolved && ticket.contactId && !isWebContact(ticket.contactId)) {
    // Fire-and-forget — un fallo notificando no debe bloquear ni revertir el
    // cambio de estado que el agente ya confirmó. Esto es un aviso genérico
    // vía plantilla de WhatsApp (requiere plantilla aprobada en Meta); para
    // mandarle al pasajero una respuesta con contenido real, usar
    // respondTicket() en vez de simplemente cambiar el estado acá.
    notifyTicketResolved(ticket).catch(err => console.error('[ticket] Error notificando resolución:', err.message));
  }

  return ticket;
}

export async function addComment(id, { autor, texto }) {
  const db = getDb();
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new Error('Reclamo no encontrado');
  const comentarios = [...(doc.data().comentarios ?? []), { autor, texto, createdAt: new Date() }];
  await docRef.update({ comentarios, updatedAt: new Date() });
  return comentarios;
}

// Respuesta real al pasajero — a diferencia de addComment (nota interna
// entre agentes, nunca sale del panel), esto le manda un WhatsApp de texto
// libre al contacto del reclamo con el contenido que escribe el agente, y
// marca el reclamo como resuelto. Es el corazón del "panel de reclamos":
// la línea le contesta al pasajero directamente desde acá, sin que un
// humano tenga que tomar la conversación de WhatsApp.
export async function respondTicket(id, { autor, texto }) {
  const db = getDb();
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new Error('Reclamo no encontrado');
  const ticket = { id: doc.id, ...doc.data() };
  if (!ticket.contactId) throw new Error('Este reclamo no tiene un contacto asociado');

  const respuesta = { autor, texto, createdAt: new Date() };
  const respuestas = [...(ticket.respuestas ?? []), respuesta];
  const wasResolved = ticket.estado === 'resuelto';

  await docRef.update({
    respuestas,
    estado: 'resuelto',
    resolvedAt: wasResolved ? (ticket.resolvedAt ?? new Date()) : new Date(),
    updatedAt: new Date(),
  });

  const mensaje = `Hola! Te escribimos por tu reclamo *N° ${ticket.numero}*:\n\n${texto}`;
  // Un reclamo que entró por el chat del sitio (contactId "web:<sesión>") no
  // tiene a dónde mandarse por WhatsApp: la respuesta queda en la
  // conversación y el pasajero la ve en el chat o en "Seguí tu reclamo".
  let notificationStatus = isWebContact(ticket.contactId) ? 'web' : 'sent';
  if (!isWebContact(ticket.contactId)) {
    try {
      await sendWhatsAppMessage(ticket.contactId, mensaje);
    } catch (err) {
      console.error('[ticket] Error enviando respuesta por WhatsApp:', err.response?.data ?? err.message);
      notificationStatus = 'failed';
    }
  }
  await docRef.update({ notificationStatus }).catch(() => {});

  // Se guarda en el historial de la conversación (role: 'admin', igual que
  // cuando un agente manda un WhatsApp manual) para que quien revise el
  // chat del pasajero vea la respuesta ahí también, no solo en el reclamo.
  await appendMessage(ticket.contactId, { role: 'admin', content: mensaje, sentBy: autor }).catch(() => {});

  const after = await docRef.get();
  return { id: after.id, ...after.data() };
}

async function notifyTicketResolved(ticket) {
  const db = getDb();
  const templates = await getAllTemplates();
  const approved = templates.find(t => t.name === RESOLVED_TEMPLATE_NAME && t.metaStatus === 'APPROVED');
  if (!approved) {
    console.warn(`[ticket] Plantilla "${RESOLVED_TEMPLATE_NAME}" no existe o no está aprobada en Meta todavía — no se notifica al cliente. Creála desde Plantillas, o usá "Responder al pasajero" que manda texto libre sin necesitar plantilla.`);
    await db.collection(COLLECTION).doc(ticket.id).update({ notificationStatus: 'no_template' }).catch(() => {});
    return;
  }
  try {
    await sendWhatsAppTemplate(ticket.contactId, RESOLVED_TEMPLATE_NAME, approved.language ?? 'es_AR', [ticket.titulo]);
    console.log(`[ticket] Notificación de resolución enviada para reclamo ${ticket.numero}`);
    await db.collection(COLLECTION).doc(ticket.id).update({ notificationStatus: 'sent' }).catch(() => {});
  } catch (err) {
    console.error('[ticket] Error enviando plantilla de resolución:', err.message);
    await db.collection(COLLECTION).doc(ticket.id).update({ notificationStatus: 'failed' }).catch(() => {});
    throw err;
  }
}

const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);

// Corre cada pocos minutos (app.js): manda la respuesta de los comunes cuya
// hora programada ya pasó. Filtra por un solo campo (sin índice compuesto)
// y la fecha en memoria — siempre son pocos pendientes.
// Si mientras tanto un agente lo pasó a grave, lo respondió a mano o lo
// cerró, no se manda nada.
export async function enviarRespuestasProgramadas(now = new Date()) {
  const db = getDb();
  const snap = await db.collection(COLLECTION).where('notificationStatus', '==', 'scheduled').get();
  if (snap.empty) return 0;
  const config = await getReclamosConfig();
  let enviadas = 0;
  for (const doc of snap.docs) {
    const t = { id: doc.id, ...doc.data() };
    const at = toDate(t.respuestaProgramadaAt);
    if (!at || at > now) continue;
    if (t.gravedad !== 'comun' || ['resuelto', 'cerrado'].includes(t.estado) || !t.contactId) {
      await doc.ref.update({ notificationStatus: 'cancelled' }).catch(() => {});
      continue;
    }
    const texto = renderRespuesta(config.respuestaComun, t);
    const canal = t.canal ?? (isWebContact(t.contactId) ? 'web' : 'whatsapp');
    let notificationStatus = canal === 'web' ? 'web' : 'sent';
    try {
      if (canal === 'whatsapp') await sendWhatsAppMessage(t.contactId, texto);
      else if (canal === 'instagram') await sendInstagramMessage(t.contactId, texto);
    } catch (err) {
      console.error(`[ticket] Error mandando respuesta programada de ${t.numero}:`, err.response?.data ?? err.message);
      notificationStatus = 'failed';
    }
    const sentAt = new Date();
    await doc.ref.update({
      notificationStatus,
      estado: 'resuelto',
      resolvedAt: sentAt,
      updatedAt: sentAt,
      respuestas: [...(t.respuestas ?? []), { autor: 'Respuesta automática', texto, automatica: true, createdAt: sentAt }],
    });
    await appendMessage(t.contactId, { role: 'admin', content: texto, sentBy: 'Respuesta automática' }).catch(() => {});
    if (notificationStatus !== 'failed') enviadas++;
    console.log(`[ticket] Respuesta programada de ${t.numero}: ${notificationStatus}`);
  }
  return enviadas;
}
