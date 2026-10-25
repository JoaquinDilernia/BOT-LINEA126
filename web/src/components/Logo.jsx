import s from './Logo.module.css';

// Placa "126" con el corte diagonal blanco de la pintura de la flota. Si la
// empresa pasa su logo oficial, se reemplaza este componente y listo.
export default function Logo({ inverted = false, compact = false }) {
  return (
    <span className={`${s.logo} ${inverted ? s.inverted : ''}`}>
      <span className={s.plate} aria-hidden="true">
        <span className={s.stripe} />
        <span className={s.num}>126</span>
      </span>
      {!compact && (
        <span className={s.text}>
          <span className={s.name}>Línea 126</span>
          <span className={s.sub}>Cárdenas S.A.</span>
        </span>
      )}
      <span className="srOnly">Línea 126 — Cárdenas S.A.</span>
    </span>
  );
}
