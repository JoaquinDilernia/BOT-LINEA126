// Datos institucionales de la Línea 126. Fuentes (oct/2026): itinerario oficial
// de la Secretaría de Transporte, Boletín Oficial (Res. 44/2023), diagramación
// Invierno 2026 y RedSUBE. Recorridos y tarifas editables viven en el panel
// del bot (vienen por API); acá queda lo que cambia poco.

export const EMPRESA = {
  nombre: 'Cárdenas S.A. Empresa de Transportes',
  marca: 'Línea 126',
  cuit: '30-54634305-3',
  direccion: 'Av. Diego A. Maradona 4920 (ex Mons. Bufano), La Tablada, La Matanza',
  direccionCorta: 'Av. D. A. Maradona 4920, La Tablada',
  coords: [-34.69627, -58.5462],
  telefono: '(011) 4482-1639',
  telefonoHref: 'tel:+541144821639',
  horarioOficina: 'Lunes a viernes de 9 a 16 h',
  permiso: 'Permiso nacional Disp. SSTM y LD N° 51/97 · vigente hasta 26/01/2027',
};

// tipo: comun (todos los días) | habiles (franja de días hábiles) | expreso
export const RAMALES = [
  {
    letra: 'A', tipo: 'comun', desde: 'Retiro', hasta: 'La Tablada',
    detalle: 'Av. D. A. Maradona 4920',
    horario: 'Todos los días · nocturno en días hábiles',
    via: 'Por Plaza de Mayo, San Telmo, Boedo, Caballito, Flores y Mataderos.',
  },
  {
    letra: 'B', tipo: 'comun', desde: 'Retiro', hasta: 'Cementerio de Villegas',
    detalle: 'Pedro León Gallo y Peribebuy',
    horario: 'Todos los días',
    via: 'Igual que el A hasta Av. Crovara; sigue por Centenera, José C. Paz y Ambrosetti.',
  },
  {
    letra: 'C', tipo: 'habiles', desde: 'Directorio y J. M. Moreno', hasta: 'La Tablada',
    detalle: 'Caballito ⇄ La Tablada',
    horario: 'Días hábiles de 7:00 a 10:30',
    via: 'Por Av. Directorio, Beauchef, Pedro Goyena y Alberdi.',
  },
  {
    letra: 'D', tipo: 'habiles', desde: 'Directorio y J. M. Moreno', hasta: 'Cementerio de Villegas',
    detalle: 'Caballito ⇄ Villegas',
    horario: 'Días hábiles de 7:00 a 10:30',
    via: 'Mismo trazado que el C, con final en el Cementerio de Villegas.',
  },
  {
    letra: 'E', tipo: 'expreso', desde: 'Retiro', hasta: 'La Tablada',
    detalle: 'Expreso por AU 25 de Mayo',
    horario: 'Días hábiles · a Retiro 7:40–9:40 · a provincia 17:30–19:30',
    via: 'Sobre la traza del A, por Autopista 25 de Mayo y Perito Moreno.',
  },
  {
    letra: 'F', tipo: 'expreso', desde: 'Retiro', hasta: 'Cementerio de Villegas',
    detalle: 'Expreso por AU 25 de Mayo',
    horario: 'Días hábiles · a Retiro 7:00–9:00 · a provincia 17:00–19:00',
    via: 'Sobre la traza del B, por Autopista 25 de Mayo y Perito Moreno.',
  },
];

export const TIPO_RAMAL = {
  comun: 'Servicio común',
  habiles: 'Sólo días hábiles',
  expreso: 'Expreso por autopista',
};

export const CABECERAS = [
  { nombre: 'Retiro', detalle: 'Av. de los Inmigrantes entre Cabo P. T. Fels y Av. Antártida Argentina', combina: 'Trenes Mitre, San Martín y Belgrano Norte · Subte C · Terminal de ómnibus', coords: [-34.58626, -58.37049] },
  { nombre: 'Caballito', detalle: 'Av. Directorio y Av. José María Moreno (ramales C y D)', combina: 'Parque Chacabuco', coords: [-34.62815, -58.43478] },
  { nombre: 'La Tablada', detalle: 'Av. D. A. Maradona 4920 · terminal y sede de la empresa', combina: 'Atención al pasajero y objetos perdidos', coords: [-34.69627, -58.5462] },
  { nombre: 'Cementerio de Villegas', detalle: 'Pedro León Gallo y Peribebuy, Villegas', combina: 'Ramales B, D y F · estación Justo Villegas', coords: [-34.70136, -58.5639] },
];

