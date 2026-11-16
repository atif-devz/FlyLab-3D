import { normalizeTable, readDelimited, tableCsv } from './analysis-core.js';
import { readWorkbook } from './workbook.js';

const methods = {
  welch: {
    title: 'Welch two-sample t-test',
    summary: 'Compare the means of two independent groups with unequal variances permitted. Small samples need approximately normal observations in each group.',
    source: 'https://www.itl.nist.gov/div898/handbook/eda/section3/eda353.htm',
    citation: 'NIST Engineering Statistics Handbook · Two-sample t-test',
  },
  anova: {
    title: 'One-way ANOVA',
    summary: 'Test for a mean difference anywhere among three or more independent groups. The classical F-test assumes approximately normal residuals and similar within-group variance.',
    source: 'https://www.itl.nist.gov/div898/handbook/prc/section4/prc433.htm',
    citation: 'NIST Engineering Statistics Handbook · One-way ANOVA',
  },
  bh: {
    title: 'Benjamini–Hochberg adjustment',
    summary: 'Adjust p-values within one prespecified family. False discovery rate control requires valid p-values and independence or appropriate positive dependence.',
    source: 'https://doi.org/10.1111/j.2517-6161.1995.tb02031.x',
    citation: 'Benjamini and Hochberg, 1995',
  },
};
const origins = {
  unknown: 'Choose the data origin',
  imported: 'Imported research data · user-declared',
  synthetic: 'Synthetic practice data',
};
const exampleRows = [
  ['Control', [11.8, 10.4, 11.4, 12.3, 9.7]],
  ['Condition A', [14.2, 15, 12.7, 14.9, 16.1, 13.5]],
  ['Condition B', [12.2, 12.8, 10.9, 12.4, 13.2]],
];
const numericPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const maximumMagnitude = 1e120;
const numberFormat = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 6 });
const lanczos = [
  676.5203681218851, -1259.1392167224028, 771.3234287776531,
  -176.6150291621406, 12.507343278686905, -0.13857109526572012,
  9.984369578019572e-6, 1.5056327351493116e-7,
];

function logGamma(value) {
  const z = value - 1;
  let sum = 0.99999999999980993;
  for (let i = 0; i < lanczos.length; i += 1) sum += lanczos[i] / (z + i + 1);
  const t = z + 7.5;
  return 0.9189385332046727 + (z + 0.5) * Math.log(t) - t + Math.log(sum);
}

function betaFraction(a, b, x) {
  const minimum = 1e-300;
  const safe = value => Math.abs(value) > minimum ? value : (value < 0 ? -minimum : minimum);
  let c = 1;
  let d = 1 / safe(1 - (a + b) * x / (a + 1));
  let value = d;
  for (let step = 1; step <= 512; step += 1) {
    const twice = step * 2;
    let factor = step * (b - step) * x / ((a - 1 + twice) * (a + twice));
    d = 1 / safe(1 + factor * d);
    c = safe(1 + factor / c);
    value *= d * c;
    factor = -(a + step) * (a + b + step) * x / ((a + twice) * (a + 1 + twice));
    d = 1 / safe(1 + factor * d);
    c = safe(1 + factor / c);
    const ratio = d * c;
    value *= ratio;
    if (Math.abs(1 - ratio) <= 8 * Number.EPSILON) return value;
  }
  throw new Error('The numerical probability calculation did not converge.');
}

function regularizedBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const symmetric = x > (a + 1) / (a + b + 2);
  const logTerm = logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log1p(-x);
  const probability = symmetric
    ? 1 - Math.exp(logTerm) * betaFraction(b, a, 1 - x) / b
    : Math.exp(logTerm) * betaFraction(a, b, x) / a;
  return Math.min(1, Math.max(0, probability));
}

function tTail(statistic, degrees) {
  return regularizedBeta(degrees / (degrees + statistic * statistic), degrees / 2, 0.5);
}

function tCritical(degrees, alpha) {
  let lower = 0;
  let upper = 1;
  while (tTail(upper, degrees) > alpha) upper *= 2;
  for (let i = 0; i < 64; i += 1) {
    const middle = lower + (upper - lower) / 2;
    if (tTail(middle, degrees) > alpha) lower = middle;
    else upper = middle;
  }
  return (lower + upper) / 2;
}

