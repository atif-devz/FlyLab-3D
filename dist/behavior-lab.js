import { average, clamp, csvRows, fmt, intValue, lineChart, rng, sourceLink, symmetricNoise } from './phase4-data.js';

const assay = (label, stage, model, kind, metric, unit, source, description, controls, extra = {}) =>
  ({ label, stage, model, kind, metric, unit, source, description, controls, ...extra });

export const behaviorAssays = {
  'binary-choice': assay('Binary food choice', 'Adult', 'choice', 'preference', 'Preference index', 'index', 'choice',
    'Score test food, reference food and no choice in each cohort.', 'Compare with a matched arena and swap the test position between cohorts.'),
  per: assay('Proboscis extension response', 'Adult', 'binary', 'summary', 'Response fraction', 'fraction', 'per',
    'Score whether each simulated fly extends its proboscis during one observation.', 'Use a blank-control cohort and record the total observed. Repeated observations of one fly do not increase the number of independent flies.', { baseline: .17 }),
  flypad: assay('flyPAD feeding events', 'Adult', 'events', 'feeding', 'Sip count', 'events', 'flypad',
    'Compare counts and see an event timeline from one simulated individual per condition.', 'Keep the observation window matched. Counts summarize interactions and are not converted to ingested volume.', { baseline: 14 }),
  cafe: assay('CAFE feeding volume', 'Adult', 'volume', 'feeding', 'Intake proxy', 'volume a.u.', 'cafe',
    'Compare a virtual feeder reading with a matched evaporation blank.', 'Subtract blank loss from the feeder reading to estimate intake in this model.'),
  'adult-locomotion': assay('Adult locomotor tracking', 'Adult', 'motion', 'summary', 'Path length', 'distance a.u.', 'motion',
    'Follow two representative tracks and compare cumulative traveled distance.', 'Keep the observation window and arena dimensions matched.', { baseline: 2.4 }),
  'negative-geotaxis': assay('Negative geotaxis', 'Adult', 'binary', 'summary', 'Climbing success fraction', 'fraction', 'motion',
    'Score the fraction of flies above a virtual height at a fixed observation point.', 'Use the same observation window and success rule across cohorts.', { baseline: .61 }),
  courtship: assay('Courtship scoring', 'Adult', 'fraction', 'summary', 'Courtship fraction', 'fraction', 'motion',
    'Score the fraction of a virtual observation window spent courting.', 'Compare matched social contexts and define the behavior classes before scoring.', { baseline: .46 }),
  sleep: assay('Sleep and activity scoring', 'Adult', 'fraction', 'summary', 'Inactive fraction', 'fraction', 'sleep',
    'Compare the fraction of a virtual window labeled inactive.', 'Use aligned observation windows and examine activity alongside immobility. This exercise scores inactivity rather than sleep stages.', { baseline: .51 }),
  'larval-crawling': assay('Larval crawling', 'Larva', 'motion', 'summary', 'Crawling path length', 'distance a.u.', 'motion',
    'Compare cumulative path lengths for stage-matched virtual larvae.', 'Hold life stage and arena dimensions constant between groups.', { baseline: 1.55 }),
  'larval-choice': assay('Larval taste preference', 'Larva', 'choice', 'preference', 'Preference index', 'index', 'choiceLarva',
    'Count larvae on two sides while retaining an unscored middle group as no choice.', 'Use a matched arena and keep life stage consistent.'),
  'olfactory-choice': assay('Olfactory choice', 'Adult', 'choice', 'preference', 'Preference index', 'index', 'olfaction',
    'Compare the distribution of virtual flies in two odor arms.', 'Balance the arm used for the test. Keep air movement and handling conceptually matched between arms.'),
  learning: assay('Associative learning and recall', 'Adult', 'choice', 'preference', 'Choice index after training', 'index', 'olfaction',
    'Compare virtual recall with an unpaired control group.', 'Compare paired and unpaired exposure. A baseline choice bias can mimic a learning effect.'),
  oviposition: assay('Oviposition site preference', 'Adult', 'choice', 'preference', 'Oviposition preference index', 'index', 'oviposition',
    'Compare synthetic egg counts at two virtual substrates in each arena.', 'Balance substrate positions and compare with matched substrates. Arena is the unit of replication here.', { eggChoice: true }),
  'egg-laying': assay('Egg-laying counts', 'Adult', 'count', 'summary', 'Egg count', 'eggs', 'oviposition',
    'Compare egg counts in a fixed virtual window.', 'Keep the scored interval and reproductive context comparable.', { baseline: 17 }),
  survival: assay('Survival and censoring', 'Adult', 'survival', 'survival', 'Observed follow-up', 'virtual days', 'survival',
    'Compare synthetic event and censor times using Kaplan–Meier estimates.', 'Track withdrawals separately from deaths and match the follow-up window across conditions.', { horizon: 72, baseline: 46 }),
  development: assay('Pupariation and eclosion', 'Larva to adult', 'development', 'development', 'Time to stage', 'virtual days', 'development',
    'Record two stage milestones per individual and switch the plotted endpoint.', 'Use the same starting-stage definition across groups. Pupariation and eclosion are distinct endpoints.'),
  stress: assay('Stress-response scenario', 'Adult', 'survival', 'survival', 'Observed follow-up', 'virtual days', 'survival',
    'Measure a synthetic response to an abstract stress condition through event and censor times.', 'Compare with a matched reference condition. The virtual stressor has no identity or preparation.', { horizon: 28, baseline: 15 }),
};

