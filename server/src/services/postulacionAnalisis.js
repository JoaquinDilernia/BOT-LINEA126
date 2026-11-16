import Anthropic from '@anthropic-ai/sdk';

// Análisis de postulaciones con IA (como el de PMC): resumen del perfil y un
// puntaje 0-100 de qué tan bien encaja con el puesto al que se postuló.
// Lee el CV en PDF si lo hay; si no, analiza sólo lo que escribió en el form.
const MODEL = process.env.CV_ANALYSIS_MODEL || 'claude-opus-5-5';

// Qué mira RRHH en cada puesto (mismo texto que la web).
export const REQUISITOS = {
  'Chofer': 'Licencia profesional D1 o superior vigente, libreta sanitaria y experiencia en transporte de pasajeros (colectivos, micros, combis). Suma: conocer la zona oeste del conurbano / CABA, buen trato con el pasajero.',
  'Mecánico/a': 'Experiencia en mantenimiento de unidades de transporte pesado: motor, frenos, electricidad o carrocería. Suma: experiencia en talleres de líneas de colectivos, formación técnica.',
  'Administración': 'Atención al pasajero, recursos humanos, tráfico y tareas administrativas en la sede de La Tablada. Suma: manejo de Excel/sistemas, experiencia en atención al público.',
  'Otro': 'Puesto no especificado: evaluá el perfil en general para una empresa de transporte de pasajeros.',
};

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['resumen', 'score', 'motivo', 'puestoSugerido', 'aniosExperiencia', 'licencia', 'alertas'],
  properties: {
    resumen: { type: 'string', description: '2-3 líneas sobre el perfil del candidato' },
    score: { type: 'integer', description: '0-100: qué tan bien encaja con el puesto al que se postuló' },
    motivo: { type: 'string', description: '1 línea que justifique el puntaje' },
    puestoSugerido: { type: 'string', enum: ['Chofer', 'Mecánico/a', 'Administración', 'Otro'] },
    aniosExperiencia: { type: ['integer', 'null'] },
    licencia: { type: ['string', 'null'], description: 'Licencia de conducir que figura (ej. D1), o null' },
    alertas: { type: 'array', items: { type: 'string' }, description: 'Faltantes o inconsistencias importantes (ej. sin licencia profesional para chofer). Vacío si no hay.' },
  },
};

export function buildPrompt(p, conCv) {
  return `Sos asistente de Recursos Humanos de la Línea 126 de colectivos (Cárdenas S.A., La Tablada). Evaluá esta postulación.

Puesto al que se postuló: ${p.puesto}
Requisitos del puesto: ${REQUISITOS[p.puesto] ?? REQUISITOS.Otro}

Datos que cargó en el formulario:
- Nombre: ${p.nombre}
- Zona donde vive: ${p.zona || '(no indicó)'}
- Licencia de conducir: ${p.licencia || '(no indicó)'}
- Mensaje: ${p.mensaje || '(sin mensaje)'}

${conCv ? 'Su CV está adjunto en PDF.' : 'No adjuntó CV: evaluá sólo con los datos del formulario y bajá el puntaje si falta información clave.'}

Reglas: no inventes datos que no estén (usá null). El puntaje mide el encaje con el puesto al que se postuló; si encaja mejor en otro, indicalo en puestoSugerido. Escribí en español rioplatense, breve y concreto.`;
}

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

/** Nunca tira: si falla devuelve { status: 'error' } y la postulación queda visible igual. */
export async function analizarPostulacion(p, cvBuffer = null) {
  try {
    const content = [];
    if (cvBuffer) content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: cvBuffer.toString('base64') } });
    content.push({ type: 'text', text: buildPrompt(p, !!cvBuffer) });

    const client = new Anthropic();
    const msg = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content }],
    });
    if (msg.stop_reason === 'refusal') return { status: 'error', error: 'La IA no pudo analizar este CV.', model: MODEL };
    const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const r = JSON.parse(text);
    return {
      status: 'ok',
      resumen: String(r.resumen ?? ''),
      score: clamp(r.score),
      motivo: String(r.motivo ?? ''),
      puestoSugerido: r.puestoSugerido ?? null,
      aniosExperiencia: Number.isInteger(r.aniosExperiencia) ? r.aniosExperiencia : null,
      licencia: r.licencia ?? null,
      alertas: Array.isArray(r.alertas) ? r.alertas.map(String).slice(0, 5) : [],
      conCv: !!cvBuffer,
      model: msg.model ?? MODEL,
    };
  } catch (err) {
    console.error('[postulaciones] Error analizando:', err.message);
    return { status: 'error', error: err.message, model: MODEL };
  }
}
