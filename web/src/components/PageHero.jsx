import s from './PageHero.module.css';

// Encabezado de las páginas internas: franja negra con el corte rojo de la flota.
export default function PageHero({ kicker, title, children, aside }) {
  return (
    <section className={s.hero}>
      <span className={s.slash} aria-hidden="true" />
      <div className={`container ${s.inner}`}>
        <div className={s.text}>
          {kicker && <span className={`kicker ${s.kicker}`}>{kicker}</span>}
          <h1 className="display">{title}</h1>
          {children && <div className={s.lead}>{children}</div>}
        </div>
        {aside && <div className={s.aside}>{aside}</div>}
      </div>
    </section>
  );
}
