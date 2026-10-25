import { useState } from 'react';
import { SECCIONADOS } from '../data/linea.js';
import { SENTIDOS, fmtHora, primeraSalida, proximos } from '../lib/sim.js';
import { IconClock, IconSwap } from './icons.jsx';
import s from './NextBus.module.css';

const enTexto = (min) => (min < 1 ? 'llegando' : `${Math.round(min)} min`);

// "¿Cuándo pasa por mi parada?" sobre el horario programado.
export default function NextBus({ clock, dark = false, defaultPunto = 5 }) {
  const [punto, setPunto] = useState(defaultPunto);
  const [sentido, setSentido] = useState('haciaRetiro');
  const lista = proximos(clock.m, clock.dia, clock.diaAyer, sentido, punto, 3);
  const [primero, ...siguientes] = lista;
  // Si el próximo está a más de 2 h, en la práctica no hay servicio ahora.
  const sinServicio = !primero || primero.en > 120;

  return (
    <div className={`${s.box} ${dark ? s.dark : ''}`}>
      <div className={s.head}>
        <span className={s.live}><i /> Próximo colectivo</span>
        <button type="button" className={s.swap} onClick={() => setSentido(sentido === 'haciaRetiro' ? 'haciaTablada' : 'haciaRetiro')}>
          <IconSwap /> {SENTIDOS[sentido].label}
        </button>
      </div>
      <label htmlFor="nb-punto" className="srOnly">Parada</label>
      <select id="nb-punto" className={s.select} value={punto} onChange={(e) => setPunto(Number(e.target.value))}>
        {SECCIONADOS.map((p, i) => <option key={p.nombre} value={i}>{p.nombre} · {p.barrio}</option>)}
      </select>

      {sinServicio ? (
        <div className={s.big}>
          <strong className={s.none}>Sin servicio ahora</strong>
          <small><IconClock /> Primer servicio desde {SENTIDOS[sentido].origen}: {fmtHora(primeraSalida(clock.dia, sentido))}</small>
        </div>
      ) : (
        <div className={s.big} aria-live="polite">
          <strong key={Math.round(primero.en)}>{enTexto(primero.en)}</strong>
          <small><IconClock /> estimado {fmtHora(primero.hora)}{siguientes.length > 0 && ` · después en ${siguientes.map((x) => Math.round(x.en)).join(' y ')} min`}</small>
        </div>
      )}
      <p className={s.note}>Estimado según el horario programado. Puede variar por el tránsito.</p>
    </div>
  );
}
