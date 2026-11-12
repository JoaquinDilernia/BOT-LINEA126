// server/src/data/linea126.js
// Recorridos de la Línea 126 (Cárdenas S.A.) para el seed inicial — editables
// después desde el panel (Recorridos). Para reemplazar los que ya están en la
// base: server/scripts/reemplazar-recorridos.mjs.
//
// Paradas: listado oficial de la empresa (PARADAS 126.xlsx, nov/2026), en
// paradas126.json. Cada parada trae dirección, esquina, barrio, si es parada
// del Metrobús y los puntos de interés cercanos ("cercania"). Coordenadas:
// USIG (CABA) y Georef / OpenStreetMap (La Matanza).
//
// Sentidos como los usa la empresa: IDA = hacia Retiro, VUELTA = hacia
// La Tablada / Villegas.
//
// Secciones: los 10 seccionados oficiales del listado (Tablada, Formosa,
// Gral. Paz, Pieres/Larrazábal, Varela/Pergamino, Centenera, La Rioja,
// Tacuarí, Diagonal Sur, Retiro) → 9 tramos, numerados siempre desde
// La Tablada (1) hacia Retiro (9). Villegas cuenta como sección 1.
import { readFileSync } from 'node:fs';

const PARADAS = JSON.parse(readFileSync(new URL('./paradas126.json', import.meta.url), 'utf8'));

export const SECCIONES_126 = [
  { numero: 1, nombre: 'La Tablada / Villegas – Crovara (Formosa)' },
  { numero: 2, nombre: 'Crovara (Formosa) – Av. General Paz' },
  { numero: 3, nombre: 'Av. General Paz – Directorio y Pieres (hacia Retiro) / Directorio y Larrazábal (hacia provincia)' },
  { numero: 4, nombre: 'Pieres / Larrazábal – Directorio y Varela (hacia Retiro) / Alberdi y Azul (Pergamino, hacia provincia)' },
  { numero: 5, nombre: 'Varela / Pergamino – Centenera (Directorio / Pedro Goyena)' },
  { numero: 6, nombre: 'Centenera – La Rioja (Av. San Juan / Humberto 1º)' },
  { numero: 7, nombre: 'La Rioja – Tacuarí (Av. San Juan / Lima)' },
  { numero: 8, nombre: 'Tacuarí – Diagonal Sur (Av. Julio A. Roca)' },
  { numero: 9, nombre: 'Diagonal Sur – Retiro (Av. de los Inmigrantes)' },
];

// Tarifa general (SUBE registrada) según cuántos tramos abarca el viaje.
// Sale de la matriz oficial: 1 tramo 0-3 km, 2 tramos 3-6 km, 3-4 tramos
// 6-12 km, 5 o más 12-27 km. Sin registrar se paga el doble.
export const CUADRO_126 = [742.81, 861.66, 1002.80, 1002.80, 1151.36, 1151.36, 1151.36, 1151.36, 1151.36]
  .map((precio, i) => ({ hastaSeccion: i + 1, precio }));

const conOrden = (paradas) => paradas.map((p, i) => ({ ...p, orden: i + 1 }));

export const RECORRIDOS_126 = [
  {
    nombre: 'Ramal A — La Tablada ⇄ Retiro',
    lineaNombre: 'Línea 126',
    descripcion: 'Servicio común, todos los días, las 24 horas. En días hábiles, en hora pico, el expreso C hace esta misma traza por Autopista 25 de Mayo y Perito Moreno (hacia Retiro 7:40 a 9:40, hacia La Tablada 17:30 a 19:30), sin subir ni bajar pasajeros en el tramo por autopista. Terminal La Tablada (Av. D. A. Maradona 4920) ⇄ Retiro (Av. de los Inmigrantes). Hacia Retiro va por Av. Crovara, Av. Eva Perón, Guaminí, Av. Cárdenas, Av. de los Corrales, Lisandro de la Torre, Av. Directorio, Av. San Juan, Paseo Colón, Av. Belgrano, Av. Julio A. Roca, Hipólito Yrigoyen y el Metrobús del Bajo (L. N. Alem). Hacia La Tablada vuelve por L. N. Alem, Av. Rivadavia, Av. Julio A. Roca, Av. Belgrano, Paseo Colón, Av. Independencia, Lima, Humberto 1º, Carlos Calvo, Av. Pedro Goyena, Av. Juan B. Alberdi, Av. Bruix, Av. Directorio, Av. Cárdenas, Av. Eva Perón y Av. Crovara.',
    activo: true,
    order: 1,
    secciones: SECCIONES_126,
    cuadroTarifario: CUADRO_126,
    paradas: { ida: conOrden(PARADAS.A.ida), vuelta: conOrden(PARADAS.A.vuelta) },
  },
  {
    nombre: 'Ramal B — Cementerio de Villegas ⇄ Retiro',
    lineaNombre: 'Línea 126',
    descripcion: 'Servicio común, todos los días, las 24 horas. En días hábiles, en hora pico, el expreso D hace esta misma traza por Autopista 25 de Mayo y Perito Moreno (hacia Retiro 7:00 a 9:00, hacia Villegas 17:00 a 19:00), sin subir ni bajar pasajeros en el tramo por autopista. Sale del Cementerio de Villegas (Pedro León Gallo y Peribebuy) por Ambrosetti, José C. Paz, Centenera y Av. Crovara, y desde Av. Crovara y La Quila hace el mismo recorrido que el ramal A hasta Retiro. A la vuelta, desde Av. Crovara sigue por Centenera, José C. Paz y Ambrosetti hasta Peribebuy (Cementerio de Villegas).',
    activo: true,
    order: 2,
    secciones: SECCIONES_126,
    cuadroTarifario: CUADRO_126,
    paradas: { ida: conOrden(PARADAS.B.ida), vuelta: conOrden(PARADAS.B.vuelta) },
  },
];
