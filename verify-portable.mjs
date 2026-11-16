import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import vm from 'node:vm';
import { makeServer } from './serve-lab.mjs';

const htmlPath = process.argv[2] ?? new URL('../../outputs/FlyBio_3D.html', import.meta.url);
const html = readFileSync(htmlPath, 'utf8');
const inline = html.match(/<script>([\s\S]+)<\/script>/)[1];
const manifest = JSON.parse(inline.match(/const modules = (.+);/)[1]);
const moduleURLs = new Map(manifest.map(([name], index) => [name, 'blob:verification/' + index]));
const blobs = new Map();
const downloads = [];
const documentHandlers = new Map();
class Element {
  constructor(id = '') {
    this.id = id;
    this.style = {};
    this.dataset = {};
    this.classList = { toggle() {} };
    this.scrollTop = 0;
  }
  append() {}
  addEventListener() {}
  setAttribute() {}
  removeAttribute() {}
  focus() { this.focused = true; }
  showModal() { this.open = true; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  click() {
    if (this.download) downloads.push({ name: this.download, body: blobs.get(this.href) });
  }
}
const elements = new Map();
const errors = [];
const storage = new Map();
const context = vm.createContext({
  document: {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element(id));
      return elements.get(id);
    },
    createElement() { return new Element(); },
    addEventListener(name, handler) { documentHandlers.set(name, handler); },
  },
  matchMedia: () => ({ matches: true }),
  console: { error: error => errors.push(error) },
  clearInterval,
  setTimeout() {},
  localStorage: {
    getItem: name => storage.get(name) ?? null,
    setItem: (name, value) => storage.set(name, value),
  },
  URL: {
    createObjectURL(blob) {
      const url = 'blob:verification/' + blobs.size;
      blobs.set(url, blob);
      return url;
    },
  },
  Blob,
  TextEncoder,
  TextDecoder,
  Intl,
});
const loaded = new Map();
function getModule(url) {
  if (loaded.has(url)) return loaded.get(url);
  assert.ok(blobs.has(url), 'Unmapped module URL: ' + url);
  const module = blobs.get(url).text().then(source => {
    if (url === moduleURLs.get('app')) {
      assert.match(source, /function ensureViewer\(\)/);
      source = source.replace('function ensureViewer() {', 'function ensureViewer() { if (true) return;');
      source += '\nexport { state, lab, training, setMode, changeSpecimen, setDissectionStep, selectPart, importContent, readHighlights, fullAdultView }; export function attachViewer(mock) { viewer = mock; }';
    }
    return new vm.SourceTextModule(source, { context, identifier: url });
  });
  loaded.set(url, module);
  return module;
}
async function importModule(url) {
  const module = await getModule(url);
  if (module.status === 'unlinked') await module.link(getModule);
  if (module.status === 'linked') await module.evaluate();
  return module;
}
async function getExports(name) {
  assert.ok(moduleURLs.has(name), 'Missing portable module: ' + name);
  return (await importModule(moduleURLs.get(name))).namespace;
}
async function getDefinitionExports(symbol) {
  const found = manifest.find(([, code]) => code.includes('export const ' + symbol) || code.includes('export function ' + symbol));
  assert.ok(found, 'Missing portable export: ' + symbol);
  return getExports(found[0]);
}
function click(action, key) {
  const button = { dataset: { action, key }, disabled: false };
  documentHandlers.get('click')({ detail: 1, target: { closest: () => button } });
}
async function checkDownload(filename, type) {
  const item = downloads.at(-1);
  assert.ok(item, 'No download was triggered');
  assert.equal(item.name, filename);
  assert.match(item.body.type, type);
  return item.body.text();
}
const buttonState = (markup, action) => markup.match(new RegExp('<button[^>]+data-action="' + action + '"[^>]*>'))?.[0] ?? '';

