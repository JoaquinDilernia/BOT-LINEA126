// Mails al pasajero vía la API HTTP de Resend (Railway bloquea el SMTP
// saliente fuera del plan Pro). El dominio de MAIL_FROM tiene que estar
// verificado en Resend. Sin RESEND_API_KEY no se manda nada (se loguea).
//   RESEND_API_KEY=re_...
//   MAIL_FROM="Línea 126 <info@techdi.com.ar>"
//   SITE_URL=https://...   (links a "Seguí tu reclamo" y al chat)
// Los mails no reciben respuestas: el pasajero sigue por el chat del sitio.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Normaliza y valida un mail. Devuelve '' si no es válido. */
export function normalizeEmail(value) {
  const v = String(value ?? '').trim().toLowerCase().replace(/^mailto:/, '');
  return EMAIL_RE.test(v) && v.length <= 120 ? v : '';
}

export const mailEnabled = () => !!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Tildes, ñ, °, —: como entidades numéricas, así el HTML se ve bien aunque el
// cliente de correo ignore el charset (pasaba: "LÃ­nea 126").
const toAscii = (s) => s.replace(/[^\x00-\x7f]/gu, c => `&#${c.codePointAt(0)};`);

// El texto de la plantilla usa *negrita* estilo WhatsApp: se pasa a <b>.
function textToHtml(texto) {
  return esc(texto)
    .replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 16px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** Arma asunto, HTML y texto plano de la respuesta a un reclamo. */
// El sitio usa HashRouter: los parámetros van antes del #.
export function buildReclamoEmail({ numero, texto }, { siteUrl = process.env.SITE_URL } = {}) {
  const base = siteUrl ? siteUrl.replace(/\/$/, '') : '';
  const q = encodeURIComponent(numero);
  const link = base ? `${base}/?reclamo=${q}#/reclamos` : '';
  const chatLink = base ? `${base}/?chat=1&reclamo=${q}#/reclamos` : '';
  const subject = `Respuesta a tu reclamo N° ${numero} — Línea 126`;
  const boton = chatLink
    ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#d7141a;border-radius:8px"><a href="${esc(chatLink)}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:15px">Ir al chat de la 126</a></td></tr></table>`
    : '';
  const html = toAscii(`<!doctype html><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#d7141a;padding:20px 28px;color:#ffffff;font-size:22px;font-weight:bold">Línea 126</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.55">${textToHtml(texto)}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;width:100%"><tr><td style="padding:14px 16px;font-size:14px">N° de reclamo: <b>${esc(numero)}</b>${link ? `<br><a href="${esc(link)}" style="color:#d7141a">Seguí tu reclamo en el sitio</a>` : ''}</td></tr></table>
<p style="margin:20px 0 12px;font-size:14px;color:#4b5563">Este mail es automático y <b>no recibe respuestas</b>. Si necesitás algo más sobre tu reclamo, escribinos por el chat:</p>
${boton}
</td></tr>
<tr><td style="padding:16px 28px;font-size:12px;color:#6b7280;border-top:1px solid #f0f0f0">Recibiste este mail porque hiciste un reclamo en la Línea 126. Por favor no respondas a este correo.</td></tr>
</table></td></tr></table></body></html>`);
  const text = `${texto.replace(/\*([^*\n]+)\*/g, '$1')}\n\nN° de reclamo: ${numero}${link ? `\nSeguí tu reclamo: ${link}` : ''}\n\nEste mail es automático y no recibe respuestas.${chatLink ? ` Si necesitás algo más, escribinos por el chat: ${chatLink}` : ''}`;
  return { subject, html, text };
}

export async function sendMail({ to, subject, html, text, replyTo, attachments }, fetchFn = fetch) {
  if (!mailEnabled()) throw new Error('Mail no configurado (faltan RESEND_API_KEY / MAIL_FROM)');
  const res = await fetchFn('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject, html, text,
      ...(replyTo && { reply_to: replyTo }),
      ...(attachments?.length && { attachments }),
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Resend ${res.status}: ${data.message || data.name || 'no se pudo mandar el mail'}`);
  }
  return res.json();
}

/** Manda la respuesta de un reclamo por mail. Devuelve 'sent' | 'failed' | 'none'. */
export async function mailRespuestaReclamo(ticket, texto) {
  if (!ticket.email) return 'none';
  if (!mailEnabled()) { console.warn(`[mail] ${ticket.numero}: mail no configurado, no se manda`); return 'failed'; }
  try {
    await sendMail({ to: ticket.email, ...buildReclamoEmail({ numero: ticket.numero, texto }) });
    console.log(`[mail] Respuesta de ${ticket.numero} enviada a ${ticket.email}`);
    return 'sent';
  } catch (err) {
    console.error(`[mail] Error mandando ${ticket.numero}:`, err.message);
    return 'failed';
  }
}

// --- Avisos internos a la empresa ---------------------------------------------
// Además de quedar en el panel, cada reclamo que entra y cada postulación
// (con el CV adjunto) se avisa por mail a la casilla de la empresa.
//   MAIL_RECLAMOS_TO / MAIL_POSTULACIONES_TO  (separados por coma; tienen default)
const DEFAULT_RECLAMOS_TO = 'linea126.adm@gmail.com';
const DEFAULT_POSTULACIONES_TO = 'linea126.rrhh@gmail.com';
const destinos = (value, fallback) => String(value || fallback).split(',').map(normalizeEmail).filter(Boolean);
export const reclamosTo = () => destinos(process.env.MAIL_RECLAMOS_TO, DEFAULT_RECLAMOS_TO);
export const postulacionesTo = () => destinos(process.env.MAIL_POSTULACIONES_TO, DEFAULT_POSTULACIONES_TO);

const filled = ([, v]) => v !== undefined && v !== null && String(v).trim() !== '';
const nl2br = (s) => esc(s).replace(/\n/g, '<br>');
const caja = (titulo, contenido, color = '#f9fafb', borde = '#e5e7eb') =>
  `<p style="margin:18px 0 6px;color:#6b7280">${esc(titulo)}</p><div style="background:${color};border:1px solid ${borde};border-radius:8px;padding:12px 14px">${contenido}</div>`;

function fichaHtml(titulo, filas, cuerpo = '') {
  const rows = filas.filter(filled)
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-weight:bold">${nl2br(v)}</td></tr>`)
    .join('');
  return toAscii(`<!doctype html><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta charset="utf-8"></head><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#d7141a;padding:18px 28px;color:#ffffff;font-size:20px;font-weight:bold">${esc(titulo)}</td></tr>
<tr><td style="padding:24px 28px;font-size:14px;line-height:1.5"><table role="presentation" cellpadding="0" cellspacing="0">${rows}</table>${cuerpo}</td></tr>
<tr><td style="padding:14px 28px;font-size:12px;color:#6b7280;border-top:1px solid #f0f0f0">Aviso automático del sitio de la Línea 126. Todo queda registrado también en el panel.</td></tr>
</table></td></tr></table></body></html>`);
}

const fichaText = (titulo, filas, extra = '') =>
  `${titulo}\n\n${filas.filter(filled).map(([k, v]) => `${k}: ${v}`).join('\n')}${extra ? `\n\n${extra}` : ''}`;

const fechaAR = (d) => new Date(d ?? Date.now()).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' });

/** Mail a la empresa con un reclamo nuevo. */
export function buildAvisoReclamoEmail(t, { categoriaLabel = t.categoria } = {}) {
  const grave = t.gravedad === 'grave';
  const subject = `${grave ? '[GRAVE] ' : ''}Reclamo ${t.numero} — ${categoriaLabel}${t.numeroUnidad ? ` — interno ${t.numeroUnidad}` : ''}`;
  const filas = [
    ['N° de reclamo', t.numero],
    ['Fecha', fechaAR(t.createdAt)],
    ['Gravedad', grave ? 'GRAVE — hay que responderlo a mano desde el panel' : 'Común — se le responde solo al pasajero'],
    ['Categoría', categoriaLabel],
    ['Título', t.titulo],
    ['Interno', t.numeroUnidad],
    ['Ramal', t.ramal],
    ['Lugar', t.lugarHecho],
    ['Hora del hecho', t.horaHecho],
    ['Email del pasajero', t.email],
    ['Canal', t.canal === 'web' ? 'Chat del sitio' : t.canal === 'whatsapp' ? 'WhatsApp' : t.canal],
    ['Fotos', t.imagenes?.length ? `${t.imagenes.length} (verlas en el panel)` : ''],
  ];
  const cuerpo = t.descripcion ? caja('Descripción', nl2br(t.descripcion)) : '';
  const titulo = `Nuevo reclamo ${t.numero}`;
  return { subject, html: fichaHtml(titulo, filas, cuerpo), text: fichaText(titulo, filas, t.descripcion ? `Descripción:\n${t.descripcion}` : '') };
}

/** Mail a RRHH con una postulación nueva (el CV va adjunto aparte). */
export function buildAvisoPostulacionEmail(p, analisis = null) {
  const ok = analisis?.status === 'ok';
  const subject = `Postulación: ${p.nombre} — ${p.puesto}${ok ? ` (puntaje IA ${analisis.score}/100)` : ''}`;
  const filas = [
    ['Nombre', p.nombre],
    ['Puesto', p.puesto],
    ['Email', p.email],
    ['Teléfono', p.telefono],
    ['Licencia', p.licencia],
    ['Zona', p.zona],
    ['Link al CV', p.cvUrl],
    ['CV adjunto', p.cv ? p.cv.nombre : 'No adjuntó PDF'],
    ['Fecha', fechaAR(p.createdAt)],
  ];
  let cuerpo = p.mensaje ? caja('Mensaje', nl2br(p.mensaje)) : '';
  let extra = p.mensaje ? `Mensaje:\n${p.mensaje}` : '';
  if (ok) {
    const det = `<b>Puntaje: ${esc(analisis.score)}/100</b><br>${nl2br(analisis.resumen)}${analisis.motivo ? `<br><br>${nl2br(analisis.motivo)}` : ''}${analisis.alertas?.length ? `<br><br>Alertas: ${esc(analisis.alertas.join(' · '))}` : ''}`;
    cuerpo += caja('Análisis con IA (orientativo)', det, '#fff7ed', '#fed7aa');
    extra += `${extra ? '\n\n' : ''}Análisis IA: ${analisis.score}/100 — ${analisis.resumen}`;
  }
  cuerpo += '<p style="margin:18px 0 0;color:#4b5563">Si respondés este mail, la respuesta le llega al postulante.</p>';
  return { subject, html: fichaHtml('Nueva postulación', filas, cuerpo), text: fichaText('Nueva postulación', filas, extra) };
}

/** Avisa un reclamo nuevo a la empresa. Nunca tira: 'sent' | 'failed' | 'off'. */
export async function avisarReclamo(ticket, opts, fetchFn = fetch) {
  const to = reclamosTo();
  if (!to.length || !mailEnabled()) return 'off';
  try {
    await sendMail({ to, ...buildAvisoReclamoEmail(ticket, opts) }, fetchFn);
    console.log(`[mail] Aviso de ${ticket.numero} enviado a ${to.join(', ')}`);
    return 'sent';
  } catch (err) {
    console.error(`[mail] No se avisó el reclamo ${ticket.numero}:`, err.message);
    return 'failed';
  }
}

/** Avisa una postulación nueva a RRHH, con el PDF adjunto. Nunca tira. */
export async function avisarPostulacion(postulacion, cvBuffer = null, analisis = null, fetchFn = fetch) {
  const to = postulacionesTo();
  if (!to.length || !mailEnabled()) return 'off';
  const attachments = cvBuffer && postulacion.cv
    ? [{ filename: postulacion.cv.nombre, content: Buffer.from(cvBuffer).toString('base64') }]
    : [];
  try {
    await sendMail({ to, replyTo: normalizeEmail(postulacion.email) || undefined, attachments, ...buildAvisoPostulacionEmail(postulacion, analisis) }, fetchFn);
    console.log(`[mail] Postulación de ${postulacion.nombre} enviada a ${to.join(', ')}`);
    return 'sent';
  } catch (err) {
    console.error(`[mail] No se avisó la postulación de ${postulacion.nombre}:`, err.message);
    return 'failed';
  }
}
