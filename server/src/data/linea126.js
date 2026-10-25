// server/src/data/linea126.js
// Recorridos de la Línea 126 (Cárdenas S.A.) para el seed inicial — editables
// después desde el panel (Recorridos).
//
// Fuentes (oct/2026):
// - Itinerario oficial: Servicios Comunes Básicos Línea 126, Secretaría de
//   Transporte (argentina.gob.ar/sites/default/files/l/126.pdf).
// - Seccionados con km acumulados (Invierno 2026) y tarifa por tramo (julio
//   2026, igual a la de RedSUBE para líneas nacionales): ficha de la línea
//   en revistacolectibondi.com.ar, armada sobre la documentación oficial.
// - Coordenadas: puntos sobre el trazado de referencia, nombrados con
//   OpenStreetMap. Las del final del ramal B (Ambrosetti / Peribebuy) son
//   aproximadas: confirmar con la empresa.

// Seccionados oficiales del Recorrido A, en km desde La Tablada. Entre dos
// puntos consecutivos queda un tramo: 10 puntos → 9 tramos (= "secciones"
// del modelo del panel).
export const SECCIONADOS_KM = [0, 2.663, 5.351, 8.230, 11.249, 15.043, 17.527, 20.561, 24.790, 27.002];

export const SECCIONES_126 = [
  { numero: 1, nombre: 'La Tablada (Av. D. A. Maradona y 9 de Julio) – Crovara y Roque Simone' },
  { numero: 2, nombre: 'Crovara y Roque Simone – Crovara y Av. Gral. Paz' },
  { numero: 3, nombre: 'Av. Gral. Paz – Av. Directorio y Larrazábal' },
  { numero: 4, nombre: 'Directorio y Larrazábal – Directorio y Azul' },
  { numero: 5, nombre: 'Directorio y Azul – Directorio y Av. J. M. Moreno' },
  { numero: 6, nombre: 'Directorio y J. M. Moreno – Av. San Juan y La Rioja' },
  { numero: 7, nombre: 'San Juan y La Rioja – Av. San Juan y Perú' },
  { numero: 8, nombre: 'San Juan y Perú – Av. L. N. Alem y Av. Corrientes' },
  { numero: 9, nombre: 'Alem y Corrientes – Retiro (Av. de los Inmigrantes)' },
];

// Tarifa general (SUBE registrada) según cuántos tramos abarca el viaje.
// Sale de la matriz oficial: 1 tramo 0-3 km, 2 tramos 3-6 km, 3-4 tramos
// 6-12 km, 5 o más 12-27 km. Sin registrar se paga el doble.
export const CUADRO_126 = [742.81, 861.66, 1002.80, 1002.80, 1151.36, 1151.36, 1151.36, 1151.36, 1151.36]
  .map((precio, i) => ({ hastaSeccion: i + 1, precio }));

export function seccionPorKm(kmDesdeTablada) {
  for (let i = SECCIONADOS_KM.length - 1; i > 0; i--) {
    if (kmDesdeTablada >= SECCIONADOS_KM[i - 1]) return Math.min(i, SECCIONES_126.length);
  }
  return 1;
}

