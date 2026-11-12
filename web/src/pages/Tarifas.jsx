import { useState } from 'react';
import PageHero from '../components/PageHero.jsx';
import { IconAccessible, IconCard, IconChat, IconInfo, IconSwap, IconShield } from '../components/icons.jsx';
import { useApi, usePageTitle, useReveal } from '../lib/hooks.js';
import { useChat } from '../lib/chat.jsx';
import { SECCIONADOS, peso, tarifaEntre } from '../data/linea.js';
import s from './Tarifas.module.css';

export default function Tarifas() {
  usePageTitle('Tarifas');
  useReveal();
  const { openChat } = useChat();
  const { data } = useApi('/tarifas');
  const [desde, setDesde] = useState(0);
  const [hasta, setHasta] = useState(SECCIONADOS.length - 1);
  const t = tarifaEntre(desde, hasta);
  const tramos = Math.abs(desde - hasta);

  const boletos = (data?.tarifas ?? []).filter((x) => /^boleto/i.test(x.servicio));
  const otros = (data?.tarifas ?? []).filter((x) => !/^boleto/i.test(x.servicio));

  return (
    <>
      <PageHero kicker="Tarifas" title="Cuánto sale tu boleto">
        La 126 cobra por secciones: el precio depende de cuántos tramos viajás. Se paga sólo con SUBE.
      </PageHero>

      <section className="section">
        <div className={`container ${s.calcGrid}`}>
          <div className={`card ${s.calc}`}>
            <h2><IconCard /> Calculadora</h2>
            <p className={s.calcLead}>Elegí dónde subís y dónde bajás (el punto de control más cercano).</p>
            <div className={s.selects}>
              <div className="field">
                <label htmlFor="desde">Subo en</label>
                <select id="desde" value={desde} onChange={(e) => setDesde(Number(e.target.value))}>
                  {SECCIONADOS.map((p, i) => <option key={p.nombre} value={i}>{p.nombre} ({p.barrio})</option>)}
                </select>
              </div>
              <button type="button" className={s.swap} onClick={() => { setDesde(hasta); setHasta(desde); }} aria-label="Invertir"><IconSwap /></button>
              <div className="field">
                <label htmlFor="hasta">Bajo en</label>
                <select id="hasta" value={hasta} onChange={(e) => setHasta(Number(e.target.value))}>
                  {SECCIONADOS.map((p, i) => <option key={p.nombre} value={i}>{p.nombre} ({p.barrio})</option>)}
                </select>
              </div>
            </div>

            {t ? (
              <div className={s.result} aria-live="polite">
                <div className={s.main}>
                  <span>Con SUBE registrada · {tramos} {tramos === 1 ? 'tramo' : 'tramos'}</span>
                  <strong>{peso(t.general)}</strong>
                </div>
                <div className={s.alt}>
                  <div><span>Sin registrar</span><strong>{peso(t.sinRegistrar)}</strong></div>
                  <div><span>Tarifa Social</span><strong>{peso(t.social)}</strong></div>
                </div>
              </div>
            ) : (
              <div className={s.result}><p className={s.same}>Elegí dos puntos distintos para calcular.</p></div>
            )}
            <p className={s.hint}><IconInfo /> Decile al chofer hasta dónde vas antes de apoyar la SUBE. Si tu parada queda entre dos puntos, se toma el siguiente.</p>
            <button type="button" className={`btn btn--ghost btn--sm ${s.askBtn}`} onClick={() => openChat('¿Cuánto sale el boleto de ')}><IconChat /> Preguntá por tu parada exacta</button>
          </div>

          <div className={s.matrix}>
            <h3>Tarifa general con SUBE registrada</h3>
            <div className={s.steps}>
              {[
                { l: '1 tramo', v: 742.81 },
                { l: '2 tramos', v: 861.66 },
                { l: '3 a 4 tramos', v: 1002.8 },
                { l: '5 tramos o más', v: 1151.36 },
              ].map((x, i) => (
                <div key={x.l} className={s.step} style={{ '--h': `${55 + i * 15}%` }}>
                  <strong>{peso(x.v)}</strong>
                  <span className={s.bar} />
                  <small>{x.l}</small>
                </div>
              ))}
            </div>
            <p className={s.matrixNote}>Valores vigentes desde julio de 2026 para líneas nacionales del AMBA. Sin SUBE registrada se paga el doble.</p>
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className="container">
          <div className="sectionHead reveal">
            <span className="kicker">Beneficios</span>
            <h2>Viajá pagando menos</h2>
          </div>
          <div className={s.benefits}>
            <article className="card reveal">
              <span className={s.pct}>55%</span>
              <h3>Tarifa Social Federal</h3>
              <p>Para jubilados y pensionados, AUH y AUE, Potenciar Trabajo, ex combatientes de Malvinas, monotributo social y personal de casas particulares. Se asocia desde Mi SUBE.</p>
            </article>
            <article className="card reveal">
              <IconAccessible className={s.bIcon} />
              <h3>Pase libre con CUD</h3>
              <p>Las personas con Certificado Único de Discapacidad viajan sin cargo, y un acompañante si el certificado lo indica. Se presenta el <strong>CUD original y vigente</strong> al chofer.</p>
            </article>
            <article className="card reveal">
              <IconSwap className={s.bIcon} />
              <h3>Red SUBE</h3>
              <p>Si combinás colectivo, tren o subte dentro de las 2 horas, pagás 50% menos en el segundo viaje y 75% del tercero en adelante.</p>
            </article>
            <article className="card reveal">
              <IconShield className={s.bIcon} />
              <h3>Registrá tu SUBE</h3>
              <p>Registrada pagás la tarifa normal, recuperás el saldo si la perdés y accedés a los beneficios. Es gratis en argentina.gob.ar/sube.</p>
            </article>
          </div>

          {boletos.length > 0 && (
            <div className={`card reveal ${s.oficial}`}>
              <h3>Cuadro tarifario por distancia</h3>
              <div className={s.oficialGrid}>
                {boletos.map((b) => (
                  <div key={b.id}>
                    <span>{b.servicio.replace(/^Boleto\s*/i, '')}</span>
                    <strong>{b.tarifa}</strong>
                    {b.notas && <small>{b.notas}</small>}
                  </div>
                ))}
              </div>
              {otros.length > 0 && (
                <ul className={s.otros}>
                  {otros.map((o) => <li key={o.id}><strong>{o.servicio}:</strong> {o.tarifa}{o.notas ? ` — ${o.notas}` : ''}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