const columns = ['origin', 'assay', 'seed', 'condition', 'replicate', 'subject', 'time', 'value', 'unit', 'metric', 'event',
  'test_count', 'reference_count', 'no_choice', 'stage', 'test_side', 'raw_volume', 'blank_volume'];
const defaults = { assay: 'binary-choice', seed: 118, replicates: 4, samples: 16, contrast: 50, balanced: true, noChoice: 15,
  corrected: true, censor: 12 };
const conditions = ['Control', 'Test'];
const colors = ['#3b6f5a', '#895c8e'];

function countFromRate(random, rate) {
  let product = 1;
  let count = -1;
  const limit = Math.exp(-rate);
  do {
    product *= random();
    count++;
  } while (product > limit);
  return count;
}

function walk(random, stride) {
  let x = 0;
  let y = 0;
  let angle = random() * Math.PI * 2;
  let distance = 0;
  const points = [[0, 0]];
  for (let i = 1; i <= 42; i++) {
    angle += symmetricNoise(random) * .58;
    const step = stride * (.65 + .7 * random());
    const nextX = clamp(x + Math.cos(angle) * step, -22, 22);
    const nextY = clamp(y + Math.sin(angle) * step, -17, 17);
    if (Math.abs(nextX) === 22 || Math.abs(nextY) === 17) angle += Math.PI * .64;
    distance += Math.hypot(nextX - x, nextY - y);
    x = nextX;
    y = nextY;
    points.push([x, y]);
  }
  return { points, distance };
}

export function survivalCurve(records, horizon) {
  let risk = records.length;
  let estimate = 1;
  const points = [[0, 1]];
  const counts = new Map();
  for (const { time, event } of records) {
    const tally = counts.get(time) ?? { events: 0, total: 0 };
    tally.events += event;
    tally.total += 1;
    counts.set(time, tally);
  }
  let median = null;
  for (const time of [...counts.keys()].sort((a, b) => a - b)) {
    const { events, total } = counts.get(time);
    if (events && risk > 0) {
      points.push([time, estimate]);
      estimate *= 1 - events / risk;
      points.push([time, estimate]);
      if (median === null && estimate <= .5) median = time;
    }
    risk -= total;
  }
  points.push([horizon, estimate]);
  return { points, median, estimate };
}

