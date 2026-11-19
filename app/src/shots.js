// Fixed scenes for screenshots: ?shot=editor shows the page with a sample
// photo loaded; ?shot=cover shows the cover alone, full frame, at the size
// the query names. `photo` / `photo2` pick the samples, `caption` the words.
// window.__shotReady is set once the fonts have loaded and the cover is painted.
import { SIZES } from './cover.js';

export async function runShot(shot, query, api) {
  const { state, redraw, loadImage, setLibrary } = api;
  const lib = {};
  lib.boulevard = await loadImage('samples/boulevard.jpg');
  lib.pier = await loadImage('samples/pier.jpg');
  setLibrary(lib);

  const layout = query.get('layout');
  if (layout) state.layout = layout;
  const grade = query.get('grade');
  if (grade) state.grade = grade;
  const size = query.get('size');
  if (size && SIZES[size]) state.size = size;
  const caption = query.get('caption');
  if (caption !== null) {
    state.title = caption;
    const titleInput = document.getElementById('title');
    if (titleInput) titleInput.value = caption;
  }
  const subtitle = query.get('subtitle');
  if (subtitle !== null) {
    state.subtitle = subtitle;
    const subInput = document.getElementById('subtitle');
    if (subInput) subInput.value = subtitle;
  }
  const color = query.get('titleColor');
  if (color) state.titleColor = color;

  const first = query.get('photo') ?? 'boulevard';
  const second = query.get('photo2') ?? 'pier';
  state.panels.forEach((p, i) => { p.photo = i % 2 === 0 ? first : second; });
  state.panels[0].photo = first;

  if (shot === 'cover') document.body.classList.add('shot-cover');

  // Wait for the vendored display fonts: the cover's lettering must be set
  // before the screenshot, or the fallback font shows instead.
  try {
    await Promise.all([
      document.fonts.load('700 100px ViceDisplay'),
      document.fonts.load('italic 700 40px ViceSerif'),
    ]);
    await document.fonts.ready;
  } catch { /* fall back to system fonts; the cover still draws */ }

  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
