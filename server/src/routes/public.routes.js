import { Router } from 'express';
import { processIncomingMessage } from '../services/bot.service.js';
import { getConversationHistory } from '../services/conversation.service.js';
import { getAllRecorridos } from '../services/recorrido.service.js';
import { getAllTarifas } from '../services/tarifa.service.js';
import { getPublicReclamoByNumero } from '../services/ticket.service.js';
import { createPostulacion } from '../services/postulacion.service.js';

// Todo lo que consume el sitio institucional. Sin auth: sólo devuelve datos
// públicos (nunca contactos, legajos ni notas internas).
const router = Router();

function rateLimit({ windowMs, max, message }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const arr = (hits.get(req.ip) ?? []).filter(t => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: message });
    arr.push(now);
    hits.set(req.ip, arr);
    next();
  };
}

// --- Chat web ---------------------------------------------------------------
// Mismo pipeline que WhatsApp (processIncomingMessage con channel: 'web'),
// pero bot.service.js sólo manda por Meta cuando el canal es whatsapp/
// instagram: acá la respuesta se guarda en Firestore y vuelve por HTTP, sin
// abrir conversaciones facturables de WhatsApp. Si la línea después activa
// WhatsApp, el mismo bot atiende los dos canales sin cambios.
const SESSION_ID_RE = /^[a-f0-9-]{16,64}$/i;
const MAX_CHAT_MESSAGE_LEN = 2000;
// Cada mensaje es una llamada a Claude: 40 mensajes / 10 min por IP.
const chatRateLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 40, message: 'Demasiados mensajes. Probá de nuevo en unos minutos.' });

const sanitizeMessages = (messages) =>
  messages.map(({ role, content, timestamp }) => ({ role, content, timestamp: timestamp ?? null }));

router.post('/chat', chatRateLimit, async (req, res) => {
  try {
    const { sessionId, message, contactName } = req.body ?? {};
    if (!SESSION_ID_RE.test(sessionId ?? '')) return res.status(400).json({ error: 'Sesión inválida.' });
    const text = String(message ?? '').trim();
    if (!text) return res.status(400).json({ error: 'Mensaje vacío.' });
    if (text.length > MAX_CHAT_MESSAGE_LEN) return res.status(400).json({ error: 'Mensaje demasiado largo.' });

    const contactId = `web:${sessionId}`;
    await processIncomingMessage({
      channel: 'web',
      from: contactId,
      messageId: null,
      text,
      contactName: contactName ? String(contactName).trim().slice(0, 80) : null,
    });

    const messages = await getConversationHistory(contactId);
    res.json({ messages: sanitizeMessages(messages.slice(-30)) });
  } catch (err) {
    console.error('[public] chat:', err.message);
    res.status(500).json({ error: 'No pudimos procesar tu mensaje. Probá de nuevo.' });
  }
});

router.get('/chat/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!SESSION_ID_RE.test(sessionId)) return res.status(400).json({ error: 'Sesión inválida.' });
    const messages = await getConversationHistory(`web:${sessionId}`);
    res.json({ messages: sanitizeMessages(messages.slice(-30)) });
  } catch (err) {
    res.status(500).json({ error: 'No pudimos cargar la conversación.' });
  }
});

// --- Recorridos y tarifas (los mismos que usa el bot) -----------------------
router.get('/recorridos', async (req, res) => {
  try {
    const recorridos = (await getAllRecorridos()).filter(r => r.activo !== false).map(r => ({
      id: r.id,
      nombre: r.nombre,
      lineaNombre: r.lineaNombre,
      descripcion: r.descripcion,
      secciones: r.secciones ?? [],
      cuadroTarifario: r.cuadroTarifario ?? [],
      paradas: {
        ida: (r.paradas?.ida ?? []).map(({ orden, nombre, seccion, lat, lng }) => ({ orden, nombre, seccion, lat, lng })),
        vuelta: (r.paradas?.vuelta ?? []).map(({ orden, nombre, seccion, lat, lng }) => ({ orden, nombre, seccion, lat, lng })),
      },
    }));
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ recorridos });
  } catch (err) {
    res.status(500).json({ error: 'No pudimos cargar los recorridos.' });
  }
});

router.get('/tarifas', async (req, res) => {
  try {
    const tarifas = (await getAllTarifas()).filter(t => t.active !== false)
      .map(({ id, servicio, tarifa, medioPago, notas }) => ({ id, servicio, tarifa, medioPago, notas }));
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ tarifas });
  } catch (err) {
    res.status(500).json({ error: 'No pudimos cargar las tarifas.' });
  }
});

// --- Seguimiento de reclamos --------------------------------------------------
const NUMERO_RE = /^R126-\d{6}$/;
// Frena que alguien recorra todos los números: 30 consultas / 10 min por IP.
const reclamoRateLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 30, message: 'Demasiadas consultas. Probá de nuevo en unos minutos.' });

router.get('/reclamos/:numero', reclamoRateLimit, async (req, res) => {
  try {
    const numero = String(req.params.numero ?? '').trim().toUpperCase();
    if (!NUMERO_RE.test(numero)) return res.status(400).json({ error: 'El número tiene que tener el formato R126-000000.' });
    const reclamo = await getPublicReclamoByNumero(numero);
    if (!reclamo) return res.status(404).json({ error: 'No encontramos un reclamo con ese número.' });
    res.json({ reclamo });
  } catch (err) {
    res.status(500).json({ error: 'No pudimos consultar el reclamo.' });
  }
});

// --- Trabajá con nosotros -----------------------------------------------------
const formRateLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: 'Ya recibimos varias postulaciones desde esta conexión. Probá más tarde.' });

router.post('/postulaciones', formRateLimit, async (req, res) => {
  try {
    const { id } = await createPostulacion(req.body ?? {});
    res.status(201).json({ ok: true, id });
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.status ? err.message : 'No pudimos enviar la postulación.' });
  }
});

export default router;
