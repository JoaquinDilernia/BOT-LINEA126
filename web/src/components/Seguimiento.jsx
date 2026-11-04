import { useEffect, useState } from 'react';
import { reclamoDeUrl } from '../lib/chat.jsx';
import { IconCheck, IconSearch } from './icons.jsx';
import { apiGet } from '../lib/api.js';
import s from './Seguimiento.module.css';

const ESTADOS = {
  abierto: { label: 'Recibido', paso: 1 },
  en_progreso: { label: 'En revisión', paso: 2 },
  resuelto: { label: 'Respondido', paso: 3 },
  cerrado: { label: 'Cerrado', paso: 3 },
};

const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

// "Consultá el estado de tu reclamo": en la página de Reclamos y en el inicio.
export default function Seguimiento({ idPrefix = 'seg', className = '' }) {
  const [numero, setNumero] = useState(() => reclamoDeUrl());
  const [estado, setEstado] = useState({ loading: false, error: '', reclamo: null });

  // Desde el link del mail (?reclamo=...) se busca solo.
  useEffect(() => { if (numero) buscar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function buscar(e) {
    e?.preventDefault();
    let n = numero.trim().toUpperCase().replace(/\s+/g, '');
    if (/^\d{1,6}$/.test(n)) n = `R126-${n.padStart(6, '0')}`;
    if (!/^R126-\d{6}$/.test(n)) {
      setEstado({ loading: false, error: 'Ingresá el número como figura en tu constancia, por ejemplo R126-000123.', reclamo: null });
      return;
    }
    setEstado({ loading: true, error: '', reclamo: null });
    try {
      const { reclamo } = await apiGet(`/reclamos/${n}`);
      setEstado({ loading: false, error: '', reclamo });
    } catch (err) {
      setEstado({ loading: false, error: err.message, reclamo: null });
    }
  }

  const r = estado.reclamo;
  const info = r ? ESTADOS[r.estado] ?? ESTADOS.abierto : null;

  return (
    <div className={`card ${s.track} ${className}`}>
      <form className={s.trackForm} onSubmit={buscar}>
        <div className="field">
          <label htmlFor={`${idPrefix}-numero`}>Número de reclamo</label>
          <input id={`${idPrefix}-numero`} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="R126-000123" autoComplete="off" />
        </div>
        <button type="submit" className="btn btn--dark" disabled={estado.loading}><IconSearch /> {estado.loading ? 'Buscando…' : 'Ver estado'}</button>
      </form>
      {estado.error && <p className={s.trackError} role="alert">{estado.error}</p>}
      {r && (
        <div className={s.trackResult} aria-live="polite">
          <div className={s.trackTop}>
            <div>
              <span className={s.trackNum}>{r.numero}</span>
              <h3>{r.titulo}</h3>
              <p>{r.categoria} · iniciado el {fecha(r.createdAt)}</p>
            </div>
            <span className={`${s.badge} ${s[`b_${r.estado}`] ?? ''}`}>{info.label}</span>
          </div>
          <ol className={s.progress}>
            {['Recibido', 'En revisión', 'Respondido'].map((p, i) => (
              <li key={p} className={i < info.paso ? s.done : ''}><span>{i < info.paso ? <IconCheck /> : i + 1}</span>{p}</li>
            ))}
          </ol>
          {r.respuestas?.length > 0 && (
            <div className={s.answers}>
              <h4>Respuesta de la línea</h4>
              {r.respuestas.map((a, i) => (
                <blockquote key={i}><p>{a.texto}</p><small>{fecha(a.createdAt)}</small></blockquote>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
