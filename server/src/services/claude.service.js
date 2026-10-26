import https from 'https';
import { getDb } from './firebase.service.js';

const MODEL = 'claude-sonnet-5';
// Caché de prompt: escribir cuesta 1.25x la entrada (TTL 5 min), leer 0.1x.
const PRICING = { inputPerMTok: 2.00, outputPerMTok: 10.00, cacheWritePerMTok: 2.50, cacheReadPerMTok: 0.20 };

// Sonnet 5 puede anteponer bloques `thinking` al texto: leer content[0].text
// a ciegas devuelve undefined y deja al cliente sin respuesta (incidente
// ALTORANCHO 2026-09-01). Se juntan sólo los bloques de texto.
function extractText(response) {
  return (response.content ?? [])
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
    .trim();
}

function logUsage(usage, type) {
  if (!usage?.input_tokens && !usage?.cache_read_input_tokens) return;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const costUSD =
    (usage.input_tokens / 1e6) * PRICING.inputPerMTok +
    (cacheWrite / 1e6) * PRICING.cacheWritePerMTok +
    (cacheRead / 1e6) * PRICING.cacheReadPerMTok +
    (usage.output_tokens / 1e6) * PRICING.outputPerMTok;
  getDb().collection('bot-linea126_usage_logs').add({
    service: 'claude',
    model: MODEL,
    inputTokens: usage.input_tokens, // sólo la parte NO cacheada
    cacheWriteTokens: cacheWrite,
    cacheReadTokens: cacheRead,
    outputTokens: usage.output_tokens,
    costUSD: Math.round(costUSD * 1e6) / 1e6,
    type,
    createdAt: new Date(),
  }).catch(err => console.error('[claude] Error logging usage to Firestore:', err.message));
}

// Este bot NO deriva a un humano en ningún caso — es el único canal de
// atención. No existe marcador de escalada ni instrucciones de "te paso
// con el equipo": el punto de venta del producto es justamente que el bot
// resuelve consultas y reclamos de punta a punta sin intervención humana.
function buildNoHumanInstructions() {
  return `
IMPORTANTE — NO HAY DERIVACIÓN A HUMANOS: Sos el único canal de atención, no existe un equipo al que "pasar" la conversación. Nunca digas que vas a derivar, transferir o pasar con un agente/persona — eso no existe acá. Si algo no lo podés resolver con la información que tenés, decilo con honestidad y ofrecé lo que sí podés hacer (por ejemplo, registrar un reclamo — ver más abajo).

IMPORTANTE — CIERRE: Si la consulta está completamente resuelta y el cliente se despidió, empezá tu respuesta con [CERRAR].
Ejemplo: "[CERRAR] ¡Con mucho gusto! Si necesitás algo más, escribinos cuando quieras."
Usá [CERRAR] solo cuando estés seguro de que la conversación terminó.`;
}

export const CATEGORIAS_PROMPT = 'demora|mal_trato|manejo_peligroso|unidad_mal_estado|cobro_indebido|objeto_perdido|no_realizo_parada|accidente|otro';

