import { average, clamp, csvRows, fmt, intValue, lineChart, rng, sourceLink, symmetricNoise } from './phase4-data.js';

const sites = {
  S: { name: 'Short', point: [224, 134], detail: 'The short class is distinguished by hair length and position.' },
  I: { name: 'Intermediate', point: [285, 90], detail: 'Many intermediate sensilla have fewer gustatory neurons than L- and S-type sensilla.' },
  L: { name: 'Long', point: [317, 60], detail: 'Long sensilla provide a distinct morphological landmark for placement.' },
};
const pulse = [0, .37, .93, 1, .46, -.12, -.39, -.16, 0];
const sampleRate = 1000;
const summaryColumns = ['origin', 'assay', 'seed', 'condition', 'replicate', 'subject', 'time', 'value', 'unit', 'metric', 'sensillum', 'threshold', 'contact'];
const waveformColumns = ['origin', 'assay', 'seed', 'condition', 'replicate', 'subject', 'time', 'value', 'unit', 'metric', 'sensillum', 'threshold', 'contact', 'detected_spike'];
const defaultSettings = { site: 'L', seed: 46, replicates: 4, duration: 1, profile: 'elevated', contact: 'centered', noise: 18 };
const profiles = {
  matched: { label: 'Matched to control', rate: 7 },
  elevated: { label: 'Elevated event rate', rate: 22 },
  reduced: { label: 'Reduced event rate', rate: 3 },
};
const methods = {
  tip: { name: 'Labellar tip recording' },
  ssr: { name: 'Antennal single-sensillum recording', description: 'Compare synthetic extracellular events before and after a virtual stimulus. The trace contains a teaching example of threshold detections.', metric: 'Detected events', unit: 'events', axis: 'Signal (a.u.)' },
  eag: { name: 'Electroantennography', description: 'Inspect a synthetic antennal field response. The plotted deflection represents a population signal.', metric: 'Trough magnitude', unit: 'voltage a.u.', axis: 'Field signal (a.u.)' },
  nmj: { name: 'Larval neuromuscular junction', description: 'Compare a synthetic background trace with an evoked postsynaptic voltage response.', metric: 'Peak voltage change', unit: 'voltage a.u.', axis: 'Voltage change (a.u.)' },
  patch: { name: 'Whole-cell current recording', description: 'Compare the resulting current traces for a normalized command step. The command and current are shown on separate scales.', metric: 'Mean step current', unit: 'current a.u.', axis: 'Current (a.u.)' },
  calcium: { name: 'Calcium response imaging', description: 'Examine a normalized fluorescence trace and its delayed rise and recovery. The synthetic signal represents a calcium indicator response.', metric: 'Peak relative fluorescence', unit: 'fluorescence a.u.', axis: 'Fluorescence change (a.u.)' },
};
const modelWindow = 2;
const modelRate = 500;

export function generateTipRecording(settings) {
  const sampleCount = Math.round(settings.duration * sampleRate);
  const rows = [];
  const gain = settings.contact === 'offset' ? .45 : 1;
  for (const [label, rate] of [['Blank control', 7], ['Simulated stimulus', profiles[settings.profile].rate]]) {
    for (let repeat = 1; repeat <= settings.replicates; repeat++) {
      const random = rng(settings.seed + repeat * 731 + (label === 'Blank control' ? 8231 : 2917));
      const scale = settings.noise / 160;
      const phase = random() * Math.PI * 2;
      const samples = Array.from({ length: sampleCount }, (_, i) => scale * symmetricNoise(random) + .035 * Math.sin(i * .08 + phase));
      const variedRate = Math.max(.2, rate * (1 + .14 * symmetricNoise(random)));
      let t = 8;
      while (t < sampleCount - pulse.length - 1) {
        t += 11 + Math.floor(-Math.log(Math.max(1e-8, random())) * sampleRate / variedRate);
        if (t >= sampleCount - pulse.length - 1) break;
        const height = gain * (.8 + .34 * random());
        for (const [j, value] of pulse.entries()) samples[t + j] += height * value;
      }
      rows.push({ condition: label, replicate: repeat, samples });
    }
  }
  return rows;
}

