import { analyses, examples, readDelimited, normalizeTable, tableCsv, inferAnalysis, measureNames, cohortNames, calculate } from './analysis-core.js';
import { readWorkbook, makeWorkbook, xlsxMime } from './workbook.js';

const format = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 5 });
const colors = ['#2f705c', '#ab653b', '#496aa0', '#925b90', '#796937', '#47878d'];
const number = value => value == null ? '—' : format.format(value);

export function createAnalysisLab({ escapeHtml: e, download, announce }) {
  let current = 0, type = 'summary', measure = '', reference = '', status = '', busy = false, request = 0;
  let files = [];

  function configure() {
    const table = files[current]?.table;
    measure = table ? measureNames(table, type)[0] ?? '' : '';
    const cohorts = table ? cohortNames(table) : [];
    reference = cohorts.find(name => /^(control|reference|baseline)$/i.test(name)) ?? cohorts[0] ?? '';
  }

  function add({ table, title, origin, kind }) {
    files = [...files, { table, title, origin, kind }].slice(-8);
    current = files.length - 1;
    type = kind && Object.hasOwn(analyses, kind) ? kind : inferAnalysis(table);
    configure();
  }

  function acceptSynthetic({ title, csv, kind }) {
    add({ table: normalizeTable(readDelimited(csv)), title, origin: 'Synthetic simulation', kind });
    status = 'Synthetic dataset added to Analysis.';
  }

  function select(name, label, choices, chosen) {
    return '<label class="lab-field"><span>' + label + '</span><select data-analysis="' + name + '">' + choices
      .map(([value, text]) => '<option value="' + e(value) + '"' + (String(value) === String(chosen) ? ' selected' : '') + '>' + e(text) + '</option>').join('') + '</select></label>';
  }
  function methodSelect() { return select('type', 'Analysis', Object.entries(analyses).map(([key, spec]) => [key, spec.title]), type); }

  function linesChart(curves) {
    let max = 0;
    for (const curve of curves) for (const point of curve.points) max = Math.max(max, point[0]);
    const x = t => 51 + (max ? t / max : 0) * 529;
    const y = p => 175 - p * 151;
    const ticks = [0, .25, .5, .75, 1];
    return '<div class="analysis-plot"><svg viewBox="0 0 612 214" role="img" aria-label="Kaplan–Meier step curve">'
      + ticks.map(t => '<path d="M51 ' + y(t) + 'H580" stroke="#dde7e2"/><text x="44" y="' + (y(t) + 4) + '" text-anchor="end">' + number(t) + '</text>').join('')
      + '<path d="M51 20V175H580" fill="none" stroke="#8fa397"/>'
      + [0, .25, .5, .75, 1].map(p => '<text x="' + x(max * p) + '" y="193" text-anchor="middle">' + number(max * p) + '</text>').join('')
      + '<text x="320" y="210" text-anchor="middle">Observed time</text>'
      + curves.map((curve, i) => '<path d="' + curve.points.map(([t, p], j) => (j ? 'L' : 'M') + x(t) + ' ' + y(p)).join(' ') + '" fill="none" stroke="' + colors[i % colors.length] + '" stroke-width="2"/>'
        + curve.marks.map(([t, p]) => '<path d="M' + x(t) + ' ' + (y(p) - 4) + 'v8" stroke="' + colors[i % colors.length] + '" stroke-width="1.8"/>').join('')).join('')
      + '</svg><div class="analysis-legend">' + curves.map((curve, i) => '<span style="--legend:' + colors[i % colors.length] + '">' + e(curve.label) + '</span>').join('')
      + '</div><small>Vertical marks indicate right-censoring.</small></div>';
  }

  function meanChart(rows) {
    const shown = rows.slice(0, 18);
    let lo = 0, hi = 0;
    for (const row of shown) { lo = Math.min(lo, row[2]); hi = Math.max(hi, row[2]); }
    const span = hi - lo || 1;
    const zero = 100 * -lo / span;
    return '<div class="analysis-bars" aria-label="Means by condition">' + shown.map(([label, , mean], i) => {
      const value = 100 * (mean - lo) / span;
      return '<div class="analysis-bar-row"><span title="' + e(label) + '">' + e(label) + '</span><i style="--zero:' + zero + '%">'
        + '<b style="--bar-start:' + Math.min(zero, value) + '%;--bar-size:' + Math.abs(zero - value) + '%;--bar-color:' + colors[i % colors.length] + '"></b></i><strong>' + number(mean) + '</strong></div>';
    }).join('') + '</div>';
  }

  function resultHTML(spec, item, result) {
    if (!item) return '<div class="lab-result"><p>Load an example or import data to calculate a result.</p></div>';
    if (!result.results.length) return '<div class="lab-result"><p>' + e(result.warning ?? 'There are no usable values for this analysis. Check the required columns and units.') + '</p></div>';
    return '<article class="lab-card"><h2>' + e(result.measure) + '</h2>'
      + '<p class="lab-provenance">' + e(item.origin) + ' · ' + e(item.title) + ' · ' + item.table.rows.length + ' source rows</p>'
      + (result.curves ? linesChart(result.curves) : meanChart(result.results))
      + '<p>' + e(spec.note) + (spec.source ? ' <a href="' + e(spec.source) + '" target="_blank" rel="noopener noreferrer">Primary method ↗</a>' : '') + '</p>'
      + (result.rejected ? '<p>' + result.rejected + ' rows were omitted because required values were missing or invalid.</p>' : '')
      + (type === 'preference' ? '<p>No-choice observations in the selected rows: ' + result.noChoice + '.</p>' : '')
      + '<div class="lab-table"><table><thead><tr>' + result.headings.map(label => '<th scope="col">' + e(label) + '</th>').join('')
      + '</tr></thead><tbody>' + result.results.slice(0, 100).map(row => '<tr>' + row.map((value, index) => index === 0 ? '<th scope="row">' + e(value) + '</th>' : '<td>' + number(value) + '</td>').join('') + '</tr>').join('')
      + '</tbody></table></div>' + (result.results.length > 100 ? '<p>Showing the first 100 result rows. The exports include all rows.</p>' : '')
      + '<div class="lab-controls"><button type="button" data-analysis-action="csv">Export results CSV</button><button type="button" data-analysis-action="xlsx">Export Excel workbook</button></div></article>';
  }

  function render() {
    const item = files[current];
    const spec = analyses[type];
    const measures = item ? measureNames(item.table, type) : [];
    const result = item ? calculate(item.table, type, measure, reference) : null;
    return '<section class="lab-section"><h1>Data analysis</h1><p>Analyze a dataset locally. Synthetic results and imported observations have separate provenance labels.</p>'
      + '<div class="lab-grid lab-grid--analysis"><div class="lab-card"><h2>Dataset and method</h2>'
      + (files.length ? select('dataset', 'Dataset', files.map((file, i) => [i, file.title + ' · ' + file.origin]), current) : '')
      + methodSelect()
      + (measures.length > 1 ? select('measure', 'Metric or unit', measures.map(entry => [entry, entry]), measure) : '')
      + (item && type === 'gene' ? select('reference', 'Reference condition', cohortNames(item.table).map(group => [group, group]), reference) : '')
      + '<p class="analysis-columns">Columns for this method<br><code>' + e(spec.columns) + '</code></p>'
      + '<label class="lab-field"><span>Import a CSV, TSV, or Excel workbook</span><input type="file" accept=".csv,.tsv,.xlsx" data-analysis="file"' + (busy ? ' disabled' : '') + '></label>'
      + '<p class="lab-muted">Excel import reads the first visible sheet. Use one header row and one dataset per file.</p>'
      + '<div class="lab-controls"><button type="button" data-analysis-action="sample">Load synthetic example</button>'
      + (item ? '<button type="button" data-analysis-action="remove">Remove dataset</button>' : '') + '</div><p class="lab-status" role="status">' + e(status) + '</p></div>'
      + resultHTML(spec, item, result) + '</div></section>';
  }

  function summarizeForExport(item) {
    const result = calculate(item.table, type, measure, reference);
    return [[...result.headings, 'Data origin'], ...result.results.map(row => [...row, item.origin])];
  }

  function bind(root) {
    const redraw = focus => {
      root.innerHTML = render();
      if (focus) root.querySelector('[data-analysis="' + focus + '"]')?.focus();
    };
    root.addEventListener('change', async event => {
      const input = event.target;
      const name = input.dataset.analysis;
      if (name === 'type') { type = input.value; configure(); redraw(name); }
      if (name === 'dataset') { current = Number(input.value); type = files[current].kind ?? inferAnalysis(files[current].table); configure(); redraw(name); }
      if (name === 'measure') { measure = input.value; redraw(name); }
      if (name === 'reference') { reference = input.value; redraw(name); }
      if (name !== 'file' || !input.files?.length) return;
      const id = ++request;
      const file = input.files[0];
      busy = true;
      status = 'Reading ' + file.name + '…';
      redraw();
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error('Choose a file below 10 MiB.');
        const grid = /\.xlsx$/i.test(file.name) ? await readWorkbook(await file.arrayBuffer()) : readDelimited(await file.text());
        const table = normalizeTable(grid);
        if (id !== request) return;
        const labels = table.rows.map(row => row.origin?.toLowerCase() ?? '');
        const synthetic = labels.filter(label => label.startsWith('synthetic')).length;
        if (synthetic > 0 && synthetic !== labels.length) throw new Error('Keep synthetic and imported research rows in separate files.');
        add({ table, title: file.name, origin: synthetic ? 'Synthetic · imported file' : 'Imported observations' });
        status = file.name + ' loaded.';
      } catch (error) {
        if (id === request) status = error.message;
      } finally {
        if (id === request) { busy = false; redraw('file'); announce(status); }
      }
    });
    root.addEventListener('click', event => {
      const action = event.target.closest('[data-analysis-action]')?.dataset.analysisAction;
      if (!action) return;
      const item = files[current];
      if (action === 'sample') {
        add({ table: normalizeTable(readDelimited(examples[type])), title: analyses[type].title + ' example', origin: 'Synthetic example', kind: type });
        status = 'Synthetic example loaded.';
        redraw(); announce(status);
      } else if (action === 'remove' && item) {
        files.splice(current, 1);
        current = Math.max(0, Math.min(current, files.length - 1));
        const selected = files[current];
        if (selected) type = selected.kind ?? inferAnalysis(selected.table);
        configure();
        status = 'Dataset removed from this workspace.';
        redraw(); announce(status);
      } else if (action === 'csv' && item) {
        download('FlyLab_Analysis_' + type + '.csv', tableCsv(summarizeForExport(item)), 'text/csv;charset=utf-8');
      } else if (action === 'xlsx' && item) {
        const grid = [item.table.columns, ...item.table.rows.map(row => item.table.columns.map(col => row[col]))];
        const book = makeWorkbook([{ name: 'Results', grid: summarizeForExport(item) }, { name: 'Observations', grid }, {
          name: 'Provenance', grid: [['Property', 'Value'], ['Origin', item.origin], ['Dataset', item.title], ['Analysis', analyses[type].title], ['Measure', measure], ['Reference', reference]],
        }]);
        download('FlyLab_Analysis_' + type + '.xlsx', book, xlsxMime);
      }
    });
  }

  return { render, bind, acceptSynthetic };
}

