import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles/global.css';
import App from './App.jsx';
import { registrarServiceWorker } from './lib/install.js';

// Links viejos del HashRouter (mails, QR, favoritos): /?reclamo=X#/reclamos
// pasa a /reclamos?reclamo=X. Va antes de montar el router.
const h = window.location.hash;
if (h.startsWith('#/')) {
  const [ruta, ancla] = h.slice(1).split('#');
  window.history.replaceState(null, '', `${ruta === '/atencion' ? '/reclamos' : ruta}${window.location.search}${ancla ? `#${ancla}` : ''}`);
}

registrarServiceWorker();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
