import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programarRespuestaAt, describirViaje, renderRespuesta, DEFAULT_RESPUESTA_COMUN } from './reclamoRespuesta.js';

// Hora AR = UTC-3.
const ar = (iso) => new Date(`${iso}-03:00`);

test('programarRespuestaAt suma la demora dentro del horario', () => {
  assert.equal(programarRespuestaAt(ar('2026-11-04T10:00:00'), 3).getTime(), ar('2026-11-04T13:00:00').getTime());
});

test('programarRespuestaAt corre a las 8 del día siguiente si cae de noche', () => {
  assert.equal(programarRespuestaAt(ar('2026-11-04T20:30:00'), 3).getTime(), ar('2026-11-05T08:00:00').getTime());
});

test('programarRespuestaAt corre a las 8 del mismo día si cae de madrugada', () => {
  assert.equal(programarRespuestaAt(ar('2026-11-05T01:00:00'), 3).getTime(), ar('2026-11-05T08:00:00').getTime());
});

test('describirViaje arma la frase sólo con los datos que hay', () => {
  assert.equal(describirViaje({ numeroUnidad: '36', ramal: 'A', horaHecho: '18:30', lugarHecho: 'Av. Crovara 2500' }),
    'el interno 36 del ramal A, cerca de las 18:30, en Av. Crovara 2500');
  assert.equal(describirViaje({ numeroUnidad: '36', horaHecho: 'ayer a la mañana' }), 'el interno 36, ayer a la mañana');
  assert.equal(describirViaje({}), 'el viaje que nos contaste');
});

test('renderRespuesta reemplaza las variables', () => {
  const t = { numero: 'R126-000012', numeroUnidad: '36', ramal: 'B', horaHecho: '7:15', lugarHecho: 'San Justo' };
  const txt = renderRespuesta(DEFAULT_RESPUESTA_COMUN, t);
  assert.match(txt, /R126-000012/);
  assert.match(txt, /el interno 36 del ramal B, cerca de las 7:15, en San Justo/);
  assert.doesNotMatch(txt, /\{/);
  assert.equal(renderRespuesta('{interno} / {lugar}', { numeroUnidad: '', lugarHecho: '' }), '— / —');
});
