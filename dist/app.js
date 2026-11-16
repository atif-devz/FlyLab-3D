import { anatomy as adultAnatomy, sources as adultSources, systems } from './anatomy.js';
import { larvalAnatomy, larvalSources } from './larval-anatomy.js';
import { parseObservations, getSeries, getConditions, summarize, exampleCsv, larvalExampleCsv } from './observations.js';
import { createProtocolLab } from './protocol-lab.js';
import { dashboardHtml } from './dashboard.js';
import { inventoryCsv } from './protocol-inventory.js';
import { createTrainingProgress, trainingPlan, trainingReport } from './training-progress.js';
import { createMicroscopy } from './microscopy.js';
import { createGeneticsLab } from './genetics-lab.js';
import { createMolecularLab } from './molecular-lab.js';
import { createNeuroLab } from './neuro-lab.js';
import { createBehaviorLab } from './behavior-lab.js';
import { createAnalysisLab } from './analysis-lab.js';
import { createResearchPlanner } from './research-planner.js';
import { createResearchGuide } from './research-guide.js';
import { createCourseLab } from './course-lab.js';
import { createResearchWorkbench } from './research-workbench.js';
import { createExperimentBuilder } from './experiment-builder.js';
import { createInferenceLab } from './inference-lab.js';

const $ = id => document.getElementById(id);
const anatomyById = new Map([...adultAnatomy, ...larvalAnatomy].map(part => [part.id, part]));
const sources = [...adultSources, ...larvalSources];
const systemsById = new Map(systems.map(system => [system.id, system]));
const buttons = {
  layers: '<path d="m2 7 8-4 8 4-8 4zM2 10l8 4 8-4M2 13l8 4 8-4"/>',
  heart: '<path d="M10 17 3.9 11a4 4 0 1 1 5.7-5.7l.4.5.4-.5a4 4 0 1 1 5.7 5.7Z"/>',
  scissors: '<circle cx="5" cy="5" r="2.7"/><circle cx="5" cy="15" r="2.7"/><path d="m7 7 10 10M7 13l10-10"/>',
  flask: '<path d="M7 2h6m-5 0v6l-5 8a1 1 0 0 0 1 2h12a1 1 0 0 0 1-2l-5-8V2M6 13h8"/>',
  compare: '<rect x="2.5" y="3" width="5.5" height="14" rx="1"/><rect x="12" y="3" width="5.5" height="14" rx="1"/>',
  info: '<circle cx="10" cy="10" r="7.4"/><path d="M10 9v5M10 6.2h.01"/>',
  plus: '<path d="M5 10h10M10 5v10"/>',
  minus: '<path d="M5 10h10"/>',
  reset: '<circle cx="10" cy="10" r="4"/><path d="M10 2v4m0 8v4m8-8h-4M6 10H2"/>',
  camera: '<path d="M3 6h3l1.5-2h5L14 6h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"/><circle cx="10" cy="11" r="3"/>',
  eye: '<path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z"/><circle cx="10" cy="10" r="2"/>',
  hide: '<path d="m3 3 14 14M8 5.3c.6-.2 1.3-.3 2-.3 5 0 8 5 8 5a13 13 0 0 1-2.6 2.9M11.8 14.8c-.6.1-1.2.2-1.8.2-5 0-8-5-8-5a14 14 0 0 1 2.7-3"/>',
  isolate: '<path d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4"/><circle cx="10" cy="10" r="2"/>',
  close: '<path d="m5 5 10 10M5 15 15 5"/>',
  down: '<path d="m5 8 5 5 5-5"/>',
  arrow: '<path d="M4 10h12m-5-5 5 5-5 5"/>',
  search: '<circle cx="8.6" cy="8.6" r="4.8"/><path d="m12 12 4.5 4.5"/>',
  moon: '<path d="M17 12.5A7.1 7.1 0 0 1 7.5 3a7.3 7.3 0 1 0 9.5 9.5Z"/>',
  sun: '<circle cx="10" cy="10" r="3.5"/><path d="M10 2v2m0 12v2M2 10h2m12 0h2M4.4 4.4l1.4 1.4m8.4 8.4 1.4 1.4m0-11.2-1.4 1.4m-8.4 8.4-1.4 1.4"/>',
  book: '<path d="M10 5C7 3 5 3 2 4v12c3-1 5-1 8 1 3-2 5-2 8-1V4c-3-1-5-1-8 1v12"/>',
  anchor: '<circle cx="10" cy="5" r="2.4"/><path d="M10 7.5v7.7m-5-4.5v2.2c0 2 2.2 3.6 5 3.6s5-1.6 5-3.6v-2.2M7.3 9.6h5.4"/>',
  forceps: '<path d="m5 3 5 14 5-14M4 3h2m8 0h2"/>',
  transfer: '<path d="m6 5 9 5-9 5m-3-5h11m2-7v2m0 10v2"/>',
  dashboard: '<rect x="3" y="3" width="5.5" height="5.5" rx="1"/><rect x="11.5" y="3" width="5.5" height="5.5" rx="1"/><rect x="3" y="11.5" width="5.5" height="5.5" rx="1"/><rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1"/>',
};
const modes = [
  ['dashboard', 'Dashboard', 'dashboard'], ['anatomy', 'Anatomy', 'layers'], ['protocols', 'Protocols', 'book'], ['labs', 'Labs', 'flask'], ['living', 'Living', 'heart'], ['dissect', 'Cutaway', 'scissors'],
  ['experiment', 'Experiment', 'flask'], ['compare', 'Compare', 'compare'],
];
const adultPresets = [
  ['cuticle', 'Cuticle', adultAnatomy.filter(part => part.system === 'external').map(part => part.id)],
  ['sensory', 'Sensory organs', ['cuticle', 'eyes', 'antennae', 'proboscis']],
  ['flight', 'Flight structures', ['cuticle', 'wings', 'halteres', 'legs']],
  ['organs', 'Internal organs', adultAnatomy.filter(part => part.system !== 'external').map(part => part.id)],
  ['nervous', 'Nervous system', ['brain', 'ventral-nerve-cord']],
  ['respiratory', 'Tracheal system', ['tracheae']],
  ['circulatory', 'Dorsal vessel', ['heart']],
  ['reproductive', 'Reproductive', ['ovaries']],
];
const larvalPresets = [
  ['cuticle', 'Cuticle', ['larval-cuticle', 'mouth-hooks', 'spiracles']],
  ['organs', 'Internal organs', ['larval-brain', 'larval-vnc', 'larval-tracheae', 'larval-gut']],
  ['nervous', 'Nervous system', ['larval-brain', 'larval-vnc']],
  ['respiratory', 'Tracheal system', ['larval-tracheae']],
  ['digestive', 'Digestive tract', ['larval-gut']],
];
const adultDissection = [
  { title: 'Examine the exterior', text: 'Find the compound eyes, thorax and banded abdomen before opening the cutaway.' },
  { title: 'Open the cuticle', text: 'Move the section slider to see how the cut plane exposes the organs.' },
  { title: 'Trace the digestive tract', text: 'Select the crop or the midgut to follow food storage and digestion.' },
  { title: 'Find the nervous system', text: 'Follow the brain in the head and the ventral nerve cord below the thorax.' },
];
const larvalDissection = [
  { title: 'Identify both ends', text: 'Find the mouth hooks at the anterior and the posterior spiracles at the opposite end.' },
  { title: 'Open the cuticle', text: 'Move the section slider to see how a cut plane reveals the larval organs.' },
  { title: 'Follow the digestive tract', text: 'The digestive tract occupies much of the body cavity.' },
  { title: 'Find the nervous system', text: 'Identify both brain lobes and the connected ventral nerve cord underneath the gut.' },
];
let anatomy = adultAnatomy;
let allIds = anatomy.map(part => part.id);
let external = adultPresets[0][2];
let internal = allIds.filter(id => !external.includes(id));
let presets = adultPresets;
let dissection = adultDissection;

