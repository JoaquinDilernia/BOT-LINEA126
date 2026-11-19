import { test } from 'node:test';
import assert from 'node:assert/strict';
import { programarRespuestaAt, normalizarHorarios, describirViaje, renderRespuesta, DEFAULT_RESPUESTA_COMUN } from './reclamoRespuesta.js';

// Hora AR = UTC-3.
const ar = (iso) => new Date(`${iso}-03:00`);

// random fijo: el primer valor elige el horario, el segundo los minutos de más
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test('programarRespuestaAt: al día siguiente, en el horario que toca, sin minutos extra', () => {
  assert.equal(programarRespuestaAt(ar('2026-11-04T10:00:00'), ['10:00', '13:00', '16:30'], seq(0, 0)).getTime(), ar('2026-11-05T10:00:00').getTime());
  assert.equal(programarRespuestaAt(ar('2026-11-04T10:00:00'), ['10:00', '13:00', '16:30'], seq(0.5, 0)).getTime(), ar('2026-11-05T13:00:00').getTime());
});

test('programarRespuestaAt suma hasta 25 minutos al azar', () => {
  assert.equal(programarRespuestaAt(ar('2026-11-04T10:00:00'), ['10:00', '13:00', '16:30'], seq(0.99, 0.3)).getTime(), ar('2026-11-05T16:37:00').getTime());
  assert.equal(programarRespuestaAt(ar('2026-11-04T10:00:00'), ['10:00'], seq(0, 0.999)).getTime(), ar('2026-11-05T10:25:00').getTime());
});

test('programarRespuestaAt usa el día argentino: un reclamo de las 23:30 sale el día siguiente, no dos días después', () => {
  assert.equal(programarRespuestaAt(ar('2026-11-04T23:30:00'), ['10:00'], seq(0, 0)).getTime(), ar('2026-11-05T10:00:00').getTime());
  assert.equal(programarRespuestaAt(ar('2026-11-05T01:00:00'), ['10:00'], seq(0, 0)).getTime(), ar('2026-11-06T10:00:00').getTime());
  assert.equal(programarRespuestaAt(ar('2026-11-30T12:00:00'), ['10:00'], seq(0, 0)).getTime(), ar('2026-12-01T10:00:00').getTime());
});

test('programarRespuestaAt nunca pasa de las 18', () => {
  assert.equal(programarRespuestaAt(ar('2026-11-04T10:00:00'), ['17:50'], seq(0, 0.999)).getTime(), ar('2026-11-05T18:00:00').getTime());
});

test('programarRespuestaAt siempre cae entre las 9 y las 18 del día siguiente', () => {
  for (let i = 0; i < 500; i++) {
    const d = programarRespuestaAt(ar('2026-11-04T15:00:00'));
    const h = new Date(d.getTime() - 3 * 3600e3);
    const min = h.getUTCHours() * 60 + h.getUTCMinutes();
    assert.equal(h.getUTCDate(), 5);
    assert.ok(min >= 9 * 60 && min <= 18 * 60, String(d));
  }
});

test('normalizarHorarios descarta lo inválido o fuera de 9–18 y ordena', () => {
  assert.deepEqual(normalizarHorarios(['16:30', '9:05', '8:00', '19:00', 'hola', '', '16:30']), ['09:05', '16:30']);
  assert.deepEqual(normalizarHorarios([]), ['10:00', '13:00', '16:30']);
  assert.deepEqual(normalizarHorarios(undefined), ['10:00', '13:00', '16:30']);
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
