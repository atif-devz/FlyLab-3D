import { inventory } from './protocol-inventory.js';

const stop = new Set('can i a the for how what where is do to using with in are of does and about find give want which help'.split(' '));
const aliases = {
  vnc: ['ventral', 'nerve', 'cord'],
  cns: ['central', 'nervous', 'system'],
  l3: ['larval', 'larva', 'third'],
  disc: ['imaginal', 'disc'],
  pcr: ['qpcr', 'expression'],
  staining: ['immunostaining', 'imaging', 'labeling'],
  behavior: ['assay', 'behavioral'],
};
const guidance = [
  { words: ['vnc', 'ventral', 'cord'], title: 'Choose an endpoint before opening the specimen', text: 'Whole-mount VNC exposure preserves the cord and its surrounding anatomical relationships. A transfer lesson uses a different endpoint, so check the selected preparation before starting.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3197069/' },
  { words: ['cns', 'larval', 'brain', 'larva'], title: 'Select the right larval stage and preparation', text: 'The third-instar CNS training bench teaches recognition of the paired lobes and the attached VNC. Check the stage specified in the source before comparing observations.', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2504453/' },
  { words: ['adult', 'optic', 'brain'], title: 'Inspect both optic lobes after transfer', text: 'In the adult brain bench, the visible preparation should include the central brain and paired optic lobes. Orientation for imaging depends on the regions you intend to observe.', url: 'https://doi.org/10.3791/61273' },
  { words: ['gene', 'expression', 'qpcr', 'pcr', 'cq'], title: 'Choose a reference and a comparison condition', text: 'Relative-expression analysis uses paired target and reference Cq measurements. The comparative calculation assumes similar amplification efficiencies and a reference stable across the conditions.', url: 'https://pubmed.ncbi.nlm.nih.gov/11846609/' },
  { words: ['survival', 'censored', 'kaplan'], title: 'Separate events from censoring', text: 'A right-censored record contributes to the risk set up to its last observed time. Record the event indicator separately from the last observed time.', url: 'https://doi.org/10.1080/01621459.1958.10501452' },
];

function tokens(text) {
  return [...new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? [])].filter(word => !stop.has(word) && word.length > 1);
}