const state = {
  stage: 'adult',
  mode: 'dashboard',
  tab: 'layers',
  preset: 'cuticle',
  visible: new Set(external),
  opacity: 1,
  clip: null,
  selected: null,
  inspector: false,
  labels: false,
  rotating: false,
  moving: !matchMedia('(prefers-reduced-motion: reduce)').matches,
  flyStyle: 'scientific',
  flyReduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  search: '',
  step: 0,
  named: false,
  rows: [],
  series: '',
  condition: '',
  compareTo: '',
  importMessage: '',
  importError: false,
  observationOrigin: null,
};

let viewer;
let viewerStarted = false;
let viewerMessage = 'Loading 3D specimen…';
let compared = false;
let tourTimer = null;
let currentView = 'default';
let fileAttempt = 0;
const fmt = new Intl.NumberFormat('en', { maximumSignificantDigits: 5 });
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
function icon(name, size = 15) {
  return '<svg aria-hidden="true" width="' + size + '" height="' + size + '" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' + (buttons[name] ?? '') + '</svg>';
}
function iconButton(action, label, picture, attributes = '') {
  return '<button type="button" class="icon-button" data-action="' + action + '" aria-label="' + esc(label) + '" title="' + esc(label) + '" ' + attributes + '>' + icon(picture) + '</button>';
}
function option(value, label, selected) {
  return '<option value="' + esc(value) + '"' + (value === selected ? ' selected' : '') + '>' + esc(label) + '</option>';
}
function sourceRows() {
  return (state.stage === 'larva' ? larvalSources : adultSources).map(source => '<li><a href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">' + esc(source.title) + '</a><small>' + esc(source.credit) + '</small></li>').join('');
}

function camera(name) {
  currentView = name;
  $('orientation').value = name;
  viewer?.orient(name);
}

function applyPreset(id) {
  const preset = presets.find(item => item[0] === id);
  if (!preset) return;
  state.preset = id;
  state.clip = null;
  state.visible = new Set(preset[2]);
  const hasInside = preset[2].some(part => internal.includes(part));
  if (hasInside) state.visible.add(cuticleId());
  state.opacity = hasInside ? .11 : 1;
  if (state.selected && !state.visible.has(state.selected)) {
    state.selected = null;
    state.inspector = false;
  }
}

function cuticleId() { return state.stage === 'larva' ? 'larval-cuticle' : 'cuticle'; }
function changeSpecimen(stage, repaint = true) {
  if (!['adult', 'larva'].includes(stage)) return;
  stopTour();
  state.stage = stage;
  anatomy = stage === 'larva' ? larvalAnatomy : adultAnatomy;
  presets = stage === 'larva' ? larvalPresets : adultPresets;
  dissection = stage === 'larva' ? larvalDissection : adultDissection;
  allIds = anatomy.map(part => part.id);
  external = presets[0][2];
  internal = allIds.filter(id => !external.includes(id));
  state.selected = null;
  state.inspector = false;
  state.search = '';
  state.step = 0;
  viewer?.setSpecimen(stage);
  applyPreset('cuticle');
  if (state.rows.length) {
    chooseSeries(getSeries(specimenRows())[0]?.key ?? '');
    if (repaint && ['experiment', 'compare'].includes(state.mode)) revealObserved();
  }
  camera('default');
  if (repaint) render();
}

function openCutaway() {
  state.preset = 'cutaway';
  state.visible = new Set(allIds);
  state.clip = .04;
  state.opacity = .35;
  camera('side');
}

function setDissectionStep(index) {
  state.step = Math.max(0, Math.min(dissection.length - 1, index));
  state.inspector = false;
  state.selected = null;
  if (state.step === 0) {
    applyPreset('cuticle');
    camera('default');
  } else if (state.step === 1) {
    openCutaway();
  } else {
    applyPreset(state.step === 2 ? (state.stage === 'larva' ? 'digestive' : 'organs') : 'nervous');
    if (state.step === 2) {
      state.visible = new Set(state.stage === 'larva' ? ['larval-cuticle', 'larval-gut'] : ['cuticle', 'crop', 'gut']);
      state.preset = null;
    }
    camera('side');
  }
}

function setMode(name) {
  stopTour();
  const leavingLesson = state.mode === 'protocols' && lab.lesson && name !== 'protocols';
  state.mode = name;
  state.inspector = false;
  state.selected = null;
  state.rotating = name === 'living' && state.moving;
  if (leavingLesson) {
    viewer?.setExtract([], true);
    viewer?.clearBenchActions();
    viewer?.setLandmark(null);
    applyPreset('cuticle');
    camera('default');
    lab.action('protocol-library');
  }
  if (name === 'dissect') setDissectionStep(0);
  if (name === 'living') {
    applyPreset('cuticle');
    camera('default');
  }
  if ((name === 'experiment' || name === 'compare') && state.rows.length) revealObserved();
  render();
}

function selectPart(id, open = false) {
  if (!allIds.includes(id)) {
    state.selected = null;
    state.inspector = false;
  } else {
    const part = anatomyById.get(id);
    state.selected = id;
    state.inspector = open || state.inspector;
    if (!state.visible.has(id)) {
      state.visible.add(id);
      state.preset = null;
    }
    if (part.system !== 'external' && state.opacity > .5 && state.clip === null) {
      state.opacity = .11;
      state.preset = null;
    }
    $('announcement').textContent = part.name + ' selected';
  }
  render();
}

function toggleVisibility(id) {
  state.preset = null;
  if (state.visible.has(id)) state.visible.delete(id);
  else {
    state.visible.add(id);
    if (internal.includes(id) && state.opacity > .5) state.opacity = .11;
  }
  render();
}

function isolate(ids) {
  state.preset = null;
  state.clip = null;
  state.opacity = 1;
  state.visible = new Set(ids);
  if (!state.visible.has(state.selected)) {
    state.selected = null;
    state.inspector = false;
  }
  render();
}

