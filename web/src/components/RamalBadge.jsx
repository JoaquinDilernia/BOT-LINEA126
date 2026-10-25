import s from './RamalBadge.module.css';

// Letra del ramal como en el cartel: común = rojo lleno, sólo días hábiles =
// contorno, expreso = negro con franja roja.
export default function RamalBadge({ letra, tipo = 'comun', size = 'md' }) {
  return (
    <span className={`${s.badge} ${s[tipo]} ${s[size]}`} aria-label={`Ramal ${letra}`}>
      {letra}
    </span>
  );
}
