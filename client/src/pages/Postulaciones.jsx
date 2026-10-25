import { useEffect, useMemo, useState } from 'react';
import { authFetch, BASE_URL } from '../lib/api';
import styles from './Postulaciones.module.css';

const ESTADOS = [
  { id: 'nueva', label: 'Nueva' },
  { id: 'vista', label: 'Vista' },
  { id: 'contactada', label: 'Contactada' },
  { id: 'descartada', label: 'Descartada' },
];

function fecha(ts) {
  const ms = ts?._seconds ? ts._seconds * 1000 : ts ? new Date(ts).getTime() : NaN;
  if (Number.isNaN(ms)) return '';
  return new Date(ms).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// CVs que llegan desde "Trabajá con nosotros" del sitio institucional.
export default function Postulaciones() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [puesto, setPuesto] = useState('');
  const [estado, setEstado] = useState('');

  useEffect(() => {
    authFetch(BASE_URL + '/api/postulaciones')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('No se pudieron cargar las postulaciones'))))
      .then(d => setItems(d.postulaciones ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const puestos = useMemo(() => [...new Set(items.map(i => i.puesto))].sort(), [items]);
  const visibles = items.filter(i => (!puesto || i.puesto === puesto) && (!estado || i.estado === estado));

  async function cambiarEstado(id, nuevo) {
    const prev = items;
    setItems(list => list.map(i => (i.id === id ? { ...i, estado: nuevo } : i)));
    const r = await authFetch(`${BASE_URL}/api/postulaciones/${id}`, { method: 'PUT', body: { estado: nuevo } });
    if (!r.ok) { setItems(prev); setError('No se pudo guardar el estado'); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Postulaciones</h1>
          <p className={styles.subtitle}>Lo que llega desde "Trabajá con nosotros" del sitio.</p>
        </div>
        <div className={styles.filters}>
          <select value={puesto} onChange={e => setPuesto(e.target.value)} aria-label="Filtrar por puesto">
            <option value="">Todos los puestos</option>
            {puestos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={estado} onChange={e => setEstado(e.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            {ESTADOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className={styles.empty}>{items.length ? 'No hay postulaciones con esos filtros.' : 'Todavía no llegó ninguna postulación.'}</p>
      ) : (
        <ul className={styles.list}>
          {visibles.map(p => (
            <li key={p.id} className={`${styles.card} ${p.estado === 'nueva' ? styles.cardNew : ''}`}>
              <div className={styles.cardTop}>
                <div>
                  <p className={styles.name}>{p.nombre}</p>
                  <p className={styles.meta}>
                    <span className={styles.chip}>{p.puesto}</span>
                    {p.licencia && <span>Licencia {p.licencia}</span>}
                    {p.zona && <span>{p.zona}</span>}
                    <span>{fecha(p.createdAt)}</span>
                  </p>
                </div>
                <select className={styles.estado} value={p.estado ?? 'nueva'} onChange={e => cambiarEstado(p.id, e.target.value)} aria-label="Estado">
                  {ESTADOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <p className={styles.contact}>
                <a href={`mailto:${p.email}`}>{p.email}</a>
                <a href={`tel:${p.telefono}`}>{p.telefono}</a>
                {p.cvUrl && <a href={p.cvUrl} target="_blank" rel="noopener noreferrer">Ver CV ↗</a>}
              </p>
              {p.mensaje && <p className={styles.msg}>{p.mensaje}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
