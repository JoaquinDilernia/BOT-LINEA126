// Respuesta diferida de los reclamos comunes: el pasajero recibe el número
// de reclamo al instante y, unas horas después, una respuesta "personalizada"
// armada con una plantilla y los datos del viaje (interno, ramal, hora,
// lugar). Que llegue un rato después y nombre su viaje hace que se sienta
// atendido por una persona y no por un contestador automático.
// Funciones puras acá; el envío vive en ticket.service.js.

export const DEFAULT_RESPUESTA_COMUN = `Hola! Te escribimos por tu reclamo *N° {numero}*.

Con los datos que nos pasaste ({viaje}) identificamos la unidad y al chofer que estaba a cargo del servicio. Se labró un acta con lo que nos contaste y el caso pasó al área de tráfico, que va a hablar con el chofer y hacer el seguimiento correspondiente.

Gracias por tomarte el tiempo de avisarnos: estos reportes nos ayudan a mejorar el servicio de la 126. 🚌`;

export const DEFAULT_DEMORA_HORAS = 3;
// No se le escribe a nadie de madrugada: lo que caería fuera de esta franja
// (hora argentina) se corre a la apertura.
export const HORA_DESDE = 8;
export const HORA_HASTA = 22;

const AR_OFFSET_MS = 3 * 60 * 60 * 1000; // Argentina es UTC-3 todo el año.

/** Cuándo mandar la respuesta: createdAt + demora, corrido a 8–22 h AR. */
export function programarRespuestaAt(createdAt, horas = DEFAULT_DEMORA_HORAS) {
  const h = Number.isFinite(Number(horas)) ? Math.min(Math.max(Number(horas), 0), 20) : DEFAULT_DEMORA_HORAS;
  const target = new Date(new Date(createdAt).getTime() + h * 60 * 60 * 1000);
  const ar = new Date(target.getTime() - AR_OFFSET_MS); // campos UTC = hora AR
  const hora = ar.getUTCHours();
  if (hora >= HORA_DESDE && hora < HORA_HASTA) return target;
  const apertura = new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), ar.getUTCDate(), HORA_DESDE, 0, 0));
  if (hora >= HORA_HASTA) apertura.setUTCDate(apertura.getUTCDate() + 1);
  return new Date(apertura.getTime() + AR_OFFSET_MS);
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
