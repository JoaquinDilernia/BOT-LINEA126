import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import Logo from './Logo.jsx';
import ChatWidget from './ChatWidget.jsx';
import NovedadesBanner, { useNovedades } from './Novedades.jsx';
import { IconChat, IconClose, IconMenu, IconPhone, IconPin, IconClock, IconSearch } from './icons.jsx';
import { useChat } from '../lib/chat.jsx';
import { useInstallPrompt } from '../lib/install.js';
import { EMPRESA } from '../data/linea.js';
import s from './SiteLayout.module.css';

const NAV = [
  { to: '/como-llego', label: 'Cómo llego' },
  { to: '/recorridos', label: 'Recorridos' },
  { to: '/horarios', label: 'Horarios' },
  { to: '/tarifas', label: 'Tarifas' },
  { to: '/reclamos', label: 'Reclamos' },
  { to: '/empresa', label: 'La empresa' },
  { to: '/trabaja', label: 'Trabajá con nosotros' },
];

export default function SiteLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const { openChat } = useChat();
  const { disponible: puedeInstalar, instalar } = useInstallPrompt();
  const novedades = useNovedades();

  useEffect(() => { setMenuOpen(false); window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <a href="#contenido" className={s.skip}>Saltar al contenido</a>
      <NovedadesBanner novedades={novedades} />
      <div className={s.topbar}>
        <div className={`container ${s.topbarInner}`}>
          <span><IconChat /> <button type="button" className={s.topbarLink} onClick={() => openChat()}>Chateá con nosotros</button> las 24 h</span>
          <span className={s.topbarHide}><IconSearch /> <Link to="/reclamos#seguimiento">Seguí tu reclamo</Link></span>
          <span className={s.topbarHide}><IconPin /> {EMPRESA.direccionCorta}</span>
        </div>
      </div>
      <header className={`${s.header} ${scrolled ? s.scrolled : ''}`}>
        <div className={`container ${s.headerInner}`}>
          <Link to="/" className={s.brand} aria-label="Línea 126 — inicio"><Logo /></Link>
          <nav className={s.nav} aria-label="Principal">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `${s.navLink} ${isActive ? s.active : ''}`}>{n.label}</NavLink>
            ))}
          </nav>
          <button type="button" className={`btn btn--sm ${s.headerCta}`} onClick={() => openChat()}>
            <IconChat /> Chat en vivo
          </button>
          <button type="button" className={s.burger} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </header>

      <div className={`${s.drawer} ${menuOpen ? s.drawerOpen : ''}`} aria-hidden={!menuOpen}>
        <nav aria-label="Menú móvil">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} tabIndex={menuOpen ? 0 : -1} className={({ isActive }) => `${s.drawerLink} ${isActive ? s.active : ''}`}>{n.label}</NavLink>
          ))}
          <NavLink to="/contacto" tabIndex={menuOpen ? 0 : -1} className={s.drawerLink}>Contacto</NavLink>
        </nav>
        <div className={s.drawerFoot}>
          {puedeInstalar && <button type="button" className="btn btn--dark" tabIndex={menuOpen ? 0 : -1} onClick={instalar}>Instalar la app de la 126</button>}
          <button type="button" className="btn" tabIndex={menuOpen ? 0 : -1} onClick={() => { setMenuOpen(false); openChat(); }}><IconChat /> Chateá con nosotros</button>
          <Link className="btn btn--ghost" tabIndex={menuOpen ? 0 : -1} to="/reclamos#seguimiento"><IconSearch /> Seguí tu reclamo</Link>
        </div>
      </div>

      <main id="contenido" className={s.main}>
        <Outlet />
      </main>

      <footer className={s.footer}>
        <div className={`container ${s.footerGrid}`}>
          <div className={s.footerBrand}>
            <Logo inverted />
            <p>Retiro ⇄ La Tablada y Cementerio de Villegas. Más de 27 km uniendo el centro porteño con La Matanza, todos los días.</p>
            <div className={s.footerBtns}>
              <button type="button" className="btn btn--light btn--sm" onClick={() => openChat()}><IconChat /> Chat 24 h</button>
              {puedeInstalar && <button type="button" className={`btn btn--sm ${s.installBtn}`} onClick={instalar}><IconPhone /> Instalar la app</button>}
            </div>
          </div>
          <div>
            <h3 className={s.footerTitle}>Viajá</h3>
            <ul className={s.footerList}>
              <li><Link to="/como-llego">Planificá tu viaje</Link></li>
              <li><Link to="/recorridos">Recorridos y paradas</Link></li>
              <li><Link to="/horarios">Horarios y frecuencias</Link></li>
              <li><Link to="/tarifas">Tarifas y calculadora</Link></li>
            </ul>
          </div>
          <div>
            <h3 className={s.footerTitle}>Ayuda</h3>
            <ul className={s.footerList}>
              <li><Link to="/reclamos">Hacer un reclamo</Link></li>
              <li><Link to="/reclamos#seguimiento">Seguí tu reclamo</Link></li>
              <li><Link to="/reclamos#perdidos">Objetos perdidos</Link></li>
              <li><Link to="/contacto">Contacto</Link></li>
            </ul>
          </div>
          <div>
            <h3 className={s.footerTitle}>Empresa</h3>
            <ul className={s.footerList}>
              <li><Link to="/empresa">Quiénes somos</Link></li>
              <li><Link to="/trabaja">Trabajá con nosotros</Link></li>
            </ul>
            <ul className={`${s.footerList} ${s.footerContact}`}>
              <li><IconPin /> {EMPRESA.direccionCorta}</li>
              <li><IconClock /> Oficinas: {EMPRESA.horarioOficina.toLowerCase()}</li>
            </ul>
          </div>
        </div>
        <div className={`container ${s.footerLegal}`}>
          <p>© {new Date().getFullYear()} {EMPRESA.nombre} · CUIT {EMPRESA.cuit}</p>
          <p>Servicio de jurisdicción nacional fiscalizado por la CNRT · <a href="https://www.argentina.gob.ar/cnrt" target="_blank" rel="noreferrer">cnrt.gob.ar</a></p>
        </div>
      </footer>

      <ChatWidget />
    </>
  );
}