// El interno es obligatorio (pedido de la línea): sin él el reclamo no se
// puede atribuir a una unidad ni a un chofer. `internos` es la flota cargada
// en el panel, compactada ("1-120, 130"); vacía = todavía no la cargaron y
// sólo se exige que el pasajero dé un número.
function buildReclamoInstructions(businessName, { internos = '', categoriasSinInterno = ['objeto_perdido', 'otro'] } = {}) {
  const flota = internos
    ? `Números de interno VÁLIDOS de la flota: ${internos}. Si el pasajero da un número que no está en esta lista, decile con amabilidad que ese interno no figura en la flota de la línea y pedile que lo revise — NO registres el reclamo con un interno que no está en la lista.`
    : 'Todavía no hay una lista de internos cargada: alcanza con que el pasajero dé un número.';
  return `
IMPORTANTE — RECLAMOS: Cuando un pasajero reporta un reclamo (demora o falta de frecuencia, mal trato, manejo peligroso, accidente, unidad en mal estado, cobro indebido, no realizó la parada) o un objeto perdido, conversá primero para juntar un título breve y una descripción clara. NUNCA preguntes de qué línea o servicio se trata — este canal es exclusivamente de ${businessName}, ya se sabe. Para un reclamo sobre un viaje, preguntá SIEMPRE el lugar (parada, calle o zona), el horario aproximado y el ramal (letra del cartel: A, B, C, D, E o F) — sin esos datos no se puede identificar el viaje ni al chofer.
NÚMERO DE INTERNO — OBLIGATORIO: Para tomar un reclamo necesitás SÍ O SÍ el número de interno del colectivo (el número que está pintado en el frente, en los laterales, atrás y adentro cerca del chofer). Pedilo siempre. Si el pasajero no lo sabe, explicale dónde lo puede ver y que sin ese número no podemos registrar el reclamo; no lo registres sin interno. La única excepción son estas categorías, donde el interno es opcional: ${categoriasSinInterno.join(', ')}.
${flota}
Para un objeto perdido, priorizá una descripción clara del objeto y dónde/cuándo viajaba el pasajero. Si el pasajero menciona el legajo o el nombre del chofer, incluilo en la descripción. Antes o junto con el marcador, avisale EXPLÍCITAMENTE en tu texto que le estás registrando el reclamo en el sistema — nunca lo hagas en silencio. Recién ahí, en una línea separada (invisible para el cliente), agregá:
[CREAR_RECLAMO:{"titulo":"...","descripcion":"...","prioridad":"baja|media|alta|urgente","categoria":"${CATEGORIAS_PROMPT}","interno":"36","ramal":"A"}]
El JSON tiene que ser válido y tener exactamente esas 6 claves ("interno" y "ramal" van como texto; vacíos "" sólo si de verdad no aplican). La categoría la elegís vos según lo que más se ajuste a lo que cuenta el pasajero — usá "otro" solo si de verdad ninguna encaja. Si todavía no tenés información suficiente, seguí preguntando antes de usar el marcador — nunca lo generes con datos vacíos o inventados. Después de crear el reclamo el sistema le da al pasajero el número de reclamo y le dice cómo sigue — vos no inventes ni digas ningún número ni prometas plazos, eso lo agrega el sistema después de tu respuesta.`;
}

