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
