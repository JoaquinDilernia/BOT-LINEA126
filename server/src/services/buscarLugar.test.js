import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseUsig, parseGeoref, parseNominatim, buscarLugar, dentroDeZona } from './buscarLugar.service.js';

test('parseUsig: esquina de CABA', () => {
  const r = parseUsig({ direccionesNormalizadas: [{ direccion: 'RIVADAVIA AV. y MEDRANO, CABA', coordenadas: { x: '-58.421014', y: '-34.611479' } }] });
  assert.deepEqual(r, { nombre: 'Rivadavia Av. y Medrano, CABA', lat: -34.611479, lng: -58.421014 });
});

test('parseGeoref: dirección de La Matanza', () => {
  const r = parseGeoref({ direcciones: [{ nomenclatura: 'AV INT CROVARA 4400, La Matanza, Buenos Aires', ubicacion: { lat: -34.699, lon: -58.540 } }] });
  assert.equal(r.nombre, 'Av Int Crovara 4400, La Matanza');
  assert.equal(r.lat, -34.699);
});

test('parseNominatim: lugar con nombre', () => {
  const r = parseNominatim([{ name: 'Hospital Santa Lucía', display_name: 'Hospital Santa Lucía, Av. San Juan, CABA', lat: '-34.6225', lon: '-58.3944' }]);
  assert.equal(r.nombre, 'Hospital Santa Lucía');
});

test('fuera de la zona de la línea → null', () => {
  assert.equal(dentroDeZona(-31.4, -64.18), false); // Córdoba
  assert.equal(parseNominatim([{ name: 'X', lat: '-31.4', lon: '-64.18' }]), null);
  assert.equal(parseUsig({}), null);
});

test('buscarLugar: usa el primer proveedor que encuentra y cachea', async () => {
  let llamadas = 0;
  const provs = [
    async () => { llamadas++; return null; },
    async () => { llamadas++; return { nombre: 'B', lat: -34.6, lng: -58.4 }; },
    async () => { llamadas++; return { nombre: 'C', lat: -34.6, lng: -58.4 }; },
  ];
  assert.equal((await buscarLugar('Algo único 123', provs)).nombre, 'B');
  assert.equal(llamadas, 2);
  await buscarLugar('algo único 123', provs);
  assert.equal(llamadas, 2);
});

test('buscarLugar: texto muy corto → null', async () => {
  assert.equal(await buscarLugar('ab', []), null);
});