function renderLayers() {
  const placeOptions = anatomy.map(part => option(part.id, part.name, state.selected)).join('');
  return '<button class="wide-button named-place" type="button" data-action="named" aria-expanded="' + state.named + '">Open a named place ' + icon('down', 13) + '</button>'
    + (state.named ? '<div class="field"><label for="place">Anatomical structure</label><select id="place"><option value="">Select a structure</option>' + placeOptions + '</select></div>' : '')
    + '<div class="preset-grid" aria-label="Layer presets">'
    + presets.map(([id, label]) => '<button type="button" class="preset" data-action="preset" data-key="' + id + '" aria-pressed="' + (state.preset === id) + '">' + label + '</button>').join('')
    + '</div><button class="wide-button' + (state.clip !== null ? ' active' : '') + '" type="button" data-action="cutaway" aria-pressed="' + (state.clip !== null) + '">Cut through the body</button>'
    + (state.clip !== null ? clipControl() : '')
    + '<div class="section-head"><h2>System layers</h2><button type="button" class="text-button" data-action="show-all">Show all</button></div>'
    + systems.filter(system => anatomy.some(part => part.system === system.id)).map(system => {
      const parts = anatomy.filter(part => part.system === system.id);
      const shown = parts.filter(part => state.visible.has(part.id)).length;
      return '<div class="system-row"><label><input type="checkbox" data-system="' + system.id + '" ' + (shown ? 'checked' : '') + '><span class="swatch" style="--swatch:' + esc(system.color) + '"></span>' + esc(system.name) + '</label>'
        + '<button type="button" class="text-button" data-action="isolate-system" data-key="' + system.id + '" aria-label="Isolate ' + esc(system.name) + '">Isolate</button></div>';
    }).join('')
    + '<p class="muted-note">Schematic ' + (state.stage === 'larva' ? 'third-instar larval' : 'adult female') + ' anatomy. Geometry and motion are illustrative.</p>';
}

function structureList() {
  const search = state.search.trim().toLowerCase();
  const matches = anatomy.filter(part => [part.name, part.id, part.location, systemsById.get(part.system).name].some(term => term.toLowerCase().includes(search)));
  if (!matches.length) return '<p class="section-copy">No structures match your search.</p>';
  return matches.map(part => {
    const system = systemsById.get(part.system);
    const visible = state.visible.has(part.id);
    return '<div class="structure-row' + (state.selected === part.id ? ' active' : '') + '"><button type="button" class="structure-main" data-action="select" data-key="' + part.id + '">'
      + '<span class="swatch" style="--swatch:' + esc(system.color) + '"></span><span><strong>' + esc(part.name) + '</strong><small>' + esc(system.name) + ' · Schematic</small></span></button>'
      + iconButton('visibility', (visible ? 'Hide ' : 'Show ') + part.name, visible ? 'eye' : 'hide', 'data-key="' + part.id + '"') + '</div>';
  }).join('');
}

function clipControl() {
  return '<div class="field"><label for="section-depth">Section position</label><input id="section-depth" type="range" min="-1.5" max="1.5" step=".01" value="' + state.clip + '"></div>';
}

function renderDissection() {
  const step = dissection[state.step];
  const targets = state.step === 2
    ? (state.stage === 'larva' ? ['larval-gut'] : ['crop', 'gut'])
    : state.step === 3 ? (state.stage === 'larva' ? ['larval-brain', 'larval-vnc'] : ['brain', 'ventral-nerve-cord']) : [];
  return '<h2>Guided cutaway</h2><div class="steps">' + dissection.map((item, index) => '<button type="button" class="step" data-action="step" data-key="' + index + '" ' + (index === state.step ? 'aria-current="step"' : '') + '>' + esc(item.title) + icon('arrow', 12) + '</button>').join('')
    + '</div><p class="section-copy">' + esc(step.text) + '</p>'
    + (state.clip !== null ? clipControl() : '')
    + (targets.length ? '<div class="steps">' + targets.map(id => '<button type="button" class="step" data-action="select" data-key="' + id + '">' + esc(anatomyById.get(id).name) + '</button>').join('') + '</div>' : '')
    + '<div class="two-buttons"><button type="button" class="small-button" data-action="step" data-key="' + (state.step - 1) + '" ' + (state.step === 0 ? 'disabled' : '') + '>Previous</button><button type="button" class="small-button" data-action="step" data-key="' + (state.step + 1) + '" ' + (state.step === dissection.length - 1 ? 'disabled' : '') + '>Next</button></div>';
}

function specimenRows() {
  return state.rows.filter(row => allIds.includes(row.structure_id));
}
function readHighlights() {
  const inExperiment = state.mode === 'compare' || state.mode === 'experiment';
  const rows = inExperiment ? specimenRows() : [];
  const first = summarize(rows, state.series, state.condition);
  const second = summarize(state.mode === 'compare' ? rows : [], state.series, state.compareTo);
  const values = [...first.values.values(), ...second.values.values()];
  return { first, second, range: values.length ? [Math.min(...values), Math.max(...values)] : [0, 1] };
}

function renderObservations(highlights) {
  const comparing = state.mode === 'compare';
  const rows = specimenRows();
  const series = getSeries(rows);
  const conditions = getConditions(rows, state.series);
  return '<h2>' + (comparing ? 'Compare conditions' : 'Map observations') + '</h2>'
    + '<p class="section-copy">' + (comparing ? 'View two conditions side by side on the same color scale.' : 'Import a CSV or JSON file to color structures by their measured value.') + '</p>'
    + (state.observationOrigin ? '<p class="dataset-origin">' + (state.observationOrigin === 'synthetic' ? 'Synthetic example data' : 'Imported research observations') + '</p>' : '')
    + '<label class="sr-only" for="observations-file">Import observations</label><input class="file-input" id="observations-file" type="file" accept=".csv,.json,text/csv,application/json">'
    + '<div class="two-buttons"><button type="button" class="small-button" data-action="example">Load example</button><button type="button" class="small-button" data-action="download-example">Example CSV</button></div>'
    + (state.importMessage ? '<p class="import-status' + (state.importError ? ' error' : '') + '" role="status">' + esc(state.importMessage) + '</p>' : '')
    + (series.length ? '<div class="field"><label for="series">Measurement</label><select id="series">' + series.map(item => option(item.key, item.label, state.series)).join('') + '</select></div>'
    + '<div class="field"><label for="condition">' + (comparing ? 'Left condition' : 'Condition') + '</label><select id="condition">' + conditions.map(value => option(value, value, state.condition)).join('') + '</select></div>'
    + (comparing && conditions.length > 1 ? '<div class="field"><label for="compare-to">Right condition</label><select id="compare-to">' + conditions.filter(value => value !== state.condition).map(value => option(value, value, state.compareTo)).join('') + '</select></div>' : '')
    + (comparing && conditions.length < 2 ? '<p class="muted-note">This measurement needs two conditions for comparison.</p>' : '')
    + '<div class="legend" aria-label="Measurement color scale"><div class="legend-ramp"></div><div class="legend-values"><span>' + fmt.format(highlights.range[0]) + '</span><span>' + fmt.format(highlights.range[1]) + '</span></div></div>'
    + '<p class="muted-note">Color shows the mean of the imported observations. ' + [highlights.first.count, ...(comparing ? [highlights.second.count] : [])].join(' / ') + ' rows displayed.</p>'
    + '<button type="button" class="text-button" data-action="clear-data">Clear imported data</button>'
    : (state.rows.length ? '<p class="muted-note">The imported file has no observations for the selected life stage.</p><button type="button" class="text-button" data-action="clear-data">Clear imported data</button>' : '<p class="muted-note">Use the example CSV to see the expected columns. Files stay in this browser session.</p>'));
}

