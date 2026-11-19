// Renders the cover: a multi-panel poster in the style of GTA cover art, drawn
// entirely with the 2D canvas API. No image is fetched from the network: the
// photos are the person's own files or the bundled samples, and the sky, sun,
// skyline and palm silhouettes are drawn with code, so the art is original.
//
// A cover is a set of panels (fractions of the canvas), each holding one photo
// the person can crop and position, plus a bold outlined caption band and a
// colour grade. The same function draws the on-screen preview and the PNG the
// app exports, at any size, so what the person sees is what they get.

// Panel rectangles as [x, y, width, height] fractions of the cover.
export const LAYOUTS = {
  grid: [
    [0, 0, 1, 0.6],
    [0, 0.6, 0.5, 0.4],
    [0.5, 0.6, 0.5, 0.4],
  ],
  hero: [[0, 0, 1, 1]],
  duo: [
    [0, 0, 0.5, 1],
    [0.5, 0, 0.5, 1],
  ],
  triptych: [
    [0, 0, 1 / 3, 1],
    [1 / 3, 0, 1 / 3, 1],
    [2 / 3, 0, 1 / 3, 1],
  ],
};

// Colour grades: a canvas filter on the photo plus a tinted gradient overlay.
export const GRADES = {
  sunset: {
    label: 'Sunset Bay',
    filter: 'saturate(1.3) contrast(1.06) brightness(1.02)',
    top: 'rgba(255, 150, 60, 0.05)',
    bottom: 'rgba(214, 40, 120, 0.42)',
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.55) hue-rotate(-18deg) contrast(1.1)',
    top: 'rgba(40, 220, 255, 0.08)',
    bottom: 'rgba(190, 20, 160, 0.45)',
  },
  pastel: {
    label: 'Pastel Day',
    filter: 'saturate(0.85) brightness(1.07) contrast(0.95)',
    top: 'rgba(255, 210, 220, 0.10)',
    bottom: 'rgba(255, 170, 120, 0.22)',
  },
  noir: {
    label: 'Noir',
    filter: 'grayscale(1) contrast(1.12) brightness(1.04)',
    top: 'rgba(255, 255, 255, 0.04)',
    bottom: 'rgba(0, 0, 0, 0.30)',
  },
};

export const EXPORT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const GUTTER = 0.008; // fraction of the cover's short side, between panels
const TITLE_COLORS = ['#ffffff', '#ffd319', '#ff2975', '#2de2ff', '#7CFC66'];

/** A fresh default state for a new cover. */
export function defaultState() {
  return {
    layout: 'grid',
    grade: 'sunset',
    title: 'SUNSET HEIST',
    subtitle: 'A NEON-CITY STORY',
    titleColor: '#ffffff',
    titlePos: 'bottom',
    exportSize: '1080x1080',
    selectedPanel: 0,
    // One entry per panel of the current layout; photo is an index into photos.
    panels: [
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
      { photo: 1, zoom: 1, ox: 0, oy: 0 },
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
    ],
    photos: [],
  };
}

export function titleColors() {
  return TITLE_COLORS;
}

/** Resizes the panels array to the layout, keeping each panel's crop. */
export function panelsForLayout(state) {
  const rects = LAYOUTS[state.layout];
  const next = [];
  for (let i = 0; i < rects.length; i++) {
    const old = state.panels[i];
    next.push(
      old ?? {
        photo: state.photos.length ? i % state.photos.length : 0,
        zoom: 1,
        ox: 0,
        oy: 0,
      },
    );
  }
  return next;
}

/** The panel rectangles of the current layout, in canvas pixels. */
export function panelRects(state, w, h) {
  const g = Math.round(Math.min(w, h) * GUTTER);
  return LAYOUTS[state.layout].map(([fx, fy, fw, fh]) => ({
    x: Math.round(fx * w) + (fx > 0 ? g / 2 : 0),
    y: Math.round(fy * h) + (fy > 0 ? g / 2 : 0),
    w: Math.round(fw * w) - (fw < 1 ? g / 2 : 0) - (fx > 0 ? g / 2 : 0),
    h: Math.round(fh * h) - (fh < 1 ? g / 2 : 0) - (fy > 0 ? g / 2 : 0),
    g,
  }));
}

/** Draws one photo into a panel, cover-fitting it and applying its crop. */
function drawPhoto(ctx, img, rect, panel, filter) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const dw = img.naturalWidth * base * panel.zoom;
  const dh = img.naturalHeight * base * panel.zoom;
  // Clamp the pan so the photo always covers the panel.
  const maxOx = Math.max(0, (dw - rect.w) / 2 / rect.w);
  const maxOy = Math.max(0, (dh - rect.h) / 2 / rect.h);
  panel.ox = Math.max(-maxOx, Math.min(maxOx, panel.ox));
  panel.oy = Math.max(-maxOy, Math.min(maxOy, panel.oy));
  const cx = rect.x + rect.w / 2 + panel.ox * rect.w;
  const cy = rect.y + rect.h / 2 + panel.oy * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = filter;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
}

/** A palm silhouette: a curved trunk and fronds that arch up and droop. */
function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk, leaning slightly, thicker at the base.
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.04, y - s * 0.5, x + s * 0.14, y - s * 0.9);
  ctx.stroke();
  const topX = x + s * 0.14;
  const topY = y - s * 0.9;
  // Fronds fan out from the crown and droop at the tips.
  ctx.lineWidth = s * 0.045;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (1.12 + (i / 5) * 0.76);
    const ex = topX + Math.cos(a) * s * 0.44;
    const ey = topY + Math.sin(a) * s * 0.3 + s * 0.14;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + (ex - topX) * 0.5,
      topY - s * 0.22,
      ex,
      ey,
    );
    ctx.stroke();
  }
  ctx.restore();
}

