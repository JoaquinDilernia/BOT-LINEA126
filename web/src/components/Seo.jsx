import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { NOT_FOUND, OG_IMAGE, PAGINAS, SITE, jsonLd } from '../data/seo.js';

// Pone en el <head> el título, la descripción, el canonical, Open Graph y el
// JSON-LD de la ruta actual. Actualiza los tags existentes (los que dejó el
// prerender) en vez de duplicarlos.
function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

export default function Seo() {
  const { pathname } = useLocation();
  useEffect(() => {
    const path = pathname === '/atencion' ? '/reclamos' : pathname.replace(/\/+$/, '') || '/';
    const pag = PAGINAS[path] ?? NOT_FOUND;
    const url = `${SITE}${path === '/' ? '/' : path}`;
    document.title = pag.title;
    setMeta('name', 'description', pag.description);
    setMeta('name', 'robots', pag.noindex ? 'noindex' : 'index, follow, max-image-preview:large');
    setMeta('property', 'og:title', pag.title);
    setMeta('property', 'og:description', pag.description);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'Línea 126');
    setMeta('property', 'og:locale', 'es_AR');
    setMeta('property', 'og:image', OG_IMAGE);
    setMeta('name', 'twitter:card', 'summary_large_image');

    let canon = document.head.querySelector('link[rel="canonical"]');
    if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; document.head.appendChild(canon); }
    canon.href = url;

    document.head.querySelectorAll('script[data-seo]').forEach((s) => s.remove());
    const ld = pag.noindex ? null : jsonLd(path);
    if (ld) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.dataset.seo = '1';
      s.textContent = JSON.stringify(ld);
      document.head.appendChild(s);
    }
  }, [pathname]);
  return null;
}