const script = new vm.Script(inline, { importModuleDynamically: importModule });
await script.runInContext(context);
assert.deepEqual(errors, []);
assert.equal(blobs.size, manifest.length);
const app = await getExports('app');
const dashboard = elements.get('dashboard');
const catalog = elements.get('protocol-catalog');
const sidebar = elements.get('sidebar-content');
assert.equal(app.state.mode, 'dashboard');
assert.equal(dashboard.hidden, false);
assert.match(dashboard.innerHTML, /FlyLab 3D/);
assert.match(dashboard.innerHTML, /Muhammad Atif/);
assert.match(html, /About the Researcher/);
assert.match(html, /Kookmin University, Seoul, South Korea/);
assert.match(html, /Researcher &amp; FlyLab 3D Developer/);
assert.doesNotMatch(html, /href="\.\/researcher\.css"/);
click('researcher-profile');
assert.equal(elements.get('about').open, true);
assert.equal(elements.get('researcher-profile-title').focused, true);
assert.match(dashboard.innerHTML, /42<\/strong><span>Published references/);
assert.equal((dashboard.innerHTML.match(/class="lab-lesson-card"/g) ?? []).length, 4);
click('mode', 'anatomy');
assert.equal(dashboard.hidden, true);
assert.equal(app.state.stage, 'adult');
assert.equal(app.state.visible.size, 7);
assert.match(sidebar.innerHTML, /Cut through the body/);
app.selectPart('brain', true);
assert.ok(app.state.visible.has('brain'));
assert.ok(app.state.opacity < .5);
assert.match(elements.get('inspector').innerHTML, /Brain/);
app.changeSpecimen('larva');
assert.equal(app.state.visible.size, 3);
app.selectPart('larval-vnc', true);
assert.ok(app.state.visible.has('larval-vnc'));
assert.match(elements.get('inspector').innerHTML, /ventral nerve cord/i);
app.changeSpecimen('adult');
app.setMode('dissect');
app.setDissectionStep(1);
assert.ok(app.state.clip !== null);
assert.equal(app.state.visible.size, 14);
app.setDissectionStep(2);
assert.equal(Array.from(app.state.visible).join(','), 'cuticle,crop,gut');
app.setMode('experiment');
const observations = await getExports('observations');
app.importContent(observations.exampleCsv, 'example.csv', true);
assert.equal(app.state.rows.length, 16);
app.setMode('compare');
const { first, second, range } = app.readHighlights();
assert.equal(first.values.size, 4);
assert.equal(second.values.size, 4);
assert.notEqual(app.state.condition, app.state.compareTo);
assert.ok(range[0] < range[1]);
app.changeSpecimen('larva');
app.importContent(observations.larvalExampleCsv, 'larval.csv', true);
assert.equal(app.state.importError, false);
assert.ok(app.readHighlights().first.values.has('larval-brain'));
assert.ok(app.readHighlights().second.values.has('larval-gut'));
assert.match(sidebar.innerHTML, /Compare conditions/);

click('mode', 'protocols');
const { lab, training } = app;
const { inventory, inventoryCsv } = await getDefinitionExports('inventory');
const { trainingDefinitions } = await getDefinitionExports('trainingDefinitions');
const { createTrainingProgress, trainingPlan, trainingReport } = await getDefinitionExports('createTrainingProgress');
const { protocolLessons } = await getExports('lessons');
assert.equal(inventory.length, 42);
assert.equal(new Set(inventory.map(record => record.id)).size, 42);
assert.equal(catalog.hidden, false);
assert.equal((catalog.innerHTML.match(/class="featured-protocol"/g) ?? []).length, 4);
assert.match(lab.resultCards(), /42 of 42 references/);
assert.match(lab.resultCards(), /Source checked|Checked source|Last verified|2026-11-16/);
click('training-inventory-export');
assert.equal(await checkDownload('FlyLab_3D_Protocol_Inventory.csv', /^text\/csv/), inventoryCsv());
assert.equal(inventoryCsv().trim().split('\r\n').length, 43);
lab.setFilter('format', 'interactive');
assert.match(lab.resultCards(), /8 of 42 references/);
lab.setFilter('stage', 'larva');
assert.match(lab.resultCards(), /4 of 42 references/);
lab.setFilter('publisher', 'JoVE');
lab.setFilter('category', 'Dissection');
lab.setFilter('search', 'larval cns');
assert.match(lab.resultCards(), /Dissection of Larval CNS/);
lab.setFilter('search', 'no result for this term');
assert.match(lab.resultCards(), /0 of 42 references/);
assert.match(lab.resultCards(), /No matches/);
lab.action('protocol-clear');
assert.match(lab.resultCards(), /42 of 42 references/);

