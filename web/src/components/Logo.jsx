import s from './Logo.module.css';

// Logo oficial de la empresa ("Cardenas S.A." arriba, "LÍNEA 126" abajo).
// En fondo claro va la versión oscura; en el pie (fondo negro), la blanca.
export default function Logo({ inverted = false }) {
  return (
    <img
      className={`${s.logo} ${inverted ? s.inverted : ''}`}
      src={inverted ? '/marca/apilado-blanco.png' : '/marca/apilado-negro.png'}
      alt="Cárdenas S.A. — Línea 126"
      width="520"
      height="241"
    />
  );
}
