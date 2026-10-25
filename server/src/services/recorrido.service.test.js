import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsearParadas, calcularTarifa, formatRecorridoParaPrompt } from './recorrido.service.js';
import { RECORRIDOS_126 } from '../data/linea126.js';

test('parsearParadas: encabezados de sección + paradas', () => {
  const txt = `=== Sección 1: Saavedra ===
Av. Maipú y Paraná
Av. Cabildo y Correa
=== Sección 2: Belgrano ===
Av. Cabildo y Juramento`;
  assert.deepEqual(parsearParadas(txt), [
    { orden: 1, nombre: 'Av. Maipú y Paraná', seccion: 1 },
    { orden: 2, nombre: 'Av. Cabildo y Correa', seccion: 1 },
    { orden: 3, nombre: 'Av. Cabildo y Juramento', seccion: 2 },
  ]);
});

test('parsearParadas: parada antes del primer encabezado -> sección 1', () => {
  assert.deepEqual(parsearParadas('Parada suelta\n=== Sección 2 ===\nOtra'), [
    { orden: 1, nombre: 'Parada suelta', seccion: 1 },
    { orden: 2, nombre: 'Otra', seccion: 2 },
  ]);
});

test('parsearParadas: ignora líneas vacías y espacios; acepta "Seccion" sin acento ni ":"', () => {
  assert.deepEqual(parsearParadas('\n=== SECCION 3 ===\n\n   Parada X   \n'), [
    { orden: 1, nombre: 'Parada X', seccion: 3 },
  ]);
});

test('parsearParadas: vacío -> []', () => {
  assert.deepEqual(parsearParadas(''), []);
  assert.deepEqual(parsearParadas(null), []);
});

const RECORRIDO = {
  cuadroTarifario: [
    { hastaSeccion: 1, precio: 490 },
    { hastaSeccion: 2, precio: 545 },
    { hastaSeccion: 3, precio: 585 },
    { hastaSeccion: 4, precio: 625 },
  ],
};

test('calcularTarifa: mismo sección = 1 sección', () => {
  assert.deepEqual(calcularTarifa(RECORRIDO, 2, 2), { seccionesCruzadas: 1, precio: 490 });
});

test('calcularTarifa: de sección 1 a 4 = 4 secciones', () => {
  assert.deepEqual(calcularTarifa(RECORRIDO, 1, 4), { seccionesCruzadas: 4, precio: 625 });
});

test('calcularTarifa: simétrico (origen > destino)', () => {
  assert.deepEqual(calcularTarifa(RECORRIDO, 3, 1), { seccionesCruzadas: 3, precio: 585 });
});

test('calcularTarifa: excede el cuadro -> última fila', () => {
  assert.deepEqual(calcularTarifa({ cuadroTarifario: [{ hastaSeccion: 1, precio: 100 }, { hastaSeccion: 2, precio: 200 }] }, 1, 5), { seccionesCruzadas: 5, precio: 200 });
});

test('calcularTarifa: cuadro vacío o secciones inválidas -> null', () => {
  assert.equal(calcularTarifa({ cuadroTarifario: [] }, 1, 2), null);
  assert.equal(calcularTarifa(RECORRIDO, 'x', 2), null);
});

test('formatRecorridoParaPrompt: sin paradas -> ""', () => {
  assert.equal(formatRecorridoParaPrompt({ nombre: 'X', paradas: { ida: [], vuelta: [] } }), '');
});

test('formatRecorridoParaPrompt: incluye cuadro y paradas por sección', () => {
  const r = {
    nombre: 'Saavedra ⇄ Retiro', lineaNombre: 'Línea 999', descripcion: 'Test.',
    secciones: [{ numero: 1, nombre: 'A' }, { numero: 2, nombre: 'B' }],
    cuadroTarifario: [{ hastaSeccion: 1, precio: 490 }, { hastaSeccion: 2, precio: 545 }],
    paradas: {
      ida: [{ orden: 1, nombre: 'P1', seccion: 1 }, { orden: 2, nombre: 'P2', seccion: 2 }],
      vuelta: [{ orden: 1, nombre: 'P2', seccion: 2 }, { orden: 2, nombre: 'P3', seccion: 1 }],
    },
  };
  const out = formatRecorridoParaPrompt(r);
  assert.match(out, /Línea 999 — Saavedra ⇄ Retiro/);
  assert.match(out, /Sección 1 \(A\): hasta acá \$490/);
  assert.match(out, /S1: P1, P3/);
  assert.match(out, /S2: P2/);
});

test('seed Línea 126: estructura válida', () => {
  assert.equal(RECORRIDOS_126.length, 2);
  for (const r of RECORRIDOS_126) {
    assert.equal(r.secciones.length, 9);
    assert.equal(r.cuadroTarifario.length, 9);
    assert.ok(r.paradas.ida.length > 20 && r.paradas.vuelta.length > 20, r.nombre);
    for (const p of [...r.paradas.ida, ...r.paradas.vuelta]) {
      assert.ok(p.seccion >= 1 && p.seccion <= 9, `sección inválida en ${p.nombre}`);
      assert.ok(Number.isFinite(p.lat) && Number.isFinite(p.lng), `coords inválidas en ${p.nombre}`);
    }
    // las cabeceras quedan en los tramos de punta
    assert.equal(r.paradas.ida[0].seccion, 9);
    assert.equal(r.paradas.ida.at(-1).seccion, 1);
  }
  const out = formatRecorridoParaPrompt(RECORRIDOS_126[0]);
  assert.match(out, /Línea 126 — Ramal A/);
  assert.match(out, /hasta acá \$742,81/);
});

test('calcularTarifa 126: Retiro → La Tablada es la tarifa máxima, un tramo es la mínima', () => {
  const a = RECORRIDOS_126[0];
  assert.equal(calcularTarifa(a, 9, 1).precio, 1151.36);
  assert.equal(calcularTarifa(a, 4, 4).precio, 742.81);
  assert.equal(calcularTarifa(a, 6, 8).precio, 1002.8);
});