export function generateBehaviorRun(settings) {
  const method = behaviorAssays[settings.assay];
  const rows = [];
  const examples = [];
  const contrast = settings.contrast / 100;
  for (const [cohort, condition] of conditions.entries()) {
    for (let replicate = 1; replicate <= settings.replicates; replicate++) {
      const random = rng(settings.seed + replicate * 997 + cohort * 5791 + settings.assay.length * 73);
      const effect = cohort ? contrast : 0;
      const batch = symmetricNoise(random);
      const base = { origin: 'synthetic', assay: settings.assay, seed: settings.seed, condition, replicate, unit: method.unit,
        metric: method.metric };
      if (method.model === 'choice') {
        const side = settings.balanced && replicate % 2 === 0 ? 'right' : 'left';
        const probability = clamp(.5 + .24 * effect + (side === 'left' ? .075 : -.075) + .047 * batch, .04, .96);
        const n = method.eggChoice ? countFromRate(random, settings.samples) : settings.samples;
        let noChoice = 0;
        let tests = 0;
        let references = 0;
        for (let i = 0; i < n; i++) {
          if (!method.eggChoice && random() < settings.noChoice / 100) noChoice++;
          else if (random() < probability) tests++;
          else references++;
        }
        const scored = tests + references;
        rows.push({ ...base, test_side: side, test_count: tests, reference_count: references,
          no_choice: noChoice, value: scored ? (tests - references) / scored : null });
        continue;
      }

      const blank = method.model === 'volume' ? .20 + random() * .17 + (cohort ? .08 : 0) : null;
      for (let i = 1; i <= settings.samples; i++) {
        const subject = condition.toLowerCase() + '-' + replicate + '-' + i;
        const row = { ...base, subject };
        if (method.model === 'binary') {
          const probability = clamp(method.baseline + .27 * effect + .047 * batch, .02, .98);
          rows.push({ ...row, value: Number(random() < probability) });
        } else if (method.model === 'fraction') {
          rows.push({ ...row, value: clamp(method.baseline + .24 * effect + .08 * batch + .11 * symmetricNoise(random), 0, 1) });
        } else if (method.model === 'count' || method.model === 'events') {
          const eventCount = countFromRate(random, Math.max(.2, method.baseline * (1 + .40 * effect + .14 * batch)));
          rows.push({ ...row, value: eventCount });
          if (method.model === 'events' && i === 1 && replicate === 1) {
            const traceRandom = rng(settings.seed + cohort * 611 + 426);
            const times = Array.from({ length: eventCount }, () => .02 + traceRandom() * .96).sort((a, b) => a - b);
            examples.push({ condition, times });
          }
        } else if (method.model === 'volume') {
          const actual = Math.max(0, .74 + .37 * effect + .10 * batch + .19 * symmetricNoise(random));
          const raw = actual + blank;
          rows.push({ ...row, raw_volume: raw, blank_volume: blank, value: settings.corrected ? raw - blank : raw,
            metric: settings.corrected ? 'Blank-corrected intake' : 'Raw feeder change' });
        } else if (method.model === 'motion') {
          const stride = Math.max(.2, method.baseline * (1 + .37 * effect + .10 * batch + .13 * symmetricNoise(random)));
          const track = walk(random, stride);
          if (i === 1 && replicate === 1) examples.push({ condition, points: track.points });
          rows.push({ ...row, value: track.distance });
        } else if (method.model === 'survival') {
          const scale = method.baseline * (1 + .35 * effect + .10 * batch);
          const eventAt = scale * Math.sqrt(-Math.log(Math.max(1e-8, random())));
          const leaves = random() < settings.censor / 100;
          const censoredAt = leaves ? method.horizon * (.16 + .78 * random()) : method.horizon;
          const time = Math.round(10 * Math.min(eventAt, censoredAt, method.horizon)) / 10;
          rows.push({ ...row, time, value: time, event: Number(eventAt <= censoredAt && eventAt <= method.horizon) });
        } else {
          const pupa = Math.max(1, 4.7 + effect * .82 + .31 * batch + .58 * symmetricNoise(random));
          const adult = pupa + Math.max(1, 4.1 + effect * .52 + .45 * symmetricNoise(random));
          rows.push({ ...row, stage: 'pupariation', time: pupa, value: pupa });
          rows.push({ ...row, stage: 'eclosion', time: adult, value: adult });
        }
      }
    }
  }
  return { method, settings: { ...settings }, rows, examples };
}

