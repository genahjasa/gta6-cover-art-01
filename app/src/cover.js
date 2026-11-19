// Vice Coast Cover Studio — the cover engine.
// Draws a GTA-poster-style multi-panel cover on a 2D canvas from the maker's
// own photos: panel layouts, a sunset/neon colour grade per photo, bold
// condensed lettering, grain and a vignette. No network, no library.

export const LAYOUTS = {
  hero: { label: 'Hero', panels: 1 },
  grid4: { label: 'Poster Grid', panels: 4 },
  strip: { label: 'Neon Strip', panels: 3 },
  nine: { label: 'Nine Panel', panels: 8 },
};

export const GRADES = {
  sunset: { label: 'Sunset', sat: 1.3, con: 1.1, bright: 1.0, top: '#ff9a3c', bottom: '#ff2e88', wash: '#7a2bff', washAlpha: 0.08, accent: '#ffb347' },
  neon: { label: 'Neon Night', sat: 1.45, con: 1.15, bright: 0.95, top: '#00e5ff', bottom: '#ff2ea6', wash: '#12002e', washAlpha: 0.12, accent: '#00e5ff' },
  vice: { label: 'Vice Pink', sat: 1.25, con: 1.08, bright: 1.0, top: '#ff7ad9', bottom: '#7b2ff7', wash: '#ff5e78', washAlpha: 0.1, accent: '#ff7ad9' },
  golden: { label: 'Golden Hour', sat: 1.35, con: 1.08, bright: 1.05, top: '#ffd166', bottom: '#ff6b35', wash: '#8a5a00', washAlpha: 0.08, accent: '#ffd166' },
  noir: { label: 'Teal Noir', sat: 0.7, con: 1.2, bright: 0.92, top: '#0affef', bottom: '#0b1035', wash: '#000000', washAlpha: 0.15, accent: '#0affef' },
};

export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

export const TITLE_COLORS = {
  sunset: { label: 'Sunset gradient', stops: ['#fff7ae', '#ffb347', '#ff2e88'] },
  white: { label: 'White', stops: ['#ffffff', '#ffe9f3'] },
  neon: { label: 'Neon', stops: ['#7df9ff', '#ff5ce1'] },
};

/** A fresh default state: Poster Grid, Sunset grade, wide size, sample photos. */
export function defaultState() {
  return {
    layout: 'grid4',
    grade: 'sunset',
    size: 'wide',
    title: 'VICE COAST',
    subtitle: 'Neon nights · Golden days',
    titleColor: 'sunset',
    grain: true,
    badge: true,
    frame: true,
    // one entry per panel slot; photo is a library key ('boulevard' | 'pier' | 'upload-0' ...)
    panels: [
      { photo: 'boulevard', zoom: 1.0, ox: 0, oy: 0.75 },
      { photo: 'pier', zoom: 1.0, ox: 0, oy: 0 },
      { photo: 'boulevard', zoom: 1.15, ox: 0, oy: 0 },
      { photo: 'pier', zoom: 1.0, ox: 0, oy: 0 },
      { photo: 'boulevard', zoom: 1.0, ox: 0, oy: 0 },
      { photo: 'pier', zoom: 1.0, ox: 0, oy: 0 },
      { photo: 'boulevard', zoom: 1.0, ox: 0, oy: 0 },
      { photo: 'pier', zoom: 1.0, ox: 0, oy: 0 },
    ],
  };
}

