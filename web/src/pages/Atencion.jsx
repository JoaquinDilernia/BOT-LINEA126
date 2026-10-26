import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import Seguimiento from '../components/Seguimiento.jsx';
import { CATEGORIA_ICON, IconBag, IconBus, IconChat, IconCheck, IconShield } from '../components/icons.jsx';
import { usePageTitle, useReveal } from '../lib/hooks.js';
import { useChat } from '../lib/chat.jsx';
import { CATEGORIAS_RECLAMO, EMPRESA, FAQ } from '../data/linea.js';
import s from './Atencion.module.css';

export default function Atencion() {
  usePageTitle('Reclamos');
  useReveal();
  const { openChat } = useChat();
  const { hash } = useLocation();
  const [faqOpen, setFaqOpen] = useState(0);

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }, [hash]);

  return (
    <>
      <PageHero
        kicker="Reclamos"
        title="Contanos qué pasó"
        aside={<button type="button" className="btn btn--light" onClick={() => openChat('Quiero hacer un reclamo')}><IconChat /> Chateá con nosotros</button>}
      >
        Hacé tu reclamo por el chat en minutos, a cualquier hora. Cada reclamo recibe un número para que sigas cómo avanza.
      </PageHero>

      <section className="section section--soft" id="seguimiento">
        <div className={`container ${s.split}`}>
          <div className="reveal">
            <span className="kicker">Seguí tu reclamo</span>
            <h2 className={s.h2}>¿Cómo va tu reclamo?</h2>
            <p className={s.lead}>Ingresá el número que te dio el chat. Vas a ver en qué etapa está y la respuesta de la línea.</p>
          </div>
          <div className="reveal"><Seguimiento idPrefix="rec" /></div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="sectionHead reveal">
            <span className="kicker">Hacé tu reclamo</span>
            <h2>¿Qué pasó en tu viaje?</h2>
            <p>Elegí el motivo y el chat te pide los datos: ramal, día, horario, lugar y el número de interno del colectivo.</p>
          </div>
          <div className={s.cats}>
            {CATEGORIAS_RECLAMO.map((c) => {
              const Icon = CATEGORIA_ICON[c.icon];
              const texto = c.id === 'objeto_perdido'
                ? 'Perdí un objeto en un colectivo de la 126'
                : c.id === 'otro' ? 'Quiero dejar una sugerencia' : `Quiero hacer un reclamo por ${c.label.toLowerCase()}`;
              return (
                <button key={c.id} type="button" className={`reveal ${s.cat}`} onClick={() => openChat(texto)}>
                  <span className={s.catIcon}><Icon /></span>
                  {c.label}
                </button>
              );
            })}
          </div>

          <div className={`reveal ${s.interno}`}>
            <IconBus />
            <div>
              <strong>Tené a mano el número de interno</strong>
              <p>Es el número pintado en el frente, los costados y atrás del colectivo, y adentro cerca del chofer. Lo necesitamos para tomar el reclamo: así sabemos exactamente qué unidad era.</p>
            </div>
          </div>

          <ol className={`reveal ${s.steps}`}>
            <li><span>1</span><div><strong>Contanos qué pasó</strong><p>En el chat, con tus palabras.</p></div></li>
            <li><span>2</span><div><strong>Recibí tu número</strong><p>Al registrar el reclamo te damos un número R126.</p></div></li>
            <li><span>3</span><div><strong>Seguilo acá</strong><p>Consultá el estado y la respuesta de la empresa.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="section section--soft" id="perdidos">
        <div className={`container ${s.split}`}>
          <div className="reveal">
            <span className="kicker">Objetos perdidos</span>
            <h2 className={s.h2}>¿Te olvidaste algo arriba del colectivo?</h2>
            <p className={s.lead}>Los objetos que encuentran los choferes se entregan en la terminal de La Tablada. Registralo cuanto antes con todos los detalles: aumenta mucho la chance de recuperarlo.</p>
            <ul className={s.checks}>
              <li><IconCheck /> Descripción del objeto (color, marca, contenido)</li>
              <li><IconCheck /> Día y horario aproximado del viaje</li>
              <li><IconCheck /> Ramal, sentido y dónde bajaste</li>
              <li><IconCheck /> Número de interno, si lo recordás</li>
            </ul>
            <button type="button" className="btn" onClick={() => openChat('Perdí un objeto en un colectivo de la 126')}><IconBag /> Registrar objeto perdido</button>
          </div>
          <div className={`reveal ${s.lostCard}`}>
            <h3>Retiro de objetos</h3>
            <p>{EMPRESA.direccion}</p>
            <p>{EMPRESA.horarioOficina}, presentando DNI.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className={`container ${s.split}`}>
          <div className="reveal">
            <span className="kicker">Preguntas frecuentes</span>
            <h2 className={s.h2}>Lo que más nos consultan</h2>
            <div className={s.cnrt}>
              <IconShield />
              <div>
                <strong>Comisión Nacional de Regulación del Transporte</strong>
                <p>La 126 es una línea de jurisdicción nacional. Si tu reclamo no fue resuelto, podés presentarlo ante la CNRT en argentina.gob.ar/cnrt.</p>
              </div>
            </div>
          </div>
          <div className={`reveal ${s.faq}`}>
            {FAQ.map((f, i) => (
              <div key={f.q} className={`${s.faqItem} ${faqOpen === i ? s.faqOpen : ''}`}>
                <button type="button" aria-expanded={faqOpen === i} onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}>
                  {f.q}<span aria-hidden="true" />
                </button>
                <div className={s.faqBody}><div><p>{f.a}</p></div></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