function renderSidebar(highlights) {
  const sidebar = $('sidebar-content');
  const scroll = sidebar.scrollTop;
  const tabs = $('tabs');
  tabs.hidden = !['anatomy', 'living'].includes(state.mode);
  sidebar.setAttribute('role', tabs.hidden ? 'region' : 'tabpanel');
  if (tabs.hidden) sidebar.removeAttribute('aria-labelledby');
  else sidebar.setAttribute('aria-labelledby', 'tab-' + state.tab);
  for (const button of tabs.querySelectorAll('button')) {
    const active = button.dataset.tab === state.tab;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  }
  if (state.mode === 'protocols') sidebar.innerHTML = lab.sidebar();
  else if (state.mode === 'dissect') sidebar.innerHTML = renderDissection();
  else if (state.mode === 'experiment' || state.mode === 'compare') sidebar.innerHTML = renderObservations(highlights);
  else if (state.tab === 'sources') sidebar.innerHTML = '<p class="sidebar-intro">Published references for the fly anatomy and model design.</p><ul class="source-list">' + sourceRows() + '</ul>';
  else if (state.tab === 'structures') sidebar.innerHTML = '<div class="search">' + icon('search') + '<label class="sr-only" for="structure-search">Search structures</label><input id="structure-search" type="search" placeholder="Search structures" value="' + esc(state.search) + '"></div><div class="structure-list" id="structure-list">' + structureList() + '</div>';
  else sidebar.innerHTML = renderLayers();
  sidebar.scrollTop = scroll;
}

function updateViewer(highlights = readHighlights()) {
  $('opacity').value = Math.round(state.opacity * 100);
  $('opacity-value').textContent = $('opacity').value + '%';
  $('show-labels').checked = state.labels;
  $('auto-rotate').checked = state.rotating;
  const flyContext = fullAdultView();
  const motionOn = state.moving && (!flyContext || !state.flyReduced);
  $('motion').setAttribute('aria-pressed', String(!motionOn));
  $('motion').setAttribute('aria-label', motionOn ? 'Pause animation' : 'Resume animation');
  $('motion').textContent = motionOn ? 'Pause' : 'Resume';
  $('motion').disabled = flyContext && state.flyReduced;
  viewer?.update({
    visible: state.visible,
    selection: state.selected,
    opacity: state.opacity,
    clipping: state.clip,
    labelVisible: state.labels,
    rotating: !['protocols', 'dashboard', 'labs'].includes(state.mode) && state.rotating && (!flyContext || !state.flyReduced),
    moving: !['protocols', 'dashboard', 'labs'].includes(state.mode) && state.moving,
    backgrounds: [highlights.first.values, highlights.second.values],
    range: highlights.range,
  });
  updateFlyControls(flyContext);
}

function fullAdultView() {
  return state.stage === 'adult' && (state.mode === 'living' || state.mode === 'anatomy') && state.clip === null
    && state.opacity >= .999 && !state.selected && !tourTimer
    && external.every(id => state.visible.has(id)) && !internal.some(id => state.visible.has(id));
}

function updateFlyControls(active) {
  const panel = $('fly-panel');
  panel.hidden = !active;
  $('motion-caption').hidden = active;
  const mode = state.mode === 'living' ? state.flyStyle : 'scientific';
  viewer?.configureFly({
    active, mode, paused: !state.moving, reducedMotion: state.flyReduced, react: state.mode === 'living',
  });
  if (!active) {
    panel.open = false;
    $('fly-greeting').hidden = true;
    return;
  }
  $('fly-reduced').checked = state.flyReduced;
  for (const button of panel.querySelectorAll('[data-action="fly-style"]')) button.setAttribute('aria-pressed', String(button.dataset.key === mode));
  const canPlay = !!viewer && state.moving && !state.flyReduced;
  for (const button of panel.querySelectorAll('[data-action="fly-play"]')) {
    button.disabled = !canPlay || (button.hasAttribute('data-playful') && mode !== 'fun');
  }
  $('fly-help').textContent = state.flyReduced ? 'Reduced motion pauses the fly.'
    : mode === 'fun' ? 'Tap the fly for a surprise. Double-tap for a special dance.'
    : state.mode === 'living' ? 'Hover near the fly or tap it for a natural movement.' : 'Living view enables hover and tap interactions.';
  if (!canPlay) $('fly-status').textContent = !viewer ? 'Waiting for the 3D viewer.' : 'Animation paused.';
}

function showFlyState({ label, message }) {
  $('fly-status').textContent = label || '';
  const greeting = $('fly-greeting');
  greeting.hidden = !message || !fullAdultView() || state.flyStyle !== 'fun';
  greeting.textContent = greeting.hidden ? '' : message;
}

