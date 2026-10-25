import { useState } from 'react';
import PageHero from '../components/PageHero.jsx';
import { IconBriefcase, IconBus, IconCheck, IconShield } from '../components/icons.jsx';
import { apiPost } from '../lib/api.js';
import { usePageTitle, useReveal } from '../lib/hooks.js';
import s from './Trabaja.module.css';

const PUESTOS = [
  { id: 'Chofer', icon: IconBus, text: 'Licencia profesional D1 o superior vigente, libreta sanitaria y experiencia en transporte de pasajeros.' },
  { id: 'Mecánico/a', icon: IconShield, text: 'Experiencia en mantenimiento de unidades de transporte pesado: motor, frenos, electricidad o carrocería.' },
  { id: 'Administración', icon: IconBriefcase, text: 'Atención al pasajero, recursos humanos, tráfico y tareas administrativas en la sede de La Tablada.' },
];

const VACIO = { nombre: '', email: '', telefono: '', puesto: 'Chofer', licencia: '', zona: '', mensaje: '', cvUrl: '' };

export default function Trabaja() {
  usePageTitle('Trabajá con nosotros');
  useReveal();
  const [form, setForm] = useState(VACIO);
  const [estado, setEstado] = useState({ sending: false, ok: false, error: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    setEstado({ sending: true, ok: false, error: '' });
    try {
      await apiPost('/postulaciones', form);
      setEstado({ sending: false, ok: true, error: '' });
      setForm(VACIO);
    } catch (err) {
      setEstado({ sending: false, ok: false, error: err.message });
    }
  }

  return (
    <>
      <PageHero kicker="Trabajá con nosotros" title="Sumate a la 126">
        Buscamos personas comprometidas con el servicio. Dejanos tus datos y el área de Recursos Humanos te contacta cuando haya una búsqueda abierta.
      </PageHero>

      <section className="section">
        <div className="container">
          <div className={s.puestos}>
            {PUESTOS.map(({ id, icon: Icon, text }) => (
              <article key={id} className={`card reveal ${s.puesto}`}>
                <Icon />
                <h3>{id}</h3>
                <p>{text}</p>
                <button type="button" className={s.pick} onClick={() => { setForm((f) => ({ ...f, puesto: id })); document.getElementById('postulacion')?.scrollIntoView({ behavior: 'smooth' }); }}>
                  Postularme
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--soft" id="postulacion">
        <div className={`container ${s.grid}`}>
          <div className="reveal">
            <span className="kicker">Postulación</span>
            <h2 className={s.h2}>Dejanos tus datos</h2>
            <ul className={s.why}>
              <li><IconCheck /> Relación de dependencia y convenio UTA</li>
              <li><IconCheck /> Capacitación al ingresar</li>
              <li><IconCheck /> Estabilidad en una empresa con trayectoria</li>
            </ul>
            <p className={s.privacy}>Usamos tus datos sólo para procesos de selección de Cárdenas S.A. y no los compartimos con terceros.</p>
          </div>

          <form className={`card reveal ${s.form}`} onSubmit={enviar} noValidate>
            {estado.ok ? (
              <div className={s.ok} role="status">
                <span><IconCheck /></span>
                <h3>¡Recibimos tu postulación!</h3>
                <p>Gracias por tu interés. Si tu perfil coincide con una búsqueda, te vamos a contactar por teléfono o email.</p>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEstado({ sending: false, ok: false, error: '' })}>Enviar otra</button>
              </div>
            ) : (
              <>
                <div className={s.row}>
                  <div className="field"><label htmlFor="nombre">Nombre y apellido *</label><input id="nombre" value={form.nombre} onChange={set('nombre')} required autoComplete="name" /></div>
                  <div className="field">
                    <label htmlFor="puesto">Puesto *</label>
                    <select id="puesto" value={form.puesto} onChange={set('puesto')}>
                      {['Chofer', 'Mecánico/a', 'Administración', 'Otro'].map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className={s.row}>
                  <div className="field"><label htmlFor="email">Email *</label><input id="email" type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></div>
                  <div className="field"><label htmlFor="telefono">Teléfono *</label><input id="telefono" type="tel" value={form.telefono} onChange={set('telefono')} required autoComplete="tel" /></div>
                </div>
                <div className={s.row}>
                  {form.puesto === 'Chofer' && (
                    <div className="field"><label htmlFor="licencia">Licencia de conducir</label><input id="licencia" value={form.licencia} onChange={set('licencia')} placeholder="Ej: D1 profesional" /></div>
                  )}
                  <div className="field"><label htmlFor="zona">Zona donde vivís</label><input id="zona" value={form.zona} onChange={set('zona')} placeholder="Ej: San Justo" /></div>
                </div>
                <div className="field"><label htmlFor="cvUrl">Link a tu CV</label><input id="cvUrl" type="url" value={form.cvUrl} onChange={set('cvUrl')} placeholder="https://drive.google.com/…" /><small>Opcional. Subilo a Google Drive o similar y pegá el link con acceso público.</small></div>
                <div className="field"><label htmlFor="mensaje">Contanos sobre tu experiencia</label><textarea id="mensaje" value={form.mensaje} onChange={set('mensaje')} maxLength={2000} /></div>
                {estado.error && <p className={s.error} role="alert">{estado.error}</p>}
                <button type="submit" className="btn" disabled={estado.sending}>{estado.sending ? 'Enviando…' : 'Enviar postulación'}</button>
              </>
            )}
          </form>
        </div>
      </section>
    </>
  );
}
