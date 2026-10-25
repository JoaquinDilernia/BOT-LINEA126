import { HashRouter, Route, Routes } from 'react-router-dom';
import { ChatProvider } from './lib/chat.jsx';
import SiteLayout from './components/SiteLayout.jsx';
import Inicio from './pages/Inicio.jsx';
import Recorridos from './pages/Recorridos.jsx';
import ComoLlego from './pages/ComoLlego.jsx';
import Horarios from './pages/Horarios.jsx';
import Tarifas from './pages/Tarifas.jsx';
import Atencion from './pages/Atencion.jsx';
import Empresa from './pages/Empresa.jsx';
import Trabaja from './pages/Trabaja.jsx';
import Contacto from './pages/Contacto.jsx';
import NotFound from './pages/NotFound.jsx';

// HashRouter: el sitio se sube como estático a Hostinger, sin reglas de
// reescritura en el servidor.
export default function App() {
  return (
    <HashRouter>
      <ChatProvider>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<Inicio />} />
            <Route path="como-llego" element={<ComoLlego />} />
            <Route path="recorridos" element={<Recorridos />} />
            <Route path="horarios" element={<Horarios />} />
            <Route path="tarifas" element={<Tarifas />} />
            <Route path="atencion" element={<Atencion />} />
            <Route path="empresa" element={<Empresa />} />
            <Route path="trabaja" element={<Trabaja />} />
            <Route path="contacto" element={<Contacto />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </ChatProvider>
    </HashRouter>
  );
}