function groupSummaries(run, endpoint) {
  const rows = run.method.model === 'development' ? run.rows.filter(row => row.stage === endpoint) : run.rows;
  return conditions.map((condition, index) => {
    const group = rows.filter(row => row.condition === condition);
    const reps = [];
    for (let rep = 1; rep <= run.settings.replicates; rep++) {
      const cohort = group.filter(row => row.replicate === rep);
      const values = cohort.map(row => row.value).filter(Number.isFinite);
      const value = average(values);
      reps.push({ rep, value, rows: cohort, valid: values.length });
    }
    const cohortValues = reps.map(row => row.value).filter(Number.isFinite);
    const mean = average(cohortValues);
    const sd = cohortValues.length > 1
      ? Math.sqrt(cohortValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (cohortValues.length - 1)) : NaN;
    return { condition, color: colors[index], group, reps, mean, sd };
  });
}

function survivalView(run, groups) {
  const curves = groups.map(group => survivalCurve(group.group, run.method.horizon));
  const plot = lineChart({
    series: curves.map((item, i) => ({ points: item.points, color: colors[i], dash: i === 1 })),
    xRange: [0, run.method.horizon], yRange: [0, 1], xLabel: 'Virtual days', yLabel: 'Estimated survival', name: 'Synthetic Kaplan–Meier survival curves',
  });
  const metrics = '<ul class="lab-grid">' + groups.map((group, i) => '<li><strong>' + group.condition + '</strong><br>'
    + group.group.filter(row => row.event).length + ' events · ' + group.group.filter(row => !row.event).length + ' censored<br>'
    + 'Median: ' + (curves[i].median === null ? 'Not reached' : fmt(curves[i].median) + ' virtual days') + '</li>').join('') + '</ul>';
  return plot + metrics + '<p>Each event lowers the estimate by the observed fraction among subjects still at risk. Censoring removes a subject from later risk sets.</p>';
}

function secondaryPlot(run) {
  if (run.method.model === 'motion') {
    return '<h3>Representative tracks</h3><p>First simulated individual in each condition. Track location and distance use illustrative units.</p>'
      + lineChart({ series: run.examples.map((sample, i) => ({ points: sample.points, color: colors[i], dash: i === 1 })),
        xRange: [-22, 22], yRange: [-17, 17], xLabel: 'Arena X (a.u.)', yLabel: 'Arena Y (a.u.)', name: 'Two example locomotion tracks' });
  }
  if (run.method.model === 'events') {
    const series = run.examples.map((sample, i) => {
      const y = i + 1;
      const points = sample.times.flatMap(time => [[time, y], [time, y + .28], [time, y]]);
      return { points: [[0, y], ...points, [1, y]], color: colors[i], dash: i === 1 };
    });
    return '<h3>Example feeding events</h3><p>Each mark shows an event for the first simulated individual in a condition. Time is shown as a fraction of the virtual window.</p>'
      + lineChart({ series, xRange: [0, 1], yRange: [.7, 2.5], xLabel: 'Fraction of window', yLabel: 'Control 1 · Test 2', name: 'Synthetic feeding event raster' });
  }
  return '';
}

