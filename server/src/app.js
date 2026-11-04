import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import webhookRoutes from './routes/webhook.routes.js';
import publicRoutes from './routes/public.routes.js';
import knowledgeRoutes from './routes/knowledge.routes.js';
import conversationRoutes from './routes/conversation.routes.js';
import configRoutes, { brandRouter } from './routes/config.routes.js';
import customerRoutes from './routes/customer.routes.js';
import testRoutes from './routes/test.routes.js';
import authRoutes from './routes/auth.routes.js';
import labelRoutes from './routes/label.routes.js';
import statsRoutes, { waitingRouter } from './routes/stats.routes.js';
import quickReplyRoutes from './routes/quickreply.routes.js';
import templateRoutes from './routes/template.routes.js';
import costsRoutes from './routes/costs.routes.js';
import { initFirebase } from './services/firebase.service.js';
import areaRoutes from './routes/area.routes.js';
import tarifaRoutes from './routes/tarifa.routes.js';
import recorridoRoutes from './routes/recorrido.routes.js';
import postulacionRoutes from './routes/postulacion.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import unidadRoutes from './routes/unidad.routes.js';
import novedadRoutes from './routes/novedad.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import redirectRoutes from './routes/redirect.routes.js';
import { seedAgentsIfNeeded } from './services/auth.service.js';
import { seedAreasIfNeeded } from './services/area.service.js';
import { seedKnowledgeIfNeeded } from './services/knowledge.service.js';
import { seedTarifasIfNeeded } from './services/tarifa.service.js';
import { seedRecorridosIfNeeded } from './services/recorrido.service.js';
import { requireAuth, requireAtLeastAtencionCliente } from './middleware/requireAuth.js';
import { closeIdleBotConversations } from './services/botAutoClose.js';
import { enviarRespuestasProgramadas } from './services/ticket.service.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Init Firebase
initFirebase();
seedAgentsIfNeeded().catch(err => console.error('[seed] Error seeding agents:', err));
seedAreasIfNeeded().catch(err => console.error('[seed] Error seeding areas:', err));
seedKnowledgeIfNeeded().catch(err => console.error('[seed] Error seeding knowledge base:', err));
seedTarifasIfNeeded().catch(err => console.error('[seed] Error seeding tarifario:', err));
seedRecorridosIfNeeded().catch(err => console.error('[seed] Error seeding recorridos:', err));

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(s => s.trim()) : []),
].filter(Boolean);

// Sitio institucional (chat web, recorridos, tarifas, seguimiento de
// reclamos). CORS abierto y antes del cors restrictivo de abajo: el sitio
// puede vivir en cualquier dominio de la línea sin tocar FRONTEND_URL.
app.set('trust proxy', 1); // Railway: req.ip real para el rate-limit del chat
app.use('/api/public', cors(), express.json({ limit: '20kb' }), publicRoutes);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('CORS not allowed'));
  },
  credentials: true,
}));
app.use(morgan('dev'));

// Raw body para validación de firma Meta (debe ir antes del JSON parser)
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Routes (public)
app.use('/api/webhook', webhookRoutes);
app.use('/api/auth', authRoutes);
// Redirect de links cortos de difusiones — lo clickea el destinatario final
// desde WhatsApp, no un agente logueado, así que va sin requireAuth.
app.use('/r', redirectRoutes);

// Routes (protected)
// Operador can access: conversations (filtered), labels
// atencion_cliente + admin: all of the below
app.use('/api/conversations', requireAuth, conversationRoutes);
app.use('/api/labels', requireAuth, labelRoutes);

// Requires at least atencion_cliente
// Livianos y sin datos sensibles: los usa el panel de cualquier rol (operadores
// incluidos) para el nombre/color de marca y el contador de "esperando".
// Van antes de /api/config y /api/stats, que exigen atencion_cliente.
app.use('/api/config/brand',  requireAuth, brandRouter);
app.use('/api/stats/waiting', requireAuth, waitingRouter);

app.use('/api/knowledge',     requireAuth, requireAtLeastAtencionCliente, knowledgeRoutes);
app.use('/api/config',        requireAuth, requireAtLeastAtencionCliente, configRoutes);
// Un operador que atiende una conversación derivada necesita ver el perfil
// del cliente (contacto, notas) y poder actualizarlo — no es una acción de
// administración global como el resto de este bloque.
app.use('/api/customers',     requireAuth, customerRoutes);
app.use('/api/test',          requireAuth, requireAtLeastAtencionCliente, testRoutes);
app.use('/api/stats',         requireAuth, requireAtLeastAtencionCliente, statsRoutes);
app.use('/api/quick-replies', requireAuth, requireAtLeastAtencionCliente, quickReplyRoutes);
// Los operadores necesitan leer templates: Conversations.jsx los usa para el
// modal de "nueva conversación" (disponible para cualquier rol) — la
// restricción de escritura (crear/sincronizar/borrar) vive dentro del router.
app.use('/api/templates',     requireAuth, templateRoutes);
app.use('/api/costs',         requireAuth, requireAtLeastAtencionCliente, costsRoutes);
// El propio router ya restringe crear/editar/borrar a requireAdmin —
// la lectura la necesita cualquier operador para derivar conversaciones.
app.use('/api/areas',         requireAuth, areaRoutes);
// Sin restricción de rol adicional — cualquier agente autenticado puede ver,
// crear y responder reclamos (panel de Reclamos).
app.use('/api/reclamos',      requireAuth, ticketRoutes);
// Flota (internos válidos para tomar reclamos) y novedades (banner del sitio
// + contexto del bot). Lectura para cualquier agente; escritura dentro del router.
app.use('/api/unidades',      requireAuth, unidadRoutes);
app.use('/api/novedades',     requireAuth, novedadRoutes);
// Lectura abierta a cualquier rol autenticado; alta/baja/edición requiere admin.
app.use('/api/tarifas',       requireAuth, tarifaRoutes);
app.use('/api/recorridos',    requireAuth, recorridoRoutes);
// CVs que llegan desde "Trabajá con nosotros" del sitio.
app.use('/api/postulaciones', requireAuth, requireAtLeastAtencionCliente, postulacionRoutes);
app.use('/api/campaigns',     requireAuth, requireAtLeastAtencionCliente, campaignRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', service: 'bot-linea126' });
});

app.listen(PORT, () => {
  console.log(`[server] BOT-LINEA126 corriendo en puerto ${PORT}`);
});

// Cada 30 min: archiva las charlas que atendió solo el bot y quedaron
// inactivas (ver botAutoClose.js) para que cuenten como resueltas por el bot.
const runAutoClose = () => closeIdleBotConversations().catch(err => console.error('[autoClose] Error:', err.message));
setTimeout(runAutoClose, 2 * 60 * 1000);
setInterval(runAutoClose, 30 * 60 * 1000);

// Cada 5 min: respuesta diferida de los reclamos comunes (ver reclamoRespuesta.js).
const runRespuestas = () => enviarRespuestasProgramadas().catch(err => console.error('[reclamos] Error respuestas programadas:', err.message));
setTimeout(runRespuestas, 60 * 1000);
setInterval(runRespuestas, 5 * 60 * 1000);

export default app;