click('mode', 'dashboard');
click('training-plan-toggle', 'adult-brain');
click('training-plan-toggle', 'larval-brain');
click('training-plan-up', 'larval-brain');
assert.equal(training.state.plan.join(','), 'larval-brain,adult-brain');
assert.equal(createTrainingProgress().state.plan.join(','), 'larval-brain,adult-brain');
const expectedPlan = trainingPlan(['larval-brain', 'adult-brain']);
assert.ok(expectedPlan.indexOf('Larval brain dissection') < expectedPlan.indexOf('Adult brain dissection'));
click('training-plan-export');
assert.equal(await checkDownload('FlyLab_3D_Training_Checklist.txt', /^text\/plain/), expectedPlan);
click('training-plan-down', 'larval-brain');
assert.equal(training.state.plan.join(','), 'adult-brain,larval-brain');
click('training-plan-toggle', 'adult-brain');
assert.equal(training.state.plan.join(','), 'larval-brain');

for (const lesson of protocolLessons) {
  const independent = lesson.id === 'larval-vnc';
  click('training-mode', independent ? 'independent' : 'guided');
  click('launch-lab', lesson.id);
  const definition = trainingDefinitions[lesson.id];
  assert.equal(app.state.stage, lesson.stage);
  assert.equal(catalog.hidden, true);
  assert.equal(lab.phase, 'setup');
  assert.equal(lab.marker, null);
  assert.match(sidebar.innerHTML, /Prepare the bench/);
  assert.match(buttonState(sidebar.innerHTML, 'protocol-begin'), /disabled/);
  lab.action('protocol-begin');
  assert.equal(lab.phase, 'setup', lesson.id + ' skipped bench setup');
  lab.action('protocol-prep', 'medium');
  assert.match(sidebar.innerHTML, /Place the dissection dish before adding medium/);
  assert.equal(training.draft(lesson.id).metrics.setup, 1);
  assert.ok(!training.draft(lesson.id).ready.includes('medium'));
  for (const item of definition.readiness) lab.action('protocol-prep', item.id);
  assert.equal(training.draft(lesson.id).ready.length, 4);
  assert.doesNotMatch(buttonState(sidebar.innerHTML, 'protocol-begin'), /disabled/);
  click('training-checklist', lesson.id);
  assert.equal(await checkDownload('FlyLab_3D_Training_Checklist.txt', /^text\/plain/), trainingPlan([lesson.id]));
  lab.action('protocol-begin');
  assert.equal(lab.phase, 'practice');
  assert.match(sidebar.innerHTML, /Step 1 of /);
  const extracted = new Set();
  let protectedWarningChecked = false;
  for (let index = 0; index < lesson.steps.length; index++) {
    const step = lesson.steps[index];
    const label = lesson.id + ' step ' + (index + 1);
    assert.equal(lab.step, step, label);
    assert.equal(lab.marker?.id ?? null, independent ? null : step.target, label);
    assert.ok(app.state.visible.has(step.target), label + ' has no visible target mesh');
    lab.action('protocol-next');
    assert.equal(lab.step, step, label + ' advanced before the action');
    lab.attempt(step.target, step.point);
    assert.equal(lab.completeStep, false, label + ' accepted no tool');
    assert.match(sidebar.innerHTML, /Choose a tool/);
    lab.action('protocol-tool', step.tool === 'inspect' ? 'orient' : 'inspect');
    lab.attempt(step.target, step.point);
    assert.equal(lab.completeStep, false, label + ' accepted the wrong tool');
    assert.match(sidebar.innerHTML, /Choose a different tool/);
    const protectedId = step.visible.find(id => ['brain', 'ventral-nerve-cord', 'larval-brain', 'larval-vnc'].includes(id));
    if (protectedId && !protectedWarningChecked) {
      lab.action('protocol-tool', 'open');
      lab.attempt(protectedId);
      assert.match(sidebar.innerHTML, /Protected neural tissue/);
      assert.equal(training.draft(lesson.id).metrics.protected, 1);
      assert.equal(lab.completeStep, false);
      protectedWarningChecked = true;
    }
    lab.action('protocol-tool', step.tool);
    lab.attempt('incorrect-target', step.point);
    assert.equal(lab.completeStep, false, label + ' accepted the wrong target');
    assert.match(sidebar.innerHTML, /Try the anatomical landmark/);
    if (step.point) {
      const distantPoint = [...step.point];
      distantPoint[0] += 1;
      lab.attempt(step.target, distantPoint);
      assert.equal(lab.completeStep, false, label + ' accepted a distant point');
    }
    lab.attempt(step.target, step.point);
    assert.equal(lab.completeStep, true, label + ' rejected the correct action');
    assert.equal(lab.marker, null, label + ' kept showing the resolved target');
    for (const id of step.after?.extract ?? []) extracted.add(id);
    assert.deepEqual(new Set(lab.extracted), extracted, label + ' extracted the wrong structures');
    if (step.after?.visible) assert.deepEqual(new Set(app.state.visible), new Set(step.after.visible), label);
    assert.match(sidebar.innerHTML, /data-action="protocol-next"/);
    if (index === 0) {
      const draft = createTrainingProgress().draft(lesson.id);
      assert.equal(draft.phase, 'practice');
      assert.equal(draft.pending, true);
      assert.equal(draft.index, 0);
      click('mode', 'dashboard');
      assert.match(dashboard.innerHTML, /Resume last session/);
      click('launch-lab', lesson.id);
      assert.equal(lab.phase, 'practice');
      assert.equal(lab.step, step);
      assert.equal(lab.completeStep, true);
    }
    lab.action('protocol-next');
  }
  assert.equal(lab.phase, 'assessment');
  assert.ok(protectedWarningChecked);
  assert.match(sidebar.innerHTML, /Check your understanding/);
  lab.action('protocol-assess');
  assert.equal(lab.phase, 'assessment', lesson.id + ' scored unanswered questions');
  for (const [index, question] of definition.questions.entries()) {
    const answer = index === 0 ? (question.answer + 1) % question.choices.length : question.answer;
    lab.action('protocol-answer', index + ':' + answer);
  }
  lab.action('protocol-assess');
  assert.equal(lab.phase, 'result');
  assert.equal(lab.stageText, 'Training complete', lesson.id);
  assert.match(sidebar.innerHTML, /Training result/);
  assert.equal(training.draft(lesson.id), null);
  const report = createTrainingProgress().state.reports.find(record => record.lessonId === lesson.id);
  assert.equal(report.score, definition.questions.length - 1);
  assert.equal(report.completedSteps, lesson.steps.length);
  assert.equal(report.metrics.tool, lesson.steps.length);
  assert.equal(report.metrics.protected, 1);
  assert.equal(report.metrics.setup, 1);
  assert.equal(report.metrics.guide, !independent);
  assert.equal(report.mode, independent ? 'independent' : 'guided');
  const expectedReport = trainingReport(report);
  assert.match(expectedReport, /Educational prototype awaiting expert review/);
  assert.match(expectedReport, /Knowledge: 2 \/ 3/);
  assert.ok(expectedReport.includes(lesson.references[0].url));
  click('training-report-export', report.id);
  assert.equal(await checkDownload('FlyLab_3D_' + lesson.id + '_Training_Report.txt', /^text\/plain/), expectedReport);
  lab.action('protocol-restart');
  assert.equal(lab.step, lesson.steps[0], lesson.id);
  assert.equal(lab.phase, 'setup', lesson.id);
  assert.equal(lab.extracted.size, 0, lesson.id);
  lab.action('protocol-library');
  assert.equal(lab.lesson, null, lesson.id);
  assert.equal(catalog.hidden, false, lesson.id);
  click('mode', 'dashboard');
}
assert.equal(createTrainingProgress().state.completed.length, 4);
assert.match(dashboard.innerHTML, /4\/4<\/strong><span>Lessons completed/);

