// Plantilla de las piezas para redes de una novedad. Dibuja en <canvas> el
// mismo boceto (etiqueta, titular, bajada, puntos, cuándo, cierre) en cada
// medida, con la identidad de la campaña de lanzamiento (Linea126_Lanzamiento):
// fondos llenos rojo/negro/blanco, Inter Display Black en mayúsculas con el
// punto final, kicker espaciado, logo en pastilla y foto con corte diagonal.
// Los textos los escribe la persona (o los sugiere la IA); el diseño es fijo,
// así las calles y horarios salen tal cual.

export const FORMATOS = [
  // IG tapa ~250 px arriba (barra de progreso, perfil) y ~300 abajo (responder).
  { id: 'historia', label: 'Historia IG · Estado WhatsApp', medida: '1080 × 1920', w: 1080, h: 1920, safeTop: 200, safeBottom: 250, fotoH: 900 },
  { id: 'post', label: 'Post IG · Facebook', medida: '1080 × 1350', w: 1080, h: 1350, safeTop: 0, safeBottom: 0, fotoH: 500 },
  { id: 'cuadrado', label: 'Cuadrado · WhatsApp, Facebook', medida: '1080 × 1080', w: 1080, h: 1080, safeTop: 0, safeBottom: 0, fotoH: 380 },
  { id: 'horizontal', label: 'Horizontal · Facebook, X, web', medida: '1200 × 630', w: 1200, h: 630 },
];

const RED = '#c8121a';
const RED_DOT = '#d7141a';
const INK = '#141414';
const WHITE = '#ffffff';

export const FONDOS = { auto: 'Automático (según el tipo)', rojo: 'Rojo', negro: 'Negro', blanco: 'Blanco' };

const TEMAS = {
  rojo: {
    bg: RED, text: WHITE, sub: 'rgba(255,255,255,.9)', dot: WHITE, kicker: 'rgba(255,255,255,.82)', kickerPill: null,
    logo: { bg: WHITE, fg: RED, sub: null }, cuando: { bg: INK, fg: WHITE, icon: '#ff4a4a' },
    punto: { bg: 'rgba(0,0,0,.16)', fg: WHITE, marker: WHITE }, cierre: { block: null, label: 'rgba(255,255,255,.75)', fg: WHITE },
    marca: 'rgba(255,255,255,.07)',
  },
  negro: {
    bg: INK, text: WHITE, sub: '#c9c9c9', dot: RED_DOT, kicker: '#ff4d4d', kickerPill: null,
    logo: { bg: RED, fg: WHITE, sub: null }, cuando: { bg: RED, fg: WHITE, icon: WHITE },
    punto: { bg: 'rgba(255,255,255,.07)', fg: WHITE, marker: RED_DOT }, cierre: { block: null, label: '#ff4d4d', fg: WHITE },
    marca: 'rgba(255,255,255,.05)',
  },
  blanco: {
    bg: WHITE, text: INK, sub: '#4a4a4a', dot: RED, kicker: WHITE, kickerPill: INK,
    logo: { bg: RED, fg: WHITE, sub: '#555555' }, cuando: { bg: INK, fg: WHITE, icon: '#ff4a4a' },
    punto: { bg: '#f4f4f4', fg: INK, marker: RED }, cierre: { block: RED, label: 'rgba(255,255,255,.85)', fg: WHITE },
    marca: 'rgba(200,18,26,.06)',
  },
};

// Fondo por defecto: lo urgente en rojo, los cambios de recorrido en negro,
// los avisos generales en blanco.
const FONDO_TIPO = { paro: 'rojo', corte: 'rojo', desvio: 'negro', servicio: 'blanco', info: 'blanco' };
export function fondoDe(pieza, tipo) {
  const f = pieza?.fondo;
  return f && f !== 'auto' && TEMAS[f] ? f : FONDO_TIPO[tipo] ?? 'blanco';
}

const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";
export const FUENTES = ['900 100px Inter', '700 100px Inter', '600 100px Inter', '400 100px Inter'];

/**
 * Parte un texto en líneas que entran en maxWidth. `measure(str)` devuelve el
 * ancho. Una palabra que no entra sola se corta por letras.
 */
