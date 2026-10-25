import s from './BusArt.module.css';

// Colectivo de perfil con la pintura de la 126 (rojo con corte diagonal
// blanco, vidrios negros). Ilustración propia: no depende de fotos de terceros.
// Con `animated` las ruedas giran y la carrocería rebota sobre la suspensión,
// como si fuera andando (la ruta y el fondo los mueve quien lo usa).
function Wheel({ cx }) {
  return (
    <g className={s.wheel} style={{ transformOrigin: `${cx}px 222px` }}>
      <circle cx={cx} cy="222" r="30" fill="#141414" />
      <circle cx={cx} cy="222" r="21" fill="#2b2e33" />
      <circle cx={cx} cy="222" r="17" fill="#a7adb3" />
      {[0, 72, 144, 216, 288].map((a) => (
        <rect key={a} x={cx - 2.2} y="206" width="4.4" height="12" rx="2" fill="#5d6368" transform={`rotate(${a} ${cx} 222)`} />
      ))}
      <circle cx={cx} cy="222" r="5.5" fill="#d7141a" />
    </g>
  );
}

export default function BusArt({ className, ramal = 'A', animated = false, night = false }) {
  return (
    <svg
      className={`${className ?? ''} ${animated ? s.animated : ''} ${night ? s.night : ''}`}
      viewBox="0 0 640 260"
      overflow="visible"
      role="img"
      aria-label="Colectivo de la Línea 126"
    >
      <defs>
        <clipPath id="busBody"><path d="M40 40c0-14 11-25 25-25h470c40 0 66 24 78 62l12 38v88c0 12-10 22-22 22H62c-12 0-22-10-22-22V40Z" /></clipPath>
        <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2d31" />
          <stop offset="1" stopColor="#0d0e10" />
        </linearGradient>
        <linearGradient id="glassNight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe39a" />
          <stop offset="1" stopColor="#f0a93a" />
        </linearGradient>
        <radialGradient id="beam" cx="0" cy=".5" r="1">
          <stop offset="0" stopColor="#fff3c4" stopOpacity=".75" />
          <stop offset=".35" stopColor="#ffe7a3" stopOpacity=".22" />
          <stop offset="1" stopColor="#ffe7a3" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <ellipse className={s.shadow} cx="330" cy="250" rx="300" ry="9" fill="#000" opacity=".35" />

      {/* Haz de luz delantero */}
      {(animated || night) && <ellipse className={s.beam} cx="622" cy="160" rx={night ? 230 : 150} ry={night ? 46 : 34} fill="url(#beam)" />}

      {/* Cabeceo al frenar (pitch) → rebote de suspensión (bounce) */}
      <g className={s.pitch}>
        <g className={s.bounce}>
          <g clipPath="url(#busBody)">
            <rect x="0" y="0" width="660" height="260" fill="#d7141a" />
            <path d="M300 260 470 60h70L380 260Z" fill="#fff" />
            <path d="M395 260 545 85h40L445 260Z" fill="#fff" opacity=".9" />
            <rect x="0" y="0" width="660" height="34" fill="#141414" />
            <rect x="0" y="196" width="660" height="30" fill="#b30f14" />
            {/* Reflejo que recorre la carrocería */}
            {animated && <rect className={s.sheen} x="-200" y="0" width="140" height="260" fill="url(#shine)" transform="skewX(-20)" />}
          </g>
          {/* ventanillas */}
          <g fill={night ? 'url(#glassNight)' : 'url(#glass)'}>
            <rect x="62" y="52" width="92" height="74" rx="8" />
            <rect x="164" y="52" width="92" height="74" rx="8" />
            <rect x="266" y="52" width="92" height="74" rx="8" />
            <rect x="368" y="52" width="92" height="74" rx="8" />
            <path d="M472 52h62c26 0 44 16 52 40l8 34H472Z" />
          </g>
          {/* pasajeros */}
          <g fill={night ? '#5a3b12' : '#3b3f45'}>
            <circle cx="100" cy="104" r="9" /><rect x="88" y="113" width="24" height="16" rx="8" />
            <circle cx="300" cy="100" r="9" /><rect x="288" y="109" width="24" height="18" rx="8" />
            <circle cx="404" cy="104" r="8.5" /><rect x="392" y="112" width="23" height="16" rx="8" />
            <circle cx="520" cy="98" r="9" /><rect x="507" y="107" width="26" height="20" rx="8" />
          </g>
          <g fill="#fff" opacity=".12">
            <path d="M70 58h30l-24 62h-6Z" /><path d="M172 58h30l-24 62h-6Z" /><path d="M274 58h30l-24 62h-6Z" /><path d="M376 58h30l-24 62h-6Z" />
          </g>
          {/* puertas */}
          <rect x="478" y="132" width="44" height="64" rx="4" fill="#141414" opacity=".85" />
          <rect x="226" y="132" width="44" height="64" rx="4" fill="#141414" opacity=".85" />
          {/* cartel */}
          <rect x="486" y="20" width="100" height="22" rx="4" fill="#0d0e10" />
          <text className={s.sign} x="536" y="36" textAnchor="middle" fontFamily="Barlow Condensed, Arial Narrow, sans-serif" fontWeight="800" fontSize="17" fill="#ffb21a">126 {ramal}</text>
          {/* número y marca */}
          <text x="70" y="176" fontFamily="Barlow Condensed, Arial Narrow, sans-serif" fontWeight="800" fontSize="44" fill="#fff" letterSpacing="-1">126</text>
          <text x="72" y="192" fontFamily="Barlow, Arial, sans-serif" fontWeight="700" fontSize="11" fill="#fff" letterSpacing="2.4">CÁRDENAS S.A.</text>
          {/* luces */}
          <rect className={s.headlight} x="606" y="150" width="16" height="10" rx="3" fill="#ffe7a3" />
          <rect className={s.taillight} x="40" y="150" width="8" height="18" rx="2" fill="#ff5a5f" />
          {/* símbolo accesible */}
          <g transform="translate(286 150)">
            <rect width="30" height="30" rx="6" fill="#1565c0" />
            <circle cx="15" cy="8" r="2.6" fill="#fff" />
            <path d="M11 12h7M14.5 12v6h4.5l1.6 4" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M12 16a4.5 4.5 0 1 0 5.6 5.6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </g>
          {/* pasaruedas */}
          <path d="M100 226a40 40 0 0 1 80 0Z" fill="#8c0d11" />
          <path d="M480 226a40 40 0 0 1 80 0Z" fill="#8c0d11" />
        </g>
      </g>

      <Wheel cx={140} />
      <Wheel cx={520} />
    </svg>
  );
}
