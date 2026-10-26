import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateReclamos, monthKey } from './reclamoStats.js';
import { parseInternos, normalizeInterno, compactInternos } from './unidad.service.js';
import { isVigente } from './novedad.service.js';

test('monthKey usa la hora argentina', () => {
  // 1/11 01:30 UTC = 31/10 22:30 en Buenos Aires
  assert.equal(monthKey(new Date('2026-11-01T01:30:00Z')), '2026-10');
  assert.equal(monthKey({ _seconds: Date.parse('2026-10-15T12:00:00Z') / 1000 }), '2026-10');
  assert.equal(monthKey(null), null);
});

test('aggregateReclamos arma rankings por chofer, interno y ramal', () => {
  const r = aggregateReclamos([
    { categoria: 'no_realizo_parada', legajoChofer: '4521', numeroUnidad: '36', ramal: 'a', gravedad: 'comun', respuestas: [{ automatica: true }] },
    { categoria: 'no_realizo_parada', legajoChofer: '4521', numeroUnidad: '36', ramal: 'A', gravedad: 'comun' },
    { categoria: 'mal_trato', legajoChofer: '4521', numeroUnidad: '12', ramal: 'B', gravedad: 'grave' },
    { categoria: 'demora', numeroUnidad: '', ramal: 'B', origen: 'carga' },
  ]);
  assert.equal(r.total, 4);
  assert.equal(r.graves, 1);
  assert.equal(r.comunes, 3);
  assert.equal(r.automaticos, 1);
  assert.equal(r.deCarga, 1);
  assert.equal(r.sinChofer, 1);
  assert.equal(r.sinInterno, 1);
  assert.deepEqual(r.porChofer[0], { key: '4521', total: 3, categorias: { no_realizo_parada: 2, mal_trato: 1 }, principal: 'no_realizo_parada' });
  assert.equal(r.porInterno[0].key, '36');
  assert.deepEqual(r.porRamal.map(x => [x.key, x.total]), [['A', 2], ['B', 2]]);
});

test('parseInternos acepta rangos, listas y descarta basura', () => {
  assert.deepEqual(parseInternos('1-3, 36\n040 x 5-4'), ['1', '2', '3', '36', '40', '4', '5']);
  assert.equal(parseInternos('1-9999').length, 2000);
  assert.deepEqual(parseInternos('1-99999'), []);
  assert.equal(normalizeInterno('Interno 036'), '36');
  assert.equal(normalizeInterno('abc'), null);
  assert.equal(compactInternos(['1', '2', '3', '5', '7', '8']), '1-3, 5, 7-8');
});

test('isVigente respeta activo y la ventana de fechas', () => {
  const now = new Date('2026-10-26T12:00:00Z');
  assert.equal(isVigente({ activo: true }, now), true);
  assert.equal(isVigente({ activo: false }, now), false);
  assert.equal(isVigente({ desde: new Date('2026-10-27T00:00:00Z') }, now), false);
  assert.equal(isVigente({ hasta: new Date('2026-10-25T00:00:00Z') }, now), false);
  assert.equal(isVigente({ desde: new Date('2026-10-20T00:00:00Z'), hasta: new Date('2026-10-30T00:00:00Z') }, now), true);
});

test('validarInternoReclamo: obligatorio salvo categorías exentas, y contra la flota', async () => {
  const { validarInternoReclamo } = await import('./unidad.service.js');
  const ctx = { internos: new Set(['36', '40']), categoriasSinInterno: ['objeto_perdido', 'otro'] };
  assert.deepEqual(validarInternoReclamo({ interno: '036', categoria: 'mal_trato' }, ctx), { ok: true, interno: '36' });
  assert.deepEqual(validarInternoReclamo({ interno: '', categoria: 'mal_trato' }, ctx), { ok: false, motivo: 'falta' });
  assert.deepEqual(validarInternoReclamo({ interno: '999', categoria: 'demora' }, ctx), { ok: false, motivo: 'invalido', interno: '999' });
  assert.deepEqual(validarInternoReclamo({ interno: '', categoria: 'objeto_perdido' }, ctx), { ok: true, interno: '' });
  // Sin flota cargada alcanza con que haya un número.
  assert.deepEqual(validarInternoReclamo({ interno: '999', categoria: 'demora' }, { internos: new Set() }), { ok: true, interno: '999' });
});
