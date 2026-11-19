// Vice Coast Cover Studio — wires the page: photos, panels, layout, grade,
// caption, export. A `?shot=` query sets up a fixed scene for a screenshot
// instead (./shots.js). Photos never leave the machine.
import { drawCover, defaultState, LAYOUTS, GRADES, SIZES, TITLE_COLORS } from './cover.js';
import { BUILD_PRESETS } from './build-presets.js';
import { runShot } from './shots.js';

// Extra presets the build hands in (a Story export size and a Midnight Neon
// grade): merge them into the engine's tables before the rows are built, so
// they appear in the UI and export exactly like the built-ins.
Object.assign(SIZES, BUILD_PRESETS.sizes);
Object.assign(GRADES, BUILD_PRESETS.grades);

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const state = defaultState();
let library = {}; // photo key -> loaded image
let selectedPanel = 0;
let lastRects = [];

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  const size = SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  lastRects = drawCover(canvas, library, state);
  syncPanelControls();
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

/** Fills the panel editor with the selected panel's settings. */
function syncPanelControls() {
  const panel = state.panels[selectedPanel] ?? { photo: null, zoom: 1, ox: 0, oy: 0 };
  document.getElementById('panelLabel').textContent = `Panel ${selectedPanel + 1} of ${lastRects.length}`;
  const photoSel = document.getElementById('panelPhoto');
  photoSel.value = panel.photo ?? '';
  document.getElementById('panelZoom').value = panel.zoom;
  document.getElementById('panelZoomVal').textContent = `${Math.round(panel.zoom * 100)}%`;
  document.getElementById('panelX').value = panel.ox;
  document.getElementById('panelY').value = panel.oy;
  document.querySelectorAll('#layoutRow button').forEach((b) =>
    b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradeRow button').forEach((b) =>
    b.classList.toggle('on', b.dataset.grade === state.grade));
  document.querySelectorAll('#sizeRow button').forEach((b) =>
    b.classList.toggle('on', b.dataset.size === state.size));
  document.querySelectorAll('#colorRow button').forEach((b) =>
    b.classList.toggle('on', b.dataset.color === state.titleColor));
}

/** Rebuilds the photo <select> options from the loaded library + uploads. */
function refreshPhotoOptions() {
  const sel = document.getElementById('panelPhoto');
  sel.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = 'Empty panel';
  sel.appendChild(none);
  for (const [key, label] of photoChoices()) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = label;
    sel.appendChild(opt);
  }
}

function photoChoices() {
  const out = [];
  if (library.boulevard) out.push(['boulevard', 'Sample · Boulevard']);
  if (library.pier) out.push(['pier', 'Sample · Pier']);
  for (let i = 0; i < 3; i++) {
    if (library[`upload-${i}`]) out.push([`upload-${i}`, `Your photo ${i + 1}`]);
  }
  return out;
}

function buildButtonRow(el, entries, key, onPick) {
  el.innerHTML = '';
  for (const [value, label] of entries) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset[key] = value;
    b.addEventListener('click', () => { onPick(value); redraw(); });
    el.appendChild(b);
  }
}

buildButtonRow(document.getElementById('layoutRow'),
  Object.entries(LAYOUTS).map(([k, v]) => [k, v.label]), 'layout',
  (v) => { state.layout = v; selectedPanel = 0; });
buildButtonRow(document.getElementById('gradeRow'),
  Object.entries(GRADES).map(([k, v]) => [k, v.label]), 'grade',
  (v) => { state.grade = v; });
buildButtonRow(document.getElementById('sizeRow'),
  Object.entries(SIZES).map(([k, v]) => [k, v.label]), 'size',
  (v) => { state.size = v; });
buildButtonRow(document.getElementById('colorRow'),
  Object.entries(TITLE_COLORS).map(([k, v]) => [k, v.label]), 'color',
  (v) => { state.titleColor = v; });

document.getElementById('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  redraw();
});
document.getElementById('subtitle').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  redraw();
});
document.getElementById('grain').addEventListener('change', (e) => {
  state.grain = e.target.checked;
  redraw();
});
document.getElementById('badge').addEventListener('change', (e) => {
  state.badge = e.target.checked;
  redraw();
});
document.getElementById('frame').addEventListener('change', (e) => {
  state.frame = e.target.checked;
  redraw();
});

document.getElementById('panelPhoto').addEventListener('change', (e) => {
  state.panels[selectedPanel].photo = e.target.value || null;
  redraw();
});
document.getElementById('panelZoom').addEventListener('input', (e) => {
  state.panels[selectedPanel].zoom = Number(e.target.value);
  redraw();
});
document.getElementById('panelX').addEventListener('input', (e) => {
  state.panels[selectedPanel].ox = Number(e.target.value);
  redraw();
});
document.getElementById('panelY').addEventListener('input', (e) => {
  state.panels[selectedPanel].oy = Number(e.target.value);
  redraw();
});
document.getElementById('fillAll').addEventListener('click', () => {
  const key = state.panels[selectedPanel].photo;
  state.panels.forEach((p) => { p.photo = key; });
  redraw();
  setStatus('Every panel now uses the selected photo.');
});

// Your own photos: three upload slots, read on this machine, never uploaded.
document.querySelectorAll('.uploadSlot').forEach((input, i) => {
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    library[`upload-${i}`] = await loadImage(URL.createObjectURL(file));
    refreshPhotoOptions();
    state.panels[selectedPanel].photo = `upload-${i}`;
    redraw();
    setStatus(`Loaded ${file.name} into slot ${i + 1}.`);
  });
});

// Click a panel to select it; drag it to reposition its photo.
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = lastRects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
  if (hit === -1) return;
  selectedPanel = hit;
  const panel = state.panels[hit];
  drag = { x: p.x, y: p.y, ox: panel.ox, oy: panel.oy, w: lastRects[hit].w, h: lastRects[hit].h };
  canvas.setPointerCapture(e.pointerId);
  syncPanelControls();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[selectedPanel];
  panel.ox = Math.max(-1, Math.min(1, drag.ox + (p.x - drag.x) / (drag.w * 0.6)));
  panel.oy = Math.max(-1, Math.min(1, drag.oy + (p.y - drag.y) / (drag.h * 0.6)));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

document.getElementById('export').addEventListener('click', () => {
  const size = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, library, state);
  off.toBlob((blob) => {
    if (!blob) { setStatus('Export failed.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-coast-cover-${size.w}x${size.h}.png`;
    a.click();
    setStatus(`Saved vice-coast-cover-${size.w}x${size.h}.png`);
  }, 'image/png');
});

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, { state, redraw, loadImage, setLibrary: (lib) => { library = lib; refreshPhotoOptions(); } });
} else {
  // Load the two bundled sample photos, then draw the default cover.
  Promise.all([
    loadImage('samples/boulevard.jpg').then((img) => { library.boulevard = img; }),
    loadImage('samples/pier.jpg').then((img) => { library.pier = img; }),
  ]).then(() => {
    refreshPhotoOptions();
    redraw();
  });
}