export function detectSpikes(samples, threshold) {
  const result = [];
  for (let index = 1; index < samples.length - 1; index++) {
    const amplitude = samples[index];
    if (amplitude >= threshold && amplitude > samples[index - 1] && amplitude >= samples[index + 1]) {
      result.push(index);
      index += 7;
    }
  }
  return result;
}

export function generateNeuralResponses({ method, seed, replicates, strength }) {
  if (!Object.hasOwn(methods, method) || method === 'tip') return [];
  const rows = [];
  const count = modelWindow * modelRate;
  const pulseAt = .4;
  const commandEnd = 1.5;
  const interval = .5;
  for (const [group, condition] of ['Control', 'Test'].entries()) {
    for (let replicate = 1; replicate <= replicates; replicate++) {
      const random = rng(seed + (group ? 513 : 801) + replicate * 719);
      const gain = (group ? strength / 100 : .12) * (.84 + random() * .27);
      const samples = Array.from({ length: count }, (_, index) => {
        const t = index / modelRate;
        const dt = t - pulseAt;
        const noise = .025 * symmetricNoise(random);
        if (dt < 0 || method === 'ssr') return noise;
        if (method === 'eag') return noise - gain * (1 - Math.exp(-dt / .065)) * Math.exp(-dt / .37);
        if (method === 'nmj') return noise + gain * (1 - Math.exp(-dt / .038)) * Math.exp(-dt / .12);
        if (method === 'patch') return noise + (t < commandEnd ? gain * (.72 + .39 * Math.exp(-dt / .11)) : -.07 * gain * Math.exp(-(t - commandEnd) / .08));
        const first = (1 - Math.exp(-dt / .17)) * Math.exp(-dt / .75);
        const next = Math.max(0, dt - interval);
        return noise + gain * (first + .4 * (1 - Math.exp(-next / .17)) * Math.exp(-next / .75));
      });
      if (method === 'ssr') {
        let i = 10;
        while (i < count - pulse.length - 1) {
          const active = i / modelRate >= pulseAt && i / modelRate < commandEnd;
          i += 10 + Math.floor(-Math.log(Math.max(1e-8, random())) * modelRate / (6 + (active ? 25 * gain : 0)));
          if (i >= count - pulse.length - 1) break;
          for (const [j, value] of pulse.entries()) samples[i + j] += (.66 + .21 * random()) * value;
        }
      }
      const value = method === 'ssr' ? detectSpikes(samples, .40).length :
        method === 'eag' ? -Math.min(...samples) :
        method === 'patch' ? average(samples.slice(Math.round(.9 * modelRate), Math.round(1.3 * modelRate))) :
        Math.max(...samples);
      rows.push({ condition, replicate, samples, value });
    }
  }
  return rows;
}

function electrodeIllustration(site, aligned, contact) {
  const [x, y] = sites[site].point;
  const endX = aligned ? x + (contact === 'offset' ? 14 : 0) : x + 54;
  const endY = aligned ? y - (contact === 'offset' ? 8 : 0) : y - 18;
  const marker = Object.entries(sites).map(([code, { point: [sx, sy] }]) => {
    const active = code === site;
    return '<path d="M' + (sx - 23) + ' ' + (sy + 32) + 'Q' + (sx - 13) + ' ' + (sy + 9) + ' ' + sx + ' ' + sy + '" stroke="' + (active ? '#27684e' : '#846952') + '" stroke-width="' + (active ? 3.5 : 2) + '" fill="none"/>'
      + '<circle cx="' + sx + '" cy="' + sy + '" r="' + (active ? 8 : 5) + '" fill="' + (active ? '#c5ead5' : '#f4e3c7') + '" stroke="' + (active ? '#27684e' : '#846952') + '"/>'
      + '<text x="' + (sx - 10) + '" y="' + (sy - 12) + '" fill="#234537" font-size="12" font-weight="650">' + code + '</text>';
  }).join('');
  return '<svg viewBox="0 0 460 235" width="100%" role="img" aria-label="Schematic taste hairs and a virtual recording electrode" style="display:block;max-width:520px;background:#f6faf7;border-radius:8px">'
    + '<path d="M135 220 C90 167 106 110 171 139 C197 154 215 162 230 201 C248 160 271 140 301 148 C335 157 358 203 341 220 Z" fill="#eacaa4" stroke="#896951" stroke-width="2"/>'
    + '<path d="M155 215Q146 171 182 157M268 213Q300 179 311 174" fill="none" stroke="#ba966e" stroke-width="2" />' + marker
    + '<path d="M438 18L' + (endX + 23) + ' ' + (endY - 12) + 'L' + endX + ' ' + endY + 'L' + (endX + 28) + ' ' + (endY - 3) + 'L443 28 Z" fill="#d9e5ef" stroke="#426d8e" stroke-width="1.7"/>'
    + '<text x="20" y="23" fill="#426056" font-size="10">SCHEMATIC LABELLUM</text>'
    + '<text x="356" y="56" fill="#426d8e" font-size="10">ELECTRODE</text></svg>';
}

