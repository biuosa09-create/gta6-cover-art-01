// Wires the page: photos, layouts, caption, grades and export. A `?shot=`
// query sets up a fixed scene for a screenshot instead (./shots.js).
import {
  EXPORT_SIZES,
  GRADES,
  LAYOUTS,
  defaultState,
  drawCover,
  panelRects,
  panelsForLayout,
} from './render.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const stage = document.getElementById('stage');
const status = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const zoomInput = document.getElementById('zoom');
const panelLabel = document.getElementById('panelLabel');
const samplesBox = document.getElementById('samples');

const state = defaultState();
let photosLoaded = 0;

function redraw(highlight = true) {
  drawCover(canvas, state, { highlight });
}

function resizeCanvas(highlight = true) {
  const [w, h] = EXPORT_SIZES[state.exportSize];
  canvas.width = w;
  canvas.height = h;
  canvas.style.aspectRatio = `${w} / ${h}`;
  redraw(highlight);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function note(text) {
  status.textContent = text;
}

/** Rebuilds the photo strip: thumbnails of every photo, click to assign. */
function renderSamples() {
  samplesBox.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.title = photo.name;
    button.setAttribute('aria-label', `Use photo ${photo.name}`);
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.name;
    button.appendChild(img);
    button.addEventListener('click', () => {
      state.panels[state.selectedPanel].photo = i;
      note(`Panel ${state.selectedPanel + 1} now uses ${photo.name}.`);
      redraw();
    });
    samplesBox.appendChild(button);
  });
}

async function addPhoto(src, name) {
  if (state.photos.length >= 6) {
    note('Six photos is the most this cover holds.');
    return null;
  }
  const img = await loadImage(src);
  const photo = { img, src, name };
  state.photos.push(photo);
  renderSamples();
  redraw();
  return photo;
}

async function loadSamples() {
  for (const [file, name] of [
    ['samples/pier.jpg', 'Pier'],
    ['samples/boulevard.jpg', 'Boulevard'],
  ]) {
    try {
      await addPhoto(file, name);
      photosLoaded++;
    } catch {
      note(`Could not load the sample ${name}.`);
    }
  }
  if (photosLoaded) redraw();
}

// --- Controls ---------------------------------------------------------------

document.querySelectorAll('[data-layout]').forEach((button) => {
  button.addEventListener('click', () => {
    state.layout = button.dataset.layout;
    state.panels = panelsForLayout(state);
    state.selectedPanel = 0;
    syncControls();
    redraw();
  });
});

document.querySelectorAll('[data-grade]').forEach((button) => {
  button.addEventListener('click', () => {
    state.grade = button.dataset.grade;
    syncControls();
    redraw();
  });
});

document.querySelectorAll('[data-size]').forEach((button) => {
  button.addEventListener('click', () => {
    state.exportSize = button.dataset.size;
    syncControls();
    resizeCanvas();
  });
});

document.querySelectorAll('[data-color]').forEach((button) => {
  button.addEventListener('click', () => {
    state.titleColor = button.dataset.color;
    syncControls();
    redraw();
  });
});

document.getElementById('titlePos').addEventListener('change', (e) => {
  state.titlePos = e.target.value;
  redraw();
});

titleInput.addEventListener('input', () => {
  state.title = titleInput.value;
  redraw();
});
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  redraw();
});

zoomInput.addEventListener('input', () => {
  const panel = state.panels[state.selectedPanel];
  panel.zoom = Number(zoomInput.value);
  redraw();
});

document.getElementById('resetCrop').addEventListener('click', () => {
  const panel = state.panels[state.selectedPanel];
  panel.zoom = 1;
  panel.ox = 0;
  panel.oy = 0;
  zoomInput.value = '1';
  redraw();
});

document.getElementById('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    await addPhoto(URL.createObjectURL(file), file.name);
    note(`Loaded ${file.name}. Click a panel, then drag to crop it.`);
  } catch {
    note('That file could not be read as a photo.');
  }
  e.target.value = '';
});