// [nombre, lat, lng, km desde La Tablada]
const IDA_A = [
  ['Terminal Retiro (Av. de los Inmigrantes y Cabo Pablo T. Fels)', -34.58626, -58.37049, 27.00],
  ['Av. Antártida Argentina (Estación Retiro)',                        -34.58812, -58.37177, 26.82],
  ['Av. del Libertador (Retiro)',                                     -34.59276, -58.37527, 26.00],
  ['Metrobús del Bajo – Av. L. N. Alem y Av. Córdoba',                -34.59723, -58.37181, 25.48],
  ['Metrobús del Bajo – Av. L. N. Alem y Av. Corrientes',             -34.60303, -58.37029, 24.96],
  ['Plaza de Mayo (Av. de Mayo y Bolívar)',                           -34.60848, -58.37347, 23.15],
  ['Diagonal Sur (Av. Pte. Julio A. Roca)',                           -34.61283, -58.37757, 22.53],
  ['Bolívar y Av. Independencia (San Telmo)',                         -34.61716, -58.37308, 21.40],
  ['Carlos Calvo y Tacuarí (San Telmo)',                              -34.61974, -58.37870, 20.10],
  ['Humberto 1º y Santiago del Estero (Constitución)',                -34.62103, -58.38435, 19.51],
  ['Humberto 1º y Av. Entre Ríos (San Cristóbal)',                    -34.62165, -58.39394, 18.62],
  ['Humberto 1º y Pasco (San Cristóbal)',                             -34.62221, -58.40062, 17.76],
  ['Humberto 1º y La Rioja (San Cristóbal)',                          -34.62324, -58.40721, 17.34],
  ['Humberto 1º y Av. Boedo (Boedo)',                                 -34.62436, -58.41476, 16.64],
  ['Av. Carlos Calvo y Quintino Bocayuva (Boedo)',                    -34.62476, -58.42186, 16.20],
  ['Av. Carlos Calvo y Senillosa (Caballito)',                        -34.62526, -58.42860, 15.57],
  ['Av. Pedro Goyena y Av. Emilio Mitre (Caballito)',                 -34.62590, -58.43527, 15.04],
  ['Av. Pedro Goyena y Nicolás Videla (Caballito)',                   -34.62667, -58.44229, 14.29],
  ['Av. Pedro Goyena y Av. Carabobo (Parque Chacabuco)',              -34.62797, -58.44932, 13.69],
  ['Av. Juan B. Alberdi (Flores)',                                    -34.62949, -58.45604, 13.21],
  ['Av. Juan B. Alberdi y Pedernera (Flores)',                        -34.63167, -58.46310, 12.45],
  ['Av. Juan B. Alberdi y Quirno (Flores)',                           -34.63373, -58.47001, 11.67],
  ['Av. Juan B. Alberdi y Baradero (Floresta)',                       -34.63607, -58.47640, 11.25],
  ['Av. Juan B. Alberdi y Av. Lacarra (Vélez Sarsfield)',             -34.63897, -58.48289, 10.55],
  ['Av. Juan B. Alberdi (Villa Luro)',                                -34.64172, -58.48872,  9.87],
  ['Av. Juan B. Alberdi y Av. Bruix (Parque Avellaneda)',             -34.64453, -58.49469,  9.15],
  ['Av. Directorio (Parque Avellaneda)',                              -34.64751, -58.48713,   9.56],
  ['Av. Directorio y Larrazábal (Mataderos)',                         -34.65478, -58.49574,   8.23],
  ['Av. Coronel Cárdenas y Timoteo Gordillo (Mataderos)',             -34.66075, -58.50387,   6.99],
  ['Av. Coronel Cárdenas y Gral. Eugenio Garzón (Mataderos)',         -34.66618, -58.50261,   6.13],
  ['Av. Eva Perón y Av. General Paz',                                 -34.67296, -58.49975,   5.12],
  ['Av. Crovara y Roque Sáenz Peña (Villa Insuperable)',              -34.67603, -58.50542,   4.63],
  ['Av. Crovara y Alfredo Palacios (Las Antenas)',                    -34.68013, -58.51136,   4.05],
  ['Av. Crovara (Las Antenas)',                                       -34.68397, -58.51687,   3.49],
  ['Av. Crovara y Roque Simone (La Tablada)',                         -34.68836, -58.52338,   2.86],
  ['Av. Crovara (barrio Alberti, La Tablada)',                        -34.69236, -58.52917,   2.19],
  ['Av. Crovara (La Tablada)',                                        -34.69646, -58.53548,   1.43],
  ['Rotonda de La Tablada (Crovara y Camino de Cintura)',             -34.69965, -58.54153,   0.62],
  ['Terminal La Tablada (Av. D. A. Maradona 4920, ex Mons. Bufano)',  -34.69627, -58.54620,   0.00],
];

const VUELTA_A = [
  ['Terminal La Tablada (Av. D. A. Maradona y 9 de Julio)',           -34.69635, -58.54627,   0.00],
  ['Rotonda de La Tablada',                                           -34.70027, -58.54176,   0.62],
  ['Av. Crovara (barrio Alberti, La Tablada)',                        -34.69403, -58.53159,   1.89],
  ['Av. Crovara y Roque Simone (La Tablada)',                         -34.68974, -58.52537,   2.66],
  ['Av. Crovara (Villa Ansaldi)',                                     -34.68605, -58.51994,   3.19],
  ['Av. Crovara y Alfredo Palacios (Las Antenas)',                    -34.68210, -58.51421,   3.75],
  ['Av. Crovara y Charcas (Las Antenas)',                             -34.67856, -58.50913,   4.25],
  ['Av. Crovara y Roque Sáenz Peña (Villa Insuperable)',              -34.67476, -58.50318,   4.81],
  ['Guaminí y Av. Eva Perón (Mataderos)',                             -34.67086, -58.49969,   5.35],
  ['Av. Coronel Cárdenas y Gral. Eugenio Garzón (Mataderos)',         -34.66508, -58.50323,   6.30],
  ['Av. Directorio y Av. Lisandro de la Torre (Mataderos)',           -34.65933, -58.50119,   7.29],
  ['Av. Directorio y Larrazábal (Mataderos)',                         -34.65478, -58.49574,   8.23],
  ['Av. Directorio y Basualdo (Mataderos)',                           -34.65082, -58.49100,   8.92],
  ['Av. Directorio y Autopista Perito Moreno (Parque Avellaneda)',    -34.64590, -58.48529,  9.76],
  ['Av. Directorio y Av. Lacarra (Parque Avellaneda)',                -34.64129, -58.47992, 10.55],
  ['Av. Directorio y Azul (Floresta)',                                -34.63790, -58.47441, 11.25],
  ['Av. Directorio y Av. San Pedrito (Flores)',                       -34.63554, -58.46748, 11.94],
  ['Av. Directorio (Flores)',                                         -34.63296, -58.45902, 12.76],
  ['Av. Directorio y Av. Carabobo (Flores)',                          -34.63062, -58.45160, 13.48],
  ['Av. Directorio (Parque Chacabuco)',                               -34.62933, -58.44293, 14.29],
  ['Av. Directorio y Av. José María Moreno (Caballito)',              -34.62815, -58.43478, 15.04],
  ['Av. San Juan y Senillosa (Caballito)',                            -34.62717, -58.42817, 15.57],
  ['Av. San Juan y Castro (Boedo)',                                   -34.62601, -58.42025, 16.20],
  ['Av. San Juan y 24 de Noviembre (San Cristóbal)',                  -34.62479, -58.41040, 16.98],
  ['Av. San Juan y La Rioja (San Cristóbal)',                         -34.62393, -58.40347, 17.53],
  ['Av. San Juan y Pasco (San Cristóbal)',                            -34.62305, -58.39637, 18.27],
  ['Av. San Juan y Virrey Cevallos (Constitución)',                   -34.62251, -58.38864, 19.07],
  ['Av. San Juan y Lima (Av. 9 de Julio)',                            -34.62219, -58.38143, 19.81],
  ['Av. San Juan y Perú (San Telmo)',                                 -34.62193, -58.37414, 20.56],
  ['Perú y México (Monserrat)',                                       -34.61496, -58.37452, 21.81],
  ['Perú y Moreno (Monserrat)',                                       -34.61052, -58.37485, 22.80],
  ['Metrobús del Bajo – Paseo Colón e Hipólito Yrigoyen',             -34.60924, -58.36930, 23.80],
  ['Metrobús del Bajo – Av. L. N. Alem y Av. Corrientes',             -34.60455, -58.37013, 24.79],
  ['Metrobús del Bajo – Av. L. N. Alem y Viamonte',                   -34.59865, -58.37102, 25.43],
  ['San Martín y Dr. Martínez Zuviría (Retiro)',                      -34.59218, -58.37275, 26.18],
  ['Av. Antártida Argentina (Estación Retiro)',                       -34.58764, -58.37161, 26.82],
  ['Terminal Retiro (Av. de los Inmigrantes y Cabo Pablo T. Fels)',   -34.58624, -58.37048, 27.00],
];

