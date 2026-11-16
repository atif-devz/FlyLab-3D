const storageKey = 'flylab.phase3.stocks.v1';
const stages = ['Egg', 'Larva', 'Pupa', 'Adult'];
const haplotypes = ['AB', 'Ab', 'aB', 'ab'];
const diplotypes = haplotypes.flatMap((first, index) => haplotypes.slice(index).map(second => first + '/' + second));
const inheritance = {
  autosomal: { label: 'One autosomal locus', parents: ['A/A', 'A/a', 'a/a'], initial: ['A/a', 'A/a'],
    text: 'One allele comes from each parent. A is dominant over a in this fictional model.' },
  xlinked: { label: 'One X-linked locus', parents: ['Xᴬ/Xᴬ', 'Xᴬ/Xᵃ', 'Xᵃ/Xᵃ'], fathers: ['Xᴬ/Y', 'Xᵃ/Y'], initial: ['Xᴬ/Xᵃ', 'Xᵃ/Y'],
    text: 'XX offspring inherit an X from each parent. XY offspring get their X from the mother. Xᴬ is dominant.' },
  linked: { label: 'Two linked loci', parents: diplotypes, initial: ['AB/ab', 'ab/ab'],
    text: 'The two letters on each side of the slash are carried together. The model applies recombination to the mother and uses parental haplotypes in the father.' },
  balancer: { label: 'Balancer chromosome', parents: ['+/+', '+/m', '+/Bal', 'm/m', 'm/Bal'], initial: ['m/Bal', 'm/Bal'],
    text: 'The fictional Bal chromosome has a dominant visual marker. Bal/Bal is nonviable in this model. The chosen m/m viability is an explicit assumption.' },
};