function commonScale(groups) {
  let scale = 0;
  for (const values of groups) {
    if (!Array.isArray(values) || values.length < 2) throw new Error('Each group must contain at least two independent observations.');
    for (const value of values) {
      if (!Number.isFinite(value) || Math.abs(value) > maximumMagnitude) throw new Error('Use finite measurements with a magnitude up to 10^120.');
      scale = Math.max(scale, Math.abs(value));
    }
  }
  return scale || 1;
}

function moments(values, scale) {
  let mean = 0;
  let sumSquares = 0;
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i] / scale;
    const delta = value - mean;
    mean += delta / (i + 1);
    sumSquares += delta * (value - mean);
  }
  return { n: values.length, mean, sumSquares: Math.max(0, sumSquares) };
}

function summary({ n, mean, sumSquares }, scale) {
  return { n, mean: mean * scale, sd: Math.sqrt(sumSquares / (n - 1)) * scale };
}

export function welchTTest(first, second, confidence = 0.95) {
  if (!(confidence > 0 && confidence < 1)) throw new Error('Choose a confidence level between 0 and 1.');
  const scale = commonScale([first, second]);
  const a = moments(first, scale);
  const b = moments(second, scale);
  const sa = a.sumSquares / (a.n - 1) / a.n;
  const sb = b.sumSquares / (b.n - 1) / b.n;
  const estimate = a.mean - b.mean;
  const variance = sa + sb;
  if (variance === 0) throw new Error('Welch inference requires observed variability in at least one group.');
  const degrees = 1 / ((sa / variance) ** 2 / (a.n - 1) + (sb / variance) ** 2 / (b.n - 1));
  const statistic = estimate / Math.sqrt(variance);
  const margin = tCritical(degrees, 1 - confidence) * Math.sqrt(variance);
  return {
    statistic, degrees, pValue: tTail(statistic, degrees), estimate: estimate * scale, confidence,
    interval: [(estimate - margin) * scale, (estimate + margin) * scale],
    groups: [summary(a, scale), summary(b, scale)],
  };
}

export function oneWayAnova(groups) {
  if (!Array.isArray(groups) || groups.length < 3) throw new Error('Choose three or more groups for one-way ANOVA.');
  const scale = commonScale(groups);
  const samples = groups.map(values => moments(values, scale));
  const total = samples.reduce((count, group) => count + group.n, 0);
  const grandMean = samples.reduce((mean, group) => mean + group.mean * group.n / total, 0);
  const within = samples.reduce((sum, group) => sum + group.sumSquares, 0);
  const between = samples.reduce((sum, group) => sum + group.n * (group.mean - grandMean) ** 2, 0);
  if (within === 0) throw new Error('The ANOVA residual variance is zero. The F-test is undefined for these observations.');
  const numeratorDegrees = samples.length - 1;
  const denominatorDegrees = total - samples.length;
  const statistic = (between / numeratorDegrees) / (within / denominatorDegrees);
  return {
    statistic, numeratorDegrees, denominatorDegrees, etaSquared: between / (within + between),
    pValue: regularizedBeta(denominatorDegrees / (denominatorDegrees + numeratorDegrees * statistic), denominatorDegrees / 2, numeratorDegrees / 2),
    groups: samples.map(group => summary(group, scale)),
  };
}

export function benjaminiHochberg(pValues) {
  if (!Array.isArray(pValues) || !pValues.length || pValues.some(p => !Number.isFinite(p) || p < 0 || p > 1)) {
    throw new Error('A p-value family must contain finite values in [0, 1].');
  }
  const ranked = pValues.map((p, index) => [p, index]).sort(([a], [b]) => a - b);
  const result = new Array(ranked.length);
  let pooled = 1;
  for (let rank = ranked.length; rank >= 1; rank -= 1) {
    const [p, index] = ranked[rank - 1];
    pooled = Math.min(pooled, (p * ranked.length) / rank);
    result[index] = pooled;
  }
  return result;
}

function numeric(raw) {
  const text = String(raw ?? '').trim();
  if (!numericPattern.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) && Math.abs(value) <= maximumMagnitude ? value : null;
}

function chooseColumn(columns, choices) {
  return choices.find(column => columns.includes(column)) ?? '';
}