await getExports('scene');
await getExports('expanded');
await getExports('spatial');
assert.equal(loaded.size, manifest.length);
const three = await getExports('three');
const { anatomy } = await getExports('anatomy');
const { larvalAnatomy } = await getExports('larvalAnatomy');
const adult = (await getExports('model')).createFlyModel(three);
const larva = (await getExports('larva')).createLarvaModel(three);
for (const [model, parts, count] of [[adult, anatomy, 14], [larva, larvalAnatomy, 7]]) {
  assert.equal(Object.keys(model.structures).length, count);
  assert.equal(parts.length, count);
  for (const part of parts) {
    const group = model.structures[part.id];
    let meshes = 0;
    group.traverse(object => { if (object.isMesh) meshes++; });
    const bounds = new three.Box3().setFromObject(group);
    assert.ok(meshes > 0, part.id + ' has no meshes');
    assert.ok(!bounds.isEmpty(), part.id + ' has no geometry');
    assert.ok([...bounds.min, ...bounds.max].every(Number.isFinite), part.id + ' has invalid geometry bounds');
  }
  model.animate(0.4, true);
  model.animate(0.4, false);
}
assert.deepEqual(errors, []);
const analysis = await getExports('analysisCore');
const fromCsv = text => analysis.normalizeTable(analysis.readDelimited(text));
for (const [kind, example] of Object.entries(analysis.examples)) {
  const table = fromCsv(example);
  const result = analysis.calculate(table, kind, analysis.measureNames(table, kind)[0], analysis.cohortNames(table)[0]);
  assert.ok(result.results.length, kind + ' produced no results');
  assert.equal(result.rejected, 0, kind);
}
const km = analysis.calculate(fromCsv('condition,time,event\nA,1,1\nA,1,0\nA,3,1\nA,5,0'), 'survival');
assert.deepEqual(Array.from(km.results[0]), ['A', 1, 4, 1, 1, .75]);
assert.deepEqual(Array.from(km.results[1]), ['A', 3, 2, 1, 0, .375]);
const preferences = fromCsv('condition,value,time,event,test_count,reference_count,no_choice\nA,.2,,,6,4,1\nA,-.2,,,4,6,3');
assert.equal(analysis.inferAnalysis(preferences), 'preference');
const preference = analysis.calculate(preferences, 'preference');
assert.equal(preference.results[0][2], 0);
assert.equal(preference.noChoice, 4);
assert.match(analysis.tableCsv([['=1+2'], [-2]]), /^"'=1\+2"\r\n"-2"/);
const microscopy = analysis.calculate(fromCsv('condition,channel,area,mean_intensity\nA,green,6,1\nA,blue,7,2'), 'microscopy', 'mean_intensity');
assert.deepEqual(Array.from(microscopy.results, row => row[0]), ['A · green', 'A · blue']);
const workbook = await getExports('workbook');
const worksheetBlob = workbook.makeWorkbook([{ name: 'Summary', grid: [['Treatment', 'Value'], ['A & B', 2.5]] }]);
assert.equal(worksheetBlob.type, workbook.xlsxMime);
const xlsxBytes = Buffer.from(await worksheetBlob.arrayBuffer());
assert.equal(xlsxBytes.readUInt32LE(0), 0x04034b50);
assert.ok(xlsxBytes.includes(Buffer.from('xl/workbook.xml')));
assert.ok(xlsxBytes.includes(Buffer.from('A &amp; B')));
const guide = await getExports('guide');
assert.match(guide.rankMethods('adult VNC')[0].title, /ventral nerve cord/i);