const sources = [
  ['Fly life cycle · Friedrich Miescher Laboratory', 'https://www.fml.tuebingen.mpg.de/68672/fruit-flies'],
  ['Male meiosis · PNAS primary study', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9704699/'],
  ['Fly genetics and balancers · GENETICS', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4649653/'],
  ['Stock identity · Bloomington Drosophila Stock Center', 'https://bdsc.indiana.edu/'],
  ['Genotype nomenclature and stock references · FlyBase', 'https://flybase.org/'],
];
const colors = ['#197268', '#397c9a', '#8b633b', '#79568a', '#5b783d', '#9b585a'];
const clamp = (value, lo, hi) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(hi, Math.max(lo, numeric)) : lo;
};

function gametes(genotype, rate = 0) {
  const [first, second] = genotype.split('/');
  const outcomes = new Map();
  function add(allele, weight) {
    if (weight > 0) outcomes.set(allele, (outcomes.get(allele) ?? 0) + weight);
  }
  add(first, (1 - rate) / 2);
  add(second, (1 - rate) / 2);
  if (rate) {
    add(first[0] + second[1], rate / 2);
    add(second[0] + first[1], rate / 2);
  }
  return outcomes;
}

function phenotype(mode, genotype) {
  if (mode === 'xlinked') return genotype.includes('ᴬ') ? 'Dominant' : 'Recessive';
  if (mode === 'balancer') return genotype.includes('Bal') ? 'Balancer marker' : genotype === 'm/m' ? 'm/m phenotype' : 'Unmarked';
  if (mode === 'linked') return ['A', 'B'].map(letter => genotype.includes(letter) ? letter : letter.toLowerCase()).join(' ');
  return genotype.includes('A') ? 'Dominant' : 'Recessive';
}

export function calculateCross({ mode, mother, father, recombination = 20, lethal = false }) {
  const model = inheritance[mode];
  if (!model || !model.parents.includes(mother) || !(model.fathers ?? model.parents).includes(father)) return [];
  if (mode === 'balancer' && lethal && (mother === 'm/m' || father === 'm/m')) return [];
  const rate = mode === 'linked' ? clamp(recombination, 0, 50) / 100 : 0;
  const ordering = mode === 'linked' ? haplotypes : mode === 'balancer' ? ['+', 'm', 'Bal']
    : mode === 'xlinked' ? ['Xᴬ', 'Xᵃ', 'Y'] : ['A', 'a'];
  const outcomes = new Map();
  for (const [maternal, mp] of gametes(mother, rate)) {
    for (const [paternal, pp] of gametes(father)) {
      const sex = mode === 'xlinked' ? (paternal === 'Y' ? 'XY' : 'XX') : '';
      const genotype = [maternal, paternal].sort((a, b) => ordering.indexOf(a) - ordering.indexOf(b)).join('/');
      const key = genotype + sex;
      const viable = !(mode === 'balancer' && (genotype === 'Bal/Bal' || (lethal && genotype === 'm/m')));
      const entry = outcomes.get(key) ?? { genotype, sex, viable, probability: 0, phenotype: phenotype(mode, genotype) };
      entry.probability += mp * pp;
      outcomes.set(key, entry);
    }
  }
  const rows = [...outcomes.values()];
  const survival = rows.reduce((total, row) => total + (row.viable ? row.probability : 0), 0);
  return rows.map(row => ({
    ...row,
    survivors: row.viable && survival > 0 ? row.probability / survival : 0,
  }));
}

function sampleCross(rows, size) {
  const counts = rows.map(() => 0);
  for (let fly = 0; fly < size; fly += 1) {
    let draw = Math.random();
    for (const [index, entry] of rows.entries()) {
      draw -= entry.probability;
      if (draw < 0 || index === rows.length - 1) {
        counts[index] += 1;
        break;
      }
    }
  }
  return counts;
}

function csvCell(value) {
  let text = String(value ?? '');
  if (typeof value !== 'number' && /^[\s]*[=+\-@\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

function csv(rows) {
  return '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

function stockText(value, limit) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function registryRecord(value) {
  try {
    const url = new URL(stockText(value, 350));
    const officialHost = ['bdsc.indiana.edu', 'flybase.org', 'www.flybase.org'].includes(url.hostname);
    return url.protocol === 'https:' && officialHost && !url.username && !url.password && !url.port ? url.href : '';
  } catch {
    return '';
  }
}

function readStocks() {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
    return Array.isArray(raw) ? raw.slice(0, 100).filter(item => item && typeof item.id === 'string' && stages.includes(item.stage)).map(item => ({
      id: item.id,
      name: stockText(item.name, 65),
      genotype: stockText(item.genotype, 92),
      stage: item.stage,
      followUp: stockText(item.followUp, 10),
      note: stockText(item.note, 100),
      registry: registryRecord(item.registry),
      updated: stockText(item.updated, 35),
      revision: Number.isInteger(item.revision) && item.revision > 0 ? item.revision : 1,
    })) : [];
  } catch {
    return [];
  }
}

function writeStocks(stocks) {
  try { localStorage.setItem(storageKey, JSON.stringify(stocks)); } catch { /* The current session remains usable. */ }
}

function percentage(value) {
  return Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

export function createGeneticsLab({ escapeHtml, download, announce }) {
  const esc = escapeHtml;
  let tab = 'cross';
  let cross = makeCross('autosomal');
  let rows = calculateCross(cross);
  let sample = null;
  let sampleSize = 40;
  let generation = 1;
  let history = [];
  let stocks = readStocks();
  let feedback = '';
  let stockDraft = null;

  function makeCross(mode) {
    const { initial } = inheritance[mode];
    return { mode, mother: initial[0], father: initial[1], recombination: 20, lethal: false };
  }

  function setCross(settings) {
    cross = settings;
    rows = calculateCross(cross);
    sample = null;
  }

  function setFeedback(message) {
    feedback = message;
    announce?.(message);
  }

  function options(choices, selected) {
    return choices.map(([value, label]) => '<option value="' + esc(value) + '"' + (selected === value ? ' selected' : '') + '>' + esc(label) + '</option>').join('');
  }

  function renderCross() {
    const model = inheritance[cross.mode];
    const stagesLabel = cross.mode === 'xlinked' ? 'Genotype and chromosome pair' : 'Genotype';
    const dominance = rows.reduce((labels, row) => row.viable ? labels.add(row.phenotype) : labels, new Set());
    const surviving = rows.reduce((total, row) => total + (row.viable ? row.probability : 0), 0);
    return '<div class="lab-grid">'
      + '<section class="lab-card"><h3>Cross design</h3>'
      + '<form data-genetics-form="cross" class="lab-controls"><label class="lab-field">Inheritance model'
      + '<select name="mode" data-genetics-select="mode">' + options(Object.entries(inheritance).map(([key, item]) => [key, item.label]), cross.mode) + '</select></label>'
      + '<p>' + esc(model.text) + '</p><label class="lab-field">Mother<select name="mother">' + options(model.parents.map(item => [item, item]), cross.mother) + '</select></label>'
      + '<label class="lab-field">Father<select name="father">' + options((model.fathers ?? model.parents).map(item => [item, item]), cross.father) + '</select></label>'
      + (cross.mode === 'linked' ? '<label class="lab-field">Maternal recombination (%)<input name="recombination" type="number" min="0" max="50" step="1" value="' + cross.recombination + '" required></label>' : '')
      + (cross.mode === 'balancer' ? '<label><input name="lethal" type="checkbox"' + (cross.lethal ? ' checked' : '') + '> Model m/m as nonviable</label>' : '')
      + '<button type="submit">Predict offspring</button></form></section>'
      + '<section class="lab-card"><h3>Cross ' + generation + '</h3><p>Expected classes for ' + esc(cross.mother) + ' × ' + esc(cross.father) + '. '
      + (cross.mode === 'balancer' ? 'Expected survival in this model ' + percentage(surviving) + '.' : dominance.size + ' expected phenotype class' + (dominance.size === 1 ? '' : 'es') + '.') + '</p>'
      + '<div class="lab-result" role="list" aria-label="Expected ' + esc(stagesLabel) + ' outcome probabilities">'
      + rows.map((row, index) => {
        const label = row.genotype + (row.sex ? ' · ' + row.sex : '');
        const nextEligible = row.viable && ((inheritance[cross.mode].parents.includes(row.genotype)) || ((inheritance[cross.mode].fathers ?? []).includes(row.genotype)));
        return '<div role="listitem" style="margin:.55rem 0"><strong>' + esc(label) + '</strong> <span>' + percentage(row.probability) + ' of zygotes</span>'
          + '<div aria-hidden="true" style="height:.38rem;margin:.25rem 0;border-radius:.2rem;background:color-mix(in srgb,currentColor 12%,transparent)"><div style="height:100%;width:' + (row.probability * 100).toFixed(3) + '%;border-radius:.2rem;background:' + colors[index % colors.length] + '"></div></div>'
          + '<small>' + esc(row.phenotype) + (row.viable ? (cross.mode === 'balancer' ? ' · ' + percentage(row.survivors) + ' of surviving offspring' : '') : ' · Nonviable') + (sample ? ' · ' + sample[index] + ' synthetic observations' : '') + '</small>'
          + (nextEligible ? ' <button type="button" data-genetics="promote" data-index="' + index + '" aria-label="' + esc('Use ' + label + ' in the next cross') + '">Use in next cross</button>' : '')
          + '</div>';
      }).join('')
      + '</div><form data-genetics-form="sample" class="lab-controls"><label class="lab-field">Synthetic offspring count<input name="size" type="number" min="1" max="500" value="' + sampleSize + '" required></label>'
      + '<button type="submit">Draw sample</button></form>'
      + '<div class="lab-controls"><button type="button" data-genetics="record">Record cross</button><button type="button" data-genetics="cross-csv">Export predictions</button><button type="button" data-genetics="save-stock">Add cross to stock organizer</button></div></section></div>'
      + (history.length ? '<section class="lab-card"><h3>Recorded crosses</h3><ol>' + history.map(entry => '<li>Cross ' + entry.generation + ' · ' + esc(entry.label) + ' · ' + esc(entry.mother) + ' × ' + esc(entry.father) + '</li>').join('') + '</ol>'
        + '<button type="button" data-genetics="history-csv">Export cross history</button></section>' : '');
  }

  function renderStocks() {
    const draft = stockDraft ?? {};
    return '<div class="lab-grid"><section class="lab-card"><h3>Stock organizer</h3><p>Record classroom vials and their follow-up dates. Advance a simulated vial through the four life stages.</p>'
      + '<form data-genetics-form="stock" class="lab-controls"><label class="lab-field">Vial or stock label<input name="name" type="text" required maxlength="65" value="' + esc(draft.name ?? '') + '"></label>'
      + '<label class="lab-field">Genotype or cross<input name="genotype" type="text" maxlength="92" value="' + esc(draft.genotype ?? '') + '"></label>'
      + '<label class="lab-field">Current stage<select name="stage">' + options(stages.map(stage => [stage, stage]), 'Egg') + '</select></label>'
      + '<label class="lab-field">Follow-up date<input name="followUp" type="date"></label>'
      + '<label class="lab-field">Stock source URL<input name="registry" type="url" maxlength="350" placeholder="Optional FlyBase or BDSC record"></label>'
      + '<label class="lab-field">Observation<input name="note" type="text" maxlength="100" placeholder="e.g. Check stage in class"></label>'
      + '<button type="submit">Add stock</button></form></section>'
      + '<section class="lab-card"><h3>Development timeline</h3><p>Egg → Larva → Pupa → Adult</p>'
      + (stocks.length ? '<ul class="lab-result">' + stocks.map((item, index) => '<li style="margin:.6rem 0"><strong>' + esc(item.name) + '</strong> · ' + esc(item.stage)
        + (item.genotype ? '<p>' + esc(item.genotype) + '</p>' : '')
        + (item.followUp ? '<p>Follow-up ' + esc(item.followUp) + '</p>' : '')
        + (item.note ? '<p>' + esc(item.note) + '</p>' : '')
        + (item.registry ? '<p><a href="' + esc(item.registry) + '" target="_blank" rel="noopener noreferrer">Open stock reference</a></p>' : '')
        + (item.updated ? '<small>Log revision ' + item.revision + ' · ' + esc(new Date(item.updated).toLocaleDateString()) + '</small>' : '')
        + '<div class="lab-controls"><button type="button" data-genetics="advance" data-index="' + index + '"' + (item.stage === 'Adult' ? ' disabled' : '') + '>Advance stage</button>'
        + '<button type="button" data-genetics="remove" data-index="' + index + '" aria-label="' + esc('Remove ' + item.name) + '">Remove</button></div></li>').join('') + '</ul>'
        + '<button type="button" data-genetics="stocks-csv">Export stock log</button>' : '<p>Add a vial to start a stock log.</p>')
      + '</section></div>';
  }

  function render() {
    return '<div class="lab-section"><h2>Genetics and fly husbandry</h2><p>Explore inheritance with fictional alleles and organize simulated fly stocks.</p>'
      + '<nav class="lab-controls" aria-label="Genetics workspace"><button type="button" data-genetics="tab-cross" aria-pressed="' + (tab === 'cross') + '">Fly crosses</button>'
      + '<button type="button" data-genetics="tab-stocks" aria-pressed="' + (tab === 'stocks') + '">Stock organizer</button></nav>'
      + '<p role="status" tabindex="-1" data-genetics-status>' + esc(feedback) + '</p>'
      + (tab === 'cross' ? renderCross() : renderStocks())
      + '<details class="lab-card"><summary>Sources and assumptions</summary><ul>' + sources.map(([name, url]) => '<li><a href="' + url + '" target="_blank" rel="noopener noreferrer">' + esc(name) + '</a></li>').join('')
      + '</ul><p>Probabilities assume ordinary segregation, equal gamete contributions before the modeled viability filter, and the dominance relationships shown for these fictional alleles. Stage changes are user-recorded in the stock organizer.</p></details></div>';
  }

  function bind(root) {
    function refresh(focusSelector = '[data-genetics-status]') {
      root.innerHTML = render();
      root.querySelector(focusSelector)?.focus();
    }

    root.onchange = event => {
      if (event.target.dataset.geneticsSelect !== 'mode' || !Object.hasOwn(inheritance, event.target.value)) return;
      generation = 1;
      setCross(makeCross(event.target.value));
      setFeedback('Loaded the ' + inheritance[cross.mode].label.toLowerCase() + ' example.');
      refresh('[data-genetics-select="mode"]');
    };

    root.onsubmit = event => {
      const form = event.target;
      const action = form.dataset.geneticsForm;
      if (!action) return;
      event.preventDefault();
      const data = new FormData(form);
      if (action === 'cross') {
        const settings = { mode: cross.mode, mother: data.get('mother'), father: data.get('father'),
          recombination: clamp(data.get('recombination'), 0, 50), lethal: data.has('lethal') };
        if (!calculateCross(settings).length) {
          setFeedback('Choose viable parents under the selected model assumptions.');
        } else {
          setCross(settings);
          setFeedback('Updated expected offspring for cross ' + generation + '.');
        }
      } else if (action === 'sample') {
        sampleSize = Math.round(clamp(data.get('size'), 1, 500));
        sample = sampleCross(rows, sampleSize);
        setFeedback('Drew ' + sampleSize + ' synthetic offspring before the viability filter.');
      } else if (action === 'stock') {
        const name = stockText(data.get('name'), 65);
        if (!name) return;
        if (stocks.length >= 100) {
          setFeedback('The stock log holds 100 entries. Export or remove a stock before adding another.');
          refresh();
          return;
        }
        const stage = data.get('stage');
        const registry = registryRecord(data.get('registry'));
        stocks = [{ id: Date.now() + '-' + Math.random().toString(36).slice(2, 8), name,
          genotype: stockText(data.get('genotype'), 92), stage: stages.includes(stage) ? stage : 'Egg',
          followUp: stockText(data.get('followUp'), 10), note: stockText(data.get('note'), 100), registry,
          revision: 1, updated: new Date().toISOString() }, ...stocks];
        stockDraft = null;
        writeStocks(stocks);
        setFeedback('Added ' + name + ' to the stock log.' + (data.get('registry') && !registry ? ' A stock reference requires a FlyBase or BDSC HTTPS address.' : ''));
      }
      refresh();
    };

    root.onclick = event => {
      const button = event.target.closest('[data-genetics]');
      if (!button || button.disabled) return;
      const index = Number(button.dataset.index);
      const command = button.dataset.genetics;
      const kind = 'synthetic_education';
      const lineage = [generation, inheritance[cross.mode].label, cross.mother, cross.father,
        cross.mode === 'linked' ? cross.recombination : '', cross.mode === 'balancer' ? (cross.lethal ? 'yes' : 'no') : ''];
      const headings = ['data_kind', 'cross_number', 'model', 'mother', 'father', 'maternal_recombination_pct', 'modeled_mm_nonviable', 'genotype', 'chromosome_pair', 'viable', 'phenotype', 'probability_of_zygotes', 'probability_of_survivors', 'synthetic_count'];
      if (command === 'tab-cross' || command === 'tab-stocks') {
        tab = command === 'tab-cross' ? 'cross' : 'stocks';
        feedback = '';
        refresh('[data-genetics="' + command + '"]');
        return;
      }
      if (command === 'promote' && rows[index]?.viable) {
        const child = rows[index];
        const role = child.sex === 'XY' ? 'father' : 'mother';
        generation += 1;
        setCross({ ...cross, [role]: child.genotype });
        setFeedback('Used ' + child.genotype + ' as ' + role + ' in cross ' + generation + '.');
      } else if (command === 'record') {
        history = [...history, { generation, label: inheritance[cross.mode].label, mother: cross.mother, father: cross.father, lineage, rows, sample }].slice(-20);
        setFeedback('Recorded cross ' + generation + ' in this session.');
      } else if (command === 'save-stock') {
        stockDraft = { name: 'Training cross ' + generation, genotype: cross.mother + ' × ' + cross.father };
        tab = 'stocks';
        setFeedback('Set a stock label and stage to save this cross.');
      } else if (command === 'advance' && stocks[index] && stocks[index].stage !== 'Adult') {
        const item = stocks[index];
        item.stage = stages[stages.indexOf(item.stage) + 1];
        item.revision += 1;
        item.updated = new Date().toISOString();
        writeStocks(stocks);
        setFeedback(item.name + ' is now recorded as ' + item.stage.toLowerCase() + '.');
      } else if (command === 'remove' && stocks[index]) {
        const [item] = stocks.splice(index, 1);
        writeStocks(stocks);
        setFeedback('Removed ' + item.name + '.');
      } else if (command === 'cross-csv' || command === 'history-csv') {
        const runs = command === 'cross-csv' ? [{ lineage, rows, sample }] : history;
        const data = runs.flatMap(run => run.rows.map((row, i) => [kind, ...run.lineage, row.genotype, row.sex, row.viable, row.phenotype, row.probability, row.survivors, run.sample?.[i] ?? '']));
        download(command === 'cross-csv' ? 'fly-cross-prediction.csv' : 'fly-cross-history.csv', csv([headings, ...data]), 'text/csv;charset=utf-8');
        return;
      } else if (command === 'stocks-csv') {
        download('fly-stock-training-log.csv', csv([['data_kind', 'stock', 'genotype', 'life_stage', 'follow_up', 'observation', 'source_url', 'log_revision', 'updated_at'],
          ...stocks.map(item => [kind, item.name, item.genotype, item.stage, item.followUp, item.note, item.registry, item.revision, item.updated])]), 'text/csv;charset=utf-8');
        return;
      } else {
        return;
      }
      refresh(command === 'save-stock' ? '[name="name"]' : undefined);
    };
  }

  return { render, bind };
}