export function prepareInference(table, settings) {
  const { group, value, unitId, first, second, method } = settings;
  if (method !== 'welch' && method !== 'anova') throw new Error('Select Welch’s t-test or one-way ANOVA.');
  const selected = method === 'welch' ? new Set([first, second]) : null;
  const selectedColumns = [group, value, unitId];
  if (selectedColumns.some(column => !table.columns.includes(column)) || new Set(selectedColumns).size !== 3) {
    throw new Error('Select distinct group, numeric outcome, and biological unit ID columns.');
  }
  if (selected && (!first || !second || selected.size !== 2)) throw new Error('Select two different groups for the contrast.');
  const groups = new Map();
  const excluded = [];
  const distinct = new Set();
  const measurements = new Map();
  for (const label of ['unit', 'units', 'metric', 'measurement', 'assay', 'endpoint']) {
    if (table.columns.includes(label) && !selectedColumns.includes(label)) measurements.set(label, new Set());
  }
  let outsideSelection = 0;
  for (const [index, row] of table.rows.entries()) {
    const name = row[group];
    if (selected && name && !selected.has(name)) {
      outsideSelection += 1;
      continue;
    }
    const id = row[unitId];
    if (name && id) {
      if (distinct.has(id)) throw new Error('A biological unit ID appears more than once. Prepare one independent value per unit before testing.');
      distinct.add(id);
    }
    const observed = numeric(row[value]);
    const reason = !name ? 'Missing group' : !id ? 'Missing biological unit ID' : observed === null ? 'Invalid numeric outcome' : '';
    if (reason) {
      excluded.push({ record: index + 1, reason });
      continue;
    }
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(observed);
    for (const [label, values] of measurements) values.add(row[label]);
  }
  if (groups.size > 50) throw new Error('Use a file with at most 50 groups in one test.');
  for (const [field, values] of measurements) {
    if (values.size > 1) throw new Error('Values in “' + field + '” differ within the selection. Prepare a file with a consistent measurement and unit.');
  }
  return {
    groups: selected ? [first, second].map(label => ({ label, values: groups.get(label) ?? [] }))
      : [...groups].map(([label, values]) => ({ label, values })),
    excluded, outsideSelection,
    labels: Object.fromEntries([...measurements].map(([label, values]) => [label, [...values][0] ?? ''])),
  };
}

function practiceTable(method) {
  if (method === 'bh') return normalizeTable([['hypothesis', 'p_value'], ['Response A', .01], ['Response B', .04], ['Response C', .03], ['Response D', .002]]);
  const rows = exampleRows.flatMap(([label, values], i) => values.map((value, j) => [label, 'S' + (i + 1) + '-' + (j + 1), value, 'arbitrary units']));
  return normalizeTable([['condition', 'unit_id', 'response', 'unit'], ...rows]);
}

function shownNumber(value) {
  return value === Infinity ? '∞' : value && Math.abs(value) < 0.0001 ? value.toExponential(4) : numberFormat.format(value);
}

function publicNumbers(object) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, value === Infinity ? 'Infinity' : value]));
}

