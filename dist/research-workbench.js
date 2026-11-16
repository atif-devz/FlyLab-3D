import { inventory } from './protocol-inventory.js';
import { anatomy as adultAnatomy, sources as adultSources } from './anatomy.js';
import { larvalAnatomy, larvalSources } from './larval-anatomy.js';
import { researchSources, searchResearchSource } from './research-sources.js';

const families = [
  ['all', 'All results'], ['gene', 'Genes and proteins'], ['anatomy', 'Anatomy and circuits'],
  ['protocol', 'Protocols'], ['paper', 'Literature'], ['dataset', 'Datasets'], ['stock', 'Stocks'],
];
const tags = { gene: 'Gene', protein: 'Protein', anatomy: 'Anatomy', protocol: 'Protocol', paper: 'Publication', dataset: 'Dataset', stock: 'Stock' };
const language = new Map(researchSources.map(source => [source.id, source]));
const sourceLookup = new Map([...adultSources, ...larvalSources].map(source => [source.id, source]));
const queryAliases = { vnc: 'ventral nerve cord', cns: 'central nervous system', l3: 'larval', labellum: 'proboscis labellum', grn: 'gustatory sensory' };
const ignore = new Set(['a', 'an', 'the', 'for', 'to', 'and', 'of', 'is', 'in', 'with', 'see', 'look', 'find']);
const localAnatomy = [['adult', adultAnatomy], ['larva', larvalAnatomy]].flatMap(([stage, items]) => items.map(part => {
  const source = sourceLookup.get(part.source);
  return { id: part.id, title: part.name, type: 'anatomy', stage, sourceLabel: 'FlyLab schematic', summary: part.description,
    searchText: [stage, part.system, part.location].join(' '), path: source?.url, linkText: 'Anatomy reference' };
}));
const localProtocols = inventory.map(record => ({
  id: record.id, title: record.title, type: 'protocol', stage: record.stage,
  sourceLabel: record.publisher + ' · catalog citation', summary: record.summary, path: record.url, linkText: 'Published reference',
  searchText: [record.category, record.doi, ...record.tissue, ...record.instruments].join(' '), lesson: record.lesson,
}));
const curated = {
  keys: ['ir25a', 'fbgn0031634', '33683', 'q9vr32'],
  entries: [{
    id: 'FBgn0031634', title: 'Ir25a · Ionotropic receptor 25a', type: 'gene', sourceLabel: 'FlyBase · curated reference',
    summary: 'FlyBase identifies Ir25a as an ionotropic receptor family member. Its expression report includes antennal sensory neurons.',
    path: 'https://flybase.org/reports/FBgn0031634',
    links: [{ label: 'NCBI Gene 33683', url: 'https://www.ncbi.nlm.nih.gov/gene/33683' }, { label: 'UniProt Q9VR32', url: 'https://www.uniprot.org/uniprotkb/Q9VR32/entry' }],
  }, {
    id: 'doi:10.7554/eLife.30115', title: 'Molecular basis of fatty acid taste in Drosophila', type: 'paper', sourceLabel: 'eLife · curated original publication',
    summary: 'The publication reports IR25a and IR76b expression in subsets of adult tarsal and labellar gustatory receptor neurons.',
    path: 'https://doi.org/10.7554/eLife.30115',
  }],
};

function normalize(value) { return String(value ?? '').trim().slice(0, 120); }
function terms(value) {
  return (String(value ?? '').toLowerCase().match(/[\p{L}0-9]+/gu) ?? []).filter(word => !ignore.has(word));
}
function categoriesMatch(item, filter) {
  const type = String(item.type).toLowerCase();
  if (filter === 'all') return true;
  if (filter === 'gene') return ['gene', 'protein'].includes(type);
  if (filter === 'paper') return ['paper', 'publication', 'preprint'].includes(type);
  return type === filter;
}
function safeUrl(address) {
  try { const url = new URL(address); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; }
  catch { return ''; }
}