// Diagramación Invierno 2026 del ramal A (intervalos programados).
export const FRECUENCIAS = {
  habil: {
    titulo: 'Días hábiles',
    servicio: '00:45 a 23:55',
    servicios: '158 a Retiro · 156 a La Tablada',
    // Distinto por sentido: [hacia Retiro, hacia La Tablada]
    franjas: [
      { horario: '00:45 – 03:55', cada: ['20 a 60 min', '20 a 60 min'], nota: 'Nocturno' },
      { horario: '03:55 – 06:10', cada: ['10 a 15 min', '10 a 15 min'] },
      { horario: '06:10 – 10:00', cada: ['9 a 10 min', '10 min'] },
      { horario: '10:00 – 11:00', cada: ['6,5 min', '6 min'] },
      { horario: '11:00 – 17:00', cada: ['6 min', '6 min'] },
      { horario: '17:00 – 19:30', cada: ['6 min', '6,5 a 7 min'] },
      { horario: '19:30 – 21:30', cada: ['10 min', '10 min'] },
      { horario: '21:30 – 23:55', cada: ['15 a 20 min', '15 a 20 min'] },
    ],
  },
  sabado: {
    titulo: 'Sábados',
    servicio: '04:00 a 24:00',
    servicios: '107 por sentido',
    franjas: [
      { horario: '04:00 – 05:00', cada: 'cada 30 min' },
      { horario: '05:00 – 06:00', cada: 'cada 15 min' },
      { horario: '06:00 – 19:00', cada: 'cada 10 min' },
      { horario: '19:00 – 24:00', cada: 'cada 15 min' },
    ],
  },
  domingo: {
    titulo: 'Domingos y feriados',
    servicio: '06:00 a 24:00',
    servicios: '86 por sentido',
    franjas: [
      { horario: '06:00 – 08:00', cada: 'cada 15 min' },
      { horario: '08:00 – 20:00', cada: 'cada 12 min' },
      { horario: '20:00 – 24:00', cada: 'cada 15 min' },
    ],
  },
};

// Seccionados del listado oficial de paradas de la empresa (nov/2026), de
// La Tablada hacia Retiro, con km y tiempos de marcha pico/valle del tramo que
// empieza en ese punto (diagramación Invierno 2026).
export const SECCIONADOS = [
  { nombre: 'Terminal La Tablada (Av. D. A. Maradona 4920)', barrio: 'La Tablada', etiqueta: 'La Tablada', km: 0, pico: 9, valle: 8 },
  { nombre: 'Formosa (Av. Crovara 2840)', barrio: 'La Tablada', etiqueta: 'Formosa', km: 2.663, pico: 10, valle: 8 },
  { nombre: 'General Paz (Av. Eva Perón 7424)', barrio: 'Mataderos', etiqueta: 'Gral. Paz', km: 5.351, pico: 11, valle: 9 },
  { nombre: 'Pieres / Larrazábal (Av. Directorio)', barrio: 'Mataderos', etiqueta: 'Mataderos', km: 8.23, pico: 12, valle: 9 },
  { nombre: 'Varela (Directorio) / Pergamino (Alberdi)', barrio: 'Flores', etiqueta: 'Flores', km: 11.249, pico: 14, valle: 11 },
  { nombre: 'Centenera (Directorio / Pedro Goyena)', barrio: 'Parque Chacabuco', etiqueta: 'Parque Chacabuco', km: 15.043, pico: 11, valle: 9 },
  { nombre: 'La Rioja (Av. San Juan / Humberto 1º)', barrio: 'San Cristóbal', km: 17.527, pico: 12, valle: 11 },
  { nombre: 'Tacuarí (Av. San Juan / Lima)', barrio: 'Constitución', km: 20.561, pico: 13, valle: 10 },
  { nombre: 'Diagonal Sur (Av. Julio A. Roca)', barrio: 'Monserrat', km: 24.79, pico: 8, valle: 7 },
  { nombre: 'Retiro (Av. de los Inmigrantes)', barrio: 'Retiro', km: 27.002 },
];

