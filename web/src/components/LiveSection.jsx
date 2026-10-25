import { useMemo, useState } from 'react';
import LiveMap from './LiveMap.jsx';
import NextBus from './NextBus.jsx';
import { IconClock, IconInfo } from './icons.jsx';
import { useSimClock } from '../lib/useSim.js';
import { busesEn, fmtHora } from '../lib/sim.js';
import s from './LiveSection.module.css';

const DIA_LABEL = { habil: 'Día hábil', sabado: 'Sábado', domingo: 'Domingo / feriado' };
const VELOCIDAD = 24; // min simulados por segundo → el día entero en 60 s

export default function LiveSection() {
  const [rapido, setRapido] = useState(false);
  const clock = useSimClock(rapido ? { velocidad: VELOCIDAD, tickMs: 100 } : { tickMs: 1000 });
  const buses = useMemo(() => busesEn(clock.m, clock.dia, clock.diaAyer), [clock]);
  const aRetiro = buses.filter((b) => b.sentido === 'haciaRetiro').length;

  // Curva del día: colectivos en la calle cada 15 minutos.
  const curva = useMemo(() => {
    const pts = [];
    for (let m = 0; m < 1440; m += 15) pts.push(busesEn(m, clock.dia, clock.diaAyer).length);
    return pts;
  }, [clock.dia, clock.diaAyer]);
  const max = Math.max(...curva, 1);
  const cursor = (clock.m / 1440) * 100;

  return (
    <section className={`section ${s.section}`} id="en-vivo">
      <div className="container">
        <div className={s.head}>
          <div className="sectionHead reveal">
            <span className="kicker">La 126 ahora</span>
            <h2>Mirá la flota en movimiento</h2>
            <p>Cada pastilla es un colectivo según la diagramación vigente: rojos hacia Retiro, negros hacia La Tablada.</p>
          </div>
          <button type="button" className={`btn ${rapido ? 'btn--dark' : ''} ${s.lapse}`} onClick={() => setRapido((v) => !v)} aria-pressed={rapido}>
            {rapido ? 'Volver a la hora actual' : 'Ver un día entero en 60 segundos'}
          </button>
        </div>

        <div className={s.grid}>
          <div className={`reveal ${s.mapCol}`}>
            <LiveMap clock={clock} fast={rapido} height="min(600px, 72vh)" />
            <div className={s.hud}>
              <span className={s.clock}><IconClock /> {fmtHora(clock.m)}</span>
              <span className={s.day}>{DIA_LABEL[clock.dia]}</span>
              {rapido && <span className={s.badge}>Cámara rápida</span>}
            </div>
          </div>

          <aside className={`reveal ${s.side}`}>
            <div className={s.count}>
              <strong>{buses.length}</strong>
              <span>colectivos en circulación</span>
              <div className={s.split}>
                <span><i className={s.dotRed} /> {aRetiro} hacia Retiro</span>
                <span><i className={s.dotInk} /> {buses.length - aRetiro} hacia La Tablada</span>
              </div>
            </div>

            <div className={s.chart} aria-label="Colectivos en la calle a lo largo del día">
              <div className={s.bars}>
                {curva.map((n, i) => (
                  <span key={i} style={{ height: `${(n / max) * 100}%` }} className={Math.abs(i * 15 - clock.m) < 15 ? s.barNow : ''} />
                ))}
                <i className={s.cursor} style={{ left: `${cursor}%` }} />
              </div>
              <div className={s.axis}><span>0 h</span><span>6</span><span>12</span><span>18</span><span>24 h</span></div>
            </div>

            <NextBus clock={clock} />
            <p className={s.disclaimer}><IconInfo /> Simulación sobre el horario programado (Invierno 2026), no seguimiento GPS.</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