function render() {
  for (const button of $('modes').querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.key === state.mode));
  const comparing = state.mode === 'compare';
  const protocolMode = state.mode === 'protocols';
  const showDashboard = state.mode === 'dashboard';
  const showLabs = state.mode === 'labs';
  const inLab = protocolMode && !!lab.lesson;
  const showLibrary = protocolMode && !inLab;
  const showStaticPage = showDashboard || showLibrary || showLabs;
  $('navigator').hidden = showDashboard || showLabs;
  $('workbench').classList.toggle('dashboard-mode', showDashboard || showLabs);
  const dashboard = $('dashboard');
  dashboard.hidden = !showDashboard;
  if (showDashboard) dashboard.innerHTML = dashboardHtml(training, esc);
  $('specimen-stage').value = state.stage;
  $('specimen-stage').disabled = protocolMode;
  const catalog = $('protocol-catalog');
  catalog.hidden = !showLibrary;
  if (showLibrary) catalog.innerHTML = lab.library();
  $('stage').classList.toggle('catalog-view', showStaticPage);
  $('stage').classList.toggle('bench-view', inLab);
  $('view-grid').hidden = showStaticPage;
  $('display').hidden = protocolMode || showDashboard || showLabs;
  $('camera-controls').hidden = showStaticPage;
  $('bottom-bar').hidden = protocolMode || showDashboard || showLabs;
  $('viewer-status').hidden = showStaticPage || !viewerMessage;
  $('viewer-status').textContent = viewerMessage;
  $('protocol-caption').hidden = !inLab;
  $('protocol-caption').textContent = inLab ? lab.stageText : '';
  $('protocol-landmark').hidden = true;
  viewer?.setBench(inLab);
  viewer?.setBenchTool(inLab && lab.phase === 'practice' && !lab.completeStep ? lab.tool : null);
  viewer?.setLandmark(inLab ? lab.marker : null);
  $('comparison-wrap').hidden = !comparing;
  $('view-grid').classList.toggle('comparing', comparing);
  if (viewer && comparing !== compared) {
    compared = comparing;
    try {
      viewer.setCompare(comparing);
    } catch (error) {
      viewerMessage = 'This browser could not open a second 3D view.';
      $('viewer-status').hidden = false;
      $('viewer-status').textContent = viewerMessage;
      console.error(error);
    }
  }
  $('caption-left').hidden = !comparing;
  $('caption-left').textContent = state.condition || 'Left condition';
  $('caption-right').textContent = state.compareTo || 'Right condition';
  const highlights = readHighlights();
  renderSidebar(highlights);
  updateViewer(highlights);
  renderInspector(highlights);
  $('tour-tools').hidden = state.mode === 'dissect' || state.mode === 'experiment' || comparing;
  $('tour-caption').textContent = tourTimer ? (presets.find(preset => preset[0] === state.preset)?.[1] ?? 'Layer tour') : 'Drag to orbit · Scroll to zoom';
  $('tour').textContent = tourTimer ? 'Stop' : 'Play layers';
  renderLabWorkspace(showLabs);
  ensureViewer();
}

function renderInspector(highlights) {
  const part = anatomyById.get(state.selected);
  const inspector = $('inspector');
  const tools = $('selection-tools');
  tools.hidden = !part;
  inspector.hidden = !part || !state.inspector;
  if (!part) return;
  const system = systemsById.get(part.system);
  const source = sources.find(candidate => candidate.id === part.source);
  tools.innerHTML = [
    ['focus', 'Focus', 'reset'], ['toggle-selected', state.visible.has(part.id) ? 'Hide' : 'Show', state.visible.has(part.id) ? 'hide' : 'eye'],
    ['isolate', 'Isolate', 'isolate'], ['details', 'Details', 'info'],
  ].map(([action, title, picture]) => '<button type="button" data-action="' + action + '">' + icon(picture, 12) + title + '</button>').join('');
  if (inspector.hidden) return;
  const value = highlights.first.values.get(part.id);
  const other = highlights.second.values.get(part.id);
  inspector.innerHTML = iconButton('close-inspector', 'Close details', 'close')
    + '<div class="descriptor"><span class="swatch" style="--swatch:' + esc(system.color) + '"></span>' + esc(system.name) + '</div>'
    + '<h2>' + esc(part.name) + '</h2><p>' + esc(part.description) + '</p><p class="subtext">' + esc(part.location) + ' · Schematic geometry</p>'
    + (value === undefined ? '' : '<p><strong>' + esc(state.condition) + '</strong> ' + fmt.format(value) + '</p>')
    + (other === undefined ? '' : '<p><strong>' + esc(state.compareTo) + '</strong> ' + fmt.format(other) + '</p>')
    + (source ? '<p class="subtext">Anatomy reference · <a class="source-link" href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">' + esc(source.title) + '</a></p>' : '');
}

function stopTour() {
  if (tourTimer) clearInterval(tourTimer);
  tourTimer = null;
}
function startTour() {
  let index = 0;
  applyPreset(presets[index][0]);
  tourTimer = setInterval(() => {
    index += 1;
    if (index >= presets.length) {
      stopTour();
      applyPreset('cuticle');
    } else applyPreset(presets[index][0]);
    render();
  }, 3400);
}

function download(blob, label) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = label;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function chooseSeries(key) {
  state.series = key;
  const conditions = getConditions(specimenRows(), key);
  state.condition = conditions[0] ?? '';
  state.compareTo = conditions[1] ?? '';
}

function revealObserved() {
  const { first, second } = readHighlights();
  const ids = new Set([...first.values.keys(), ...second.values.keys()]);
  state.visible = new Set([...external, ...ids]);
  state.clip = null;
  state.opacity = [...ids].some(id => internal.includes(id)) ? .14 : 1;
  state.preset = null;
}

function importContent(content, filename, sample = false) {
  try {
    const result = parseObservations(content, filename, anatomyById.keys());
    state.rows = result.rows;
    state.observationOrigin = sample ? 'synthetic' : 'imported';
    chooseSeries(getSeries(specimenRows())[0]?.key ?? '');
    const unknown = result.unmatched.length ? ' Unmatched IDs were skipped: ' + result.unmatched.join(', ') + '.' : '';
    state.importMessage = (sample ? 'Illustrative data. ' : '') + state.rows.length + ' observations loaded.' + unknown;
    state.importError = false;
    revealObserved();
  } catch (error) {
    state.importMessage = error.message;
    state.importError = true;
  }
  render();
}