// Tarifa general por cantidad de seccionados entre subida y bajada (matriz
// oficial julio 2026, igual a RedSUBE oct/2026). Sin registrar = doble.
const POR_SALTO = [null, 742.81, 861.66, 1002.8, 1002.8, 1151.36, 1151.36, 1151.36, 1151.36, 1151.36];

export function tarifaEntre(i, j) {
  const salto = Math.abs(i - j);
  if (salto === 0) return null;
  const general = POR_SALTO[salto];
  return { general, sinRegistrar: Math.round(general * 2 * 100) / 100, social: Math.round(general * 0.45 * 100) / 100 };
}

export const peso = (n) =>
  `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Lugares a los que acerca, del listado oficial de paradas (columna "Cercanía").
export const LUGARES = [
  { nombre: 'Estación Retiro y terminal de ómnibus', tipo: 'Transporte', barrio: 'Retiro' },
  { nombre: 'Palacio Libertad y Luna Park', tipo: 'Cultura', barrio: 'San Nicolás' },
  { nombre: 'Plaza de Mayo y Cabildo', tipo: 'Historia', barrio: 'Monserrat' },
  { nombre: 'Manzana de las Luces', tipo: 'Historia', barrio: 'Monserrat' },
  { nombre: 'Feria de San Telmo', tipo: 'Paseo', barrio: 'San Telmo' },
  { nombre: 'Facultad de Ingeniería (UBA) y UCA', tipo: 'Educación', barrio: 'Monserrat' },
  { nombre: 'UADE', tipo: 'Educación', barrio: 'Monserrat' },
  { nombre: 'Facultad de Ciencias Sociales (UBA)', tipo: 'Educación', barrio: 'Constitución' },
  { nombre: 'Hospital Santa Lucía', tipo: 'Salud', barrio: 'San Cristóbal' },
  { nombre: 'Hospital Milstein', tipo: 'Salud', barrio: 'San Cristóbal' },
  { nombre: 'Hospital del Quemado', tipo: 'Salud', barrio: 'Caballito' },
  { nombre: 'Facultad de Filosofía y Letras (UBA)', tipo: 'Educación', barrio: 'Parque Chacabuco' },
  { nombre: 'Parque Chacabuco', tipo: 'Parque', barrio: 'Parque Chacabuco' },
  { nombre: 'UFLO', tipo: 'Educación', barrio: 'Flores' },
  { nombre: 'Parque Avellaneda', tipo: 'Parque', barrio: 'Parque Avellaneda' },
  { nombre: 'Feria de Mataderos', tipo: 'Paseo', barrio: 'Mataderos' },
  { nombre: 'Estadio de Nueva Chicago', tipo: 'Deporte', barrio: 'Mataderos' },
  { nombre: 'Estación La Tablada', tipo: 'Transporte', barrio: 'La Tablada' },
  { nombre: 'Estación Justo Villegas', tipo: 'Transporte', barrio: 'Villegas' },
];

export const BARRIOS = ['Retiro', 'San Nicolás', 'Monserrat', 'San Telmo', 'Constitución', 'San Cristóbal', 'Boedo', 'Caballito', 'Parque Chacabuco', 'Flores', 'Parque Avellaneda', 'Mataderos', 'Villa Madero', 'La Tablada', 'Villegas'];

export const FAQ = [
  { q: '¿Cómo pago el boleto?', a: 'Sólo con tarjeta SUBE. Al subir decile al chofer hasta dónde viajás y apoyá la tarjeta. Registrala a tu nombre: sin registrar el boleto sale el doble.' },
  { q: '¿El colectivo funciona de noche?', a: 'Sí. En días hábiles el ramal A tiene servicio nocturno desde las 00:45, con frecuencias de 20 a 60 minutos de madrugada. Sábados arranca a las 4 y domingos a las 6.' },
  { q: '¿Qué ramal me deja más cerca?', a: 'El A termina en La Tablada (Av. D. A. Maradona 4920) y el B en el Cementerio de Villegas (Pedro León Gallo y Peribebuy). En días hábiles a la mañana, el C y el D salen desde Caballito. Preguntale al asistente desde dónde y hasta dónde viajás.' },
  { q: '¿Los expresos paran en todas las paradas?', a: 'No en el tramo por autopista. Hacia provincia no se puede subir ni bajar entre Carlos Calvo (subida a la AU 25 de Mayo) y Pitágoras y Av. Alberdi; hacia Retiro, entre Av. Directorio y Dámaso Larrañaga y Bernardo de Irigoyen y Av. San Juan.' },
  { q: '¿Perdí algo en un colectivo, qué hago?', a: 'Registralo en el chat de atención con la descripción del objeto, el día, el horario y el ramal. Te damos un número para seguirlo y te avisamos si aparece. Los objetos se guardan en la terminal de La Tablada.' },
  { q: '¿Puedo viajar con mi mascota?', a: 'Sí, si es pequeña y va dentro de un transportador o bolso cerrado. Los perros de asistencia pueden viajar siempre.' },
  { q: '¿Quién tiene descuento?', a: 'La Tarifa Social Federal da 55% de descuento a jubilados, pensionados, AUH y otros beneficiarios. Las personas con Certificado Único de Discapacidad viajan sin cargo.' },
];

export const CATEGORIAS_RECLAMO = [
  { id: 'demora', label: 'Demora o frecuencia', icon: 'clock' },
  { id: 'no_realizo_parada', label: 'No paró en la parada', icon: 'stop' },
  { id: 'mal_trato', label: 'Mal trato', icon: 'face' },
  { id: 'manejo_peligroso', label: 'Manejo peligroso', icon: 'alert' },
  { id: 'unidad_mal_estado', label: 'Unidad en mal estado', icon: 'bus' },
  { id: 'cobro_indebido', label: 'Cobro indebido', icon: 'card' },
  { id: 'accidente', label: 'Accidente o seguridad', icon: 'shield' },
  { id: 'objeto_perdido', label: 'Objeto perdido', icon: 'bag' },
  { id: 'otro', label: 'Sugerencia u otro', icon: 'chat' },
];

// Fotos reales de la flota (las pasó la línea, oct/2026). Viven en
// public/fotos y se sirven con rutas relativas (el sitio usa HashRouter).
export const FOTOS = {
  clasico: { src: 'fotos/clasico-126.jpg', w: 750, h: 562, alt: 'Colectivo clásico Mercedes-Benz de la 126, rojo con fileteado, restaurado como unidad de auxilio', pie: 'El clásico de la casa: restaurado en nuestro taller, hoy sale como unidad de auxilio.' },
  unidad: { src: 'fotos/unidad-31.jpg', w: 1080, h: 1080, alt: 'Interno 31 de la Línea 126 en la terminal, rojo y blanco con detalles fileteados', pie: 'Interno 31 en la terminal de La Tablada, con el fileteado de la línea.' },
  frente: { src: 'fotos/frente-126.jpg', w: 447, h: 447, alt: 'Frente de un colectivo de la 126 con el cartel Plaza de Mayo, Retiro y Villegas', pie: 'Listo para salir: Plaza de Mayo, Retiro y Villegas.' },
};

// Texto institucional. Tono de relato, sin fechas ni cifras históricas que
// no estén confirmadas por la empresa.
export const HISTORIA = [
  'La 126 es parte del paisaje del oeste desde hace décadas. Generaciones de vecinos de La Tablada, Villegas, Mataderos y Flores fueron al trabajo, a la escuela, al hospital y a la cancha arriba de nuestros colectivos rojos.',
  'Somos una empresa de La Matanza que creció con su gente. Muchos de nuestros choferes, mecánicos e inspectores son del barrio, y en la terminal de La Tablada se conocen por el nombre: ahí arranca y termina cada vuelta.',
  'Y hay cosas que no cambiamos: el fileteado porteño en nuestras unidades, el cuidado de cada coche en taller propio y el clásico 126, restaurado pieza por pieza, que todavía sale a la calle.',
];