/** Panel rectangles for a layout, in fractions of the canvas (x, y, w, h). */
export function layoutPanels(layout, W, H) {
  const g = Math.max(6, Math.round(W * 0.006)); // gutter between panels
  const m = Math.max(10, Math.round(W * 0.012)); // outer frame margin
  const x0 = m, y0 = m, x1 = W - m, y1 = H - m;
  const full = [{ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }];
  if (layout === 'hero') return { rects: full, title: 'band', frame: true };
  if (layout === 'grid4') {
    const heroH = Math.round((y1 - y0) * 0.6);
    const rowY = y0 + heroH + g;
    const rowH = y1 - rowY;
    const colW = Math.round(((x1 - x0) - 2 * g) / 3);
    return {
      rects: [
        { x: x0, y: y0, w: x1 - x0, h: heroH },
        { x: x0, y: rowY, w: colW, h: rowH },
        { x: x0 + colW + g, y: rowY, w: colW, h: rowH },
        { x: x0 + 2 * (colW + g), y: rowY, w: x1 - (x0 + 2 * (colW + g)), h: rowH },
      ],
      title: 'band', frame: true,
    };
  }
  if (layout === 'strip') {
    const colW = Math.round(((x1 - x0) - 2 * g) / 3);
    return {
      rects: [
        { x: x0, y: y0, w: colW, h: y1 - y0 },
        { x: x0 + colW + g, y: y0, w: colW, h: y1 - y0 },
        { x: x0 + 2 * (colW + g), y: y0, w: x1 - (x0 + 2 * (colW + g)), h: y1 - y0 },
      ],
      title: 'band', frame: true,
    };
  }
  // nine: 3x3 grid, the centre cell is the title block, the other 8 are photos.
  const cellW = Math.round(((x1 - x0) - 2 * g) / 3);
  const cellH = Math.round(((y1 - y0) - 2 * g) / 3);
  const rects = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r === 1 && c === 1) continue;
      rects.push({
        x: x0 + c * (cellW + g), y: y0 + r * (cellH + g),
        w: c === 2 ? x1 - (x0 + 2 * (cellW + g)) : cellW,
        h: r === 2 ? y1 - (y0 + 2 * (cellH + g)) : cellH,
      });
    }
  }
  const centre = {
    x: x0 + cellW + g, y: y0 + cellH + g, w: cellW, h: cellH,
  };
  return { rects, title: 'centre', centre, frame: true };
}

let noiseCanvas = null;
/** A small tiled noise canvas, made once, for the film grain. */
export function grainPattern(ctx) {
  if (!noiseCanvas) {
    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 160;
    noiseCanvas.height = 160;
    const nctx = noiseCanvas.getContext('2d');
    const img = nctx.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 118 + Math.floor(Math.random() * 40);
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    nctx.putImageData(img, 0, 0);
  }
  return ctx.createPattern(noiseCanvas, 'repeat');
}

/** Draws one photo into a panel rect, cover-fit, zoomed and offset, then grades it. */
export function drawPhotoPanel(ctx, img, rect, panel, grade) {
  if (!img) {
    ctx.fillStyle = '#3a2140';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    return;
  }
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const base = Math.max(rect.w / iw, rect.h / ih) * panel.zoom;
  const pw = iw * base, ph = ih * base;
  // ox/oy in [-1, 1] pan across the whole overhang, so a portrait photo can
  // show its top (faces) inside a wide panel.
  const dx = rect.x + (rect.w - pw) / 2 + panel.ox * Math.max(0, (pw - rect.w) / 2) * 0.95;
  const dy = rect.y + (rect.h - ph) / 2 + panel.oy * Math.max(0, (ph - rect.h) / 2) * 0.95;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = `saturate(${grade.sat}) contrast(${grade.con}) brightness(${grade.bright})`;
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.filter = 'none';
  // sunset/neon wash: a soft-light gradient plus a faint multiply tint.
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, grade.top);
  wash.addColorStop(1, grade.bottom);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = grade.washAlpha;
  ctx.fillStyle = grade.wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  // thin inner edge so panels read as separate poster tiles
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  ctx.restore();
}

