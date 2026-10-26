import { getDb } from './firebase.service.js';

const COLLECTION = 'bot-linea126_novedades';

// Avisos que carga la línea desde el panel: desvíos, cortes, paros y datos
// de la empresa. Una sola fuente para dos usos: el banner del sitio
// (GET /api/public/novedades) y el prompt del bot, así lo que dice la web y
// lo que contesta el asistente nunca se contradicen.
export const TIPOS_NOVEDAD = {
  desvio: 'Desvío / cambio de recorrido',
  corte: 'Corte de calle',
  paro: 'Paro / medida de fuerza',
  servicio: 'Cambio de servicio u horario',
  info: 'Información de la empresa',
};

const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);
const validDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

function clean({ tipo, titulo, texto, desde, hasta, activo, destacado } = {}) {
  const out = {};
  if (tipo !== undefined) out.tipo = TIPOS_NOVEDAD[tipo] ? tipo : 'info';
  if (titulo !== undefined) out.titulo = String(titulo).trim().slice(0, 140);
  if (texto !== undefined) out.texto = String(texto).trim().slice(0, 2000);
  if (desde !== undefined) out.desde = validDate(desde);
  if (hasta !== undefined) out.hasta = validDate(hasta);
  if (activo !== undefined) out.activo = !!activo;
  if (destacado !== undefined) out.destacado = !!destacado;
  return out;
}

/** Activa y dentro de su ventana [desde, hasta]; sin fechas = vigente siempre. */
export function isVigente(n, now = new Date()) {
  if (n.activo === false) return false;
  const desde = toDate(n.desde);
  const hasta = toDate(n.hasta);
  if (desde && now < desde) return false;
  if (hasta && now > hasta) return false;
  return true;
}

export async function getAllNovedades() {
  const snap = await getDb().collection(COLLECTION).orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getNovedadesVigentes(now = new Date()) {
  return (await getAllNovedades()).filter(n => isVigente(n, now));
}

export async function createNovedad(data) {
  const novedad = { tipo: 'info', texto: '', desde: null, hasta: null, activo: true, destacado: false, ...clean(data), createdAt: new Date(), updatedAt: new Date() };
  if (!novedad.titulo) throw Object.assign(new Error('El título es obligatorio'), { status: 400 });
  const ref = await getDb().collection(COLLECTION).add(novedad);
  return { id: ref.id, ...novedad };
}

export async function updateNovedad(id, data) {
  const ref = getDb().collection(COLLECTION).doc(id);
  await ref.update({ ...clean(data), updatedAt: new Date() });
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() };
}

export async function deleteNovedad(id) {
  await getDb().collection(COLLECTION).doc(id).delete();
}

const fmt = (d) => d.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });

export function toPublic(n) {
  return {
    id: n.id,
    tipo: n.tipo,
    tipoLabel: TIPOS_NOVEDAD[n.tipo] ?? TIPOS_NOVEDAD.info,
    titulo: n.titulo,
    texto: n.texto ?? '',
    destacado: !!n.destacado,
    desde: toDate(n.desde)?.toISOString() ?? null,
    hasta: toDate(n.hasta)?.toISOString() ?? null,
  };
}

// Bloque para el system prompt. Va en la parte NO cacheada del prompt
// (cambia cuando la línea carga un aviso).
export async function getNovedadesPrompt() {
  const vigentes = await getNovedadesVigentes();
  if (!vigentes.length) return '';
  return vigentes.map(n => {
    const desde = toDate(n.desde);
    const hasta = toDate(n.hasta);
    const ventana = desde || hasta ? ` (${desde ? `desde ${fmt(desde)}` : ''}${desde && hasta ? ' ' : ''}${hasta ? `hasta ${fmt(hasta)}` : ''})` : '';
    return `- [${TIPOS_NOVEDAD[n.tipo] ?? 'Aviso'}] ${n.titulo}${ventana}${n.texto ? `: ${n.texto}` : ''}`;
  }).join('\n');
}