const ui = { escapeHtml: value => String(value ?? ''), download() {}, announce() {}, readTrainingReports: () => [] };
for (const [module, entry, label] of [
  ['expanded', 'createExpandedDissection', /Expanded dissection/], ['microscopy', 'createMicroscopy', /confocal/],
  ['genetics', 'createGeneticsLab', /genetics|cross/i], ['molecular', 'createMolecularLab', /molecular/i],
  ['neuro', 'createNeuroLab', /recording/i], ['behavior', 'createBehaviorLab', /behavior/i],
  ['analysis', 'createAnalysisLab', /Data analysis/], ['planner', 'createResearchPlanner', /Research planner/],
  ['guide', 'createResearchGuide', /Research guide/], ['course', 'createCourseLab', /learning|assessment/i],
  ['spatial', 'createSpatialLab', /WebXR/],
]) {
  const factory = (await getExports(module))[entry];
  assert.match(factory(ui).render(), label);
}

const relay = await makeServer();
function relayRequest(method, url, payload, headers = {}) {
  const request = Readable.from(payload ? [Buffer.from(JSON.stringify(payload))] : []);
  Object.assign(request, { method, url, headers: { host: 'localhost:8842', 'content-type': 'application/json', ...headers } });
  return new Promise(resolve => {
    const reply = { status: 0, writeHead(status) { this.status = status; }, end(bytes) { resolve({ status: this.status, bytes }); } };
    relay.emit('request', request, reply);
  });
}
assert.equal((await relayRequest('GET', '/')).status, 200);
assert.equal((await relayRequest('GET', '/app.js')).status, 200);
assert.equal((await relayRequest('GET', '/serve-lab.mjs')).status, 404);
assert.equal((await relayRequest('POST', '/api/flylab/rooms', { plan: { title: 'Draft A' } }, { origin: 'https://example.invalid' })).status, 403);
const created = await relayRequest('POST', '/api/flylab/rooms', { plan: { title: 'Draft A' } });
assert.equal(created.status, 201);
const room = JSON.parse(created.bytes);
const [roomId, secret] = room.code.split('.');
const roomUri = '/api/flylab/rooms/' + roomId;
const auth = { authorization: 'Bearer ' + secret };
assert.equal((await relayRequest('GET', roomUri)).status, 404);
assert.equal(JSON.parse((await relayRequest('GET', roomUri, null, auth)).bytes).plan.title, 'Draft A');
assert.equal((await relayRequest('PUT', roomUri, { revision: 1, plan: { title: 'Draft B' } }, auth)).status, 200);
assert.equal((await relayRequest('PUT', roomUri, { revision: 1, plan: { title: 'Older revision' } }, auth)).status, 409);

