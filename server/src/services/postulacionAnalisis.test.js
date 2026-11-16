import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt, REQUISITOS } from './postulacionAnalisis.js';

const p = { nombre: 'Ana', puesto: 'Chofer', zona: '', licencia: 'D1', mensaje: '' };

test('buildPrompt: incluye requisitos del puesto y avisa si no hay CV', () => {
  const sinCv = buildPrompt(p, false);
  assert.match(sinCv, /D1 o superior/);
  assert.match(sinCv, /No adjuntó CV/);
  assert.match(buildPrompt(p, true), /CV está adjunto/);
});

test('buildPrompt: puesto desconocido usa los requisitos de Otro', () => {
  assert.ok(buildPrompt({ ...p, puesto: 'Gerente' }, true).includes(REQUISITOS.Otro));
});
