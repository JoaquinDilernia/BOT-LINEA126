import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanPieza, piezaBase, cuandoBase, buildPrompt, CIERRE_DEFAULT } from './novedadPieza.service.js';

test('cleanPieza: recorta largos, saca puntos vacíos y pone el cierre por defecto', () => {
  const p = cleanPieza({ titular: 'x'.repeat(200), puntos: ['  Ramal A ', '', null, 'b', 'c', 'd', 'e'] });
  assert.equal(p.titular.length, 70);
  assert.deepEqual(p.puntos, ['Ramal A', 'b', 'c', 'd']);
  assert.equal(p.cierre, CIERRE_DEFAULT);
  assert.equal(p.fondo, 'auto');
  assert.equal(cleanPieza({ fondo: 'negro' }).fondo, 'negro');
  assert.equal(cleanPieza({ fondo: 'violeta' }).fondo, 'auto');
});

test('piezaBase: usa lo cargado y la etiqueta del tipo', () => {
  const p = piezaBase({ tipo: 'desvio', titulo: 'Ramal A desviado', texto: 'Sigue por Eva Perón.' });
  assert.equal(p.etiqueta, 'Desvío');
  assert.equal(p.titular, 'Ramal A desviado');
  assert.equal(p.bajada, 'Sigue por Eva Perón.');
  assert.equal(p.cuando, '');
});

test('piezaBase: tipo desconocido cae en "Aviso"', () => {
  assert.equal(piezaBase({ tipo: 'raro', titulo: 't' }).etiqueta, 'Aviso');
});

test('cuandoBase: arma el texto en hora de Argentina', () => {
  const t = cuandoBase({ desde: '2026-11-28T11:00:00Z', hasta: '2026-11-28T21:00:00Z' });
  assert.equal(t, 'Sábado 28/11, de 08:00 a 18:00 h');
  assert.equal(
    cuandoBase({ desde: '2026-11-28T11:00:00Z', hasta: '2026-11-29T21:00:00Z' }),
    'Del sábado 28/11, 08:00 h al domingo 29/11, 18:00 h'
  );
  assert.equal(cuandoBase({}), '');
});

test('buildPrompt: incluye lo cargado y la regla de no inventar', () => {
  const pr = buildPrompt({ tipo: 'corte', titulo: 'Corte en Directorio', texto: 'Entre Larrazábal y Escalada' });
  assert.match(pr, /Corte de calle/);
  assert.match(pr, /Entre Larrazábal y Escalada/);
  assert.match(pr, /No inventes/);
});
