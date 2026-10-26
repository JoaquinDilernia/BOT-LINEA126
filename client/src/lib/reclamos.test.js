import { describe, it, expect } from 'vitest';
import { parseCargaMasiva, parseFecha, mesActual } from './reclamos';

describe('parseFecha', () => {
  it('entiende dd/mm/aaaa, dd/mm/aa y aaaa-mm-dd', () => {
    expect(parseFecha('3/10/2026')).toBe('2026-10-03');
    expect(parseFecha('03-10-26')).toBe('2026-10-03');
    expect(parseFecha('2026-10-3')).toBe('2026-10-03');
    expect(parseFecha('ayer')).toBe(null);
  });
});

describe('parseCargaMasiva', () => {
  it('lee tabs de Excel, saltea el encabezado y reporta filas rotas', () => {
    const text = 'Fecha\tCategoría\tInterno\tRamal\tChofer\tDetalle\n'
      + '3/10/2026\tNo realizó la parada\t036\ta\t4521\tEn Directorio y Azul\n'
      + 'cualquiera\tMal trato\t12\tB\t\t\n';
    const { filas, errores } = parseCargaMasiva(text);
    expect(filas).toEqual([{
      fecha: '2026-10-03T12:00:00', categoria: 'No realizó la parada', numeroUnidad: '036', ramal: 'A', legajoChofer: '4521', descripcion: 'En Directorio y Azul',
    }]);
    expect(errores).toEqual(['Fila 3: no entiendo la fecha "cualquiera"']);
  });

  it('también acepta punto y coma', () => {
    const { filas } = parseCargaMasiva('1/10/2026;demora;40;B;;pasó lleno');
    expect(filas[0].categoria).toBe('demora');
    expect(filas[0].descripcion).toBe('pasó lleno');
  });
});

describe('mesActual', () => {
  it('devuelve AAAA-MM', () => {
    expect(mesActual(new Date(2026, 9, 26))).toBe('2026-10');
  });
});
