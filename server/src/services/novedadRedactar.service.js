import Anthropic from '@anthropic-ai/sdk';
import { TIPOS_NOVEDAD } from './novedad.service.js';
import { fmtFecha as fmt } from './novedadPieza.service.js';

// "Ordenar con IA" del detalle de una novedad: el equipo escribe como le sale
// (apurado, sin puntos, con abreviaturas) y la IA lo deja claro para el
// pasajero. Se usa en el banner del sitio y el asistente lo lee para
// responder, así que no puede agregar nada que no esté en lo cargado.
const MODEL = process.env.NOVEDAD_MODEL || 'claude-opus-5-5';

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['titulo', 'texto'],
  properties: {
    titulo: { type: 'string', description: 'Título corto para el banner, máximo 80 caracteres' },
    texto: { type: 'string', description: 'El detalle reescrito: 1 a 4 oraciones en un solo párrafo, sin saltos de línea' },
  },
};

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
// Un solo párrafo: el sitio lo muestra en un <p>.
const unParrafo = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export function buildRedactarPrompt(n = {}) {
  const desde = toDate(n.desde);
  const hasta = toDate(n.hasta);
  return `Sos quien escribe los avisos de la Línea 126 de colectivos (Cárdenas S.A., Retiro ⇄ La Tablada). Alguien del equipo cargó este aviso rápido y desprolijo. Reescribilo para que cualquier pasajero lo entienda de una, en el banner del sitio.

Tipo de aviso: ${TIPOS_NOVEDAD[n.tipo] ?? 'Aviso'}
Título cargado: ${n.titulo?.trim() || '(vacío)'}
Detalle cargado: ${n.texto?.trim() || '(vacío)'}
Desde: ${desde ? fmt(desde) : '(sin fecha)'}
Hasta: ${hasta ? fmt(hasta) : '(sin fecha)'}

Reglas:
- Usá SÓLO lo que está arriba. No inventes calles, ramales, paradas, horarios, motivos ni recomendaciones. Si algo no está claro, dejalo como está en vez de adivinar.
- Copiá exactamente nombres de calles, ramales, números de parada y horarios (sólo corregí mayúsculas y tildes obvias, ej. "av directorio" → "Av. Directorio").
- Desarmá abreviaturas comunes ("x" → "por", "q" → "que", "esq" → "esquina", "hs" → "h").
- Detalle: 1 a 4 oraciones cortas en un solo párrafo, sin saltos de línea, sin viñetas. Primero qué pasa y dónde, después por dónde sigue el colectivo y qué paradas no tienen servicio, si eso está.
- No repitas las fechas en el detalle si ya están en "Desde" / "Hasta" (el sitio las muestra aparte), salvo que el detalle tenga un horario distinto.
- Título: si el cargado está bien, devolvelo igual o con mínimas correcciones. Si está vacío o es confuso, armá uno corto y directo (ej. "Ramal A desviado por obras en Av. Directorio").
- Español rioplatense, tono claro y amable, sin emojis, sin hashtags, sin signos de exclamación.`;
}

/** Devuelve { titulo, texto, ia }. Si la IA falla, devuelve lo cargado tal cual con ia: false. */
export async function redactarNovedad(n = {}) {
  const original = { titulo: unParrafo(n.titulo, 140), texto: unParrafo(n.texto, 2000) };
  if (!original.texto && !original.titulo) return { ...original, ia: false };
  try {
    const client = new Anthropic();
    const msg = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: buildRedactarPrompt(n) }],
    });
    if (msg.stop_reason === 'refusal') return { ...original, ia: false };
    const r = JSON.parse(msg.content.filter(b => b.type === 'text').map(b => b.text).join(''));
    return {
      titulo: unParrafo(r.titulo, 140) || original.titulo,
      texto: unParrafo(r.texto, 2000) || original.texto,
      ia: true,
    };
  } catch (err) {
    console.error('[novedad-redactar] IA no disponible:', err.message);
    return { ...original, ia: false };
  }
}