/** A low skyline silhouette with a few lit windows, drawn with code. */
function drawSkyline(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  let cx = x;
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  while (cx < x + w) {
    const bw = w * (0.05 + next() * 0.09);
    const bh = h * (0.35 + next() * 0.65);
    ctx.fillRect(cx, y + h - bh, bw, bh);
    if (next() > 0.6) ctx.fillRect(cx + bw * 0.45, y + h - bh - h * 0.22, 2, h * 0.22);
    cx += bw + w * 0.015;
  }
  ctx.restore();
}

/** Fits a font size so the text fits maxWidth, starting from startSize. */
function fitFont(ctx, text, maxWidth, startSize, weight, family) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

const TITLE_FONT = '"Arial Black", "Segoe UI", Arial, sans-serif';
const BODY_FONT = '"Segoe UI", Arial, sans-serif';

/**
 * Draws the whole cover onto the canvas at its own size.
 * state: the cover state; options.highlight draws the selected panel's outline.
 */
export function drawCover(canvas, state, options = {}) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const rects = panelRects(state, w, h);

  // Dark gutters show between the panels.
  ctx.fillStyle = '#14101d';
  ctx.fillRect(0, 0, w, h);

  rects.forEach((rect, i) => {
    const panel = state.panels[i];
    const photo = panel ? state.photos[panel.photo] : null;
    if (photo?.img) {
      drawPhoto(ctx, photo.img, rect, panel, grade.filter);
    } else {
      // Empty panel: a sunset gradient so the cover never looks broken.
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      g.addColorStop(0, '#3b1d5e');
      g.addColorStop(1, '#ff7a3d');
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    // Grade tint over the photo.
    const tint = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    tint.addColorStop(0, grade.top);
    tint.addColorStop(1, grade.bottom);
    ctx.fillStyle = tint;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    // Thin white frame, like a poster panel.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.004);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });

  // Decoration on the first (largest) panel: a setting sun and palms, drawn
  // in silhouette so they read on any photo.
  const hero = rects[0];
  if (hero && state.grade !== 'noir') {
    const sunR = Math.min(w, h) * 0.055;
    const sunX = hero.x + hero.w * 0.9;
    const sunY = hero.y + hero.h * 0.16;
    const sun = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR);
    sun.addColorStop(0, 'rgba(255, 236, 160, 0.95)');
    sun.addColorStop(0.55, 'rgba(255, 140, 60, 0.75)');
    sun.addColorStop(1, 'rgba(255, 80, 120, 0)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();
  }
  if (hero) {
    const palmH = Math.min(w, h) * 0.16;
    ctx.globalAlpha = 0.85;
    drawPalm(ctx, hero.x + hero.w * 0.06, hero.y + hero.h * 0.98, palmH, '#120a1e');
    drawPalm(ctx, hero.x + hero.w * 0.13, hero.y + hero.h * 0.98, palmH * 0.7, '#120a1e');
    ctx.globalAlpha = 1;
  }

  // Caption band with the skyline drawn behind the title.
  const bandH = h * 0.17;
  const bandY = state.titlePos === 'top' ? 0 : h - bandH;
  const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  band.addColorStop(0, 'rgba(12, 6, 24, 0)');
  band.addColorStop(0.35, 'rgba(12, 6, 24, 0.82)');
  band.addColorStop(1, 'rgba(12, 6, 24, 0.94)');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, w, bandH);
  drawSkyline(ctx, w * 0.04, bandY + bandH * 0.12, w * 0.92, bandH * 0.38, 'rgba(20, 10, 34, 0.4)');

  const title = (state.title || '').trim().toUpperCase();
  if (title) {
    const size = fitFont(ctx, title, w * 0.92, h * 0.085, 900, TITLE_FONT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try {
      ctx.letterSpacing = `${Math.round(size * 0.04)}px`;
    } catch {
      // Older browsers ignore letterSpacing; the title still draws.
    }
    const ty = state.titlePos === 'top' ? bandY + bandH * 0.42 : bandY + bandH * 0.42;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(10, 4, 20, 0.9)';
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeText(title, w / 2, ty);
    ctx.fillStyle = state.titleColor || '#ffffff';
    ctx.fillText(title, w / 2, ty);
    try {
      ctx.letterSpacing = '0px';
    } catch {
      /* ignore */
    }
  }
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (subtitle) {
    const size = fitFont(ctx, subtitle, w * 0.8, h * 0.028, 700, BODY_FONT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    try {
      ctx.letterSpacing = `${Math.round(size * 0.32)}px`;
    } catch {
      /* ignore */
    }
    const sy = state.titlePos === 'top' ? bandY + bandH * 0.78 : bandY + bandH * 0.78;
    ctx.fillStyle = '#ffd319';
    ctx.fillText(subtitle, w / 2, sy);
    try {
      ctx.letterSpacing = '0px';
    } catch {
      /* ignore */
    }
  }

  // Selected panel outline, preview only: never part of the exported PNG.
  if (options.highlight && state.selectedPanel != null && rects[state.selectedPanel]) {
    const r = rects[state.selectedPanel];
    ctx.strokeStyle = '#2de2ff';
    ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.006);
    ctx.setLineDash([Math.min(w, h) * 0.02, Math.min(w, h) * 0.012]);
    ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
    ctx.setLineDash([]);
  }
}