// Drag a photo file onto the stage to add it.
['dragover', 'dragenter'].forEach((name) =>
  stage.addEventListener(name, (e) => {
    e.preventDefault();
    stage.classList.add('dropping');
  }),
);
['dragleave', 'drop'].forEach((name) =>
  stage.addEventListener(name, (e) => {
    e.preventDefault();
    stage.classList.remove('dropping');
  }),
);
stage.addEventListener('drop', async (e) => {
  const file = e.dataTransfer.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  try {
    await addPhoto(URL.createObjectURL(file), file.name);
    note(`Loaded ${file.name}. Click a panel, then drag to crop it.`);
  } catch {
    note('That file could not be read as a photo.');
  }
});

// --- Canvas interaction: click a panel to select it, drag to crop it. -------

function canvasPoint(e) {
  const box = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - box.left) / box.width) * canvas.width,
    y: ((e.clientY - box.top) / box.height) * canvas.height,
  };
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const rects = panelRects(state, canvas.width, canvas.height);
  const hit = rects.findIndex((r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h);
  if (hit === -1) return;
  state.selectedPanel = hit;
  syncControls();
  redraw();
  const panel = state.panels[hit];
  drag = { x: p.x, y: p.y, ox: panel.ox, oy: panel.oy, rect: rects[hit] };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[state.selectedPanel];
  panel.ox = drag.ox + (p.x - drag.x) / drag.rect.w;
  panel.oy = drag.oy + (p.y - drag.y) / drag.rect.h;
  redraw();
});
canvas.addEventListener('pointerup', () => {
  drag = null;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const panel = state.panels[state.selectedPanel];
  panel.zoom = Math.max(1, Math.min(4, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
  zoomInput.value = String(panel.zoom);
  redraw();
}, { passive: false });

// --- Export -----------------------------------------------------------------

document.getElementById('export').addEventListener('click', () => {
  const [w, h] = EXPORT_SIZES[state.exportSize];
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  drawCover(out, state, { highlight: false });
  out.toBlob((blob) => {
    if (!blob) {
      note('The export did not work in this browser.');
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    note(`Saved cover-${w}x${h}.png`);
  }, 'image/png');
});

function syncControls() {
  document.querySelectorAll('[data-layout]').forEach((b) =>
    b.classList.toggle('active', b.dataset.layout === state.layout),
  );
  document.querySelectorAll('[data-grade]').forEach((b) =>
    b.classList.toggle('active', b.dataset.grade === state.grade),
  );
  document.querySelectorAll('[data-size]').forEach((b) =>
    b.classList.toggle('active', b.dataset.size === state.exportSize),
  );
  document.querySelectorAll('[data-color]').forEach((b) =>
    b.classList.toggle('active', b.dataset.color === state.titleColor),
  );
  const panel = state.panels[state.selectedPanel];
  zoomInput.value = panel ? String(panel.zoom) : '1';
  panelLabel.textContent = `Panel ${state.selectedPanel + 1} of ${state.panels.length} selected — drag on the cover to crop it, scroll to zoom.`;
}

// --- Shot mode ---------------------------------------------------------------

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    async loadSample(name) {
      await addPhoto(`samples/${name}.jpg`, name);
    },
    setCaption(text) {
      state.title = text;
      titleInput.value = text;
    },
    setSubtitle(text) {
      state.subtitle = text;
      subtitleInput.value = text;
    },
    setLayout(layout) {
      if (LAYOUTS[layout]) {
        state.layout = layout;
        state.panels = panelsForLayout(state);
      }
    },
    setGrade(grade) {
      if (GRADES[grade]) state.grade = grade;
    },
    setSize(size) {
      if (EXPORT_SIZES[size]) state.exportSize = size;
    },
    setTitlePos(pos) {
      state.titlePos = pos;
    },
    setPanelPan(panel, ox, oy) {
      const p = state.panels[panel];
      if (p) {
        p.ox = ox;
        p.oy = oy;
      }
    },
    finish() {
      syncControls();
      // A cover shot shows the exported cover: no selection outline on it.
      resizeCanvas(!document.body.classList.contains('shot-cover'));
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          window.__shotReady = true;
        }),
      );
    },
  });
} else {
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  syncControls();
  resizeCanvas();
  loadSamples();
}
