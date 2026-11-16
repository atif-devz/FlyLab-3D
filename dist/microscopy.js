const width = 144;
const height = 115;
const depth = 23;
const planeSize = width * height;
const channels = [
  { id: 'nuclei', label: 'Nuclear counterlabel', rgb: [102, 112, 255], color: '#96a0ff' },
  { id: 'boundary', label: 'Epithelial boundaries', rgb: [41, 248, 149], color: '#6ef3ad' },
  { id: 'target', label: 'Antibody target', rgb: [255, 77, 140], color: '#ff89b6' },
];
const specimens = {
  'wing-disc': { label: 'Wing imaginal disc', seed: 1967, count: 118, tissue: 'larval epithelium',
    explanation: 'The broad folded sheet illustrates a developing epithelial sac.' },
  'gut-epithelium': { label: 'Adult gut epithelium', seed: 2159, count: 136, tissue: 'adult gut',
    explanation: 'The hollow profile illustrates an epithelial tube.' },
  'egg-chambers': { label: 'Ovariole egg chambers', seed: 2161, count: 128, tissue: 'adult ovary',
    explanation: 'The series of different-sized chambers illustrates the organization of an ovariole.' },
};
const actions = [
  ['prepare', 'Preserve tissue morphology', 'The virtual fixed specimen retains its shape through labeling.'],
  ['block', 'Limit nonspecific binding', 'Blocking reduces background in this simulated specimen.'],
  ['label', 'Apply target recognition', 'Primary antibody binding determines where the target signal can appear.'],
  ['detect', 'Visualize and counterlabel', 'The virtual detection label produces a target channel if a primary label was included.'],
  ['mount', 'Mount the virtual slide', 'The slide is ready for optical sectioning. Compare optical planes with the projection.'],
];
const sources = [
  ['Imaginal-disc dissection and immunostaining', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4542997/'],
  ['Confocal optical sectioning principles', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6961134/'],
  ['Quantitative confocal microscopy guidance', 'https://www.nature.com/articles/s41596-020-0313-9'],
];
const limit = (value, lower, upper) => Math.min(upper, Math.max(lower, value));

function generator(seed) {
  let state = seed;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function deposit(buffer, x, y, z, sigma, intensity) {
  const radius = sigma.map(value => Math.max(1, Math.ceil(value * 2.45)));
  const fromX = Math.max(0, Math.floor(x - radius[0]));
  const fromY = Math.max(0, Math.floor(y - radius[1]));
  const fromZ = Math.max(0, Math.floor(z - radius[2]));
  const toX = Math.min(width - 1, Math.ceil(x + radius[0]));
  const toY = Math.min(height - 1, Math.ceil(y + radius[1]));
  const toZ = Math.min(depth - 1, Math.ceil(z + radius[2]));
  for (let pz = fromZ; pz <= toZ; pz += 1) {
    const zz = ((pz - z) / sigma[2]) ** 2;
    for (let py = fromY; py <= toY; py += 1) {
      const yz = ((py - y) / sigma[1]) ** 2 + zz;
      for (let px = fromX; px <= toX; px += 1) {
        const index = pz * planeSize + py * width + px;
        buffer[index] += intensity * Math.exp(-.5 * (((px - x) / sigma[0]) ** 2 + yz));
      }
    }
  }
}

export function buildOpticalVolume(id) {
  const specimen = specimens[id];
  const random = generator(specimen.seed);
  const volume = channels.map(() => new Float32Array(depth * planeSize));
  const ring = (x, y, z, rx, ry, density, amplitude) => {
    for (let angle = 0; angle < Math.PI * 2; angle += 1 / density) {
      deposit(volume[1], x + Math.cos(angle) * rx, y + Math.sin(angle) * ry, z + Math.cos(angle) * .37, [1.2, 1.0, .78], amplitude);
    }
  };
  for (let i = 0; i < specimen.count; i += 1) {
    const phase = random() * Math.PI * 2;
    const radius = Math.sqrt(random());
    let x, y, z;
    if (id === 'wing-disc') {
      x = width * .49 + Math.cos(phase) * radius * width * .37;
      y = height * .49 + Math.sin(phase) * radius * height * (.30 + .07 * Math.cos(phase));
      z = depth * .47 + 4.6 * Math.sin((x - 34) * .055) + 4 * (random() - .5);
    } else if (id === 'gut-epithelium') {
      x = 13 + (width - 26) * i / specimen.count + (random() - .5) * 9;
      y = height * .52 + Math.sin(x * .043) * height * .16 + Math.cos(phase) * height * .175;
      z = depth * .50 + Math.sin(phase) * depth * .27 + (random() - .5) * 1.5;
    } else {
      const chamber = i % 4;
      const size = 7 + chamber * 4;
      x = width * (.17 + chamber * .19) + Math.cos(phase) * radius * size;
      y = height * .53 + Math.sin(phase) * radius * size * 1.30;
      z = depth * .47 + (random() - .5) * (3 + chamber * 2);
    }
    const size = 1.18 + random() * 1.33;
    deposit(volume[0], x, y, z, [size, size * 1.12, .54 + random() * .56], .63 + random() * .64);
    ring(x, y, z, size * 1.7, size * 1.5, 2.3, .11 + random() * .09);
    const restricted = id === 'wing-disc' ? x > width * .44 && x < width * .58
      : id === 'gut-epithelium' ? random() > .70 : (i % 4) > 1 && random() > .48;
    if (restricted) deposit(volume[2], x + random() * 3 - 1.5, y + random() * 3 - 1.5, z + .2, [1.5, 1.7, .8], .77 + random() * .64);
  }
  return volume;
}

function kernel(index, opening) {
  const sigma = .29 + opening * .52;
  const radius = Math.ceil(sigma * 2.2);
  const neighbors = [];
  let sum = 0;
  for (let z = Math.max(0, index - radius); z <= Math.min(depth - 1, index + radius); z += 1) {
    const weight = Math.exp(-.5 * ((z - index) / sigma) ** 2);
    sum += weight;
    neighbors.push([z * planeSize, weight]);
  }
  return neighbors.map(([offset, weight]) => [offset, weight / sum]);
}

function frameAt(volume, z, settings) {
  const neighbors = kernel(z, settings.opening);
  const throughput = .43 + .57 * settings.opening / (settings.opening + .33);
  const measured = channels.map(() => new Float32Array(planeSize));
  const stage = settings.stage;
  const isOmit = settings.control === 'omit-primary';
  const enabled = [stage >= 4, stage >= 4, stage >= 4 && !isOmit];
  const noise = generator(6901 + z * 731);
  for (let c = 0; c < channels.length; c += 1) {
    const values = measured[c];
    for (let pixel = 0; pixel < planeSize; pixel += 1) {
      let signal = 0;
      if (enabled[c] || (c === 1 && stage < 4)) {
        for (const [offset, weight] of neighbors) signal += weight * volume[c][offset + pixel];
        if (stage < 4) signal *= .14;
      }
      const brownian = (noise() + noise()) * .5;
      const background = (stage < 2 ? .043 : .021) * settings.opening * brownian;
      values[pixel] = Math.max(0, (signal * throughput + background - settings.black) * settings.gain);
    }
  }
  return measured;
}

function viewFrame(volume, mode, settings) {
  if (mode === 'slice') return { w: width, h: height, data: frameAt(volume, settings.z, settings) };
  if (mode === 'xz') {
    const data = channels.map(() => new Float32Array(width * depth));
    const row = Math.floor(height / 2);
    for (let z = 0; z < depth; z += 1) {
      const slice = frameAt(volume, z, settings);
      for (let c = 0; c < channels.length; c += 1) data[c].set(slice[c].subarray(row * width, (row + 1) * width), (depth - 1 - z) * width);
    }
    return { w: width, h: depth, data };
  }
  const data = channels.map(() => new Float32Array(planeSize));
  for (let z = 0; z < depth; z += 1) {
    const slice = frameAt(volume, z, settings);
    for (let c = 0; c < channels.length; c += 1) {
      for (let pixel = 0; pixel < planeSize; pixel += 1) data[c][pixel] = Math.max(data[c][pixel], slice[c][pixel]);
    }
  }
  return { w: width, h: height, data };
}

function stats(data) {
  let total = 0;
  let clipped = 0;
  let foreground = 0;
  for (const value of data) {
    clipped += Number(value >= 1);
    foreground += Number(value >= .12);
    total += limit(value, 0, 1);
  }
  return { area: foreground, mean: total / data.length, clipped: clipped / data.length };
}

export function createMicroscopy({ escapeHtml, download, announce, publishSynthetic }) {
  let specimenId = 'wing-disc';
  let volume = buildOpticalVolume(specimenId);
  let mode = 'slice';
  let feedback = '';
  let shown = channels.map(() => true);
  let settings = { opening: 1, gain: 1.75, black: .011, stage: 0, control: 'target-plus', z: Math.floor(depth / 2) };
  let node;
  let bindings;
  let pendingPaint;
  let availableCsv;

  function render() {
    return '<section class="lab-section" data-microscopy><header><h2>Immunostaining and confocal imaging</h2>' +
      '<p>Prepare a virtual slide and explore a three-dimensional fluorescence stack. All signals and measurements are synthetic.</p></header>' +
      '<div class="lab-grid"><article class="lab-card"><h3>Virtual slide</h3>' +
      '<label class="lab-field">Specimen <select data-microscopy-specimen>' + Object.entries(specimens).map(([id, specimen]) =>
        '<option value="' + id + '"' + (id === specimenId ? ' selected' : '') + '>' + specimen.label + '</option>').join('') + '</select></label>' +
      '<label class="lab-field">Staining condition <select data-microscopy-control><option value="target-plus"' + (settings.control === 'target-plus' ? ' selected' : '') +
      '>Target label included</option><option value="omit-primary"' + (settings.control === 'omit-primary' ? ' selected' : '') + '>Omit primary, retain counterlabel</option></select></label>' +
      '<p data-microscopy-morphology></p><div data-microscopy-stages></div><p class="lab-result" data-microscopy-feedback role="status"></p>' +
      '<button type="button" data-microscopy-reset>Reset slide</button><div class="lab-controls">' +
      sources.map(([title, url]) => '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + title + ' ↗</a>').join('') +
      '</div></article><article class="lab-card"><h3>Optical stack</h3>' +
      '<canvas data-microscopy-canvas width="' + width + '" height="' + height + '" style="display:block;width:100%;height:auto;aspect-ratio:144/115;object-fit:contain;background:#050d14;border-radius:10px" ' +
      'role="img" aria-label="Synthetic fluorescence image of the active virtual specimen">This display requires a browser supporting canvas.</canvas>' +
      '<p><small>Simulated fluorescence, no physical scale calibration</small></p><div class="lab-controls" aria-label="Stack view">' +
      [['slice', 'Optical plane'], ['mip', 'Maximum projection'], ['xz', 'Orthogonal X–Z']].map(([id, label]) =>
        '<button type="button" data-microscopy-view="' + id + '" aria-pressed="' + (id === mode) + '">' + label + '</button>').join('') +
      '</div><div class="lab-controls" aria-label="Visible channels">' +
      channels.map((channel, i) => '<label><input type="checkbox" data-microscopy-channel="' + i + '"' + (shown[i] ? ' checked' : '') +
        '> <span style="color:' + channel.color + ';background:#07111b;padding:2px 5px;border-radius:4px">' + channel.label + '</span></label>').join('') +
      '</div><div class="lab-controls">' +
      '<label class="lab-field">Z plane <output data-micro-out="z"></output><input type="range" data-microscopy-range="z" min="0" max="' + (depth - 1) + '" step="1" value="' + settings.z + '"></label>' +
      '<label class="lab-field">Relative pinhole <output data-micro-out="opening"></output><input type="range" data-microscopy-range="opening" min=".35" max="2.4" step=".05" value="' + settings.opening + '"></label>' +
      '<label class="lab-field">Detector gain <output data-micro-out="gain"></output><input type="range" data-microscopy-range="gain" min=".35" max="5" step=".05" value="' + settings.gain + '"></label>' +
      '<label class="lab-field">Background offset <output data-micro-out="black"></output><input type="range" data-microscopy-range="black" min="0" max=".12" step=".003" value="' + settings.black + '"></label>' +
      '</div><p class="lab-result" data-microscopy-stats></p><div class="lab-controls">' +
      '<button type="button" data-microscopy-export="png" disabled>Export synthetic PNG</button>' +
      '<button type="button" data-microscopy-export="csv" disabled>Export stack metrics CSV</button>' +
      (publishSynthetic ? '<button type="button" data-microscopy-export="analysis" disabled>Send metrics to Data Analysis</button>' : '') +
      '</div></article></div></section>';
  }

  function sampleName() {
    return specimens[specimenId].label + ' / ' + (settings.control === 'omit-primary' ? 'omit primary' : 'target included');
  }

  function updatePrep() {
    const panel = node.querySelector('[data-microscopy-stages]');
    const ready = settings.stage === actions.length;
    node.querySelector('[data-microscopy-morphology]').textContent = specimens[specimenId].explanation;
    panel.innerHTML = '<progress max="' + actions.length + '" value="' + settings.stage + '" aria-label="Slide preparation progress"></progress><ol>' +
      actions.map(([id, label], index) => '<li><button type="button" data-microscopy-action="' + id + '"' +
        (index !== settings.stage ? ' disabled' : '') + '>' + (index < settings.stage ? '✓ ' : '') + label + '</button></li>').join('') +
      '</ol>' + (ready ? '<p>Slide mounted. Explore the channels and compare optical sections.</p>' : '');
    node.querySelector('[data-microscopy-feedback]').textContent = feedback;
    node.querySelectorAll('[data-microscopy-export]').forEach(button => { button.disabled = !ready; });
  }

  function paint() {
    if (!node) return;
    const canvas = node.querySelector('[data-microscopy-canvas]');
    const frame = viewFrame(volume, mode, settings);
    canvas.width = frame.w;
    canvas.height = frame.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const image = ctx.createImageData(frame.w, frame.h);
    for (let pixel = 0; pixel < frame.w * frame.h; pixel += 1) {
      const rgb = [4, 8, 13];
      for (let c = 0; c < channels.length; c += 1) {
        if (!shown[c]) continue;
        const value = limit(frame.data[c][pixel], 0, 1);
        rgb[0] += channels[c].rgb[0] * value;
        rgb[1] += channels[c].rgb[1] * value;
        rgb[2] += channels[c].rgb[2] * value;
      }
      const i = pixel * 4;
      image.data[i] = rgb[0];
      image.data[i + 1] = rgb[1];
      image.data[i + 2] = rgb[2];
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    canvas.setAttribute('aria-label', 'Synthetic ' + mode + ' view of ' + sampleName());
    for (const key of ['z', 'opening', 'gain', 'black']) {
      node.querySelector('[data-micro-out="' + key + '"]').textContent = key === 'z'
        ? (settings.z + 1) + ' of ' + depth : settings[key].toFixed(key === 'black' ? 3 : 2);
    }
    node.querySelector('[data-microscopy-range="z"]').disabled = mode !== 'slice';
    const results = frame.data.map(stats);
    const labels = results.map((channel, c) => shown[c] ? channels[c].label + ' ' + (channel.mean * 255).toFixed(1) + ' a.u.' : '').filter(Boolean);
    const worstClipping = Math.max(0, ...results.map((entry, c) => shown[c] ? entry.clipped : 0));
    node.querySelector('[data-microscopy-stats]').textContent = (labels.length ? 'Mean display intensity · ' + labels.join(' · ') : 'Enable a channel to inspect intensity.') +
      (worstClipping >= .002 ? ' · Saturation present. Lower gain before comparing intensities.' : '');
  }

  function queuePaint() {
    availableCsv = null;
    if (pendingPaint) cancelAnimationFrame(pendingPaint);
    pendingPaint = requestAnimationFrame(() => { pendingPaint = null; paint(); });
  }

  function csv() {
    if (availableCsv) return availableCsv;
    const rows = ['origin,condition,slice,channel,area,mean_intensity,clipped_fraction'];
    const condition = '"' + sampleName().replaceAll('"', '""') + '"';
    for (let z = 0; z < depth; z += 1) {
      frameAt(volume, z, settings).map(stats).forEach((item, c) => {
        rows.push(['synthetic', condition, z + 1, channels[c].id, item.area, (item.mean * 255).toFixed(4), item.clipped.toFixed(6)].join(','));
      });
    }
    availableCsv = rows.join('\n') + '\n';
    return availableCsv;
  }

  function handleSlideChange() {
    settings.stage = 0;
    feedback = '';
    updatePrep();
    queuePaint();
  }

  function bind(root) {
    unmount();
    node = root.matches?.('[data-microscopy]') ? root : root.querySelector('[data-microscopy]');
    if (!node) return;
    bindings = new AbortController();
    const { signal } = bindings;
    node.addEventListener('input', event => {
      const key = event.target.dataset.microscopyRange;
      if (!key) return;
      settings[key] = Number(event.target.value);
      queuePaint();
    }, { signal });
    node.addEventListener('change', event => {
      const input = event.target;
      if (input.matches('[data-microscopy-specimen]')) {
        specimenId = input.value;
        volume = buildOpticalVolume(specimenId);
        handleSlideChange();
      } else if (input.matches('[data-microscopy-control]')) {
        settings.control = input.value;
        handleSlideChange();
      } else if (input.matches('[data-microscopy-channel]')) {
        shown[Number(input.dataset.microscopyChannel)] = input.checked;
        queuePaint();
      }
    }, { signal });
    node.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      const action = button.dataset.microscopyAction;
      const view = button.dataset.microscopyView;
      const format = button.dataset.microscopyExport;
      if (action && actions[settings.stage]?.[0] === action) {
        feedback = action === 'label' && settings.control === 'omit-primary'
          ? 'The primary label was omitted. Any signal in its channel represents modeled background.'
          : actions[settings.stage][2];
        settings.stage += 1;
        updatePrep();
        node.querySelector('[data-microscopy-action]:enabled')?.focus();
        announce(feedback);
        queuePaint();
      } else if (view) {
        mode = view;
        node.querySelectorAll('[data-microscopy-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        queuePaint();
      } else if (button.matches('[data-microscopy-reset]')) {
        handleSlideChange();
      } else if (format && settings.stage === actions.length) {
        if (format === 'analysis') {
          publishSynthetic({ title: 'Synthetic confocal stack · ' + sampleName(), csv: csv(), kind: 'microscopy' });
        } else if (format === 'csv') {
          download('flylab-synthetic-confocal-' + specimenId + '.csv', csv(), 'text/csv');
        } else {
          paint();
          const source = node.querySelector('[data-microscopy-canvas]');
          const capture = document.createElement('canvas');
          capture.width = 576;
          capture.height = Math.round(source.height / source.width * 576) + 44;
          const ctx = capture.getContext('2d');
          ctx.fillStyle = '#07111b';
          ctx.fillRect(0, 0, capture.width, capture.height);
          ctx.drawImage(source, 0, 44, capture.width, capture.height - 44);
          ctx.fillStyle = '#e7f3ff';
          ctx.font = '14px sans-serif';
          ctx.fillText('FlyLab 3D · SYNTHETIC · ' + sampleName(), 13, 26, capture.width - 26);
          capture.toBlob(blob => { if (blob) download('flylab-synthetic-confocal-' + specimenId + '.png', blob, 'image/png'); });
        }
      }
    }, { signal });
    updatePrep();
    paint();
  }

  function unmount() {
    bindings?.abort();
    if (pendingPaint) cancelAnimationFrame(pendingPaint);
    pendingPaint = null;
    node = null;
  }

  return { render, bind, unmount };
}
