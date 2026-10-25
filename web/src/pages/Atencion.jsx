import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import { CATEGORIA_ICON, IconBag, IconChat, IconCheck, IconPhone, IconSearch, IconShield } from '../components/icons.jsx';
import { apiGet } from '../lib/api.js';
import { usePageTitle, useReveal } from '../lib/hooks.js';
import { useChat } from '../lib/chat.jsx';
import { CATEGORIAS_RECLAMO, EMPRESA, FAQ } from '../data/linea.js';
import s from './Atencion.module.css';

const ESTADOS = {
  abierto: { label: 'Recibido', paso: 1 },
  en_progreso: { label: 'En revisión', paso: 2 },
  resuelto: { label: 'Respondido', paso: 3 },
  cerrado: { label: 'Cerrado', paso: 3 },
};

const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

function Seguimiento() {
  const [numero, setNumero] = useState('');
  const [estado, setEstado] = useState({ loading: false, error: '', reclamo: null });

  async function buscar(e) {
    e.preventDefault();
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
    <div className={`card ${s.track}`}>
      <form className={s.trackForm} onSubmit={buscar}>
        <div className="field">
          <label htmlFor="numero">Número de reclamo</label>
          <input id="numero" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="R126-000123" autoComplete="off" />
        </div>
        <button type="submit" className="btn btn--dark" disabled={estado.loading}><IconSearch /> {estado.loading ? 'Buscando…' : 'Consultar'}</button>
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

export default function Atencion() {
  usePageTitle('Atención al pasajero');
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
        kicker="Atención al pasajero"
        title="Estamos para ayudarte"
        aside={<button type="button" className="btn btn--light" onClick={() => openChat()}><IconChat /> Chatear ahora</button>}
      >
        Consultas, reclamos y objetos perdidos las 24 horas con nuestro asistente virtual. Cada reclamo recibe un número para que lo sigas.
      </PageHero>

      <section className="section">
        <div className="container">
          <div className="sectionHead reveal">
            <span className="kicker">Hacé tu reclamo</span>
            <h2>¿Qué pasó en tu viaje?</h2>
            <p>Elegí el motivo y el asistente te pide los datos necesarios: ramal, día, horario, lugar y, si lo tenés, el número de interno del colectivo.</p>
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

          <ol className={`reveal ${s.steps}`}>
            <li><span>1</span><div><strong>Contanos qué pasó</strong><p>En el chat, con tus palabras. El asistente te guía.</p></div></li>
            <li><span>2</span><div><strong>Recibí tu número</strong><p>Al registrar el reclamo te damos un número R126.</p></div></li>
            <li><span>3</span><div><strong>Seguilo acá</strong><p>Consultá el estado y la respuesta de la empresa.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="section section--soft" id="seguimiento">
        <div className={`container ${s.split}`}>
          <div className="reveal">
            <span className="kicker">Seguí tu reclamo</span>
            <h2 className={s.h2}>¿Cómo va tu reclamo?</h2>
            <p className={s.lead}>Ingresá el número que te dio el asistente. Vas a ver en qué etapa está y la respuesta de la línea apenas la cargue el área de atención.</p>
          </div>
          <div className="reveal"><Seguimiento /></div>
        </div>
      </section>

      <section className="section" id="perdidos">
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
            <a className={s.phone} href={EMPRESA.telefono0800Href}><IconPhone /> {EMPRESA.telefono0800}</a>
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className={`container ${s.split}`}>
          <div className="reveal">
            <span className="kicker">Preguntas frecuentes</span>
            <h2 className={s.h2}>Lo que más nos consultan</h2>
            <div className={s.cnrt}>
              <IconShield />
              <div>
                <strong>Comisión Nacional de Regulación del Transporte</strong>
                <p>La 126 es una línea de jurisdicción nacional. Si tu reclamo no fue resuelto, podés presentarlo ante la CNRT: 0800-333-0300 o argentina.gob.ar/cnrt.</p>
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