export function wrapLines(text, maxWidth, measure) {
  const words = String(text ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  const pushLong = (word) => {
    let chunk = '';
    for (const ch of word) {
      if (chunk && measure(chunk + ch) > maxWidth) { lines.push(chunk); chunk = ch; } else chunk += ch;
    }
    return chunk;
  };
  for (const w of words) {
    const tryLine = line ? `${line} ${w}` : w;
    if (measure(tryLine) <= maxWidth) { line = tryLine; continue; }
    if (line) lines.push(line);
    line = measure(w) <= maxWidth ? w : pushLong(w);
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Titular de la campaña: en mayúsculas y con el punto final dibujado aparte
 * (en color). Si termina en "?" o "!" se respeta y no lleva punto.
 */
export function titularParts(s) {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  if (/[?!]$/.test(t)) return { text: t, dot: false };
  return { text: t.replace(/[.…]+$/, '').trim(), dot: !!t };
}

export function slug(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'novedad';
}

// ---- helpers de dibujo -----------------------------------------------------

const hasLetterSpacing = (ctx) => 'letterSpacing' in ctx;

function setFont(ctx, weight, size) {
  ctx.font = `${weight} ${size}px ${FONT}`;
}

// Ancho con tracking (px por letra). Se mide sin tracking y se suma, así
// mide igual en navegadores con y sin ctx.letterSpacing.
function width(ctx, s, sp = 0) {
  if (hasLetterSpacing(ctx)) ctx.letterSpacing = '0px';
  return ctx.measureText(s).width + sp * Math.max(0, [...s].length - 1);
}

function text(ctx, s, x, y, sp = 0) {
  if (!sp) { if (hasLetterSpacing(ctx)) ctx.letterSpacing = '0px'; ctx.fillText(s, x, y); return; }
  if (hasLetterSpacing(ctx)) { ctx.letterSpacing = `${sp}px`; ctx.fillText(s, x, y); ctx.letterSpacing = '0px'; return; }
  let cx = x; // Safari viejo: letra por letra
  for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + sp; }
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Imagen "cover" dentro de un rectángulo (recorta lo que sobra).
function drawCover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s; const sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

// Pastilla "LÍNEA 126" (+ "Cárdenas S.A." al lado en fondo blanco).
function drawLogo(ctx, x, y, h, tema, { forceWhite = false } = {}) {
  const logo = forceWhite ? { bg: WHITE, fg: RED, sub: null } : tema.logo;
  const size = h * 0.56;
  setFont(ctx, 900, size);
  const sp = -size * 0.035;
  const tw = width(ctx, 'LÍNEA 126', sp);
  const padX = h * 0.3;
  roundRect(ctx, x, y, tw + padX * 2, h, h * 0.22);
  ctx.fillStyle = logo.bg;
  ctx.fill();
  ctx.fillStyle = logo.fg;
  ctx.textBaseline = 'middle';
  text(ctx, 'LÍNEA 126', x + padX, y + h * 0.53, sp);
  if (logo.sub) {
    setFont(ctx, 600, h * 0.44);
    ctx.fillStyle = logo.sub;
    text(ctx, 'Cárdenas S.A.', x + tw + padX * 2 + h * 0.35, y + h * 0.53);
  }
  ctx.textBaseline = 'alphabetic';
}

function drawClock(ctx, cx, cy, r, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.22);
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.55); ctx.lineTo(cx, cy); ctx.lineTo(cx + r * 0.42, cy + r * 0.25); ctx.stroke();
}

// Cierre: "MÁS INFO" espaciado + el dominio grande. En fondo blanco va en un
// bloque rojo (como el "CONOCELA" del afiche).
function measureCierre(ctx, pieza, tema, maxW, base) {
  if (!pieza.cierre) return { h: 0, draw: () => {} };
  const big = base.cierre;
  const pad = tema.cierre.block ? big * 0.8 : 0;
  setFont(ctx, 900, big);
  const sp = -big * 0.03;
  const lines = wrapLines(pieza.cierre, maxW - pad * 2, (s) => width(ctx, s, sp)).slice(0, 2);
  const label = big * 0.36;
  const inner = label * 1.9 + lines.length * big * 1.08;
  const h = inner + pad * 2;
  return {
    h,
    draw: (x, y) => {
      if (tema.cierre.block) {
        roundRect(ctx, x, y, maxW, h, big * 0.55);
        ctx.fillStyle = tema.cierre.block;
        ctx.fill();
      }
      const ix = x + pad;
      setFont(ctx, 700, label);
      ctx.fillStyle = tema.cierre.label;
      text(ctx, 'MÁS INFO', ix, y + pad + label * 0.9, label * 0.22);
      setFont(ctx, 900, big);
      ctx.fillStyle = tema.cierre.fg;
      lines.forEach((l, i) => text(ctx, l, ix, y + pad + label * 1.9 + big * 0.86 + i * big * 1.08, sp));
    },
  };
}

// Bloques de contenido medidos a una escala dada; devuelve alto total y los
// bloques para dibujar a partir de una y.
function measureContent(ctx, pieza, tema, maxW, base, k) {
  const sz = {
    kicker: Math.round(base.kicker * k), titular: Math.round(base.titular * k), bajada: Math.round(base.bajada * k),
    punto: Math.round(base.punto * k), cuando: Math.round(base.cuando * k),
  };
  const blocks = [];

  if (pieza.etiqueta) {
    const label = pieza.etiqueta.toUpperCase();
    const sp = sz.kicker * 0.24;
    setFont(ctx, 700, sz.kicker);
    const tw = width(ctx, label, sp);
    const pill = !!tema.kickerPill;
    const h = pill ? sz.kicker * 2 : sz.kicker * 1.1;
    blocks.push({ h, gap: sz.kicker * (pill ? 1.1 : 0.9), draw: (x, y) => {
      setFont(ctx, 700, sz.kicker);
      if (pill) {
        roundRect(ctx, x, y, tw + sz.kicker * 1.6, h, h / 2);
        ctx.fillStyle = tema.kickerPill; ctx.fill();
      }
      ctx.fillStyle = tema.kicker;
      ctx.textBaseline = 'middle';
      text(ctx, label, x + (pill ? sz.kicker * 0.8 : 0), y + h / 2 + sz.kicker * 0.04, sp);
      ctx.textBaseline = 'alphabetic';
    } });
  }

  const tit = titularParts(pieza.titular);
  if (tit.text) {
    const sp = -sz.titular * 0.04;
    const lh = sz.titular * 0.92;
    const dotR = sz.titular * 0.085;
    setFont(ctx, 900, sz.titular);
    const lines = wrapLines(tit.text, maxW, (s) => width(ctx, s, sp));
    // Si el punto no entra en la última línea, baja la última palabra.
    if (tit.dot && lines.length) {
      const last = lines[lines.length - 1];
      if (width(ctx, last, sp) + dotR * 2.6 > maxW) {
        const words = last.split(' ');
        if (words.length > 1) { lines[lines.length - 1] = words.slice(0, -1).join(' '); lines.push(words[words.length - 1]); }
      }
    }
    // Una palabra cortada por letras queda fea: que achique la escala.
    const palabras = new Set(tit.text.split(' '));
    const broken = lines.some(l => l.split(' ').some(p => !palabras.has(p)));
    blocks.push({ h: lines.length * lh, gap: sz.titular * 0.3, overflow: broken, draw: (x, y) => {
      setFont(ctx, 900, sz.titular);
      ctx.fillStyle = tema.text;
      lines.forEach((l, i) => text(ctx, l, x, y + sz.titular * 0.8 + i * lh, sp));
      if (tit.dot) {
        const last = lines[lines.length - 1];
        const lx = x + width(ctx, last, sp) + dotR * 1.25;
        const ly = y + sz.titular * 0.8 + (lines.length - 1) * lh - dotR;
        ctx.fillStyle = tema.dot;
        ctx.beginPath(); ctx.arc(lx, ly, dotR, 0, Math.PI * 2); ctx.fill();
      }
    } });
  }

  if (pieza.bajada) {
    const lh = sz.bajada * 1.3;
    setFont(ctx, 400, sz.bajada);
    const lines = wrapLines(pieza.bajada, maxW, (s) => width(ctx, s));
    blocks.push({ h: lines.length * lh, gap: sz.bajada * 1.0, draw: (x, y) => {
      setFont(ctx, 400, sz.bajada);
      ctx.fillStyle = tema.sub;
      lines.forEach((l, i) => text(ctx, l, x, y + sz.bajada * 0.95 + i * lh));
    } });
  }

  const puntos = (pieza.puntos ?? []).filter(Boolean);
  if (puntos.length) {
    const lh = sz.punto * 1.28;
    const pad = sz.punto * 0.62;
    const marker = sz.punto * 0.36;
    const indent = pad + marker + sz.punto * 0.6;
    setFont(ctx, 600, sz.punto);
    const items = puntos.map(p => wrapLines(p, maxW - indent - pad, (s) => width(ctx, s)));
    const itemGap = sz.punto * 0.32;
    const heights = items.map(ls => ls.length * lh + pad * 1.6);
    const h = heights.reduce((a, b) => a + b, 0) + itemGap * (items.length - 1);
    blocks.push({ h, gap: sz.punto * 1.0, draw: (x, y) => {
      let cy = y;
      items.forEach((ls, i) => {
        const ih = heights[i];
        roundRect(ctx, x, cy, maxW, ih, sz.punto * 0.5);
        ctx.fillStyle = tema.punto.bg; ctx.fill();
        ctx.fillStyle = tema.punto.marker;
        ctx.beginPath(); ctx.arc(x + pad + marker / 2, cy + pad * 0.8 + lh / 2, marker / 2, 0, Math.PI * 2); ctx.fill();
        setFont(ctx, 600, sz.punto);
        ctx.fillStyle = tema.punto.fg;
        ls.forEach((l, j) => text(ctx, l, x + indent, cy + pad * 0.8 + sz.punto * 0.98 + j * lh));
        cy += ih + itemGap;
      });
    } });
  }

  if (pieza.cuando) {
    const s = sz.cuando;
    const pad = s * 0.75;
    const icon = s * 0.95;
    const lh = s * 1.25;
    setFont(ctx, 700, s);
    const lines = wrapLines(pieza.cuando, maxW - pad * 2 - icon - pad * 0.5, (t) => width(ctx, t));
    const tw = Math.max(...lines.map(l => width(ctx, l)));
    const w = Math.min(maxW, tw + pad * 2.5 + icon);
    const h = lines.length * lh + pad * 1.3;
    blocks.push({ h, gap: 0, draw: (x, y) => {
      roundRect(ctx, x, y, w, h, Math.min(h / 2, s * 0.9));
      ctx.fillStyle = tema.cuando.bg; ctx.fill();
      drawClock(ctx, x + pad + icon / 2, y + h / 2, icon / 2, tema.cuando.icon);
      setFont(ctx, 700, s);
      ctx.fillStyle = tema.cuando.fg;
      const tx = x + pad + icon + pad * 0.5;
      const ty = y + (h - lines.length * lh) / 2 + s * 0.95;
      lines.forEach((l, i) => text(ctx, l, tx, ty + i * lh));
    } });
  }

  const total = blocks.reduce((acc, b, i) => acc + b.h + (i < blocks.length - 1 ? b.gap : 0), 0);
  return { total, blocks, overflow: blocks.some(b => b.overflow) };
}

// Escala más grande (de 1.3 a 0.45) en la que todo entra: con poco texto la
// letra crece, con mucho se achica.
function fitContent(ctx, pieza, tema, maxW, maxH, base) {
  let m;
  for (let k = 1.3; k >= 0.45; k -= 0.03) {
    m = measureContent(ctx, pieza, tema, maxW, base, k);
    if (m.total <= maxH && !m.overflow) return m;
  }
  return m;
}

function drawBlocks(ctx, m, x, y) {
  let cy = y;
  m.blocks.forEach((b) => { b.draw(x, cy); cy += b.h + b.gap; });
}

const BASE = {
  historia: { kicker: 34, titular: 150, bajada: 46, punto: 40, cuando: 40, cierre: 64, logo: 70 },
  post: { kicker: 30, titular: 128, bajada: 40, punto: 35, cuando: 35, cierre: 54, logo: 62 },
  cuadrado: { kicker: 26, titular: 112, bajada: 35, punto: 31, cuando: 31, cierre: 46, logo: 56 },
  horizontal: { kicker: 18, titular: 72, bajada: 24, punto: 21, cuando: 21, cierre: 30, logo: 44 },
};

function drawVertical(ctx, f, pieza, tema, foto) {
  const { w, h } = f;
  const base = BASE[f.id];
  const P = 90;
  ctx.fillStyle = tema.bg;
  ctx.fillRect(0, 0, w, h);

  let top;
  if (foto) {
    // Foto arriba y el fondo entra en diagonal (sube hacia la derecha), como Historia_01.
    const fh = f.fotoH;
    const cut = w * 0.13;
    drawCover(ctx, foto, 0, 0, w, fh);
    ctx.fillStyle = tema.bg;
    ctx.beginPath();
    ctx.moveTo(0, fh); ctx.lineTo(w, fh - cut); ctx.lineTo(w, h); ctx.lineTo(0, h);
    ctx.closePath(); ctx.fill();
    drawLogo(ctx, P, f.safeTop + 50, base.logo * 0.8, tema, { forceWhite: true });
    top = fh + 50;
  } else {
    drawLogo(ctx, P, f.safeTop + 80, base.logo, tema);
    top = f.safeTop + 80 + base.logo + 90;
  }

  const cierre = measureCierre(ctx, pieza, tema, w - P * 2, base);
  const footBottom = h - f.safeBottom - (tema.cierre.block ? 80 : 100);
  const footTop = footBottom - cierre.h;
  cierre.draw(P, footTop);

  const bottom = footTop - 80;
  const m = fitContent(ctx, pieza, tema, w - P * 2, bottom - top, base);
  // Un poco por arriba del centro del espacio libre (como en la campaña).
  const y = top + Math.max(0, (bottom - top - m.total) * (foto ? 0.15 : 0.4));
  drawBlocks(ctx, m, P, y);
}

function drawHorizontal(ctx, f, pieza, tema, foto) {
  const { w, h } = f;
  const base = BASE.horizontal;
  const P = 64;
  ctx.fillStyle = tema.bg;
  ctx.fillRect(0, 0, w, h);

  let maxW;
  if (foto) {
    // Foto a la derecha con el borde izquierdo en diagonal.
    const x0 = w * 0.56; const x1 = w * 0.64;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h); ctx.lineTo(x0, h);
    ctx.closePath(); ctx.clip();
    drawCover(ctx, foto, x0, 0, w - x0, h);
    ctx.restore();
    maxW = x0 - P * 1.6;
  } else {
    // "126" gigante de marca de agua, como el hero de la web.
    ctx.fillStyle = tema.marca;
    setFont(ctx, 900, h * 1.05);
    const mw = width(ctx, '126', -h * 0.05);
    text(ctx, '126', w - mw * 0.86, h * 0.93, -h * 0.05);
    maxW = w * 0.66 - P;
  }

  drawLogo(ctx, P, P - 8, base.logo, tema);
  // En horizontal el cierre va sin bloque (no hay alto para eso).
  const temaCierre = tema.cierre.block ? { ...tema, cierre: { block: null, label: RED, fg: INK } } : tema;
  const cierre = measureCierre(ctx, pieza, temaCierre, maxW, base);
  const footTop = h - P - cierre.h + 10;
  cierre.draw(P, footTop);

  const top = P - 8 + base.logo + 34;
  const bottom = footTop - 30;
  const m = fitContent(ctx, pieza, tema, maxW, bottom - top, base);
  drawBlocks(ctx, m, P, top + Math.max(0, (bottom - top - m.total) / 2));
}

/** Dibuja la pieza en el canvas (lo redimensiona a la medida del formato). */
export function renderPieza(canvas, formato, pieza, { tipo = 'info', foto = null } = {}) {
  canvas.width = formato.w;
  canvas.height = formato.h;
  const ctx = canvas.getContext('2d');
  const tema = TEMAS[fondoDe(pieza, tipo)];
  if (formato.id === 'horizontal') drawHorizontal(ctx, formato, pieza, tema, foto);
  else drawVertical(ctx, formato, pieza, tema, foto);
}

/** Carga las fuentes de la marca antes de dibujar (si no, el canvas usa la del sistema). */
export async function loadFuentes() {
  if (!document.fonts?.load) return;
  await Promise.all(FUENTES.map(f => document.fonts.load(f, 'LÍNEA 126 áéíóúñ').catch(() => {})));
}

export function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
