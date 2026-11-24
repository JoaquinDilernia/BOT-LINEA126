// Pre-render para SEO: después de `vite build` abre cada ruta en Chrome
// (puppeteer-core con el Chrome instalado) y guarda el HTML ya armado en
// dist/<ruta>.html, para que Google lea título, meta y contenido sin
// depender de JavaScript. También genera dist/sitemap.xml y dist/404.html.
//
// Chrome: CHROME_PATH o la ruta por defecto de Windows.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { preview } from 'vite';
import puppeteer from 'puppeteer-core';
import { PAGINAS, SITE } from '../src/data/seo.js';

const DIST = join(import.meta.dirname, '..', 'dist');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const RUTAS = Object.keys(PAGINAS);

const server = await preview({ preview: { port: 4179, strictPort: true }, logLevel: 'warn' });
const base = 'http://localhost:4179';
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });

async function render(path) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await page.waitForSelector('main, #contenido', { timeout: 10000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 800));
  const html = await page.evaluate(() => {
    // El SW y los tiles del mapa no tienen que quedar en el HTML estático.
    document.querySelectorAll('.leaflet-tile-container img').forEach((img) => img.remove());
    return `<!doctype html>\n${document.documentElement.outerHTML}`;
  });
  const titulo = await page.title();
  await page.close();
  return { html, titulo };
}

const salida = {};
try {
  for (const ruta of RUTAS) {
    const { html, titulo } = await render(ruta);
    if (!html.includes('id="root"') || html.length < 5000) throw new Error(`render vacío en ${ruta}`);
    salida[ruta === '/' ? 'index.html' : `${ruta.slice(1)}.html`] = html;
    console.log(`  ${ruta.padEnd(12)} ${Math.round(html.length / 1024)} kB · ${titulo}`);
  }
  salida['404.html'] = (await render('/pagina-que-no-existe')).html;
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}

// Se escribe al final: mientras renderiza, preview necesita el index.html vacío.
for (const [archivo, html] of Object.entries(salida)) await writeFile(join(DIST, archivo), html);

const hoy = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${RUTAS.map((r) => `  <url><loc>${SITE}${r}</loc><lastmod>${hoy}</lastmod><changefreq>${PAGINAS[r].frecuencia}</changefreq><priority>${PAGINAS[r].prioridad.toFixed(1)}</priority></url>`).join('\n')}
</urlset>
`;
await writeFile(join(DIST, 'sitemap.xml'), sitemap);
console.log(`prerender OK: ${RUTAS.length} páginas + 404 + sitemap.xml`);