export function findLocalResearch(input, filter = 'all') {
  const query = normalize(input);
  const queryTerms = [...new Set(terms(query).flatMap(word => terms(queryAliases[word] ?? word)))];
  if (!queryTerms.length) return [];
  return [...localAnatomy, ...localProtocols]
    .filter(item => categoriesMatch(item, filter))
    .map(item => {
      const title = new Set(terms(item.title));
      const keywords = new Set(terms([item.id, item.summary, item.searchText].join(' ')));
      const score = queryTerms.reduce((sum, term) => sum + (title.has(term) ? 4 : keywords.has(term) ? 1 : 0), 0);
      return { score, item };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, 24)
    .map(({ item }) => item);
}

export function createResearchWorkbench({ escapeHtml: e, announce }) {
  const starterQueries = ['Ir25a', 'adult brain', 'ventral nerve cord', 'calcium imaging'];
  let query = '', submitted = '', provider = 'all', filter = 'all', active = null, outcomes = [], pending = false;
  let mount = null, bridge = null;

  function link(address, label) {
    const href = safeUrl(address);
    return href ? '<a href="' + e(href) + '" rel="noopener noreferrer" target="_blank">' + e(label) + ' ↗</a>' : '';
  }

  function option(value, text, selected) {
    return '<option value="' + e(value) + '"' + (selected === value ? ' selected' : '') + '>' + e(text) + '</option>';
  }

  function relatedContext() {
    if (!terms(submitted).some(word => curated.keys.includes(word))) return '';
    return '<article class="lab-card research-chain"><h2>Ir25a in context</h2>'
      + '<p>Open the full gene report or the published expression study. The adjacent fly views illustrate the corresponding organ at schematic scale.</p>'
      + '<div class="lab-controls"><button type="button" data-research-anatomy="antennae" data-stage="adult">Inspect adult antennae</button>'
      + '<button type="button" data-research-anatomy="legs" data-stage="adult">Inspect legs and tarsi</button>'
      + '<button type="button" data-research-station="neuro">Open sensory recordings lab</button></div>'
      + '<p class="lab-muted">The 3D views do not map expression or identify labeled cells.</p></article>';
  }

  function recordCard(item, response) {
    const date = response?.retrievedAt && String(response.retrievedAt).slice(0, 10);
    const attribution = response ? language.get(response.sourceId)?.label ?? response.sourceId : item.sourceLabel;
    const release = item.release || response?.release;
    const address = safeUrl(item.url ?? item.path);
    const idList = Array.isArray(item.identifiers) ? item.identifiers : [];
    const linked = Array.isArray(item.links) ? item.links : [];
    const action = item.type === 'anatomy' && item.stage
      ? '<button type="button" data-research-anatomy="' + e(item.id) + '" data-stage="' + e(item.stage) + '">Inspect in 3D</button>'
      : item.lesson ? '<button type="button" data-research-lesson="' + e(item.lesson) + '">Open linked bench</button>' : '';
    return '<article class="lab-card research-result"><p class="lab-provenance">' + e(tags[item.type] ?? item.type)
      + ' · ' + e(attribution) + (response ? ' · Live source metadata' : '') + '</p><h3>' + e(item.title) + '</h3>'
      + '<p class="research-id">' + e(item.id) + [item.stage, item.organism, item.year].filter(Boolean).map(value => ' · ' + e(value)).join('') + '</p>'
      + (item.summary ? '<p>' + e(item.summary) + '</p>' : '')
      + (idList.length ? '<p class="lab-muted">' + idList.map(value => e(typeof value === 'string' ? value : value?.value ?? value?.id ?? '')).filter(Boolean).join(' · ') + '</p>' : '')
      + (date || release || item.releaseDate ? '<p class="lab-muted">' + [date && 'Retrieved ' + date, release && 'Release ' + release, item.releaseDate && 'Release date ' + item.releaseDate].filter(Boolean).map(e).join(' · ') + '</p>' : '')
      + '<div class="lab-controls">' + link(address, item.linkText ?? 'Open original record') + action
      + (address ? '<button type="button" data-research-reference="' + e(address) + '">Add to experiment</button>' : '')
      + linked.map(entry => link(entry.url, entry.label ?? 'Cross-reference')).join('') + '</div></article>';
  }

  function statuses() {
    if (!outcomes.length) return '';
    return '<details class="research-sources-status"><summary>Source status · ' + outcomes.length + '</summary><ul>'
      + outcomes.map(outcome => {
        const source = language.get(outcome.sourceId);
        return '<li><strong>' + e(source?.label ?? outcome.sourceId) + '</strong> · ' + e(outcome.message ?? outcome.status)
          + ' ' + link(outcome.searchUrl, 'Open the provider') + '</li>';
      }).join('') + '</ul></details>';
  }

  function renderResults() {
    if (!submitted) return '<div class="lab-result">Search by symbol, stable identifier, tissue, or method. External providers receive only the query you submit.</div>';
    const isExample = terms(submitted).some(word => curated.keys.includes(word));
    const curatedMatches = isExample ? curated.entries.filter(item => categoriesMatch(item, filter)) : [];
    const local = findLocalResearch(submitted, filter);
    const seen = new Set();
    const live = outcomes.flatMap(result => result.records
      .filter(item => categoriesMatch(item, filter))
      .filter(item => {
        const key = result.sourceId + ':' + item.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(item => recordCard(item, result)));
    return '<p class="research-status" role="status">' + (pending ? 'Fetching selected sources…' : (live.length + local.length + curatedMatches.length) + ' matching records') + '</p>'
      + relatedContext()
      + (live.length ? '<h2>Live source records</h2><div class="lab-grid">' + live.join('') + '</div>' : '')
      + (curatedMatches.length ? '<h2>Curated source links</h2><div class="lab-grid">' + curatedMatches.map(item => recordCard(item)).join('') + '</div>' : '')
      + (local.length ? '<h2>FlyLab anatomy and protocol index</h2><div class="lab-grid">' + local.map(item => recordCard(item)).join('') + '</div>' : '')
      + (!pending && !live.length && !local.length && !curatedMatches.length ? '<div class="lab-result">Try an alternate symbol, anatomical term, or provider. Check the source status for direct links.</div>' : '')
      + statuses();
  }

  function render() {
    return '<section class="lab-section research-workbench"><h1>Research resources</h1>'
      + '<p>Search authoritative records and cross-reference them with FlyLab’s anatomy and protocol catalog.</p>'
      + '<form class="lab-card research-form" data-research-form><label class="lab-field"><span>Gene, anatomy, method or dataset</span>'
      + '<input id="research-query" name="query" type="search" maxlength="120" value="' + e(query) + '" placeholder="e.g. Ir25a or ventral nerve cord" required></label>'
      + '<div class="lab-fields"><label class="lab-field"><span>Provider</span><select name="provider">'
      + option('all', 'All providers with live lookup', provider)
      + researchSources.map(source => option(source.id, source.label, provider)).join('') + '</select></label>'
      + '<label class="lab-field"><span>Record type</span><select name="family">' + families.map(([key, label]) => option(key, label, filter)).join('') + '</select></label></div>'
      + '<div class="lab-controls"><button type="submit" class="protocol-primary">Search research</button>'
      + starterQueries.map(sample => '<button type="button" data-research-example="' + e(sample) + '">' + e(sample) + '</button>').join('') + '</div></form>'
      + '<div class="research-results" data-research-results>' + renderResults() + '</div>'
      + '<details class="lab-card research-directory"><summary>Source directory and access methods</summary><ul>'
      + researchSources.map(source => '<li><strong>' + e(source.label) + '</strong> · ' + e(source.method === 'api' ? 'Live metadata' : 'Provider link') + '. '
        + e(source.description) + ' ' + link(source.homeUrl, 'Provider') + (source.docsUrl ? ' ' + link(source.docsUrl, 'Access documentation') : '') + '</li>').join('')
      + '</ul></details></section>';
  }

  function update() {
    const results = mount?.querySelector('[data-research-results]');
    if (results) results.innerHTML = renderResults();
  }

  async function run(next) {
    query = normalize(next);
    if (!query) return;
    submitted = query;
    active?.abort();
    active = new AbortController();
    const task = active;
    outcomes = [];
    const selected = provider === 'all' ? researchSources.filter(source => source.method === 'api') : researchSources.filter(source => source.id === provider);
    pending = selected.length > 0;
    update();
    await Promise.all(selected.map(async source => {
      try {
        const result = await searchResearchSource(source.id, submitted, { signal: task.signal, limit: 6 });
        if (task === active) {
          outcomes.push({ ...result, records: Array.isArray(result.records) ? result.records : [] });
          update();
        }
      } catch (error) {
        if (task !== active || error?.name === 'AbortError') return;
        outcomes.push({ sourceId: source.id, status: 'error', records: [], message: 'Provider lookup unavailable.', searchUrl: source.searchUrl(submitted) });
        update();
      }
    }));
    if (task === active) {
      pending = false;
      update();
      announce('Research search complete.');
    }
  }

  function seed(value) {
    query = submitted = normalize(value);
    outcomes = [];
    pending = false;
  }

  function bind(root, options) {
    mount = root;
    bridge = options;
    root.addEventListener('submit', event => {
      if (!event.target.matches('[data-research-form]')) return;
      event.preventDefault();
      const form = event.target;
      provider = form.querySelector('[name="provider"]').value;
      filter = form.querySelector('[name="family"]').value;
      void run(form.querySelector('[name="query"]').value);
    });
    root.addEventListener('input', event => {
      if (event.target.matches('#research-query')) query = normalize(event.target.value);
    });
    root.addEventListener('change', event => {
      if (event.target.matches('[name="family"]')) { filter = event.target.value; update(); }
      if (event.target.matches('[name="provider"]')) provider = event.target.value;
    });
    root.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      const { researchExample, researchAnatomy, researchLesson, researchStation, researchReference, stage } = button.dataset;
      if (researchExample) {
        root.querySelector('#research-query').value = researchExample;
        void run(researchExample);
      } else if (researchAnatomy) bridge?.openAnatomy?.(stage, researchAnatomy);
      else if (researchLesson) bridge?.openLesson?.(researchLesson);
      else if (researchStation) bridge?.openStation?.(researchStation);
      else if (researchReference) bridge?.addExperimentReference?.(researchReference);
    });
  }

  function unmount() {
    const request = active;
    active = null;
    request?.abort();
    pending = false;
    mount = null;
    bridge = null;
  }

  return { render, bind, unmount, seed };
}