function applyStepView(view) {
  if (view.visible) state.visible = new Set(view.visible);
  if (view.opacity !== undefined) state.opacity = view.opacity;
  if (view.clip !== undefined) state.clip = view.clip;
  state.selected = null;
  state.inspector = false;
  state.preset = null;
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
reducedMotion.addEventListener?.('change', event => {
  state.flyReduced = event.matches;
  updateViewer();
});
const training = createTrainingProgress();
const announceLab = message => { $('announcement').textContent = message; };
const labExports = (filename, contents, type) => download(contents instanceof Blob ? contents : new Blob([contents], { type }), filename);
const analysisWorkspace = createAnalysisLab({ escapeHtml: esc, download: labExports, announce: announceLab });
let activeStation = 'expanded';
let mountedStation = '';
const labOptions = {
  escapeHtml: esc,
  download: labExports,
  announce: announceLab,
  readTrainingReports: () => training.state.reports,
  publishSynthetic(dataset) {
    try { analysisWorkspace.acceptSynthetic(dataset); }
    catch (error) { announceLab(error.message); return; }
    activeStation = 'analysis';
    setMode('labs');
  },
};
const researchWorkspace = createResearchWorkbench(labOptions);
const experimentWorkspace = createExperimentBuilder(labOptions);

function openStation(id) {
  if (!stations.has(id)) return;
  activeStation = id;
  setMode('labs');
}

function openResearch() {
  openStation('resources');
  $('research-query')?.focus();
}

function openAnatomy(stage, id) {
  changeSpecimen(stage, false);
  state.tab = 'structures';
  setMode('anatomy');
  if (id) {
    selectPart(id, true);
    viewer?.focus(id);
  }
}

function lazyWorkspace(load) {
  let workspace;
  let pending;
  let mounted;
  return {
    render() { return workspace?.render() ?? '<section class="lab-section"><p role="status">Loading workspace…</p></section>'; },
    bind(root, options) {
      mounted = root;
      if (workspace) { workspace.bind(root, options); return; }
      pending ??= load().then(create => { workspace = create(labOptions); return workspace; }).catch(error => { pending = null; throw error; });
      void pending.then(result => {
        if (mounted !== root) return;
        root.innerHTML = result.render();
        result.bind(root, options);
      }).catch(() => {
        if (mounted === root) root.innerHTML = '<section class="lab-section"><p role="status">This workspace could not load. Reopen it to retry.</p></section>';
      });
    },
    unmount() { mounted = null; workspace?.unmount?.(); },
  };
}
const stationGroups = [
  ['Research workbench', [
    ['resources', 'Research resources', researchWorkspace],
    ['experiment-builder', 'Experiment builder', experimentWorkspace],
    ['analysis', 'Data analysis', analysisWorkspace],
    ['inference', 'Statistical inference', createInferenceLab(labOptions)],
  ]],
  ['Specimens and imaging', [
    ['expanded', 'Expanded dissection', lazyWorkspace(() => import('./expanded-dissection.js').then(module => module.createExpandedDissection))],
    ['microscopy', 'Imaging and microscopy', createMicroscopy(labOptions)],
  ]],
  ['Experiments', [
    ['genetics', 'Genetics and husbandry', createGeneticsLab(labOptions)],
    ['molecular', 'Molecular biology', createMolecularLab(labOptions)],
    ['neuro', 'Neurobiology and recordings', createNeuroLab(labOptions)],
    ['behavior', 'Behavior and physiology', createBehaviorLab(labOptions)],
  ]],
  ['Research and training', [
    ['planner', 'Research planner', createResearchPlanner(labOptions)],
    ['guide', 'Research guide', createResearchGuide(labOptions)],
    ['learning', 'Learning and assessment', createCourseLab(labOptions)],
    ['spatial', 'Spatial viewer', lazyWorkspace(() => import('./spatial-lab.js').then(module => module.createSpatialLab))],
  ]],
];
const stations = new Map(stationGroups.flatMap(([, items]) => items).map(([id, , workspace]) => [id, workspace]));

function renderLabWorkspace(show) {
  const host = $('lab-workspaces');
  host.hidden = !show;
  if (!show) {
    if (mountedStation) { stations.get(mountedStation)?.unmount?.(); host.innerHTML = ''; mountedStation = ''; }
    return;
  }
  if (mountedStation === activeStation) return;
  if (mountedStation) stations.get(mountedStation)?.unmount?.();
  const workspace = stations.get(activeStation);
  mountedStation = activeStation;
  host.innerHTML = '<nav class="lab-stations" aria-label="Laboratory workspaces">' + stationGroups.map(([title, items]) =>
    '<div class="lab-station-group"><h2>' + esc(title) + '</h2>' + items.map(([id, label]) =>
      '<button type="button" data-action="station" data-key="' + id + '"' + (id === activeStation ? ' aria-current="page"' : '') + '>' + esc(label) + '</button>').join('') + '</div>').join('')
    + '</nav><div class="lab-panel" id="lab-panel">' + workspace.render() + '</div>';
  workspace.bind($('lab-panel'), {
    openLesson(id) { setMode('protocols'); lab.action('protocol-open', id); },
    openStation,
    openAnatomy,
    addExperimentReference(url) {
      if (!experimentWorkspace.addReference(url)) return;
      openStation('experiment-builder');
      $('lab-panel').querySelector('[name="referenceText"]')?.focus();
    },
  });
}

const lab = createProtocolLab({
  progress: training,
  esc,
  icon,
  findPart: id => anatomyById.get(id),
  onEnter(stage) {
    changeSpecimen(stage, false);
    viewer?.setBench(true);
    viewer?.clearBenchActions();
    viewer?.setExtract([], true);
    state.labels = false;
  },
  onStep(step, extracted) {
    applyStepView(step);
    viewer?.setExtract(extracted, true);
    camera(step.view);
    const focus = step.focus ?? (extracted.has(step.target) ? step.target : null);
    if (focus) viewer?.focus(focus, step.view);
  },
  onSetup(item, step) {
    const target = item.id === 'specimen' ? { id: step.target, point: step.point } : {};
    viewer?.applyBenchAction(item.action, { ...target, instant: reducedMotion.matches });
  },
  onReplay(preparations, steps) {
    viewer?.clearBenchActions();
    for (const item of preparations) viewer?.applyBenchAction(item.action, { instant: true });
    for (const step of steps) {
      if (['open', 'release', 'stabilize'].includes(step.tool)) viewer?.applyBenchAction(step.tool,
        { id: step.target, point: step.point, instant: true });
    }
  },
  onWarning(id, point) {
    viewer?.applyBenchAction('damage', { id, point, instant: reducedMotion.matches });
  },
  onApply(step, extracted, restore, point) {
    if (step.after) applyStepView(step.after);
    viewer?.setExtract(extracted, restore || reducedMotion.matches);
    if (!restore) viewer?.applyBenchAction(step.tool, { id: step.target, point: point ?? step.point, instant: reducedMotion.matches });
    const focus = step.after?.focus;
    if (focus) viewer?.focus(focus);
    const caption = $('protocol-caption');
    if (!restore && !reducedMotion.matches) caption.animate?.([{ opacity: .45, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 360, easing: 'ease-out' });
  },
  onChange: render,
  announce(message) { $('announcement').textContent = message; },
});

$('modes').innerHTML = modes.map(([id, name, picture]) => '<button type="button" aria-pressed="false" data-action="mode" data-key="' + id + '">' + icon(picture, 16) + name + '</button>').join('');
$('global-research').innerHTML = icon('search', 17);
$('global-research').onclick = openResearch;
const themeKey = 'flylab-color-theme-v1';
let colorTheme = 'light';
try {
  const preference = localStorage.getItem(themeKey);
  if (preference === 'light' || preference === 'dark') colorTheme = preference;
  else if (matchMedia('(prefers-color-scheme: dark)').matches) colorTheme = 'dark';
} catch { /* Browser storage may be unavailable. */ }
function renderTheme() {
  if (document.documentElement) document.documentElement.dataset.theme = colorTheme;
  const toggle = $('theme-toggle');
  const dark = colorTheme === 'dark';
  const label = dark ? 'Switch to light theme' : 'Switch to dark theme';
  toggle.innerHTML = icon(dark ? 'sun' : 'moon', 17);
  toggle.title = label;
  toggle.setAttribute('aria-label', label);
}
$('theme-toggle').onclick = () => {
  colorTheme = colorTheme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(themeKey, colorTheme); } catch { /* Preference remains active for this session. */ }
  renderTheme();
};
renderTheme();
document.addEventListener('keydown', event => {
  if (event.key !== '/' || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
  if ($('about').open || event.target?.closest?.('input, textarea, select, [contenteditable], dialog')) return;
  event.preventDefault();
  openResearch();
});
$('about-button').innerHTML = icon('info', 17);
$('close-about').innerHTML = icon('close', 17);
$('camera-controls').innerHTML = [
  ['zoom-in', 'Zoom in', 'plus'], ['home', 'Reset camera', 'reset'], ['zoom-out', 'Zoom out', 'minus'],
  ['picture', 'Save a picture of the view', 'camera'],
].map(([action, label, picture]) => iconButton(action, label, picture)).join('');
$('about-sources').innerHTML = sources.map(source => '<li><a href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">' + esc(source.title) + '</a> · ' + esc(source.credit) + '</li>').join('');
for (const [id, parent] of [['caption-left', 'canvas-wrap'], ['caption-right', 'comparison-wrap']]) {
  const label = document.createElement('span');
  label.id = id;
  label.className = 'view-caption';
  $(parent).append(label);
}
$('about-button').onclick = () => $('about').showModal();
$('close-about').onclick = () => $('about').close();
$('about').addEventListener('click', event => { if (event.target === $('about')) $('about').close(); });
$('model-label').onclick = () => { state.inspector = true; render(); };
$('tour').onclick = () => { if (tourTimer) stopTour(); else startTour(); render(); };
$('motion').onclick = () => {
  state.moving = !state.moving;
  if (!state.moving) state.rotating = false;
  updateViewer();
};
$('tabs').addEventListener('click', event => {
  const button = event.target.closest('[data-tab]');
  if (!button) return;
  state.tab = button.dataset.tab;
  render();
});
$('tabs').addEventListener('keydown', event => {
  const tabs = [...$('tabs').querySelectorAll('button')];
  let index = tabs.indexOf(event.target);
  if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
  else if (event.key === 'ArrowLeft') index = (index + tabs.length - 1) % tabs.length;
  else if (event.key === 'Home') index = 0;
  else if (event.key === 'End') index = tabs.length - 1;
  else return;
  event.preventDefault();
  tabs[index].click();
  tabs[index].focus();
});

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button || button.disabled) return;
  const { action, key } = button.dataset;
  if (action.startsWith('protocol-')) {
    if (action === 'protocol-library') {
      viewer?.setExtract([], true);
      viewer?.clearBenchActions();
      applyPreset('cuticle');
      camera('default');
    }
    lab.action(action, key);
    if (event.detail === 0 || action === 'protocol-target') {
      const sidebar = $('sidebar-content');
      const focus = action === 'protocol-tool'
        ? sidebar.querySelector('[data-action="protocol-tool"][data-key="' + key + '"]')
        : sidebar.querySelector('[data-action="protocol-next"]:not(:disabled), [data-action="protocol-begin"]:not(:disabled)')
          ?? sidebar.querySelector('[data-action="protocol-prep"]:not(:disabled), [data-action="protocol-tool"]:not(:disabled), [data-protocol-answer]')
          ?? sidebar.querySelector('[data-action="protocol-restart"], #protocol-stage');
      focus?.focus();
    }
    return;
  }
  if (action.startsWith('training-')) {
    if (action === 'training-inventory-export') {
      download(new Blob([inventoryCsv()], { type: 'text/csv;charset=utf-8' }), 'FlyLab_3D_Protocol_Inventory.csv');
    } else if (action === 'training-plan-export' || action === 'training-checklist') {
      const ids = action === 'training-checklist' ? [key] : training.state.plan;
      if (ids.length) download(new Blob([trainingPlan(ids)], { type: 'text/plain;charset=utf-8' }), 'FlyLab_3D_Training_Checklist.txt');
    } else if (action === 'training-report-export') {
      const report = training.state.reports.find(item => item.id === key);
      if (report) download(new Blob([trainingReport(report)], { type: 'text/plain;charset=utf-8' }), 'FlyLab_3D_' + report.lessonId + '_Training_Report.txt');
    } else {
      if (action === 'training-mode') training.setMode(key);
      if (action === 'training-plan-toggle') training.togglePlan(key);
      if (action === 'training-plan-up') training.movePlan(key, -1);
      if (action === 'training-plan-down') training.movePlan(key, 1);
      render();
      const replacements = $('dashboard').querySelectorAll('[data-action="' + action + '"]');
      [...replacements].find(replacement => replacement.dataset.key === key && !replacement.disabled)?.focus();
    }
    return;
  }
  switch (action) {
    case 'mode': setMode(key); break;
    case 'researcher-profile':
      $('about').showModal();
      $('researcher-profile-title').focus();
      break;
    case 'fly-style': {
      if (!fullAdultView() || !['scientific', 'fun'].includes(key)) break;
      if (key === 'fun' && state.mode !== 'living') {
        state.flyStyle = key;
        setMode('living');
      } else {
        state.flyStyle = key;
        updateViewer();
      }
      break;
    }
    case 'fly-play':
      if (fullAdultView()) viewer?.playFly(key);
      break;
    case 'open-research': openResearch(); break;
    case 'station': {
      if (stations.has(key)) {
        openStation(key);
        if (event.detail === 0) $('lab-workspaces').querySelector('[data-action="station"][aria-current="page"]')?.focus();
      }
      break;
    }
    case 'launch-lab': setMode('protocols'); lab.action('protocol-open', key); break;
    case 'named': state.named = !state.named; render(); if (state.named) $('place').focus(); break;
    case 'preset': stopTour(); applyPreset(key); render(); break;
    case 'cutaway': stopTour(); if (state.clip === null) openCutaway(); else { applyPreset('cuticle'); camera('default'); } render(); break;
    case 'show-all': stopTour(); state.visible = new Set(allIds); state.clip = null; state.opacity = .11; state.preset = null; render(); break;
    case 'isolate-system': isolate(anatomy.filter(part => part.system === key).map(part => part.id)); break;
    case 'select': selectPart(key, true); break;
    case 'visibility': toggleVisibility(key); break;
    case 'step': setDissectionStep(Number(key)); render(); break;
    case 'focus':
      if (!state.visible.has(state.selected)) toggleVisibility(state.selected);
      viewer?.focus(state.selected);
      break;
    case 'toggle-selected': toggleVisibility(state.selected); break;
    case 'isolate':
      if (state.visible.size === 1 && state.visible.has(state.selected)) {
        const part = anatomyById.get(state.selected);
        applyPreset(part.system === 'external' ? 'cuticle' : 'organs');
        render();
      } else isolate([state.selected]);
      break;
    case 'details': state.inspector = !state.inspector; render(); break;
    case 'close-inspector': state.inspector = false; render(); break;
    case 'zoom-in': viewer?.zoom(.82); break;
    case 'zoom-out': viewer?.zoom(1.22); break;
    case 'home': {
      const step = state.mode === 'protocols' && lab.step;
      camera(step?.view ?? 'default');
      if (step) {
        const focus = (lab.completeStep && step.after?.focus) || (lab.extracted.has(step.target) ? step.target : step.focus);
        if (focus) viewer?.focus(focus, step.view);
      }
      break;
    }
    case 'picture': viewer?.save().toBlob(blob => { if (blob) download(blob, 'flybio-3d.png'); }); break;
    case 'example': fileAttempt += 1; importContent(state.stage === 'larva' ? larvalExampleCsv : exampleCsv, 'example.csv', true); break;
    case 'download-example': download(new Blob([state.stage === 'larva' ? larvalExampleCsv : exampleCsv], { type: 'text/csv' }), 'flybio-' + state.stage + '-example.csv'); break;
    case 'clear-data':
      fileAttempt += 1;
      state.rows = [];
      chooseSeries('');
      state.importMessage = '';
      state.importError = false;
      state.observationOrigin = null;
      applyPreset('cuticle');
      render();
      break;
  }
});

