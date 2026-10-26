import { Router } from 'express';
import multer from 'multer';
import { uploadMetaMedia } from '../services/meta.service.js';
import { requireAtLeastAtencionCliente } from '../middleware/requireAuth.js';
import {
  getAllTickets, getTicketById, createTicket, updateTicket, addComment, respondTicket,
  getReclamosConfig, updateReclamosConfig, createCargaBatch, gravedadDe, CATEGORIAS_RECLAMO,
} from '../services/ticket.service.js';
import { aggregateReclamos } from '../services/reclamoStats.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });
const MES_RE = /^\d{4}-\d{2}$/;

router.get('/', async (req, res) => {
  try {
    const { estado, prioridad, categoria, gravedad, origen, mes } = req.query;
    res.json({ tickets: await getAllTickets({ estado, prioridad, categoria, gravedad, origen, mes: MES_RE.test(mes ?? '') ? mes : undefined }) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Qué es grave, texto de la respuesta automática y en qué categorías el
// interno es opcional.
router.get('/config', async (req, res) => {
  try {
    res.json({ config: await getReclamosConfig(), categorias: CATEGORIAS_RECLAMO });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/config', requireAtLeastAtencionCliente, async (req, res) => {
  try {
    res.json({ config: await updateReclamosConfig(req.body ?? {}) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Estadísticas del mes para la Gestión de reclamos (por chofer, interno y ramal).
router.get('/stats', async (req, res) => {
  const { mes } = req.query;
  if (!MES_RE.test(mes ?? '')) return res.status(400).json({ error: 'mes tiene que ser AAAA-MM' });
  try {
    const [tickets, config] = await Promise.all([getAllTickets({ mes }), getReclamosConfig()]);
    res.json({ stats: aggregateReclamos(tickets, { gravedadDe: t => gravedadDe(t, config) }) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Carga masiva para estadísticas: no se asocia a ningún pasajero.
router.post('/carga', requireAtLeastAtencionCliente, async (req, res) => {
  const rows = req.body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'rows es requerido' });
  try {
    res.status(201).json(await createCargaBatch(rows, req.agent.email));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const ticket = await getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { titulo, descripcion, contactId, prioridad, categoria, imagenes, numeroUnidad, ramal } = req.body;
  if (!titulo?.trim() || !descripcion?.trim()) return res.status(400).json({ error: 'titulo y descripcion son requeridos' });
  try {
    const ticket = await createTicket({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      contactId: contactId || null,
      prioridad: prioridad || 'media',
      categoria: categoria || 'otro',
      imagenes: imagenes || [],
      numeroUnidad: numeroUnidad || '',
      ramal: ramal || '',
      createdBy: req.agent.email,
    });
    res.status(201).json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const ticket = await updateTicket(req.params.id, req.body);
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/comments', async (req, res) => {
  const { texto } = req.body;
  if (!texto?.trim()) return res.status(400).json({ error: 'texto es requerido' });
  try {
    const comentarios = await addComment(req.params.id, { autor: req.agent.email, texto: texto.trim() });
    res.json({ comentarios });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Responde al pasajero de verdad: le manda un WhatsApp de texto libre con
// el contenido que escribe el agente y marca el reclamo como resuelto.
router.post('/:id/responder', async (req, res) => {
  const { texto } = req.body;
  if (!texto?.trim()) return res.status(400).json({ error: 'texto es requerido' });
  try {
    const ticket = await respondTicket(req.params.id, { autor: req.agent.email, texto: texto.trim() });
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sube una imagen nueva (no vinculada a ningún mensaje de WhatsApp existente)
// para adjuntar a un ticket cargado a mano desde el panel. Reutiliza
// uploadMetaMedia — el archivo termina alojado en Meta igual que cualquier
// media de WhatsApp, así que se sirve después con el mismo
// GET /api/conversations/media/:mediaId que ya existe (no hace falta un
// endpoint de lectura nuevo).
router.post('/upload-image', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  try {
    const { buffer, mimetype } = req.file;
    if (!mimetype.startsWith('image/')) return res.status(400).json({ error: 'Solo se aceptan imágenes' });
    const mediaId = await uploadMetaMedia(buffer, mimetype);
    if (!mediaId) return res.status(503).json({ error: 'Meta no configurado — no se pudo subir la imagen' });
    res.json({ mediaId, mimeType: mimetype });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
