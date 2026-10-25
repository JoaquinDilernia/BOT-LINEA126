import { Link } from 'react-router-dom';
import PageHero from '../components/PageHero.jsx';
import { usePageTitle } from '../lib/hooks.js';

export default function NotFound() {
  usePageTitle('Página no encontrada');
  return (
    <PageHero kicker="Error 404" title="Esta parada no existe">
      <p>La página que buscás no está en el recorrido.</p>
      <p style={{ marginTop: 24 }}><Link to="/" className="btn btn--light">Volver al inicio</Link></p>
    </PageHero>
  );
}