document.addEventListener('change', async event => {
  const input = event.target;
  if (input.id === 'fly-reduced') {
    state.flyReduced = input.checked;
    updateViewer();
    return;
  }
  if (input.id === 'specimen-stage') {
    changeSpecimen(input.value);
    return;
  }
  if (input.matches('[data-protocol-guided]')) {
    lab.action('protocol-markers');
    $('sidebar-content').querySelector('[data-protocol-guided]')?.focus();
    return;
  }
  if (input.matches('[data-protocol-answer]')) {
    const answer = input.dataset.protocolAnswer;
    lab.action('protocol-answer', answer);
    $('sidebar-content').querySelector('[data-protocol-answer="' + answer + '"]')?.focus();
    return;
  }
  if (input.matches('[data-protocol-target]')) {
    if (input.value) lab.attempt(input.value);
    ($('sidebar-content').querySelector('[data-action="protocol-next"]') ?? $('sidebar-content').querySelector('[data-protocol-target]'))?.focus();
    return;
  }
  if (input.matches('select[data-protocol-filter]')) {
    lab.setFilter(input.dataset.protocolFilter, input.value);
    $('protocol-results').innerHTML = lab.resultCards();
    return;
  }
  if (input.matches('[data-system]')) {
    stopTour();
    state.preset = null;
    const system = input.dataset.system;
    for (const part of anatomy.filter(candidate => candidate.system === system)) {
      if (input.checked) state.visible.add(part.id);
      else state.visible.delete(part.id);
    }
    if (input.checked && system !== 'external' && state.opacity > .5) state.opacity = .11;
    render();
    $('sidebar-content').querySelector('[data-system="' + system + '"]')?.focus();
  }
  if (input.id === 'place' && input.value) {
    selectPart(input.value, true);
    viewer?.focus(input.value);
  }
  if (input.id === 'show-labels') { state.labels = input.checked; updateViewer(); }
  if (input.id === 'auto-rotate') { state.rotating = input.checked; updateViewer(); }
  if (input.id === 'orientation') camera(input.value);
  if (['series', 'condition', 'compare-to'].includes(input.id)) {
    if (input.id === 'series') chooseSeries(input.value);
    if (input.id === 'condition') {
      state.condition = input.value;
      if (state.compareTo === state.condition) {
        state.compareTo = getConditions(specimenRows(), state.series).find(value => value !== state.condition) ?? '';
      }
    }
    if (input.id === 'compare-to') state.compareTo = input.value;
    revealObserved();
    render();
    $(input.id)?.focus();
  }
  if (input.id === 'observations-file' && input.files[0]) {
    const file = input.files[0];
    const request = ++fileAttempt;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Choose a file smaller than 5 MiB.');
      const content = await file.text();
      if (request === fileAttempt) importContent(content, file.name);
    } catch (error) {
      if (request !== fileAttempt) return;
      state.importMessage = error.message;
      state.importError = true;
      render();
    }
  }
});
document.addEventListener('input', event => {
  const input = event.target;
  if (input.id === 'protocol-search') {
    lab.setFilter('search', input.value);
    $('protocol-results').innerHTML = lab.resultCards();
    return;
  }
  if (input.id === 'structure-search') {
    state.search = input.value;
    $('structure-list').innerHTML = structureList();
  }
  if (input.id === 'opacity') {
    state.opacity = Number(input.value) / 100;
    updateViewer();
  }
  if (input.id === 'section-depth') {
    state.clip = Number(input.value);
    updateViewer();
  }
});

