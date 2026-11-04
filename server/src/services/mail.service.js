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
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#d7141a;padding:20px 28px;color:#ffffff;font-size:22px;font-weight:bold">Línea 126</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.55">${textToHtml(texto)}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;width:100%"><tr><td style="padding:14px 16px;font-size:14px">N° de reclamo: <b>${esc(numero)}</b>${link ? `<br><a href="${esc(link)}" style="color:#d7141a">Seguí tu reclamo en el sitio</a>` : ''}</td></tr></table>
<p style="margin:20px 0 12px;font-size:14px;color:#4b5563">Este mail es automático y <b>no recibe respuestas</b>. Si necesitás algo más sobre tu reclamo, escribinos por el chat:</p>
${boton}
</td></tr>
<tr><td style="padding:16px 28px;font-size:12px;color:#6b7280;border-top:1px solid #f0f0f0">Recibiste este mail porque hiciste un reclamo en la Línea 126. Por favor no respondas a este correo.</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${texto.replace(/\*([^*\n]+)\*/g, '$1')}\n\nN° de reclamo: ${numero}${link ? `\nSeguí tu reclamo: ${link}` : ''}\n\nEste mail es automático y no recibe respuestas.${chatLink ? ` Si necesitás algo más, escribinos por el chat: ${chatLink}` : ''}`;
  return { subject, html, text };
}

export async function sendMail({ to, subject, html, text }, fetchFn = fetch) {
  if (!mailEnabled()) throw new Error('Mail no configurado (faltan RESEND_API_KEY / MAIL_FROM)');
  const res = await fetchFn('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html, text }),
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
