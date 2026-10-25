import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNominatimResponse } from './geocode.service.js';

test('parseNominatimResponse: primer resultado', () => {
  assert.deepEqual(parseNominatimResponse([{ lat: '-34.5808', lon: '-58.4210' }, { lat: '1', lon: '2' }]), { lat: -34.5808, lng: -58.4210 });
});
test('parseNominatimResponse: vacío o malformado -> null', () => {
  assert.equal(parseNominatimResponse([]), null);
  assert.equal(parseNominatimResponse(null), null);
  assert.equal(parseNominatimResponse([{ foo: 'bar' }]), null);
});