let flyConfig, lastAnimation = null;
app.attachViewer({
  configureFly(config) { flyConfig = config; },
  playFly(action) { lastAnimation = action; },
  update() {}, orient() {}, setBench() {}, setBenchTool() {}, setLandmark() {}, setSpecimen() {}, setExtract() {},
  clearBenchActions() {}, applyBenchAction() {}, focus() {},
});
app.changeSpecimen('adult');
app.setMode('anatomy');
assert.equal(app.fullAdultView(), true);
assert.equal(flyConfig.mode, 'scientific');
assert.equal(flyConfig.react, false, 'Anatomy clicks should remain anatomical picks');
assert.equal(flyConfig.reducedMotion, true, 'Default should honor reduced-motion preference');
app.selectPart('eyes', true);
assert.equal(flyConfig.active, false);
app.selectPart(null);
app.state.flyReduced = false;
app.state.moving = true;
click('fly-style', 'fun');
assert.equal(app.state.mode, 'living');
assert.equal(flyConfig.mode, 'fun');
assert.equal(flyConfig.react, true);
click('fly-play', 'wave');
assert.equal(lastAnimation, 'wave');
app.setMode('protocols');
assert.equal(flyConfig.active, false);
app.setMode('living');
app.changeSpecimen('larva');
assert.equal(flyConfig.active, false);

const { createFlyAnimator } = await getExports('flyAnimation');
const flyStates = [];
const animator = createFlyAnimator({ random: () => .39, onState: value => flyStates.push(value) });
let now = 0;
function advanceAnimation(seconds) {
  const frames = Math.ceil(seconds * 60);
  let pose;
  for (let frame = 0; frame < frames; frame += 1) {
    now += 1 / 60;
    pose = animator.update(now);
    if (pose) {
      assert.ok(pose.feet.every(foot => foot.length === 3 && foot.every(Number.isFinite)));
      assert.ok(Number.isFinite(pose.headYaw));
      adult.rig.applyPose(pose);
      const floor = new three.Box3().setFromObject(adult.structures.legs).min.y;
      assert.ok(floor >= -1.96002, 'leg geometry crossed the floor at ' + floor);
    }
  }
  return pose;
}
const rest = new Map(Object.entries(adult.structures).map(([name, part]) => [name, new three.Box3().setFromObject(part)]));
animator.configure({ active: true, mode: 'scientific', paused: false, reducedMotion: false });
assert.equal(animator.request('dance'), false);
assert.equal(animator.interact('double-click'), false);
assert.equal(animator.interact('click'), true);
advanceAnimation(3.7);
assert.equal(animator.request('groom'), true);
advanceAnimation(3.7);
animator.configure({ mode: 'fun' });
assert.equal(animator.interact('double-click'), true);
assert.equal(flyStates.at(-1).action, 'special-dance');
const held = JSON.stringify(advanceAnimation(.8));
animator.configure({ paused: true });
assert.equal(animator.update(now + 40), null);
animator.configure({ paused: false });
now += 40;
assert.equal(JSON.stringify(animator.update(now)), held, 'Manual resume should preserve the last pose and motion phase');
advanceAnimation(4.6);
assert.equal(animator.request('walk'), true);
advanceAnimation(3.2);
animator.configure({ paused: true });
assert.equal(animator.update(now), null);
animator.configure({ paused: false, reducedMotion: true });
assert.equal(animator.update(now), null);
adult.rig.reset();
for (const [name, baseline] of rest) {
  const bounds = new three.Box3().setFromObject(adult.structures[name]);
  assert.ok(baseline.min.distanceTo(bounds.min) < 1e-6 && baseline.max.distanceTo(bounds.max) < 1e-6, name + ' rest pose changed');
}
console.log('Verified all ' + manifest.length + ' offline modules, researcher profile, animation view isolation, pose floor clearance and rest reset, eleven workspaces, four core lessons, analysis, and review rooms.');