function openEntryRoute() {
  if (typeof location === 'undefined' || !location.search) return;
  const parameters = new URLSearchParams(location.search);
  const view = parameters.get('view');
  const station = parameters.get('station');
  const bench = parameters.get('bench');
  if (view === 'labs' && stations.has(station)) {
    activeStation = station;
    if (station === 'resources' && parameters.has('q')) researchWorkspace.seed(parameters.get('q'));
  }
  if (modes.some(([id]) => view === id)) setMode(view);
  if (view === 'protocols' && bench) lab.action('protocol-open', bench);
}

function ensureViewer() {
  if (viewerStarted || state.mode === 'dashboard' || state.mode === 'labs' || (state.mode === 'protocols' && !lab.lesson)) return;
  viewerStarted = true;
  void startViewer();
}

render();
openEntryRoute();

async function startViewer() {
  try {
    const { createViewer } = await import('./scene.js');
    viewer = createViewer({
      primary: $('canvas-wrap'),
      secondary: $('comparison-wrap'),
      onFlyState: showFlyState,
      onPick(id, point) {
        if (state.mode === 'protocols' && lab.lesson) lab.attempt(id, point);
        else selectPart(id);
      },
      onLabel(id, x, y) {
        const label = $('model-label');
        label.hidden = !id;
        if (!id) return;
        label.textContent = anatomyById.get(id).name;
        label.style.left = x + 'px';
        label.style.top = y + 'px';
      },
      onLandmark(id, x, y) {
        const marker = $('protocol-landmark');
        const details = state.mode === 'protocols' && lab.marker;
        marker.hidden = !id || !details;
        if (marker.hidden) return;
        marker.querySelector('strong').textContent = details.label;
        marker.setAttribute('aria-label', 'Apply selected tool to ' + details.label);
        marker.style.left = x + 'px';
        marker.style.top = y + 'px';
      },
    });
    viewer.setSpecimen(state.stage);
    if (state.mode === 'protocols' && lab.lesson) {
      viewer.setBench(true);
      viewer.setExtract(lab.extracted, true);
      lab.replay();
    }
    viewer.orient(currentView, false);
    if (state.mode === 'anatomy' && state.inspector && state.selected) viewer.focus(state.selected);
    viewerMessage = '';
    render();
  } catch (error) {
    viewerMessage = 'The 3D viewer could not start. Use a WebGL-enabled browser to see the specimen.';
    render();
    console.error(error);
  }
}