// Ramal B: igual al A hasta Av. Crovara; ahí dobla por Ambrosetti hacia el
// Cementerio de Villegas (Peribebuy y Mocoretá).
const COLA_B_IDA = [
  ['Ambrosetti (La Tablada)',                                        -34.69850, -58.54900,  0.90],
  ['Peribebuy y Pedro León Gallo (San Justo)',                       -34.69980, -58.55850,  0.40],
  ['Cementerio de Villegas (Peribebuy y Mocoretá)',                  -34.70160, -58.56280,  0.00],
];
const COLA_B_VUELTA = [
  ['Cementerio de Villegas (Peribebuy y Mocoretá)',                  -34.70160, -58.56280,  0.00],
  ['Pedro León Gallo y Agustín de Vedia (San Justo)',                -34.70190, -58.55600,  0.40],
  ['Ambrosetti (La Tablada)',                                        -34.69850, -58.54900,  0.90],
];

const aParadas = (rows) => rows.map(([nombre, lat, lng, km], i) => ({
  orden: i + 1, nombre, direccion: '', seccion: seccionPorKm(km), lat, lng,
}));

const IDA_B = [...IDA_A.slice(0, IDA_A.findIndex(r => r[0].startsWith('Av. Crovara (barrio Alberti'))), ...COLA_B_IDA];
const VUELTA_B = [...COLA_B_VUELTA, ...VUELTA_A.slice(VUELTA_A.findIndex(r => r[0].startsWith('Av. Crovara (barrio Alberti')))];

export const RECORRIDOS_126 = [
  {
    nombre: 'Ramal A — Retiro ⇄ La Tablada',
    lineaNombre: 'Línea 126',
    descripcion: 'Servicio común, todos los días. Retiro (Av. de los Inmigrantes) – Metrobús del Bajo – Plaza de Mayo – San Telmo – San Cristóbal – Boedo – Caballito – Flores – Parque Avellaneda – Mataderos – Av. Gral. Paz – Av. Crovara – La Tablada (Av. D. A. Maradona 4920). Ida por Carlos Calvo / Pedro Goyena / Alberdi, vuelta por Directorio / San Juan. 27 km, entre 82 y 100 minutos de punta a punta.',
    activo: true,
    order: 1,
    secciones: SECCIONES_126,
    cuadroTarifario: CUADRO_126,
    paradas: { ida: aParadas(IDA_A), vuelta: aParadas(VUELTA_A) },
  },
  {
    nombre: 'Ramal B — Retiro ⇄ Cementerio de Villegas',
    lineaNombre: 'Línea 126',
    descripcion: 'Servicio común, todos los días. Mismo recorrido que el ramal A hasta Av. Crovara; ahí sigue por Ambrosetti y Peribebuy hasta Mocoretá (Cementerio de Villegas, San Justo). Vuelve por Pedro León Gallo, Agustín de Vedia y Ambrosetti.',
    activo: true,
    order: 2,
    secciones: SECCIONES_126,
    cuadroTarifario: CUADRO_126,
    paradas: { ida: aParadas(IDA_B), vuelta: aParadas(VUELTA_B) },
  },
];