export function createBehaviorLab({ escapeHtml, download, announce, publishSynthetic }) {
  const bound = new WeakSet();
  const esc = escapeHtml;
  let settings = { ...defaults };
  let run = null;
  let stage = 'eclosion';
  const option = (value, title, selected) => '<option value="' + esc(value) + '"' + (value === selected ? ' selected' : '') + '>' + esc(title) + '</option>';
  const field = (label, controls) => '<label class="lab-field"><span>' + esc(label) + '</span>' + controls + '</label>';
  const number = (id, min, max) => '<input type="number" data-behavior-setting="' + id + '" value="' + settings[id] + '" min="' + min + '" max="' + max + '" step="1" required>';
  const check = (id, label) => '<label class="lab-field"><input type="checkbox" data-behavior-setting="' + id + '" ' + (settings[id] ? 'checked' : '') + '><span>' + esc(label) + '</span></label>';

  function exportCsv() {
    return csvRows(columns, run.rows);
  }

  function cohortTable(groups, method, config) {
    const isChoice = method.model === 'choice';
    const rows = groups.flatMap(group => group.reps.map(record => {
      const counts = record.rows[0];
      return '<tr><td>' + group.condition + '</td><td>' + record.rep + '</td><td>' + fmt(record.value) + '</td>'
        + (isChoice ? '<td>' + counts.test_count + '</td><td>' + counts.reference_count + '</td><td>' + counts.no_choice + '</td><td>' + counts.test_side + '</td>'
          : '<td>' + record.valid + '</td>') + '</tr>';
    })).join('');
    return '<details><summary>Replicate results</summary><div style="overflow:auto"><table><thead><tr><th scope="col">Condition</th><th scope="col">Replicate</th><th scope="col">Score</th>'
      + (isChoice ? '<th scope="col">Test</th><th scope="col">Reference</th><th scope="col">No choice</th><th scope="col">Test side</th>' : '<th scope="col">Subjects</th>')
      + '</tr></thead><tbody>' + rows + '</tbody></table></div></details>'
      + (isChoice ? '<p>Each cohort index is (test − reference) ÷ (test + reference). No-choice counts are reported separately. '
        + (config.balanced ? 'The test position alternates between replicates.' : 'The test position stays on the same side, so side bias can alter the index.') + '</p>' : '');
  }

  function renderResult() {
    if (!run) return '<div class="lab-result"><p>Run the assay to generate replicate results.</p></div>';
    const { method, settings: config } = run;
    const groups = groupSummaries(run, stage);
    let display = '';
    if (method.model === 'survival') display = survivalView(run, groups);
    else {
      const allNumbers = groups.flatMap(item => item.reps.map(row => row.value)).filter(Number.isFinite);
      const minimum = method.model === 'choice' ? -1 : 0;
      const maximum = ['choice', 'binary', 'fraction'].includes(method.model) ? 1 : Math.max(.15, ...allNumbers) * 1.08;
      const axisLabel = method.model === 'development' ? 'Time to stage (virtual days)' :
        method.model === 'volume' && !config.corrected ? 'Raw change (volume a.u.)' : method.metric;
      display = (method.model === 'development' ? field('Plotted stage', '<select data-behavior-stage>'
        + option('pupariation', 'Pupariation', stage) + option('eclosion', 'Adult eclosion', stage) + '</select>') : '')
        + lineChart({ series: groups.map((group, i) => ({
          points: group.reps.filter(row => Number.isFinite(row.value)).map(row => [row.rep, row.value]), color: group.color, dash: i === 1,
        })), xRange: [1, config.replicates], yRange: [minimum, maximum], xLabel: 'Replicate', yLabel: axisLabel,
        name: 'Synthetic control and test replicate values' })
        + '<ul class="lab-grid">' + groups.map(group => '<li><strong>' + group.condition + '</strong><br>' + fmt(group.mean)
          + ' mean · ' + fmt(group.sd) + ' replicate SD</li>').join('') + '</ul>'
        + cohortTable(groups, method, config) + secondaryPlot(run);
    }
    return '<div class="lab-result"><h2>Synthetic results</h2><p>Control is solid green. Test is dashed purple. Seed ' + config.seed
      + ' · ' + config.replicates + ' replicates per condition. Values are generated for practice.</p>' + display
      + '<div class="lab-controls"><button type="button" data-behavior-action="csv">Download synthetic CSV</button>'
      + (publishSynthetic ? '<button type="button" data-behavior-action="analysis">Send synthetic data to Analysis</button>' : '') + '</div></div>';
  }

  function render() {
    const method = behaviorAssays[settings.assay];
    const applicable = method.model === 'choice' ? check('balanced', 'Alternate test side between replicates')
      + (method.eggChoice ? '' : field('Simulated no-choice chance (%)', number('noChoice', 0, 70))) :
      method.model === 'survival' ? field('Simulated early withdrawal chance (%)', number('censor', 0, 65)) :
      method.model === 'volume' ? check('corrected', 'Subtract matched evaporation blank') : '';
    return '<section class="lab-section" aria-labelledby="behavior-title"><header><h1 id="behavior-title">Behavior and physiology</h1><p>Set up a virtual assay with a matched control, generate independent replicates and compare outcomes.</p></header>'
      + '<form class="lab-card" data-behavior-form><h2>Assay setup</h2><div class="lab-controls">'
      + field('Assay', '<select data-behavior-setting="assay">' + Object.entries(behaviorAssays).map(([key, item]) => option(key, item.label + ' · ' + item.stage, settings.assay)).join('') + '</select>')
      + field('Replicates per condition', number('replicates', 2, 12))
      + field(method.eggChoice ? 'Mean synthetic eggs per arena' : 'Subjects per replicate', number('samples', 8, 60))
      + field('Test contrast (synthetic %)', number('contrast', -100, 100))
      + field('Random seed', number('seed', 1, 99999999)) + applicable + '</div>'
      + '<p>' + method.description + '</p><p><strong>Control design</strong> ' + method.controls + '</p>'
      + '<button type="submit">Run synthetic assay</button></form><div data-behavior-results>' + renderResult() + '</div>'
      + '<footer><p>' + sourceLink(method.source) + '</p></footer></section>';
  }

  function bind(root) {
    if (bound.has(root)) return;
    bound.add(root);
    function redraw(focusSelector) {
      root.innerHTML = render();
      if (focusSelector) root.querySelector(focusSelector)?.focus();
    }
    root.addEventListener('change', event => {
      const source = event.target;
      const field = source.dataset.behaviorSetting;
      if (field === 'assay' && Object.hasOwn(behaviorAssays, source.value)) {
        settings.assay = source.value;
        run = null;
        redraw('[data-behavior-setting="assay"]');
      } else if (source.hasAttribute('data-behavior-stage') && ['pupariation', 'eclosion'].includes(source.value)) {
        stage = source.value;
        redraw('[data-behavior-stage]');
      } else if (field && field !== 'assay') {
        settings[field] = source.type === 'checkbox' ? source.checked : intValue(source.value, settings[field], Number(source.min), Number(source.max));
        if (source.type !== 'checkbox') source.value = String(settings[field]);
        run = null;
        root.querySelector('[data-behavior-results]').innerHTML = renderResult();
      }
    });
    root.addEventListener('submit', event => {
      if (!event.target.hasAttribute('data-behavior-form')) return;
      event.preventDefault();
      run = generateBehaviorRun(settings);
      redraw('[data-behavior-action="csv"]');
      announce?.('Synthetic ' + run.method.label + ' results are ready.');
    });
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-behavior-action]');
      if (!button || !run) return;
      if (button.dataset.behaviorAction === 'csv') download('flylab-' + run.settings.assay + '-synthetic.csv', exportCsv(), 'text/csv');
      else if (button.dataset.behaviorAction === 'analysis') {
        publishSynthetic?.({ title: 'Synthetic ' + run.method.label, kind: run.method.kind, csv: exportCsv() });
      }
    });
  }

  return { render, bind };
}