export function rankMethods(query, limit = 8) {
  const base = tokens(query);
  const words = [...new Set(base.flatMap(word => [word, ...(aliases[word] ?? [])]))];
  const matches = inventory.map(record => {
    const title = new Set(tokens(record.title));
    const detail = new Set(tokens([record.summary, record.stage, record.category, ...record.tissue, ...record.instruments].join(' ')));
    const score = words.reduce((total, word) => total + (title.has(word) ? 4 : detail.has(word) ? 1 : 0), 0);
    return { record, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.record.title.localeCompare(b.record.title));
  return matches.slice(0, limit).map(item => item.record);
}

export function createResearchGuide({ escapeHtml: e, announce }) {
  let query = '', hits = [], asked = false, status = '', busy = false;
  const samples = ['Adult VNC exposure', 'Larval brain and optic lobe', 'Feeding preference controls', 'Relative expression reference'];

  function render() {
    const terms = tokens(query);
    const cards = asked && hits.length ? guidance.filter(item => item.words.some(word => terms.includes(word))).slice(0, 2) : [];
    return '<section class="lab-section"><h1>Research guide</h1><p>Find verified references and explanations from the FlyLab methods index.</p>'
      + '<form class="lab-card lab-guide-form" data-guide-form><label class="lab-field"><span>Research question or technique</span>'
      + '<input data-guide-query name="query" type="search" maxlength="250" value="' + e(query) + '" placeholder="e.g., larval VNC preparation" required></label>'
      + '<div class="lab-controls"><button type="submit" class="protocol-primary" ' + (busy ? 'disabled' : '') + '>Search references</button>'
      + '<button type="button" data-guide-ai ' + (busy ? 'disabled' : '') + '>Rank with on-device AI</button></div>'
      + '<p class="lab-muted">On-device ranking uses a compatible browser model if it is already available. FlyLab displays its own cited records.</p>'
      + '<div class="lab-controls">' + samples.map(example => '<button type="button" data-guide-sample="' + e(example) + '">' + e(example) + '</button>').join('') + '</div>'
      + '<p class="lab-status" role="status">' + e(status) + '</p></form>'
      + (cards.length ? '<div class="lab-grid">' + cards.map(item => '<article class="lab-card"><h2>' + e(item.title) + '</h2><p>' + e(item.text)
        + '</p><a href="' + e(item.url) + '" target="_blank" rel="noopener noreferrer">Published source ↗</a></article>').join('') + '</div>' : '')
      + (asked && hits.length ? '<div class="lab-grid">' + hits.map(item => '<article class="lab-card"><p class="lab-provenance">'
        + e(item.publisher) + ' · ' + e(item.stage) + '</p><h2>' + e(item.title) + '</h2><p>' + e(item.summary) + '</p>'
        + '<a href="' + e(item.url) + '" target="_blank" rel="noopener noreferrer">Read source ↗</a>'
        + (item.lesson ? ' <button type="button" data-guide-lesson="' + e(item.lesson) + '">Open linked bench</button>' : '') + '</article>').join('') + '</div>'
        : asked ? '<div class="lab-result">No close catalog matches. Try a tissue name, life stage, or assay.</div>' : '') + '</section>';
  }

  function bind(root, { openLesson } = {}) {
    const redraw = () => { root.innerHTML = render(); announce(status); };
    function run(value) {
      query = value.trim().slice(0, 250);
      asked = !!query;
      hits = asked ? rankMethods(query) : [];
    }
    root.addEventListener('submit', event => {
      if (!event.target.matches('[data-guide-form]')) return;
      event.preventDefault();
      run(root.querySelector('[data-guide-query]').value);
      status = 'Catalog search complete.';
      redraw();
    });
    root.addEventListener('click', async event => {
      const sample = event.target.closest('[data-guide-sample]')?.dataset.guideSample;
      if (sample) { run(sample); status = 'Catalog search complete.'; redraw(); return; }
      const lesson = event.target.closest('[data-guide-lesson]')?.dataset.guideLesson;
      if (lesson) { openLesson?.(lesson); return; }
      if (!event.target.closest('[data-guide-ai]') || busy) return;
      run(root.querySelector('[data-guide-query]').value);
      if (!hits.length) { status = 'Search for a catalog topic first.'; redraw(); return; }
      const api = globalThis.LanguageModel;
      if (!api) { status = 'On-device AI is unavailable here. Showing catalog matches.'; redraw(); return; }
      let session;
      try {
        if (await api.availability() !== 'available') {
          status = 'A local AI model is unavailable. Showing catalog matches.';
          redraw();
          return;
        }
        busy = true; status = 'Ranking catalog matches on this device…'; redraw();
        session = await api.create();
        const body = JSON.stringify({ query, entries: hits.map((item, i) => [i, item.title, item.summary]) });
        const response = await session.prompt('Return a JSON array of numeric indices, most relevant first. Rank only these catalog entries; do not answer the question. Input: ' + body,
          { responseConstraint: { type: 'array', items: { type: 'integer', minimum: 0, maximum: hits.length - 1 } } });
        const order = JSON.parse(response);
        if (!Array.isArray(order) || !order.length || !order.every(i => Number.isInteger(i) && hits[i])) throw new Error('Invalid ranking');
        const ordered = [...new Set(order)];
        hits = [...ordered.map(i => hits[i]), ...hits.filter((_, i) => !ordered.includes(i))];
        status = 'Ranked with on-device AI. Titles, descriptions and citations come from the catalog.';
      } catch {
        status = 'AI ranking could not finish. Showing catalog matches.';
      } finally {
        session?.destroy?.();
        busy = false;
        redraw();
      }
    });
  }

  return { render, bind };
}