function figure(groups, filename, origin, outcome, e) {
  const displayed = groups.slice(0, 12);
  if (!displayed.length) return '';
  let low = Infinity;
  let high = -Infinity;
  for (const { values } of groups) {
    for (const value of values) {
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
  }
  const left = 135;
  const width = 455;
  const axisY = 32 + displayed.length * 34;
  const at = value => (left + (high === low ? 0.5 : (value - low) / (high - low)) * width).toFixed(2);
  const title = 'Observations by group · ' + filename;
  const description = origin + '. Outcome: ' + outcome + '. Shows the first twelve groups and samples up to forty-eight observations per group.';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 ' + (axisY + 35)
    + '" role="img" aria-label="' + e(title) + '" style="max-width:100%;color:var(--ink,#304c46)">'
    + '<title>' + e(title) + '</title><desc>' + e(description) + '</desc>'
    + '<g font-family="system-ui,sans-serif" font-size="11" fill="currentColor">'
    + displayed.map(({ label, values, mean }, i) => {
      const y = 30 + i * 34;
      const step = Math.max(1, Math.ceil(values.length / 48));
      const dots = values.filter((_, index) => index % step === 0).map((point, index) =>
        '<circle cx="' + at(point) + '" cy="' + (y + (index % 7) - 3) + '" r="2.7" fill="#408c70" fill-opacity=".75"/>');
      return '<text x="126" y="' + (y + 4) + '" text-anchor="end">' + e(label.length > 19 ? label.slice(0, 18) + '…' : label)
        + '</text><path d="M135 ' + y + 'H590" stroke="currentColor" opacity=".15"/>'
        + dots.join('') + '<path d="M' + at(mean) + ' ' + (y - 10) + 'v20" stroke="currentColor" stroke-width="1.6"/>';
    }).join('')
    + '<path d="M135 ' + axisY + 'H590" stroke="currentColor" opacity=".55"/>'
    + '<text x="135" y="' + (axisY + 16) + '">' + e(shownNumber(low)) + '</text><text x="590" y="' + (axisY + 16)
    + '" text-anchor="end">' + e(shownNumber(high)) + '</text></g></svg>';
}

export function createInferenceLab({ escapeHtml: e, download, announce }) {
  let dataset = null;
  let settings = { method: 'welch', confidence: 0.95, origin: 'unknown', group: '', unitId: '', value: '', first: '', second: '', pColumn: '', hypothesis: '' };
  let outcome = null;
  let acknowledged = false;
  let allowOmission = false;
  let busy = false;
  let status = '';
  let review = null;
  let request = 0;
  let mountedRoot;

  function analysisGroups() {
    return settings.group && dataset ? [...new Set(dataset.table.rows.map(row => row[settings.group]).filter(Boolean))].slice(0, 51) : [];
  }

  function configureGroups() {
    const groups = analysisGroups();
    settings.first = groups.includes(settings.first) ? settings.first : (groups.find(label => /^control$/i.test(label)) ?? groups[0] ?? '');
    settings.second = settings.second !== settings.first && groups.includes(settings.second) ? settings.second : (groups.find(label => label !== settings.first) ?? '');
  }

  function setDataset(table, file = null) {
    const synthetic = table.rows.filter(row => /^(synthetic|simulated|simulation|practice)\b/i.test(row.origin ?? '')).length;
    if (synthetic > 0 && synthetic !== table.rows.length) throw new Error('Keep synthetic and imported research data in separate files.');
    const fixedOrigin = !file || synthetic > 0;
    dataset = { table, file, title: file?.name ?? 'Synthetic demonstration', fixedOrigin };
    settings = {
      ...settings, origin: fixedOrigin ? 'synthetic' : 'unknown', first: '', second: '',
      group: chooseColumn(table.columns, ['condition', 'group', 'cohort', 'treatment']),
      unitId: chooseColumn(table.columns, ['unit_id', 'biological_unit', 'sample_id', 'specimen_id', 'subject_id']),
      value: chooseColumn(table.columns, ['response', 'value', 'measurement']),
      pColumn: chooseColumn(table.columns, ['p_value', 'pvalue', 'p']),
      hypothesis: chooseColumn(table.columns, ['hypothesis', 'test_id', 'test', 'label']),
    };
    configureGroups();
  }

  function field(name, title, items, disabled = false) {
    const options = items.map(([value, label]) => '<option value="' + e(value) + '"'
      + (String(settings[name]) === String(value) ? ' selected' : '') + '>' + e(label) + '</option>');
    return '<label class="lab-field"><span>' + title + '</span><select data-inference="' + name + '"'
      + (disabled ? ' disabled' : '') + '>' + options.join('') + '</select></label>';
  }

  function columnField(name, label, placeholder = 'Choose a column') {
    return field(name, label, [['', placeholder], ...dataset.table.columns.map(key => [key, key])]);
  }

  function settingsHtml() {
    if (!dataset) return '';
    const origin = field('origin', 'Data provenance', Object.entries(origins), dataset.fixedOrigin);
    const ack = '<label class="lab-field"><span><input type="checkbox" data-inference="acknowledged"'
      + (acknowledged ? ' checked' : '') + '> '
      + (settings.method === 'bh' ? 'This file contains an entire prespecified family of p-values.'
        : 'Each included row represents a distinct, independent biological unit. I have checked the method assumptions.')
      + '</span></label>';
    if (settings.method === 'bh') return origin + columnField('pColumn', 'P-value column')
      + columnField('hypothesis', 'Hypothesis label', 'Use normalized record numbers') + ack;
    const groups = analysisGroups().map(label => [label, label]);
    return origin + columnField('group', 'Group column') + columnField('value', 'Numeric outcome')
      + columnField('unitId', 'Unique biological unit ID')
      + (settings.method === 'welch' ? field('first', 'First group', groups) + field('second', 'Second group', groups)
        + field('confidence', 'Confidence level', [[0.90, '90%'], [0.95, '95%'], [0.99, '99%']]) : '')
      + ack + (review?.excluded.length ? '<label class="lab-field"><span><input type="checkbox" data-inference="allowOmission"'
        + (allowOmission ? ' checked' : '') + '> Proceed after omitting the listed invalid records.</span></label>' : '');
  }

  function htmlTable(headers, rows) {
    return '<div class="lab-table"><table><thead><tr>' + headers.map(column => '<th scope="col">' + e(column) + '</th>').join('')
      + '</tr></thead><tbody>' + rows.map(row => '<tr>' + row.map((cell, index) => index
        ? '<td>' + e(cell) + '</td>' : '<th scope="row">' + e(cell) + '</th>').join('') + '</tr>').join('') + '</tbody></table></div>';
  }

  function resultHtml() {
    const exclusionHtml = review?.excluded.length ? '<p>' + review.excluded.length
      + ' normalized records have missing fields or invalid measurements. The report records all exclusions.</p>'
      + htmlTable(['Normalized record', 'Reason'], review.excluded.slice(0, 20).map(record => [record.record, record.reason])) : '';
    if (!outcome) return '<article class="lab-card"><h2>Data review</h2>'
      + (dataset ? '<p class="lab-provenance">' + e(origins[settings.origin]) + ' · ' + e(dataset.title) + ' · ' + dataset.table.rows.length
        + ' imported or synthetic records</p>' + exclusionHtml : '<p>Import a dataset or load a synthetic example to begin.</p>')
      + (dataset ? htmlTable(dataset.table.columns.slice(0, 8), dataset.table.rows.slice(0, 8)
        .map(row => dataset.table.columns.slice(0, 8).map(column => row[column]))) + '<small>Preview shows up to eight normalized records and eight columns.</small>' : '') + '</article>';
    const { result, provenance, method, config } = outcome;
    const synthetic = provenance.origin === 'synthetic';
    let details;
    if (method === 'bh') {
      details = '<p>' + result.hypotheses.length + ' p-values adjusted as one family.</p>'
        + htmlTable(['Hypothesis', 'Raw p', 'BH adjusted p'], result.hypotheses.slice(0, 100).map(row =>
          [row.label, shownNumber(row.pValue), shownNumber(row.adjustedP)]))
        + (result.hypotheses.length > 100 ? '<p>Showing the first 100 hypotheses. The report and CSV include the full family.</p>' : '');
    } else {
      const p = result.pValue === 0 ? '≈ 0 (below numerical range)' : shownNumber(result.pValue);
      details = method === 'welch'
        ? '<p>Mean difference (' + e(config.first) + ' minus ' + e(config.second) + ') <strong>' + e(shownNumber(result.estimate))
          + '</strong>. ' + (config.confidence * 100) + '% confidence interval [' + result.interval.map(shownNumber).map(e).join(', ') + '].</p>'
          + '<p>t(' + e(shownNumber(result.degrees)) + ') = ' + e(shownNumber(result.statistic)) + ', two-sided p = ' + e(p) + '.</p>'
        : '<p>F(' + result.numeratorDegrees + ', ' + result.denominatorDegrees + ') = ' + e(shownNumber(result.statistic)) + ', p = ' + e(p)
          + ', η² = ' + e(shownNumber(result.etaSquared)) + '.</p><p>The omnibus test does not identify which groups differ.</p>';
      details += htmlTable(['Group', 'Independent units', 'Mean', 'Standard deviation'], result.groups.map(group =>
        [group.label, group.n, shownNumber(group.mean), shownNumber(group.sd)]));
      details += '<div class="analysis-plot">' + outcome.plot
        + '<small>Dots show up to 48 sampled measurements per group and the first 12 groups. The vertical line marks the group mean.</small></div>';
    }
    return '<article class="lab-card"><h2>' + methods[method].title + '</h2><p class="lab-provenance">'
      + e(origins[provenance.origin]) + ' · ' + e(provenance.dataset) + '</p>'
      + (synthetic ? '<p>Practice calculations from synthetic data. These results carry no empirical evidence.</p>' : '')
      + details + exclusionHtml + (provenance.otherGroupCount ? '<p>' + provenance.otherGroupCount + ' records belonged to unselected groups.</p>' : '')
      + '<div class="lab-controls"><button type="button" data-inference-action="report">Export JSON report</button>'
      + '<button type="button" data-inference-action="csv">Export results CSV</button>'
      + (outcome.plot ? '<button type="button" data-inference-action="figure">Export SVG figure</button>' : '') + '</div></article>';
  }

  function render() {
    const spec = methods[settings.method];
    return '<section class="lab-section"><h1>Statistical tests</h1><p>Calculate results locally from independent biological observations or a defined family of p-values.</p>'
      + '<div class="lab-grid lab-grid--analysis"><article class="lab-card"><h2>Test setup</h2>'
      + field('method', 'Statistical method', Object.entries(methods).map(([key, entry]) => [key, entry.title]))
      + '<p>' + spec.summary + ' <a href="' + spec.source + '" target="_blank" rel="noopener noreferrer">' + spec.citation + ' ↗</a></p>'
      + '<label class="lab-field"><span>Original CSV, TSV, or Excel workbook</span><input type="file" accept=".csv,.tsv,.xlsx" data-inference="file"' + (busy ? ' disabled' : '') + '></label>'
      + '<p><small>Excel reads the first visible sheet. ' + (settings.method === 'bh'
        ? 'Use a p_value column and an optional hypothesis label.'
        : 'Suggested headers are unit_id, condition, and response. Use one row per independent unit.') + '</small></p>'
      + '<div class="lab-controls"><button type="button" data-inference-action="sample"' + (busy ? ' disabled' : '') + '>Load synthetic example</button>'
      + (dataset?.file ? '<button type="button" data-inference-action="original">Download original</button>' : '') + '</div>'
      + settingsHtml() + '<div class="lab-controls"><button type="button" data-inference-action="run"'
      + (busy || !dataset ? ' disabled' : '') + '>Calculate</button></div><p class="lab-status" role="status">' + e(status) + '</p></article>'
      + resultHtml() + '</div></section>';
  }

  function calculateResult() {
    outcome = null;
    if (!dataset) throw new Error('Import data or load a synthetic example.');
    if (settings.origin === 'unknown') throw new Error('Declare whether your input is research data or synthetic practice data.');
    if (!acknowledged) throw new Error('Confirm the design assumptions before calculating.');
    const { method } = settings;
    let result;
    let plot = '';
    if (method === 'bh') {
      if (!dataset.table.columns.includes(settings.pColumn)) throw new Error('Select the p-value column.');
      const records = dataset.table.rows.map((row, i) => ({ label: row[settings.hypothesis] || String(i + 1), pValue: numeric(row[settings.pColumn]) }));
      const adjusted = benjaminiHochberg(records.map(row => row.pValue));
      result = { hypotheses: records.map((row, i) => ({ ...row, adjustedP: adjusted[i] })) };
    } else {
      if (review === null) review = prepareInference(dataset.table, settings);
      if (review.excluded.length && !allowOmission) throw new Error('Review the invalid records, then choose whether to omit them.');
      const values = review.groups.map(group => group.values);
      const statistics = method === 'welch' ? welchTTest(values[0], values[1], settings.confidence) : oneWayAnova(values);
      result = { ...publicNumbers(statistics), groups: statistics.groups.map((group, i) => ({ ...group, label: review.groups[i].label })) };
      plot = figure(review.groups.map((group, i) => ({ ...group, mean: result.groups[i].mean })), dataset.title, origins[settings.origin], settings.value, e);
    }
    outcome = {
      schema: 'flylab-inference-v1',
      method, methodReference: methods[method].source, assumptions: methods[method].summary,
      config: { ...settings, acknowledged, allowOmission },
      provenance: {
        origin: settings.origin, dataset: dataset.title, fileSize: dataset.file?.size ?? null,
        fileLastModified: dataset.file ? new Date(dataset.file.lastModified).toISOString() : null,
        sheetSelection: dataset.file && /\.xlsx$/i.test(dataset.file.name) ? 'first visible sheet' : null,
        sourceRecordCount: dataset.table.rows.length, otherGroupCount: method === 'bh' ? 0 : review.outsideSelection,
        excluded: method === 'bh' ? [] : review.excluded, labels: method === 'bh' ? null : review.labels,
        calculatedAt: new Date().toISOString(),
      },
      result, plot,
    };
  }

  function csvReport() {
    const { method, provenance, config, result } = outcome;
    const origin = origins[provenance.origin];
    if (method === 'bh') return tableCsv([['Hypothesis', 'Raw p', 'BH adjusted p', 'Provenance', 'Dataset'],
      ...result.hypotheses.map(row => [row.label, row.pValue, row.adjustedP, origin, provenance.dataset])]);
    const names = method === 'welch'
      ? ['Statistic t', 'Degrees of freedom', 'Two-sided p', 'Mean difference', 'Confidence level', 'Lower CI', 'Upper CI', 'First group', 'Second group']
      : ['Statistic F', 'Numerator degrees of freedom', 'Denominator degrees of freedom', 'p', 'Eta squared'];
    const stats = method === 'welch'
      ? [result.statistic, result.degrees, result.pValue, result.estimate, config.confidence, ...result.interval, config.first, config.second]
      : [result.statistic, result.numeratorDegrees, result.denominatorDegrees, result.pValue, result.etaSquared];
    return tableCsv([[...names, 'Provenance', 'Dataset'], [...stats, origin, provenance.dataset]]);
  }

  function redraw(focus) {
    if (!mountedRoot) return;
    mountedRoot.innerHTML = render();
    if (focus) mountedRoot.querySelector('[data-inference="' + focus + '"]')?.focus();
    if (status) announce(status);
  }

  function bind(root) {
    mountedRoot = root;
    root.addEventListener('change', async event => {
      if (root !== mountedRoot) return;
      const input = event.target;
      const key = input.dataset.inference;
      if (!key) return;
      if (key !== 'file') {
        outcome = null;
        status = '';
        if (key === 'acknowledged') acknowledged = input.checked;
        else if (key === 'allowOmission') allowOmission = input.checked;
        else if (Object.hasOwn(settings, key)) {
          settings[key] = key === 'confidence' ? Number(input.value) : input.value;
          review = null;
          allowOmission = false;
          acknowledged = false;
          if (key === 'group') configureGroups();
        }
        redraw(key);
        return;
      }
      if (!input.files?.length) return;
      const file = input.files[0];
      const id = ++request;
      busy = true;
      status = 'Reading ' + file.name + '…';
      redraw();
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error('Choose a file below 10 MiB.');
        const grid = /\.xlsx$/i.test(file.name) ? await readWorkbook(await file.arrayBuffer()) : readDelimited(await file.text());
        if (id !== request) return;
        setDataset(normalizeTable(grid), file);
        outcome = review = null;
        acknowledged = allowOmission = false;
        status = file.name + ' loaded. The source file was kept intact.';
      } catch (error) {
        if (id === request) status = error.message;
      } finally {
        if (id === request) {
          busy = false;
          redraw('file');
        }
      }
    });
    root.addEventListener('click', event => {
      if (root !== mountedRoot) return;
      const action = event.target.closest('[data-inference-action]')?.dataset.inferenceAction;
      if (!action) return;
      if (action === 'sample') {
        setDataset(practiceTable(settings.method));
        outcome = review = null;
        acknowledged = allowOmission = false;
        status = 'Synthetic example loaded. Confirm the practice design to calculate.';
        redraw();
      } else if (action === 'run') {
        try {
          calculateResult();
          status = 'Calculation complete.';
        } catch (error) {
          status = error.message;
        }
        redraw();
      } else if (action === 'original' && dataset?.file) {
        download(dataset.file.name, dataset.file, dataset.file.type || 'application/octet-stream');
      } else if (action === 'report' && outcome) {
        const { plot, ...report } = outcome;
        download('FlyLab_' + outcome.method + '_report.json', JSON.stringify(report, null, 2) + '\n', 'application/json');
      } else if (action === 'csv' && outcome) {
        download('FlyLab_' + outcome.method + '_results.csv', csvReport(), 'text/csv;charset=utf-8');
      } else if (action === 'figure' && outcome?.plot) {
        download('FlyLab_' + outcome.method + '_observations.svg', outcome.plot, 'image/svg+xml');
      }
    });
  }
  return { render, bind, unmount() { mountedRoot = null; } };
}
