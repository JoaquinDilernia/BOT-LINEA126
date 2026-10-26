import { useEffect, useRef, useState } from 'react';
import { IconAlert, IconArrow, IconClose, IconInfo } from './icons.jsx';
import { apiGet } from '../lib/api.js';
import s from './Novedades.module.css';

// Avisos que la línea carga en el panel (Novedades): desvíos, cortes, paros.
// Franja arriba de todo y, si alguno está marcado como destacado, un aviso
// emergente una vez por sesión.

const SEEN_KEY = 'l126_novedades_vistas';
const fecha = (iso) => new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

function readSeen() {
  try { return JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]'); } catch { return []; }
}
function markSeen(ids) {
  try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...new Set([...readSeen(), ...ids])])); } catch { /* sin storage */ }
}

export function useNovedades() {
  const [novedades, setNovedades] = useState([]);
  useEffect(() => {
    let alive = true;
    apiGet('/novedades').then(d => alive && setNovedades(d.novedades ?? [])).catch(() => {});
    return () => { alive = false; };
  }, []);
  return novedades;
}

const isAlerta = (n) => n.tipo !== 'info';

function Detalle({ n }) {
  return (
    <article className={s.item}>
      <span className={`${s.tag} ${isAlerta(n) ? s.tagAlert : ''}`}>{n.tipoLabel}</span>
      <h3>{n.titulo}</h3>
      {n.texto && <p>{n.texto}</p>}
      {(n.desde || n.hasta) && (
        <small>{n.desde ? `Desde el ${fecha(n.desde)}` : ''}{n.desde && n.hasta ? ' · ' : ''}{n.hasta ? `hasta el ${fecha(n.hasta)}` : ''}</small>
      )}
    </article>
  );
}

export default function NovedadesBanner({ novedades }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => {
    const destacadas = novedades.filter(n => n.destacado).map(n => n.id);
    const seen = readSeen();
    if (destacadas.some(id => !seen.includes(id))) setOpen(true);
  }, [novedades]);

  useEffect(() => {
    if (!open) return;
    markSeen(novedades.map(n => n.id));
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, novedades]);

  if (!novedades.length) return null;
  const [primera] = novedades;
  const Icon = isAlerta(primera) ? IconAlert : IconInfo;

  return (
    <>
      <button type="button" className={`${s.strip} ${isAlerta(primera) ? s.stripAlert : ''}`} onClick={() => setOpen(true)}>
        <span className={`container ${s.stripInner}`}>
          <Icon className={s.stripIcon} />
          <span className={s.stripText}><b>{primera.tipoLabel}:</b> {primera.titulo}</span>
          <span className={s.stripMore}>{novedades.length > 1 ? `+${novedades.length - 1} avisos` : 'Ver más'} <IconArrow /></span>
        </span>
      </button>

      {open && (
        <div className={s.backdrop} onClick={() => setOpen(false)}>
          <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby="novedades-title" onClick={(e) => e.stopPropagation()}>
            <header className={s.modalHead}>
              <h2 id="novedades-title">Novedades del servicio</h2>
              <button ref={closeRef} type="button" className={s.close} onClick={() => setOpen(false)} aria-label="Cerrar"><IconClose /></button>
            </header>
            <div className={s.modalBody}>
              {novedades.map(n => <Detalle key={n.id} n={n} />)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
