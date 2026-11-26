import Anthropic from '@anthropic-ai/sdk';
import { TIPOS_NOVEDAD } from './novedad.service.js';

// "Boceto" de la pieza para redes de una novedad: los textos cortos que van
// en la imagen (historia de IG / estado de WhatsApp, post, cuadrado,
// horizontal). La imagen se dibuja en el panel con la plantilla de la línea;
// acá sólo se arma el texto. La IA resume, no dibuja: así las calles y los
// horarios salen tal cual se cargaron.
const MODEL = process.env.PIEZA_MODEL || 'claude-opus-5-5';

// Va debajo de un "MÁS INFO" fijo en la imagen.
export const CIERRE_DEFAULT = 'linea126.com.ar';
export const FONDOS = ['auto', 'rojo', 'negro', 'blanco'];

// Etiqueta corta del tipo, para el chip de la imagen.
export const ETIQUETAS = {
  desvio: 'Desvío',
  corte: 'Corte de calle',
  paro: 'Paro',
  servicio: 'Cambio de servicio',
  info: 'Aviso',
};

const LIMITES = { etiqueta: 24, titular: 70, bajada: 160, punto: 70, cuando: 60, cierre: 60 };
const MAX_PUNTOS = 4;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['titular', 'bajada', 'puntos', 'cuando'],
  properties: {
    titular: { type: 'string', description: 'Lo más importante, máximo 45 caracteres (va en letra muy grande, en mayúsculas)' },
    bajada: { type: 'string', description: '1 oración que explique, máximo 110 caracteres. Vacío si el titular alcanza.' },
    puntos: { type: 'array', items: { type: 'string' }, description: '0 a 3 datos concretos (ramal, tramo, calles, paradas afectadas), máximo 45 caracteres cada uno' },
    cuando: { type: 'string', description: 'Cuándo rige, legible (ej. "Sábado 28/11, de 8 a 18 h"). Vacío si no hay fechas.' },
  },
};

const cut = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const toDate = (v) => {
  if (!v) return null;
  const d = v?.toDate ? v.toDate() : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Partes de una fecha en hora de Argentina: { dia: 'sábado 28/11', hora: '08:00' }.
function partes(d) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d).map(x => [x.type, x.value]));
  return { dia: `${p.weekday} ${p.day}/${p.month}`, hora: `${p.hour}:${p.minute}` };
}
const fmtFecha = (d) => { const p = partes(d); return `${p.dia}, ${p.hora} h`; };
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Normaliza un boceto que viene del panel o de la IA (nunca confía en el largo). */
export function cleanPieza(p = {}) {
  const puntos = Array.isArray(p.puntos) ? p.puntos.map(x => cut(x, LIMITES.punto)).filter(Boolean).slice(0, MAX_PUNTOS) : [];
  return {
    etiqueta: cut(p.etiqueta, LIMITES.etiqueta),
    titular: cut(p.titular, LIMITES.titular),
    bajada: cut(p.bajada, LIMITES.bajada),
    puntos,
    cuando: cut(p.cuando, LIMITES.cuando),
    cierre: cut(p.cierre ?? CIERRE_DEFAULT, LIMITES.cierre),
    fondo: FONDOS.includes(p.fondo) ? p.fondo : 'auto',
  };
}

// "Sábado 28/11, de 08:00 a 18:00 h" — texto base para el "cuándo" cuando la
// IA no está disponible.
export function cuandoBase(n) {
  const desde = toDate(n.desde);
  const hasta = toDate(n.hasta);
  if (desde && hasta) {
    const a = partes(desde); const b = partes(hasta);
    if (a.dia === b.dia) return capital(`${a.dia}, de ${a.hora} a ${b.hora} h`);
    return `Del ${fmtFecha(desde)} al ${fmtFecha(hasta)}`;
  }
  if (desde) return `Desde el ${fmtFecha(desde)}`;
  if (hasta) return `Hasta el ${fmtFecha(hasta)}`;
  return '';
}

/** Boceto sin IA: lo cargado, tal cual. Es el respaldo si la IA falla. */
export function piezaBase(n = {}) {
  return cleanPieza({
    etiqueta: ETIQUETAS[n.tipo] ?? ETIQUETAS.info,
    titular: n.titulo,
    bajada: n.texto,
    puntos: [],
    cuando: cuandoBase(n),
  });
}

export function buildPrompt(n) {
  const desde = toDate(n.desde);
  const hasta = toDate(n.hasta);
  return `Sos quien maneja las redes de la Línea 126 de colectivos (Cárdenas S.A., Retiro ⇄ La Tablada). Con este aviso, escribí los textos de una imagen para historia de Instagram y estado de WhatsApp. La gente la mira 3 segundos desde el celular.

Tipo de aviso: ${TIPOS_NOVEDAD[n.tipo] ?? 'Aviso'}
Título cargado: ${n.titulo || '(sin título)'}
Detalle cargado: ${n.texto || '(sin detalle)'}
Desde: ${desde ? fmtFecha(desde) : '(sin fecha)'}
Hasta: ${hasta ? fmtFecha(hasta) : '(sin fecha)'}

Reglas:
- Usá SÓLO datos que estén arriba. No inventes calles, ramales, horarios ni motivos. Copiá nombres de calles, ramales y horarios exactamente como están.
- Titular directo, que se entienda solo (ej. "Ramal A desviado por obras").
- Puntos: datos concretos que el pasajero necesita (tramo, por dónde sigue, paradas sin servicio). Si no hay, dejá la lista vacía.
- "cuando" en formato corto y humano (ej. "Sábado 28/11, de 8 a 18 h"). Vacío si no hay fechas.
- Español rioplatense, sin emojis, sin hashtags, sin signos de exclamación.`;
}

/** Nunca tira: si la IA falla devuelve el boceto base con `ia: false`. */
export async function sugerirPieza(n = {}) {
  const base = piezaBase(n);
  try {
    const client = new Anthropic();
    const msg = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: buildPrompt(n) }],
    });
    if (msg.stop_reason === 'refusal') return { pieza: base, ia: false };
    const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const r = JSON.parse(text);
    const pieza = cleanPieza({ ...r, etiqueta: base.etiqueta, cierre: base.cierre, puntos: (r.puntos ?? []).slice(0, 3) });
    if (!pieza.titular) pieza.titular = base.titular;
    return { pieza, ia: true };
  } catch (err) {
    console.error('[novedad-pieza] IA no disponible, va el boceto base:', err.message);
    return { pieza: base, ia: false };
  }
}
