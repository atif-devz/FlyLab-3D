import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inventory } from './dist/protocol-inventory.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const arg = name => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined;
const base = new URL(arg('--base') || process.env.PAGES_BASE || '');
if (base.protocol !== 'https:' || base.search || base.hash || base.username || base.password) throw new Error('Use the final HTTPS site address.');
base.pathname = base.pathname.replace(/\/+$/, '') + '/';
const output = resolve(root, arg('--output') || 'pages-build');
const outputRelative = relative(root, output);
if (!outputRelative || isAbsolute(outputRelative) || outputRelative.startsWith('..') || outputRelative.split(/[\\/]/).length !== 1
    || ['dist', '.github', '.git', '.openai', 'outputs'].includes(outputRelative)) throw new Error('Use a separate build folder directly under the project.');

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const author = 'Muhammad Atif';
const siteTitle = 'FlyLab 3D | Interactive Drosophila Virtual Laboratory';
const description = 'Explore FlyLab 3D, an interactive virtual laboratory for Drosophila research, featuring 3D anatomy, dissections, genetics, molecular biology, and scientific protocols. Developed by Muhammad Atif.';
const byId = new Map(inventory.map(item => [item.id, [item.title, item.url]]));
const atlas = ['Jürgens et al. · Anatomical atlas of wild-type Drosophila', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11457947/'];
const qpcr = ['Livak and Schmittgen · Comparative Ct analysis', 'https://pubmed.ncbi.nlm.nih.gov/11846609/'];
const modules = [
  ['3d-anatomy','Drosophila 3D anatomy','Explore adult and third-instar larval Drosophila structures by layer.',
    'Compare the outer cuticle with the nervous, respiratory, and digestive systems in separate adult and larval specimens.',
    ['Choose an adult or larva and locate the exterior landmarks.', 'Rotate the specimen, choose an anatomical layer, and inspect the linked structure descriptions.'],
    '?view=anatomy', [atlas]],
  ['adult-brain-dissection','Adult Drosophila brain dissection','Practice identifying the adult fruit fly brain, freeing it, and inspecting the paired optic lobes.',
    'The educational bench illustrates why the optic lobes and central brain need to remain connected during this preparation.',
    ['Prepare the virtual dish and identify the head and thorax.', 'Open the depicted head capsule, free the brain, and inspect the transferred model.', 'Answer the concept questions and export a training report.'],
    '?view=protocols&bench=adult-brain', ['adult-brain-jove','adult-brain-whole-mount']],
  ['adult-vnc-dissection','Adult Drosophila ventral nerve cord dissection','Explore dorsal access and whole-mount exposure of the adult ventral nerve cord (VNC).',
    'The cord lies beneath overlying thoracic structures. The simulation teaches in-place exposure and attention to the connection toward the head.',
    ['Orient the thorax and check the support points.', 'Open the schematic dorsal view, clear the obscuring tissue, and inspect the visible cord.'],
    '?view=protocols&bench=adult-vnc', ['adult-vnc-jove','adult-vnc-imaging']],
  ['larval-brain-and-vnc','Larval Drosophila brain and VNC dissection','Identify the paired larval brain lobes and practice connected brain–VNC transfer.',
    'The model represents a third-instar larva. Connected CNS transfer and in-place VNC exposure are taught by separate benches.',
    ['Identify the anterior landmarks and stabilize the specimen.', 'Expose the schematic CNS and transfer the connected preparation.', 'Inspect both brain lobes and the continuous cord.'],
    '?view=protocols&bench=larval-brain', ['larval-cns-jove','larval-vnc-open']],
  ['genetics','Drosophila genetics and fly crosses','Predict simulated offspring from autosomal, X-linked, linked-locus, and balancer crosses.',
    'The cross calculator follows selected inheritance assumptions and keeps track of successive crosses. It records predictions for a teaching scenario.',
    ['Select a cross model and enter the parental labels.', 'Compare predicted genotype frequencies and optionally generate synthetic individuals.', 'Promote a predicted genotype to the next cross and export the result.'],
    '?view=labs&station=genetics', ['fly-genetics-teaching','bdsc-fly-manual']],
  ['molecular-biology','Drosophila molecular biology simulations','Interpret conceptual amplification, gel, and relative gene-expression data.',
    'Fictional numerical inputs let learners compare controls and distinguish classroom models from measured data.',
    ['Select a synthetic molecular scenario and inspect its controls.', 'Compare the curves or bands and send eligible synthetic Cq pairs to Data Analysis.'],
    '?view=labs&station=molecular', [qpcr]],
  ['neurobiology','Drosophila neurobiology and electrophysiology','Practice electrode placement and compare synthetic neural recordings.',
    'The labellar tip recording activity distinguishes short, intermediate, and long sensilla as anatomical classes. Other stations illustrate alternative signal types with synthetic traces.',
    ['Select a recording model and identify the illustrated location.', 'Adjust the synthetic comparison and inspect traces, detection thresholds, and replicate outputs.'],
    '?view=labs&station=neuro', ['labellar-tip-recording','larval-nmj']],
  ['behavioral-assays','Drosophila behavioral and physiological assays','Explore synthetic choice, feeding, locomotion, and developmental outcomes.',
    'Exercises make controls, replicate counts, and outcome definitions visible so learners can interpret numerical results in context.',
    ['Choose an assay, define the comparison, and generate a seeded example.', 'Review the plotted outcomes and send the synthetic dataset to Data Analysis.'],
    '?view=labs&station=behavior', ['per-jove','flypad-primary','larval-crawling']],
  ['fly-husbandry','Drosophila husbandry and stock tracking','Organize virtual stocks, life-stage records, cross notes, and follow-up dates.',
    'The stock organizer records planning information and links to published institutional teaching references.',
    ['Create a stock card and add a registry reference where available.', 'Track stages or follow-ups and export a local planning copy.'],
    '?view=labs&station=genetics', ['fly-lab-maintenance','bdsc-fly-manual']],
];
const validModules = new Map(modules.map(entry => [entry[0], entry]));
const url = path => new URL(path, base).href;
const image = url('flylab-social.png');
const imageAlt = 'FlyLab 3D title and fruit fly emblem on a sage background';
function meta(title, descriptionText, canonical, types) {
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': types }).replaceAll('<', '\\u003c');
  return '<title>' + esc(title) + '</title>\n<meta name="description" content="' + esc(descriptionText) + '">\n'
    + '<link rel="canonical" href="' + esc(canonical) + '">\n<meta property="og:type" content="website">\n'
    + '<meta property="og:site_name" content="FlyLab 3D">\n<meta property="og:title" content="' + esc(title) + '">\n'
    + '<meta property="og:description" content="' + esc(descriptionText) + '">\n<meta property="og:url" content="' + esc(canonical) + '">\n'
    + '<meta property="og:image" content="' + esc(image) + '">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
    + '<meta property="og:image:alt" content="' + imageAlt + '">\n<meta name="twitter:card" content="summary_large_image">\n'
    + '<script type="application/ld+json">' + json + '</script>';
}
const publicLinks = modules.map(([slug, title]) => '<li><a href="' + esc(url('modules/' + slug + '/')) + '">' + esc(title) + '</a></li>').join('');
const developer = '<p>Developed by Muhammad Atif · Graduate researcher at Kookmin University, Seoul, South Korea.</p>';
const footer = '<footer class="publication-footer"><div><strong>FlyLab 3D</strong>' + developer + '<p>This independent project is an educational simulation.</p></div>'
  + '<nav aria-label="Module guides"><ul>' + publicLinks + '</ul></nav></footer>';
const indexContent = '<section class="dashboard-intro"><div><h1>FlyLab 3D</h1><p><strong>Interactive Virtual Drosophila Research Laboratory</strong></p>'
  + '<p>Explore adult and larval Drosophila anatomy, practice virtual laboratory procedures, compare synthetic experiments, and follow published methods.</p>'
  + '<p>Explore, learn, and experiment in a virtual Drosophila laboratory.</p>' + developer
  + '<p><a href="' + url('?view=living') + '">Meet the interactive fly</a> · <a href="' + url('?view=protocols') + '">Browse protocols</a></p></div></section>'
  + '<nav class="publication-index" aria-label="Public module guides"><h2>Module guides</h2><ul>' + publicLinks + '</ul></nav>';
const personId = base.href + '#developer';
const schema = [
  { '@type': 'WebSite', '@id': base.href + '#site', name: 'FlyLab 3D', url: base.href, description, creator: { '@id': personId } },
  { '@type': 'SoftwareApplication', name: 'FlyLab 3D', url: base.href, description, operatingSystem: 'Web browser', applicationCategory: 'EducationalApplication', creator: { '@id': personId } },
  { '@type': 'Person', '@id': personId, name: author, jobTitle: 'Graduate researcher', affiliation: { '@type': 'Organization', name: 'Kookmin University' } },
];

await mkdir(output, { recursive: true });
await cp(join(root, 'dist'), output, { recursive: true });
let home = await readFile(join(root, 'dist', 'index.html'), 'utf8');
const verify = process.env.GOOGLE_SITE_VERIFICATION?.trim();
if (verify && !/^[A-Za-z0-9_-]{10,200}$/.test(verify)) throw new Error('Set only the content token from Google Search Console.');
home = home.replace(/ *<meta name="description"[^>]*>\r?\n/, '')
  .replace(/<title>[^<]+<\/title>/, () => meta(siteTitle, description, base.href, schema) + (verify ? '\n<meta name="google-site-verification" content="' + esc(verify) + '">' : ''))
  .replace('id="dashboard" class="protocol-catalog dashboard" hidden></div>', 'id="dashboard" class="protocol-catalog dashboard"><div class="dashboard-inner">' + indexContent + '</div></div>')
  .replace('class="workbench" id="workbench"', 'class="workbench dashboard-mode" id="workbench"')
  .replace('id="navigator" class="navigator"', 'id="navigator" class="navigator" hidden')
  .replace('class="view-grid" id="view-grid">', 'class="view-grid" id="view-grid" hidden>')
  .replace('id="viewer-status" role="status">', 'id="viewer-status" role="status" hidden>')
  .replace('</main>', '</main>\n' + footer);
await writeFile(join(output, 'index.html'), home);

for (const [slug, title, intro, outcome, steps, target, refs] of modules) {
  const canonical = url('modules/' + slug + '/');
  const descriptionText = intro + ' Includes an educational workflow and published references.';
  const references = refs.map(ref => {
    const reference = Array.isArray(ref) ? ref : byId.get(ref);
    if (!reference) throw new Error('Unknown reference for ' + slug + ': ' + ref);
    return '<li><a href="' + esc(reference[1]) + '">' + esc(reference[0]) + '</a></li>';
  }).join('');
  const page = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + meta(title + ' | FlyLab 3D', descriptionText, canonical, [{ '@type': 'WebPage', url: canonical, name: title, description: descriptionText, isPartOf: { '@id': base.href + '#site' } }])
    + '<link rel="icon" href="' + url('fly.svg') + '" type="image/svg+xml"><link rel="stylesheet" href="' + url('style.css') + '"></head>'
    + '<body><main class="public-guide"><nav aria-label="FlyLab"><a href="' + base.href + '">FlyLab 3D dashboard</a> · <a href="' + url('?view=protocols') + '">Protocol library</a></nav>'
    + '<h1>' + esc(title) + '</h1><p>' + esc(intro) + '</p><a class="public-launch" href="' + esc(url(target)) + '">Open interactive module</a>'
    + '<h2>Purpose</h2><p>' + esc(outcome) + '</p><h2>Virtual workflow</h2><ol>' + steps.map(step => '<li>' + esc(step) + '</li>').join('')
    + '</ol><h2>Published references</h2><ul>' + references + '</ul>'
    + '<p>The interactive workspace is an educational prototype. The published references describe the underlying research methods.</p></main>' + footer + '</body></html>\n';
  const directory = join(output, 'modules', slug);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'index.html'), page);
}

const sitemap = [base.href, ...[...validModules.keys()].map(slug => url('modules/' + slug + '/'))]
  .map(address => '  <url><loc>' + esc(address) + '</loc></url>').join('\n');
await writeFile(join(output, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + sitemap + '\n</urlset>\n');
await writeFile(join(output, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: ' + url('sitemap.xml') + '\n');
await writeFile(join(output, '.nojekyll'), '');
console.log('Built ' + (modules.length + 1) + ' canonical pages for ' + base.href + ' in ' + output);

