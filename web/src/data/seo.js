// SEO por página: título, descripción y datos estructurados. Lo usa
// components/Seo.jsx en el navegador y scripts/prerender.mjs para armar el
// HTML estático de cada ruta y el sitemap. El dominio va sin barra final.
import { EMPRESA, FAQ } from './linea.js';

export const SITE = 'https://linea126.com.ar';
export const OG_IMAGE = `${SITE}/fotos/interno-54.jpg`;

export const PAGINAS = {
  '/': {
    title: 'Línea 126 — Colectivo La Tablada y Villegas ⇄ Retiro | Cárdenas S.A.',
    description: 'Sitio oficial de la Línea 126 de colectivos (Cárdenas S.A.): recorridos y paradas, horarios, expresos por autopista, tarifas con SUBE, reclamos y chat 24 h. La Tablada, Villegas, Mataderos, Flores, Constitución, Plaza de Mayo y Retiro.',
    prioridad: 1.0, frecuencia: 'weekly',
  },
  '/recorridos': {
    title: 'Recorrido de la Línea 126: mapa, paradas y ramales A, B, C y D',
    description: 'Mapa y listado oficial de paradas del colectivo 126: ramal A La Tablada ⇄ Retiro, ramal B Cementerio de Villegas ⇄ Retiro y expresos C y D por Autopista 25 de Mayo. Por dónde pasa, calle por calle.',
    prioridad: 0.9, frecuencia: 'monthly',
  },
  '/horarios': {
    title: 'Horarios de la Línea 126: frecuencias y expresos C y D',
    description: 'Cada cuánto pasa el colectivo 126: servicio las 24 horas, frecuencias de días hábiles, sábados y domingos, y horarios oficiales de los expresos por autopista (turno mañana y tarde).',
    prioridad: 0.9, frecuencia: 'weekly',
  },
  '/tarifas': {
    title: 'Tarifas de la Línea 126: cuánto sale el boleto con SUBE',
    description: 'Precio del boleto del colectivo 126 por tramo, calculadora de tarifa entre dos paradas, tarifa social, Red SUBE y pase libre con CUD.',
    prioridad: 0.8, frecuencia: 'monthly',
  },
  '/como-llego': {
    title: '¿Cómo llego con la 126? Parada, precio y tiempo de viaje',
    description: 'Decinos a dónde vas y te decimos en qué parada del 126 subir y bajar, cuánto sale el boleto y cuánto tarda el viaje.',
    prioridad: 0.8, frecuencia: 'monthly',
  },
  '/reclamos': {
    title: 'Reclamos y objetos perdidos de la Línea 126',
    description: 'Hacé tu reclamo o denunciá un objeto perdido en el colectivo 126 y seguí su estado con tu número de reclamo. Atención al pasajero las 24 horas por chat.',
    prioridad: 0.7, frecuencia: 'monthly', faq: true,
  },
  '/empresa': {
    title: 'La empresa: Cárdenas S.A., Línea 126 desde La Tablada',
    description: 'Historia y presente de Cárdenas S.A. Empresa de Transportes, la empresa de la Línea 126 con terminal en La Tablada, La Matanza.',
    prioridad: 0.5, frecuencia: 'yearly',
  },
  '/trabaja': {
    title: 'Trabajá en la Línea 126: choferes, mecánicos y administrativos',
    description: 'Dejá tu CV para trabajar en Cárdenas S.A., Línea 126: búsquedas de choferes, mecánicos y personal administrativo.',
    prioridad: 0.5, frecuencia: 'monthly',
  },
  '/contacto': {
    title: 'Contacto de la Línea 126: teléfono, dirección y oficinas',
    description: `Teléfono, dirección y horario de oficinas de la Línea 126: ${EMPRESA.direccion}. Atención al pasajero 24 h por chat.`,
    prioridad: 0.6, frecuencia: 'yearly',
  },
};

export const NOT_FOUND = { title: 'Página no encontrada · Línea 126', description: 'La página que buscás no existe.', noindex: true };

const ORGANIZACION = {
  '@type': 'Organization',
  '@id': `${SITE}/#empresa`,
  name: EMPRESA.nombre,
  alternateName: ['Línea 126', 'Colectivo 126', 'Cárdenas S.A.'],
  url: `${SITE}/`,
  logo: `${SITE}/icon-512.png`,
  image: OG_IMAGE,
  telephone: '+54 11 4482-1639',
  taxID: EMPRESA.cuit,
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Av. Diego A. Maradona 4920',
    addressLocality: 'La Tablada',
    addressRegion: 'Buenos Aires',
    postalCode: 'B1766',
    addressCountry: 'AR',
  },
  areaServed: ['Ciudad Autónoma de Buenos Aires', 'La Matanza'],
};

// JSON-LD de cada página (array de nodos; van en un @graph).
export function jsonLd(path) {
  const pag = PAGINAS[path];
  if (!pag) return null;
  const graph = [ORGANIZACION];
  if (path === '/') {
    graph.push({ '@type': 'WebSite', '@id': `${SITE}/#sitio`, url: `${SITE}/`, name: 'Línea 126', inLanguage: 'es-AR', publisher: { '@id': `${SITE}/#empresa` } });
  } else {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: pag.title.split(/[:—|]/)[0].trim(), item: `${SITE}${path}` },
      ],
    });
  }
  if (pag.faq) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