function callAnthropicAPIOnce(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
      },
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode !== 200) {
          const err = new Error(`Anthropic API ${res.statusCode}: ${data}`);
          err.statusCode = res.statusCode;
          err.retryAfter = res.headers['retry-after'];
          return reject(err);
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse Anthropic response: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const CLAUDE_MAX_RETRIES = 5;

async function callAnthropicAPI(payload) {
  let lastErr;
  for (let attempt = 1; attempt <= CLAUDE_MAX_RETRIES; attempt++) {
    try {
      return await callAnthropicAPIOnce(payload);
    } catch (err) {
      lastErr = err;
      const retryable = !err.statusCode || err.statusCode === 429 || err.statusCode === 529 || err.statusCode >= 500;
      if (!retryable || attempt === CLAUDE_MAX_RETRIES) throw err;
      const waitMs = err.retryAfter ? parseInt(err.retryAfter, 10) * 1000 : Math.min(1000 * 2 ** (attempt - 1), 15000);
      console.warn(`[claude] Retry ${attempt}/${CLAUDE_MAX_RETRIES} tras error: ${err.message} — esperando ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}

export async function generateConversationSummary(messages) {
  if (!messages?.length) return 'Sin mensajes para resumir.';
  const formatted = messages
    .map(m => {
      const who = m.role === 'user' ? 'Cliente' : m.role === 'admin' ? 'Agente' : 'Bot';
      return `${who}: ${m.content ?? ''}`;
    })
    .join('\n');

  const response = await callAnthropicAPI({
    model: MODEL,
    max_tokens: 350,
    system: 'Generás resúmenes breves de conversaciones de atención al cliente en español rioplatense. Respondés SOLO con el resumen, sin encabezados ni listas.',
    messages: [{
      role: 'user',
      content: `Generá un resumen de 2 a 4 oraciones de esta conversación. Incluí: el motivo principal de la consulta y cómo terminó (resuelto, derivado a agente, pendiente).\n\nConversación:\n${formatted}`,
    }],
  });
  logUsage(response.usage, 'summary');
  return extractText(response).trim();
}

export async function generateBotResponse(userMessage, conversationHistory, context = {}) {
  const { knowledgeBase = '', customerContext = null, availableLabels = [], botConfig = {}, imageData = null, tarifario = '', recorridos = '', reclamos = {}, novedades = '' } = context;

  const systemContent = buildSystemPrompt(botConfig, knowledgeBase, customerContext, availableLabels, tarifario, recorridos, { reclamos, novedades });
  const messages = buildMessages(conversationHistory, userMessage, imageData);

  const response = await callAnthropicAPI({
    model: MODEL,
    max_tokens: 1024,
    system: systemContent,
    messages,
  });

  logUsage(response.usage, 'bot_reply');
  return extractText(response);
}

export function buildSystemPrompt(botConfig = {}, knowledgeBase, customerContext, availableLabels = [], tarifario = '', recorridos = '', { reclamos = {}, novedades = '' } = {}) {
  const botName = botConfig.botName || 'Asistente';
  const businessName = botConfig.businessName || 'Línea 126';
  const personality = botConfig.botPersonality ||
    `Respondés de forma amigable, natural y cercana — como lo haría una persona real del equipo.
Usás un tono cálido y profesional. Nunca robótico ni genérico.
Escribís en español rioplatense (vos, etc.) con claridad.
Si no sabés algo, lo decís honestamente.
Nunca inventás información sobre servicios, precios, plazos, procesos o links — solo usás los datos que te den. Si algo no está en la información que tenés, lo decís honestamente en vez de inventar o suponer.`;

  let prompt = `Sos el asistente virtual de ${businessName}. Tu nombre es ${botName}.\n${personality}`;
  prompt += buildNoHumanInstructions();
  prompt += buildReclamoInstructions(businessName, reclamos);
  if (tarifario) {
    prompt += `\n\n--- CUADRO TARIFARIO (fuente de verdad para precios) ---\n${tarifario}`;
  }
  if (recorridos) {
    prompt += `\n\n--- RECORRIDOS Y SECCIONES ---\n${recorridos}`;
  }
  if (knowledgeBase) {
    prompt += `\n\n--- INFORMACIÓN DE LA EMPRESA ---\n${knowledgeBase}`;
    prompt += `\n\nIMPORTANTE — USO DE ESTA INFORMACIÓN: Es TU fuente de verdad sobre horarios, procesos y políticas. Para precios usá el bloque CUADRO TARIFARIO de arriba, y para recorridos/secciones usá el bloque RECORRIDOS Y SECCIONES de arriba (cuando estén presentes). Antes de responder CUALQUIER consulta, revisá esta sección completa primero. Si algo aplica, compartilo directamente aunque el cliente no lo pida explícitamente. Si la consulta no está cubierta acá, NUNCA inventes ni supongas una respuesta — decí honestamente que no tenés ese dato.`;
  }
  if (availableLabels.length) {
    prompt += `\n\n--- ETIQUETAS ---\nDEBÉS etiquetar SIEMPRE esta conversación con al menos 1 etiqueta usando [LABEL:nombre] en tu respuesta (invisible para el cliente).
Etiquetas disponibles: ${availableLabels.join(', ')}.
Si ninguna aplica, creá una nueva con [NEW_LABEL:nombre] (ej: [NEW_LABEL:Consulta técnica]).
Guía:
- [LABEL:Consulta] → preguntas de horarios, recorridos o tarifas.
- [LABEL:Recorridos] → cómo llegar, qué ramal tomar, dónde para.
- [LABEL:Tarifas] → cuánto sale el boleto, SUBE, descuentos.
- [LABEL:Reclamo] → queja, incidente o cobro indebido.
- [LABEL:Objeto perdido] → pasajero busca algo que se le olvidó en una unidad.
Podés combinar varias etiquetas si aplica.`;
  }

  // Caché de prompt: todo lo de arriba es igual para todos los contactos y va
  // en un bloque cacheado (~10% del costo); lo que depende del contacto va
  // aparte, al final. No meter nada variable en el primer bloque.
  const blocks = [{ type: 'text', text: prompt, cache_control: { type: 'ephemeral' } }];
  if (novedades) {
    blocks.push({ type: 'text', text: `--- NOVEDADES VIGENTES (desvíos, cortes, paros, avisos de la empresa) ---\n${novedades}\n\nIMPORTANTE — NOVEDADES: Son avisos cargados por la línea y tienen prioridad sobre los recorridos y horarios habituales. Si la consulta del pasajero (recorrido, parada, horario, cómo llegar) se ve afectada por alguna, avisale primero de la novedad y después respondé.` });
  }
  if (customerContext) blocks.push({ type: 'text', text: `--- PERFIL DEL CONTACTO ---\n${customerContext}` });
  return blocks;
}

function buildMessages(conversationHistory, newMessage, imageData = null) {
  const messages = [];
  if (conversationHistory?.length) {
    const recent = conversationHistory.slice(-10);
    for (const msg of recent) {
      const role = msg.role === 'user' ? 'user' : 'assistant';
      messages.push({ role, content: msg.content });
    }
  }
  if (imageData) {
    messages.push({
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: imageData.mimeType, data: imageData.base64 } },
        { type: 'text', text: newMessage || 'Describí esta imagen en el contexto de la consulta del cliente.' },
      ],
    });
  } else {
    messages.push({ role: 'user', content: newMessage });
  }
  return messages;
}
