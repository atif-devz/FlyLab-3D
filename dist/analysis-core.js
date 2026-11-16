export const analyses = {
  summary: { title: 'Descriptive statistics', columns: 'condition, value, unit (optional)', note: 'Summaries report the number of rows, mean, median, and sample standard deviation. Enter one row per independent observation or aggregate repeated measurements first.' },
  preference: { title: 'Preference index', columns: 'condition, test_count, reference_count, no_choice (optional)', note: 'The index is (test − reference) / (test + reference). No-choice observations are tracked separately and rows with no choices have no index.' },
  feeding: { title: 'Feeding measurements', columns: 'condition, consumed, evaporation, flies, hours (or value, unit)', note: 'Corrected feeding is (consumed − evaporation) per fly per hour when those columns are present. A negative corrected value is retained for review.' },
  spikes: { title: 'Spike count and rate', columns: 'condition, value (spike count), time (recording duration in seconds)', note: 'Rate is detected spikes divided by recording duration. Use the same scoring and window definition across conditions.' },
  survival: { title: 'Kaplan–Meier survival', columns: 'condition, time, event (1 = event, 0 = right-censored)', note: 'The curve uses the product-limit estimator. At a tied time, subjects censored then contribute to the risk set for events at that time.', source: 'https://doi.org/10.1080/01621459.1958.10501452' },
  development: { title: 'Developmental timing', columns: 'condition, time, stage, unit (optional)', note: 'Compare times within each life-stage milestone and time unit. Summaries are descriptive.' },
  gene: { title: 'Relative expression (ΔΔCq)', columns: 'condition, target_cq, reference_cq', note: 'The fold value is 2 to the power of negative ΔΔCq, using the mean ΔCq in the selected reference group. This assumes comparable amplification efficiencies and a stable reference.', source: 'https://pubmed.ncbi.nlm.nih.gov/11846609/' },
  microscopy: { title: 'Microscopy measurements', columns: 'condition, value, metric, unit (or intensity / area)', note: 'Compare measurements made with compatible settings. Choose a metric and unit before aggregating rows.' },
};

export const examples = {
  summary: 'condition,value,unit\nReference,10,a.u.\nReference,13,a.u.\nReference,11,a.u.\nTest,15,a.u.\nTest,18,a.u.\nTest,16,a.u.',
  preference: 'condition,test_count,reference_count,no_choice\nControl,11,9,3\nControl,10,10,2\nTreatment,15,5,1\nTreatment,13,7,2',
  feeding: 'condition,consumed,evaporation,flies,hours\nControl,1.2,0.2,5,2\nControl,1.4,0.2,5,2\nTreatment,1.9,0.25,5,2\nTreatment,2.1,0.25,5,2',
  spikes: 'condition,value,time\nControl,6,1\nControl,7,1\nTest,16,1\nTest,15,1',
  survival: 'condition,time,event\nControl,2,1\nControl,3,0\nControl,4,1\nControl,7,0\nTest,3,1\nTest,5,0\nTest,6,1\nTest,7,0',
  development: 'condition,time,stage,unit\nControl,104,pupariation,h\nControl,109,pupariation,h\nTest,115,pupariation,h\nTest,120,pupariation,h\nControl,211,eclosion,h\nTest,220,eclosion,h',
  gene: 'condition,target_cq,reference_cq\nReference,25.3,22.4\nReference,25.5,22.6\nTest,24.1,22.4\nTest,23.9,22.5',
  microscopy: 'condition,value,metric,unit\nControl,41,mean intensity,a.u.\nControl,48,mean intensity,a.u.\nTest,52,mean intensity,a.u.\nTest,53,mean intensity,a.u.',
};

export function readDelimited(text) {
  const content = String(text).replace(/^\uFEFF/, '');
  const firstLine = content.split(/\r?\n/, 1)[0];
  const delimiter = firstLine.includes('\t') ? '\t' : !firstLine.includes(',') && firstLine.includes(';') ? ';' : ',';
  const grid = [];
  let row = [], value = '', quoted = false, ended = false;
  function cell() { row.push(value); value = ''; ended = false; }
  function line() {
    cell();
    if (row.some(entry => entry.trim())) grid.push(row);
    row = [];
    if (grid.length > 30001) throw new Error('Use a file with at most 30,000 data rows.');
  }
  for (let offset = 0; offset < content.length; offset += 1) {
    const ch = content[offset];
    if (quoted) {
      if (ch !== '"') value += ch;
      else if (content[offset + 1] === '"') { value += '"'; offset += 1; }
      else { quoted = false; ended = true; }
    } else if (ch === delimiter) cell();
    else if (ch === '\n' || ch === '\r') {
      line();
      if (ch === '\r' && content[offset + 1] === '\n') offset += 1;
    } else if (ch === '"' && !value && !ended) quoted = true;
    else if (ended || ch === '"') throw new Error('Check the quotation marks around delimited fields.');
    else value += ch;
  }
  if (quoted) throw new Error('A quoted field is missing its closing quote.');
  line();
  return grid;
}