export function createNeuroLab({ escapeHtml, download, announce, publishSynthetic }) {
  const bound = new WeakSet();
  let settings = { ...defaultSettings };
  let aligned = false;
  let acquisition = null;
  let method = 'tip';
  let methodRows = null;
  let methodStrength = 70;
  let methodTrace = 0;
  let traceIndex = 0;
  let threshold = .48;
  const esc = escapeHtml;
  const option = (value, title, selected) => '<option value="' + esc(value) + '"' + (value === selected ? ' selected' : '') + '>' + esc(title) + '</option>';
  const field = (label, input) => '<label class="lab-field"><span>' + label + '</span>' + input + '</label>';
  const number = (name, value, min, max, step = 1) => '<input type="number" data-tip-setting="' + name + '" value="' + value + '" min="' + min + '" max="' + max + '" step="' + step + '" required>';
  function inputSettings(name, value) {
    if (name === 'profile' && Object.hasOwn(profiles, value)) settings.profile = value;
    if (name === 'contact' && ['centered', 'offset'].includes(value)) {
      settings.contact = value;
      aligned = false;
    }
    if (name === 'seed') settings.seed = intValue(value, settings.seed, 1, 99999999);
    if (name === 'replicates') settings.replicates = intValue(value, settings.replicates, 2, 8);
    if (name === 'duration') settings.duration = intValue(Number(value) * 1000, settings.duration * 1000, 500, 2500) / 1000;
    if (name === 'noise') settings.noise = intValue(value, settings.noise, 0, 55);
    acquisition = null;
    traceIndex = 0;
  }

  function renderResult() {
    if (!acquisition) return '<div class="lab-result"><p>Choose a site, align the electrode, then acquire a control and stimulus recording for each replicate.</p></div>';
    const data = acquisition.rows;
    const selected = data[traceIndex] ?? data[0];
    const found = detectSpikes(selected.samples, threshold);
    const means = ['Blank control', 'Simulated stimulus'].map(condition => {
      const traces = data.filter(row => row.condition === condition);
      const counts = traces.map(trial => detectSpikes(trial.samples, threshold).length);
      return '<li><strong>' + condition + '</strong><br>' + fmt(average(counts)) + ' spikes per trial · ' + traces.length + ' replicates</li>';
    }).join('');
    const points = selected.samples.map((value, index) => [index / sampleRate, value]);
    const chart = lineChart({
      series: [{ points, color: '#337455' }], xRange: [0, acquisition.config.duration],
      yRange: [Math.min(-.52, ...selected.samples), Math.max(1.24, ...selected.samples)],
      xLabel: 'Virtual time (s)', yLabel: 'Signal (illustrative units)', name: 'Synthetic tip recording and detected events',
      threshold, spikes: found.map(index => points[index]),
    });
    return '<div class="lab-result"><h2>Synthetic tip recording</h2><p>Spikes are threshold detections in a generated trace. Adjust the threshold or compare the mock contact conditions to see how detection changes.</p>'
      + '<div class="lab-controls">' + field('Trace', '<select data-tip-trace>' + data.map((row, i) => option(String(i), row.condition + ' · replicate ' + row.replicate, String(traceIndex))).join('') + '</select>')
      + field('Detection threshold', '<input type="number" data-tip-threshold min=".10" max="1.50" step=".01" value="' + threshold + '">')
      + '</div>' + chart + '<p><strong>' + found.length + '</strong> detected spikes · ' + fmt(found.length / acquisition.config.duration) + ' per virtual second · red marks show detections.</p>'
      + '<ul class="lab-grid">' + means + '</ul>'
      + '<div class="lab-controls"><button type="button" data-tip-action="summary">Download spike counts CSV</button><button type="button" data-tip-action="waveform">Download selected trace CSV</button>'
      + (publishSynthetic ? '<button type="button" data-tip-action="analysis">Send synthetic data to Analysis</button>' : '') + '</div></div>';
  }

  function methodResults() {
    if (!methodRows) return '<p>Generate a synthetic recording to compare the control and test groups.</p>';
    const active = methodRows[methodTrace] ?? methodRows[0];
    const model = methods[method];
    const points = active.samples.map((value, index) => [index / modelRate, value]);
    const eventMarkers = method === 'ssr' ? detectSpikes(active.samples, .40).map(index => points[index]) : [];
    const meanByGroup = ['Control', 'Test'].map(condition => '<li><strong>' + condition + '</strong><br>'
      + fmt(average(methodRows.filter(row => row.condition === condition).map(row => row.value))) + ' ' + esc(model.unit) + '</li>').join('');
    const chart = lineChart({
      series: [{ points, color: '#337455' }], xRange: [0, modelWindow],
      yRange: [Math.min(-.15, ...active.samples), Math.max(.15, ...active.samples)], xLabel: 'Virtual time (s)',
      yLabel: model.axis, name: 'Synthetic ' + model.name, threshold: method === 'ssr' ? .40 : undefined,
      spikes: eventMarkers,
    });
    const command = method === 'patch' ? lineChart({
      series: [{ points: [[0, 0], [.4, 0], [.4, 1], [1.5, 1], [1.5, 0], [2, 0]], color: '#8a6489' }],
      xRange: [0, modelWindow], yRange: [0, 1.1], xLabel: 'Virtual time (s)', yLabel: 'Command level (normalized)', name: 'Normalized command step',
    }) : '';
    return '<div class="lab-result"><h2>Synthetic traces</h2><div class="lab-controls">' + field('Trace',
      '<select data-neuro-trace>' + methodRows.map((row, i) => option(String(i), row.condition + ' · replicate ' + row.replicate, String(methodTrace))).join('') + '</select>')
      + '</div>' + chart + command + '<h3>' + esc(model.metric) + ' by group</h3><ul class="lab-grid">' + meanByGroup + '</ul>'
      + '<div class="lab-controls"><button type="button" data-neuro-action="summary">Download summaries CSV</button><button type="button" data-neuro-action="waveform">Download selected trace CSV</button>'
      + (publishSynthetic ? '<button type="button" data-neuro-action="analysis">Send synthetic data to Analysis</button>' : '') + '</div></div>';
  }

  function renderAdditional(header) {
    const model = methods[method];
    return header + '<article class="lab-card"><h2>' + esc(model.name) + '</h2><p>' + model.description + '</p><div class="lab-controls">'
      + field('Virtual test response strength (%)', '<input type="number" min="0" max="100" step="1" value="' + methodStrength + '" data-neuro-setting="strength">')
      + field('Replicates per condition', '<input type="number" min="2" max="8" step="1" value="' + settings.replicates + '" data-neuro-setting="replicates">')
      + field('Random seed', '<input type="number" min="1" max="99999999" step="1" value="' + settings.seed + '" data-neuro-setting="seed">')
      + '</div><button type="button" data-neuro-action="run">Generate paired traces</button></article>'
      + '<div data-neuro-results>' + methodResults() + '</div><footer><p>' + sourceLink(method) + '</p></footer></section>';
  }

  function render() {
    const header = '<section class="lab-section" aria-labelledby="tip-title"><header><h1 id="tip-title">Neurobiology and electrophysiology</h1><p>Explore how different measurement methods represent neural activity. Signals and parameter effects are synthetic.</p></header>'
      + '<div class="lab-controls">' + field('Recording method', '<select data-neuro-method>' + Object.entries(methods)
        .map(([key, info]) => option(key, info.name, method)).join('') + '</select>') + '</div>';
    if (method !== 'tip') return renderAdditional(header);
    return header
      + '<div class="lab-grid"><article class="lab-card"><h2>Virtual electrode</h2><div class="lab-controls" aria-label="Sensillum class">'
      + Object.entries(sites).map(([code, site]) => '<button type="button" data-tip-site="' + code + '" aria-pressed="' + (settings.site === code) + '">' + code + ' · ' + site.name + '</button>').join('')
      + '</div>' + electrodeIllustration(settings.site, aligned, settings.contact)
      + '<p>' + sites[settings.site].detail + ' Individual sensilla can differ. For physiological properties, consult the linked studies.</p>'
      + '<p role="status">' + (aligned ? 'Electrode placed at the selected virtual site.' : 'Select a site and place the virtual electrode.') + '</p>'
      + '<button type="button" data-tip-action="align">Place electrode at ' + settings.site + '</button></article>'
      + '<article class="lab-card"><h2>Acquisition setup</h2><div class="lab-controls">'
      + field('Contact', '<select data-tip-setting="contact">' + option('centered', 'Centered', settings.contact) + option('offset', 'Offset', settings.contact) + '</select>')
      + field('Simulated stimulus profile', '<select data-tip-setting="profile">' + Object.entries(profiles).map(([key, profile]) => option(key, profile.label, settings.profile)).join('') + '</select>')
      + field('Replicates per condition', number('replicates', settings.replicates, 2, 8))
      + field('Observation window (s)', number('duration', settings.duration, .5, 2.5, .25))
      + field('Synthetic background noise', number('noise', settings.noise, 0, 55))
      + field('Random seed', number('seed', settings.seed, 1, 99999999))
      + '</div><p>The generator adds a matched blank for every run. Stimulus profiles set illustrative event rates without assigning responses to a specific tastant or receptor.</p>'
      + '<button type="button" data-tip-action="acquire"' + (aligned ? '' : ' disabled') + '>Acquire paired recordings</button></article></div>'
      + '<div data-tip-results>' + renderResult() + '</div><footer><p>' + sourceLink('tip') + ' · ' + sourceLink('sensilla') + '</p></footer></section>';
  }

  function rowsForExport(waveform) {
    const config = acquisition.config;
    const bursts = waveform ? [acquisition.rows[traceIndex] ?? acquisition.rows[0]] : acquisition.rows;
    const rows = bursts.flatMap(row => {
      const events = detectSpikes(row.samples, threshold);
      const shared = { origin: 'synthetic', assay: 'tip-recording', seed: config.seed, condition: row.condition,
        replicate: row.replicate, subject: 'recording-' + row.replicate, sensillum: config.site, threshold, contact: config.contact };
      if (!waveform) return [{ ...shared, time: config.duration, value: events.length, unit: 'spikes', metric: 'detected_spike_count' }];
      const at = new Set(events);
      return row.samples.map((value, index) => ({ ...shared, time: index / sampleRate, value, unit: 'a.u.', metric: 'waveform',
        detected_spike: at.has(index) ? 1 : 0 }));
    });
    return csvRows(waveform ? waveformColumns : summaryColumns, rows);
  }

  function methodCsv(waveform) {
    const model = methods[method];
    const measure = wave => ({
      origin: 'synthetic', assay: method, seed: settings.seed, condition: wave.condition,
      replicate: wave.replicate, subject: 'recording-' + wave.replicate,
    });
    const baseFields = summaryColumns.slice(0, 10);
    if (!waveform) return csvRows(baseFields, methodRows.map(row => ({
      ...measure(row), time: modelWindow, value: row.value, unit: model.unit, metric: model.metric,
    })));
    const selected = methodRows[methodTrace] ?? methodRows[0];
    return csvRows(baseFields, selected.samples.map((value, i) => ({
      ...measure(selected), time: i / modelRate, value, unit: 'a.u.', metric: 'waveform',
    })));
  }

  function bind(root) {
    if (bound.has(root)) return;
    bound.add(root);
    function redraw(focusSelector) {
      root.innerHTML = render();
      if (focusSelector) root.querySelector(focusSelector)?.focus();
    }
    root.addEventListener('click', event => {
      const methodButton = event.target.closest('[data-neuro-action]');
      if (methodButton?.dataset.neuroAction) {
        const action = methodButton.dataset.neuroAction;
        if (action === 'run') {
          methodRows = generateNeuralResponses({ method, seed: settings.seed, replicates: settings.replicates, strength: methodStrength });
          methodTrace = settings.replicates;
          redraw('[data-neuro-trace]');
          announce?.('Synthetic neural responses are ready.');
        } else if (methodRows) {
          const csv = methodCsv(action === 'waveform');
          if (action === 'analysis') publishSynthetic?.({ title: 'Synthetic ' + methods[method].name, kind: method === 'ssr' ? 'spikes' : 'summary', csv });
          else download('flylab-' + method + '-' + action + '-synthetic.csv', csv, 'text/csv');
        }
        return;
      }
      const source = event.target.closest('[data-tip-site],[data-tip-action]');
      if (!source || source.disabled) return;
      if (source.dataset.tipSite) {
        settings = { ...settings, site: source.dataset.tipSite };
        aligned = false;
        acquisition = null;
        redraw('[data-tip-site="' + settings.site + '"]');
        return;
      }
      const action = source.dataset.tipAction;
      if (action === 'align') {
        aligned = true;
        redraw('[data-tip-action="acquire"]');
        announce?.('Virtual electrode placed.');
      } else if (action === 'acquire' && aligned) {
        acquisition = { config: { ...settings }, rows: generateTipRecording(settings) };
        traceIndex = settings.replicates;
        redraw('[data-tip-trace]');
        announce?.('Synthetic paired recordings are ready.');
      } else if (acquisition && ['summary', 'waveform', 'analysis'].includes(action)) {
        const data = rowsForExport(action === 'waveform');
        if (action === 'analysis') publishSynthetic?.({ title: 'Synthetic labellar tip recordings', kind: 'spikes', csv: data });
        else download('flylab-tip-' + action + '-synthetic.csv', data, 'text/csv');
      }
    });
    root.addEventListener('change', event => {
      const source = event.target;
      if (source.hasAttribute('data-neuro-method') && Object.hasOwn(methods, source.value)) {
        method = source.value;
        methodRows = null;
        redraw('[data-neuro-method]');
      } else if (source.dataset.neuroSetting) {
        const key = source.dataset.neuroSetting;
        if (key === 'strength') {
          methodStrength = intValue(source.value, methodStrength, 0, 100);
          source.value = String(methodStrength);
        } else {
          inputSettings(key, source.value);
          source.value = String(settings[key]);
        }
        methodRows = null;
        root.querySelector('[data-neuro-results]').innerHTML = methodResults();
      } else if (source.hasAttribute('data-neuro-trace') && methodRows) {
        methodTrace = intValue(source.value, methodTrace, 0, methodRows.length - 1);
        redraw('[data-neuro-trace]');
      } else if (source.dataset.tipSetting) {
        inputSettings(source.dataset.tipSetting, source.value);
        if (source.dataset.tipSetting === 'contact') redraw('[data-tip-setting="contact"]');
        else {
          const area = root.querySelector('[data-tip-results]');
          if (area) area.innerHTML = renderResult();
          source.value = String(settings[source.dataset.tipSetting]);
        }
      } else if (source.hasAttribute('data-tip-trace')) {
        traceIndex = intValue(source.value, traceIndex, 0, acquisition.rows.length - 1);
        redraw('[data-tip-trace]');
      } else if (source.hasAttribute('data-tip-threshold')) {
        const value = Number(source.value);
        threshold = Number.isFinite(value) ? clamp(value, .10, 1.50) : threshold;
        redraw('[data-tip-threshold]');
      }
    });
  }

  return { render, bind };
}
