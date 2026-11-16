import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarPostulacion, validarCv, CV_MAX_BYTES } from './postulacion.service.js';

const ok = { nombre: 'Ana Pérez', email: 'Ana@Mail.com ', telefono: '11 5555-1234', puesto: 'Chofer' };

test('validarPostulacion: normaliza email y respeta el puesto', () => {
  const d = validarPostulacion(ok);
  assert.equal(d.email, 'ana@mail.com');
  assert.equal(d.puesto, 'Chofer');
});

test('validarPostulacion: puesto desconocido cae en Otro', () => {
  assert.equal(validarPostulacion({ ...ok, puesto: 'Gerente' }).puesto, 'Otro');
});

test('validarPostulacion: rechaza datos faltantes o CV sin http', () => {
  assert.throws(() => validarPostulacion({ ...ok, email: 'x' }), /email/);
  assert.throws(() => validarPostulacion({ ...ok, telefono: '12' }), /teléfono/);
  assert.throws(() => validarPostulacion({ ...ok, cvUrl: 'javascript:alert(1)' }), /http/);
});

test('validarCv: acepta PDF real, rechaza otros archivos y los muy pesados', () => {
  const pdf = { buffer: Buffer.from('%PDF-1.7 ...'), size: 12, originalname: 'Mi CV (2026).pdf' };
  assert.deepEqual(validarCv(pdf), { nombre: 'Mi CV _2026_.pdf', size: 12 });
  assert.equal(validarCv(null), null);
  assert.throws(() => validarCv({ ...pdf, buffer: Buffer.from('PK\x03\x04docx') }), /PDF/);
  assert.throws(() => validarCv({ ...pdf, size: CV_MAX_BYTES + 1 }), /5 MB/);
  assert.equal(validarCv({ ...pdf, originalname: 'cv' }).nombre, 'cv.pdf');
});
