// Respuesta diferida de los reclamos comunes: el pasajero recibe el número
// de reclamo al instante y, al día siguiente, una respuesta "personalizada"
// armada con una plantilla y los datos del viaje (interno, ramal, hora,
// lugar). Que llegue un rato después y nombre su viaje hace que se sienta
// atendido por una persona y no por un contestador automático.
// Funciones puras acá; el envío vive en ticket.service.js.

export const DEFAULT_RESPUESTA_COMUN = `Hola! Te escribimos por tu reclamo *N° {numero}*.

Con los datos que nos pasaste ({viaje}) identificamos la unidad y al chofer que estaba a cargo del servicio. Se labró un acta con lo que nos contaste y el caso pasó al área de tráfico, que va a hablar con el chofer y hacer el seguimiento correspondiente.

Gracias por tomarte el tiempo de avisarnos: estos reportes nos ayudan a mejorar el servicio de la 126. 🚌`;

// La respuesta sale AL DÍA SIGUIENTE, en horario de oficina, en uno de los
// horarios configurados elegido al azar y con unos minutos de más: así no
// llega siempre a la misma hora ni a la hora en punto, como pasaría con un
// contestador automático.
export const DEFAULT_HORARIOS_RESPUESTA = ['10:00', '13:00', '16:30'];
export const HORA_DESDE = 9;   // ventana permitida (hora argentina)
export const HORA_HASTA = 18;
export const MINUTOS_AZAR = 25; // se suman 0–25 min al horario elegido

const AR_OFFSET_MS = 3 * 60 * 60 * 1000; // Argentina es UTC-3 todo el año.
const aMin = (hhmm) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm).trim()); return m && Number(m[2]) < 60 ? Number(m[1]) * 60 + Number(m[2]) : null; };
const aHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Deja sólo horarios válidos dentro de 9–18 h, sin repetir y ordenados (máx. 5). Vacío → los de siempre. */
export function normalizarHorarios(lista) {
  const mins = [...new Set((Array.isArray(lista) ? lista : []).map(aMin).filter((m) => m !== null && m >= HORA_DESDE * 60 && m <= HORA_HASTA * 60))].sort((a, b) => a - b).slice(0, 5);
  return mins.length ? mins.map(aHHMM) : [...DEFAULT_HORARIOS_RESPUESTA];
}

/** Cuándo mandar la respuesta: el día siguiente al reclamo (hora AR), en un horario al azar + 0–25 min, sin pasar las 18. */
export function programarRespuestaAt(createdAt, horarios = DEFAULT_HORARIOS_RESPUESTA, random = Math.random) {
  const lista = normalizarHorarios(horarios);
  const base = aMin(lista[Math.min(Math.floor(random() * lista.length), lista.length - 1)]);
  const min = Math.min(base + Math.floor(random() * (MINUTOS_AZAR + 1)), HORA_HASTA * 60);
  const ar = new Date(new Date(createdAt).getTime() - AR_OFFSET_MS); // campos UTC = hora AR
  const dia = Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), ar.getUTCDate() + 1, Math.floor(min / 60), min % 60);
  return new Date(dia + AR_OFFSET_MS);
}

/** "el interno 36 del ramal A, cerca de las 18:30, en Av. Crovara 2500" — sólo con lo que haya. */
export function describirViaje({ numeroUnidad, ramal, horaHecho, lugarHecho } = {}) {
  const partes = [];
  if (numeroUnidad) partes.push(`el interno ${numeroUnidad}${ramal ? ` del ramal ${ramal}` : ''}`);
  else if (ramal) partes.push(`el ramal ${ramal}`);
  if (horaHecho) partes.push(/^\d/.test(horaHecho) ? `cerca de las ${horaHecho}` : horaHecho);
  if (lugarHecho) partes.push(`en ${lugarHecho}`);
  return partes.length ? partes.join(', ') : 'el viaje que nos contaste';
}

/**
 * Reemplaza {numero} {interno} {ramal} {hora} {lugar} {viaje} en la
 * plantilla. Un dato que falta queda como "—" salvo {viaje}, que se arma
 * sólo con lo que hay para que el texto nunca quede roto.
 */
export function renderRespuesta(plantilla, ticket) {
  const vars = {
    numero: ticket.numero ?? '',
    interno: ticket.numeroUnidad || '—',
    ramal: ticket.ramal || '—',
    hora: ticket.horaHecho || '—',
    lugar: ticket.lugarHecho || '—',
    viaje: describirViaje(ticket),
  };
  return String(plantilla ?? '').replace(/\{(numero|interno|ramal|hora|lugar|viaje)\}/gi, (_, k) => vars[k.toLowerCase()]);
}
