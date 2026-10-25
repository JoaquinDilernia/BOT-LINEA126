import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarPostulacion } from './postulacion.service.js';

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
