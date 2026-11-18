import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail, buildReclamoEmail } from './mail.service.js';

test('normalizeEmail limpia y valida', () => {
  assert.equal(normalizeEmail('  Juan.Perez@Gmail.com '), 'juan.perez@gmail.com');
  assert.equal(normalizeEmail('mailto:a@b.com.ar'), 'a@b.com.ar');
  assert.equal(normalizeEmail('juan@gmail'), '');
  assert.equal(normalizeEmail('no tengo'), '');
  assert.equal(normalizeEmail(''), '');
});

test('buildReclamoEmail pasa *negrita* a <b>, escapa HTML y agrega el link', () => {
  const { subject, html, text } = buildReclamoEmail({ numero: 'R126-000007', texto: 'Hola! Tu reclamo *N° R126-000007*.\n\nGracias <3' }, { siteUrl: 'https://l126.ar/' });
  assert.match(subject, /R126-000007/);
  assert.match(html, /<b>N&#176; R126-000007<\/b>/);
  assert.match(html, /Gracias &lt;3/);
  assert.ok(html.includes('https://l126.ar/?reclamo=R126-000007#/reclamos'));
  assert.ok(html.includes('?chat=1&amp;reclamo=R126-000007'));
  assert.match(html, /no recibe respuestas/);
  assert.doesNotMatch(text, /\*/);
});

test('buildReclamoEmail: HTML 100% ASCII con charset (tildes como entidades)', () => {
  const { html, text } = buildReclamoEmail({ numero: 'R126-000008', texto: 'Revisamos tu reclamo, señor. Disculpá.' }, { siteUrl: 'https://l126.ar' });
  assert.match(html, /<meta charset="utf-8">/);
  assert.doesNotMatch(html, /[^\x00-\x7f]/);
  assert.ok(html.includes('L&#237;nea 126'));
  assert.ok(html.includes('se&#241;or. Disculp&#225;.'));
  assert.ok(text.includes('señor. Disculpá.'));
});

test('buildAvisoReclamoEmail: ficha con los datos y [GRAVE] en el asunto', async () => {
  const { buildAvisoReclamoEmail } = await import('./mail.service.js');
  const { subject, html, text } = buildAvisoReclamoEmail({
    numero: 'R126-000010', gravedad: 'grave', titulo: 'Chofer agresivo', descripcion: 'Me gritó <feo>',
    numeroUnidad: '54', ramal: 'A', lugarHecho: 'Rivadavia y Acoyte', horaHecho: '8:30', email: 'a@b.com', canal: 'web',
    imagenes: [{ mediaId: 'x' }], createdAt: new Date('2026-11-18T12:00:00Z'),
  }, { categoriaLabel: 'Mal trato' });
  assert.equal(subject, '[GRAVE] Reclamo R126-000010 — Mal trato — interno 54');
  assert.doesNotMatch(html, /[^\x00-\x7f]/);
  assert.match(html, /Me grit&#243; &lt;feo&gt;/);
  assert.match(html, /Rivadavia y Acoyte/);
  assert.match(text, /Interno: 54/);
  assert.match(text, /Fotos: 1/);
});

test('avisarPostulacion manda el CV adjunto en base64 y reply_to al postulante', async () => {
  const { avisarPostulacion } = await import('./mail.service.js');
  process.env.RESEND_API_KEY = 're_test'; process.env.MAIL_FROM = 'L126 <info@x.com>';
  let body;
  const fetchFn = async (_url, opts) => { body = JSON.parse(opts.body); return { ok: true, json: async () => ({ id: '1' }) }; };
  const pdf = Buffer.from('%PDF-1.4 hola');
  const r = await avisarPostulacion({ nombre: 'Ana Gómez', email: 'Ana@Mail.com', telefono: '1155556666', puesto: 'Chofer', cv: { nombre: 'cv.pdf' } }, pdf, { status: 'ok', score: 80, resumen: 'Buena', alertas: [] }, fetchFn);
  delete process.env.RESEND_API_KEY; delete process.env.MAIL_FROM;
  assert.equal(r, 'sent');
  assert.deepEqual(body.to, ['linea126.rrhh@gmail.com']);
  assert.equal(body.reply_to, 'ana@mail.com');
  assert.equal(body.attachments[0].filename, 'cv.pdf');
  assert.equal(Buffer.from(body.attachments[0].content, 'base64').toString(), '%PDF-1.4 hola');
  assert.match(body.subject, /Ana Gómez — Chofer \(puntaje IA 80\/100\)/);
});

test('avisarReclamo va a la casilla de reclamos y no tira si Resend falla', async () => {
  const { avisarReclamo } = await import('./mail.service.js');
  process.env.RESEND_API_KEY = 're_test'; process.env.MAIL_FROM = 'L126 <info@x.com>';
  let body;
  const ok = await avisarReclamo({ numero: 'R1', titulo: 't' }, {}, async (_u, o) => { body = JSON.parse(o.body); return { ok: true, json: async () => ({}) }; });
  const fail = await avisarReclamo({ numero: 'R2', titulo: 't' }, {}, async () => ({ ok: false, status: 500, json: async () => ({}) }));
  delete process.env.RESEND_API_KEY; delete process.env.MAIL_FROM;
  assert.equal(ok, 'sent');
  assert.deepEqual(body.to, ['linea126.adm@gmail.com']);
  assert.equal(fail, 'failed');
});