/** Fits `text` to `maxWidth` and returns the largest font size that fits. */
export function fitTitleSize(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size = Math.max(12, size - Math.round(size * 0.06));
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

/** Draws the big caption and the italic subtitle, centred on cx, with the
 * subtitle (or the title, when there is none) ending at bottomY. */
export function drawTitleBlock(ctx, cx, bottomY, maxWidth, title, subtitle, titleColor, grade, scale) {
  const text = (title || 'VICE COAST').trim().toUpperCase();
  const size = fitTitleSize(ctx, text, maxWidth, Math.round(150 * scale), 'ViceDisplay');
  const hasSub = Boolean(subtitle && subtitle.trim());
  const subSize = Math.max(18, Math.round(size * 0.24));
  const baselineY = hasSub ? bottomY - subSize * 1.5 : bottomY;
  const grad = ctx.createLinearGradient(0, baselineY - size, 0, baselineY + size * 0.15);
  const stops = TITLE_COLORS[titleColor]?.stops ?? TITLE_COLORS.sunset.stops;
  stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
  ctx.save();
  ctx.translate(cx, baselineY);
  ctx.rotate(-0.02);
  ctx.translate(-cx, -baselineY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${size}px ViceDisplay`;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1a0b2e';
  ctx.lineWidth = Math.max(3, size * 0.055);
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.03;
  ctx.strokeText(text, cx, baselineY);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = grad;
  ctx.fillText(text, cx, baselineY);
  ctx.restore();
  if (hasSub) {
    ctx.save();
    ctx.font = `italic 700 ${subSize}px ViceSerif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = grade.accent;
    ctx.shadowBlur = subSize * 0.7;
    ctx.fillText(subtitle.trim(), cx, bottomY);
    ctx.restore();
  }
  return size;
}

/** Draws the small star badge in the top-left corner of the cover. */
export function drawBadge(ctx, x, y, scale) {
  const pad = Math.round(14 * scale);
  const h = Math.round(44 * scale);
  ctx.save();
  ctx.font = `${Math.round(26 * scale)}px ViceDisplay`;
  const label = '★ VICE COAST';
  const w = ctx.measureText(label).width + pad * 2;
  ctx.fillStyle = 'rgba(26,11,46,0.85)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + pad, y + h / 2 + 1);
  ctx.restore();
}

/**
 * Draws the whole cover onto `canvas` (which must already be the export size).
 * `library` maps photo keys to loaded images. Returns the panel rects drawn,
 * so the editor can hit-test clicks and drags against them.
 */
export function drawCover(canvas, library, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const scale = W / 1080;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = state.frame ? '#f5efe6' : '#1a0b2e';
  ctx.fillRect(0, 0, W, H);
  const { rects, title, centre } = layoutPanels(state.layout, W, H);
  rects.forEach((rect, i) => {
    const panel = state.panels[i] ?? { photo: null, zoom: 1, ox: 0, oy: 0 };
    drawPhotoPanel(ctx, panel.photo ? library[panel.photo] ?? null : null, rect, panel, grade);
  });
  if (title === 'band') {
    // dark band rising from the foot of the hero panel (or of the whole
    // cover for the full-height strip), title + subtitle sitting in it
    const heroRect = rects[0];
    const bandTop = state.layout === 'strip'
      ? Math.round(H * 0.70)
      : Math.round(heroRect.y + heroRect.h * 0.52);
    const bandBottom = state.layout === 'strip' ? H : heroRect.y + heroRect.h;
    const band = ctx.createLinearGradient(0, bandTop, 0, bandBottom);
    band.addColorStop(0, 'rgba(26,11,46,0)');
    band.addColorStop(0.55, 'rgba(26,11,46,0.55)');
    band.addColorStop(1, 'rgba(26,11,46,0.88)');
    ctx.fillStyle = band;
    ctx.fillRect(0, bandTop, W, bandBottom - bandTop);
    const bottomY = bandBottom - Math.round(H * 0.02);
    drawTitleBlock(ctx, W / 2, bottomY, W * 0.92, state.title, state.subtitle, state.titleColor, grade, scale);
  } else if (title === 'centre' && centre) {
    const cg = ctx.createLinearGradient(centre.x, centre.y, centre.x + centre.w, centre.y + centre.h);
    cg.addColorStop(0, '#2b0f45');
    cg.addColorStop(1, '#12041f');
    ctx.fillStyle = cg;
    ctx.fillRect(centre.x, centre.y, centre.w, centre.h);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.strokeRect(centre.x + 4, centre.y + 4, centre.w - 8, centre.h - 8);
    const size = drawTitleBlock(ctx, centre.x + centre.w / 2, centre.y + centre.h * 0.60,
      centre.w * 0.9, state.title, state.subtitle, state.titleColor, grade, scale * 0.42);
    ctx.save();
    ctx.font = `${Math.max(14, Math.round(size * 0.22))}px ViceDisplay`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.fillText('★ ★ ★ ★ ★', centre.x + centre.w / 2, centre.y + centre.h * 0.80);
    ctx.restore();
  }
  if (state.badge) drawBadge(ctx, Math.round(W * 0.03), Math.round(H * 0.03), scale);
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grainPattern(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // vignette: darkened corners, poster depth
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,2,20,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  return rects;
}
