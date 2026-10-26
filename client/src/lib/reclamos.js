// Constantes y helpers puros de reclamos, compartidos por "Reclamos graves" y
// "Gestión de reclamos". Las categorías tienen que coincidir con
// CATEGORIAS_RECLAMO de server/src/services/ticket.service.js.

export const CATEGORIAS = [
  { id: 'demora', label: 'Demora / falta de frecuencia' },
  { id: 'mal_trato', label: 'Mal trato' },
  { id: 'manejo_peligroso', label: 'Manejo peligroso' },
  { id: 'unidad_mal_estado', label: 'Unidad en mal estado' },
  { id: 'cobro_indebido', label: 'Cobro indebido' },
  { id: 'objeto_perdido', label: 'Objeto perdido' },
  { id: 'no_realizo_parada', label: 'No realizó la parada' },
  { id: 'accidente', label: 'Accidente o seguridad' },
  { id: 'otro', label: 'Otro' },
];

export const RAMALES = ['A', 'B', 'C', 'D', 'E', 'F'];

export const categoriaLabel = (id) => CATEGORIAS.find(c => c.id === id)?.label ?? id ?? '—';

/** "2026-10" del mes actual (hora local del navegador). */
export function mesActual(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** "2026-10" → "octubre 2026". */
export function mesLabel(mes) {
  const [y, m] = String(mes).split('-').map(Number);
  if (!y || !m) return mes;
  return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

export function toDate(ts) {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  const secs = ts._seconds ?? ts.seconds;
  if (secs) return new Date(secs * 1000);
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const fechaCorta = (ts) => toDate(ts)?.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) ?? '—';

/** "26/10/2026" o "2026-10-26" → "2026-10-26"; null si no se entiende. */
export function parseFecha(text) {
  const t = String(text ?? '').trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

/**
 * Lo que se pega desde Excel / Google Sheets (columnas separadas por tab,
 * ";" o ","): fecha, categoría, interno, ramal, chofer, detalle. Saltea una
 * fila de encabezado si la primera celda no es una fecha.
 */
export function parseCargaMasiva(text) {
  const filas = [];
  const errores = [];
  const lines = String(text ?? '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  lines.forEach((line, i) => {
    const sep = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
    const [fecha, categoria = '', interno = '', ramal = '', chofer = '', ...detalle] = line.split(sep).map(c => c.trim());
    const f = parseFecha(fecha);
    if (!f) {
      if (i > 0) errores.push(`Fila ${i + 1}: no entiendo la fecha "${fecha}"`);
      return;
    }
    filas.push({
      fecha: `${f}T12:00:00`,
      categoria,
      numeroUnidad: interno.replace(/\D/g, ''),
      ramal: ramal.toUpperCase().slice(0, 1),
      legajoChofer: chofer,
      descripcion: detalle.join(sep === ',' ? ', ' : ' ').trim(),
    });
  });
  return { filas, errores };
}