export function normalizeTable(grid) {
  if (!Array.isArray(grid) || grid.length < 2 || grid.length > 30001) throw new Error('Use one header row and 1 to 30,000 data rows.');
  const columns = grid[0].map(cell => String(cell ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_'));
  while (columns.length && !columns.at(-1)) columns.pop();
  if (!columns.length || columns.length > 128 || columns.some(col => !col) || new Set(columns).size !== columns.length) {
    throw new Error('Use unique, nonempty headers and at most 128 columns.');
  }
  const rows = [];
  for (const input of grid.slice(1)) {
    if (!input.some(cell => String(cell ?? '').trim())) continue;
    if (input.slice(columns.length).some(cell => String(cell ?? '').trim())) throw new Error('A data row has more columns than the header.');
    rows.push(Object.fromEntries(columns.map((col, index) => [col, String(input[index] ?? '').trim().slice(0, 500)])));
  }
  if (!rows.length) throw new Error('This file contains no data rows.');
  return { columns, rows };
}

export function tableCsv(grid) {
  return grid.map(row => row.map(value => {
    let text = String(value ?? '');
    if (typeof value !== 'number' && /^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  }).join(',')).join('\r\n') + '\r\n';
}

function field(row, ...keys) { return keys.map(key => row[key]).find(value => value !== undefined && value !== '') ?? ''; }
function numeric(row, ...keys) {
  const value = field(row, ...keys);
  if (value === '' || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= 1e120 ? number : null;
}
function cohort(row) { return field(row, 'condition', 'group', 'cohort', 'treatment') || 'All rows'; }
function groupBy(rows, fn) {
  const map = new Map();
  for (const row of rows) {
    const key = fn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

export function inferAnalysis(table) {
  const has = (...names) => names.every(name => table.columns.includes(name) && table.rows.some(row => row[name] !== ''));
  if (has('time', 'event')) return 'survival';
  if (has('target_cq', 'reference_cq')) return 'gene';
  if (has('test_count', 'reference_count')) return 'preference';
  if (has('time', 'stage')) return 'development';
  if (has('consumed', 'evaporation')) return 'feeding';
  if (has('intensity') || has('area')) return 'microscopy';
  if (has('spike_count', 'duration_s')) return 'spikes';
  return 'summary';
}

export function cohortNames(table) { return [...new Set(table.rows.map(cohort))]; }

function measureLabel(row) {
  const label = [field(row, 'metric', 'measurement'), field(row, 'unit')].filter(Boolean).join(' · ');
  return label || 'Value';
}

export function measureNames(table, kind) {
  if (kind === 'spikes') return ['Spikes per second', 'Spike count'];
  if (!['summary', 'microscopy', 'feeding', 'development', 'survival'].includes(kind)) return [''];
  if (kind === 'development' || kind === 'survival') return [...new Set(table.rows.map(row => field(row, 'unit') || 'Time'))];
  if (!table.columns.some(name => ['metric', 'measurement', 'unit'].includes(name))) {
    const numericColumns = table.columns.filter(col => !['condition', 'group', 'cohort', 'replicate', 'subject', 'seed', 'origin'].includes(col)
      && table.rows.some(row => numeric(row, col) !== null));
    const preferred = ['value', 'intensity', 'area', 'feeding_rate'].filter(col => numericColumns.includes(col));
    if (kind === 'feeding' && table.columns.includes('consumed')) return ['Corrected feeding'];
    return [...new Set([...preferred, ...numericColumns])];
  }
  return [...new Set(table.rows.map(measureLabel))];
}

function validCount(value) { return Number.isInteger(value) && value >= 0; }
function mean(values) { return values.reduce((out, x) => out + x / values.length, 0); }

function summarize(values) {
  const sorted = values.toSorted((a, b) => a - b);
  const n = sorted.length;
  const average = mean(values);
  const median = n % 2 ? sorted[(n - 1) / 2] : sorted[n / 2 - 1] / 2 + sorted[n / 2] / 2;
  const sd = n > 1 ? Math.sqrt(values.reduce((acc, x) => acc + (x - average) ** 2 / (n - 1), 0)) : null;
  return [n, average, median, sd, sorted[0], sorted[n - 1]];
}

function survivalResult(rows) {
  const headings = ['Condition', 'Time', 'At risk', 'Events', 'Censored', 'Survival'];
  const results = [];
  const curves = [];
  let rejected = 0;
  for (const [condition, samples] of groupBy(rows, cohort)) {
    const byTime = new Map();
    for (const row of samples) {
      const time = numeric(row, 'time', 'days', 'duration', 'value');
      const event = numeric(row, 'event', 'status');
      if (time === null || time < 0 || ![0, 1].includes(event)) { rejected += 1; continue; }
      const entry = byTime.get(time) ?? { events: 0, censored: 0 };
      if (event === 1) entry.events += 1;
      else entry.censored += 1;
      byTime.set(time, entry);
    }
    let risk = [...byTime.values()].reduce((total, entry) => total + entry.events + entry.censored, 0);
    let survival = 1;
    const points = [[0, 1]];
    const marks = [];
    for (const [time, { events, censored }] of [...byTime.entries()].sort((a, b) => a[0] - b[0])) {
      points.push([time, survival]);
      survival *= 1 - events / risk;
      points.push([time, survival]);
      if (censored) marks.push([time, survival]);
      results.push([condition, time, risk, events, censored, survival]);
      risk -= events + censored;
    }
    if (byTime.size) curves.push({ label: condition, points, marks });
  }
  return { headings, results, curves, rejected, measure: 'Survival probability' };
}

export function calculate(table, kind, selectedMeasure = '', reference = '') {
  const customMeasure = table.columns.includes(selectedMeasure);
  const rows = selectedMeasure && !customMeasure && ['summary', 'microscopy', 'feeding', 'development', 'survival'].includes(kind)
    && selectedMeasure !== 'Corrected feeding'
    ? table.rows.filter(row => ['development', 'survival'].includes(kind) ? (field(row, 'unit') || 'Time') === selectedMeasure : measureLabel(row) === selectedMeasure)
    : table.rows;
  if (kind === 'survival') return survivalResult(rows);
  const collected = [];
  let rejected = 0, noChoice = 0;
  for (const row of rows) {
    let value = null;
    let label = cohort(row);
    switch (kind) {
      case 'preference': {
        const test = numeric(row, 'test_count', 'choice_a', 'test');
        const control = numeric(row, 'reference_count', 'choice_b', 'control');
        const nc = numeric(row, 'no_choice', 'no_response');
        if (validCount(nc)) noChoice += nc;
        if (validCount(test) && validCount(control) && test + control > 0) value = (test - control) / (test + control);
        break;
      }
      case 'feeding': {
        const net = numeric(row, 'consumed', 'volume');
        const evaporation = numeric(row, 'evaporation', 'blank_loss');
        const flies = numeric(row, 'flies', 'n_flies');
        const hours = numeric(row, 'hours', 'duration_h');
        if ([net, evaporation, flies, hours].every(x => x !== null) && hours > 0 && flies > 0 && net >= 0 && evaporation >= 0) value = (net - evaporation) / flies / hours;
        else if (!table.columns.includes('consumed')) value = numeric(row, ...(customMeasure ? [selectedMeasure] : ['value', 'feeding_rate']));
        break;
      }
      case 'spikes': {
        const spikes = numeric(row, 'spikes', 'spike_count', 'value');
        const duration = numeric(row, 'duration_s', 'time', 'window_seconds');
        if (validCount(spikes)) {
          if (selectedMeasure === 'Spike count') value = spikes;
          else if (duration !== null && duration > 0) value = spikes / duration;
        }
        break;
      }
      case 'development':
        value = numeric(row, 'time', 'value');
        if (value !== null && value < 0) value = null;
        if (field(row, 'stage')) label += ' · ' + field(row, 'stage');
        break;
      case 'gene': {
        const target = numeric(row, 'target_cq', 'target_ct');
        const ref = numeric(row, 'reference_cq', 'reference_ct');
        if (target !== null && ref !== null && target >= 0 && ref >= 0 && target <= 100 && ref <= 100) value = target - ref;
        break;
      }
      case 'microscopy':
        value = numeric(row, ...(customMeasure ? [selectedMeasure] : ['value', 'mean_intensity', 'intensity', 'area']));
        if (field(row, 'channel')) label += ' · ' + field(row, 'channel');
        break;
      default:
        value = numeric(row, ...(customMeasure ? [selectedMeasure] : ['value', 'intensity', 'area']));
    }
    if (value === null || !Number.isFinite(value)) rejected += 1;
    else collected.push({ label, value });
  }
  let measure = selectedMeasure || (kind === 'feeding' ? 'Corrected feeding' : 'Value');
  if (kind === 'preference') measure = 'Preference index';
  if (kind === 'spikes') measure = selectedMeasure === 'Spike count' ? selectedMeasure : 'Spikes per second';
  if (kind === 'gene') {
    const calibration = collected.filter(entry => entry.label === reference);
    if (!calibration.length) return { headings: [], results: [], rejected, warning: 'Choose a reference condition with valid paired target and reference Cq values.' };
    const meanReference = mean(calibration.map(entry => entry.value));
    for (const entry of collected) entry.value = 2 ** (-(entry.value - meanReference));
    measure = 'Relative expression (fold)';
  }
  const headings = ['Condition', 'Rows', 'Mean', 'Median', 'Sample SD', 'Min', 'Max'];
  const results = [...groupBy(collected, row => row.label)].map(([label, items]) => [label, ...summarize(items.map(item => item.value))]);
  return { headings, results, rejected, noChoice, measure };
}

