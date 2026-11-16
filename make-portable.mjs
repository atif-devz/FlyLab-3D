import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = filename => readFileSync(new URL('./dist/' + filename, import.meta.url), 'utf8');
const moduleOrder = [
  ['core', 'vendor/three.core.min.js', {}],
  ['three', 'vendor/three.module.min.js', { './three.core.min.js': 'core' }],
  ['controls', 'vendor/OrbitControls.js', { three: 'three' }],
  ['model', 'fly-model.js', {}],
  ['larva', 'larva-model.js', {}],
  ['anatomy', 'anatomy.js', {}],
  ['larvalAnatomy', 'larval-anatomy.js', {}],
  ['observations', 'observations.js', {}],
  ['catalog', 'protocol-catalog.js', {}],
  ['inventory', 'protocol-inventory.js', { './protocol-catalog.js': 'catalog' }],
  ['lessons', 'protocol-lessons.js', {}],
  ['trainingDefinitions', 'training-definitions.js', {}],
  ['trainingProgress', 'training-progress.js', { './protocol-lessons.js': 'lessons', './training-definitions.js': 'trainingDefinitions' }],
  ['lab', 'protocol-lab.js', { './protocol-inventory.js': 'inventory', './protocol-lessons.js': 'lessons', './training-definitions.js': 'trainingDefinitions', './training-progress.js': 'trainingProgress' }],
  ['dashboard', 'dashboard.js', { './protocol-lessons.js': 'lessons', './training-definitions.js': 'trainingDefinitions', './protocol-inventory.js': 'inventory' }],
  ['bench', 'bench-geometry.js', {}],
  ['flyAnimation', 'interactive-fly.js', {}],
  ['scene', 'scene.js', { three: 'three', './vendor/OrbitControls.js': 'controls', './fly-model.js': 'model', './larva-model.js': 'larva', './bench-geometry.js': 'bench', './interactive-fly.js': 'flyAnimation' }],
  ['expanded', 'expanded-dissection.js', { three: 'three', './vendor/OrbitControls.js': 'controls', './fly-model.js': 'model', './larva-model.js': 'larva', './bench-geometry.js': 'bench' }],
  ['microscopy', 'microscopy.js', {}],
  ['genetics', 'genetics-lab.js', {}],
  ['molecular', 'molecular-lab.js', {}],
  ['physiologyCore', 'phase4-data.js', {}],
  ['neuro', 'neuro-lab.js', { './phase4-data.js': 'physiologyCore' }],
  ['behavior', 'behavior-lab.js', { './phase4-data.js': 'physiologyCore' }],
  ['analysisCore', 'analysis-core.js', {}],
  ['workbook', 'workbook.js', {}],
  ['analysis', 'analysis-lab.js', { './analysis-core.js': 'analysisCore', './workbook.js': 'workbook' }],
  ['plansCore', 'plans-core.js', {}],
  ['planner', 'research-planner.js', { './protocol-inventory.js': 'inventory', './plans-core.js': 'plansCore', './analysis-core.js': 'analysisCore' }],
  ['guide', 'research-guide.js', { './protocol-inventory.js': 'inventory' }],
  ['course', 'course-lab.js', { './protocol-lessons.js': 'lessons' }],
  ['spatial', 'spatial-lab.js', { three: 'three', './fly-model.js': 'model', './larva-model.js': 'larva' }],
  ['researchSources', 'research-sources.js', {}],
  ['researchWorkbench', 'research-workbench.js', { './protocol-inventory.js': 'inventory', './anatomy.js': 'anatomy',
    './larval-anatomy.js': 'larvalAnatomy', './research-sources.js': 'researchSources' }],
  ['experimentBuilder', 'experiment-builder.js', { './analysis-core.js': 'analysisCore', './protocol-inventory.js': 'inventory' }],
  ['inference', 'inference-lab.js', { './analysis-core.js': 'analysisCore', './workbook.js': 'workbook' }],
  ['app', 'app.js', { './anatomy.js': 'anatomy', './larval-anatomy.js': 'larvalAnatomy', './observations.js': 'observations',
    './protocol-lab.js': 'lab', './dashboard.js': 'dashboard', './protocol-inventory.js': 'inventory', './training-progress.js': 'trainingProgress',
    './scene.js': 'scene', './expanded-dissection.js': 'expanded', './microscopy.js': 'microscopy', './genetics-lab.js': 'genetics',
    './molecular-lab.js': 'molecular', './neuro-lab.js': 'neuro', './behavior-lab.js': 'behavior', './analysis-lab.js': 'analysis',
    './research-planner.js': 'planner', './research-guide.js': 'guide', './spatial-lab.js': 'spatial', './course-lab.js': 'course',
    './research-workbench.js': 'researchWorkbench', './experiment-builder.js': 'experimentBuilder', './inference-lab.js': 'inference' }],
];
const manifest = moduleOrder.map(([id, filename, deps]) => [id, read(filename), deps]);
const embedded = JSON.stringify(manifest).replaceAll('<', '\\u003c');
const script = [
  'const modules = ' + embedded + ';',
  'const urls = Object.create(null);',
  'for (const [id, code, dependencies] of modules) {',
  '  let source = code;',
  '  for (const [specifier, dependency] of Object.entries(dependencies)) {',
  '    source = source.replaceAll(JSON.stringify(specifier), JSON.stringify(urls[dependency]));',
  "    source = source.replaceAll(\"'\" + specifier + \"'\", JSON.stringify(urls[dependency]));",
  '  }',
  "  urls[id] = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));",
  '}',
  "import(urls.app).catch(error => {",
  "  document.getElementById('viewer-status').textContent = 'This browser could not start the offline explorer.';",
  '  console.error(error);',
  '});',
].join('\n');

const svg = 'data:image/svg+xml;base64,' + Buffer.from(read('fly.svg')).toString('base64');
const html = read('index.html')
  .replaceAll('./fly.svg', svg)
  .replace('class="brand" href="./"', 'class="brand" href=""')
  .replace('<link rel="stylesheet" href="./style.css">', () => '<style>\n' + read('style.css') + '</style>')
  .replace('<link rel="stylesheet" href="./researcher.css">', () => '<style>\n' + read('researcher.css') + '</style>')
  .replace(/ *<script type="importmap">[^\n]+<\/script>\r?\n/, '')
  .replace('<script type="module" src="./app.js"></script>', () => '<!-- Three.js license\n' + read('vendor/LICENSE') + '\n-->\n<script>\n' + script + '\n</script>');
if (!process.argv[2]) throw new Error('Pass the output HTML path.');
writeFileSync(resolve(process.argv[2]), html);

