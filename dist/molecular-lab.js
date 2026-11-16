const tabs = [
  ['amplification', 'PCR amplification'],
  ['gel', 'Gel interpretation'],
  ['expression', 'Relative expression'],
  ['imaging', 'Image measurements'],
  ['concepts', 'Molecular concepts'],
];
const sources = [
  ['PCR and electrophoresis · NHGRI', 'https://www.genome.gov/genetics-glossary'],
  ['Comparative Cq analysis · Livak and Schmittgen', 'https://pubmed.ncbi.nlm.nih.gov/11846609/'],
  ['Region and mean intensity measurements · ImageJ', 'https://imagej.net/ij/docs/menus/analyze'],
  ['GAL4/UAS in Drosophila · Brand and Perrimon', 'https://pubmed.ncbi.nlm.nih.gov/8223268/'],
];
const phases = [
  'Starting copy pool',
  'Strand separation opens the model copies.',
  'Pairing indicates which copies are counted.',
  'Synthesis adds the new copies to the pool.',
];
const scenarios = [
  ['valid', 'Expected controls'],
  ['blank', 'Signal in blank control'],
  ['positive', 'Positive control has no signal'],
];
const gelLanes = [
  ['Size reference', [1100, 750, 500, 340, 200, 100]],
  ['Positive control', [340]],
  ['Sample A', [340]],
  ['Sample B', [500, 200]],
  ['Blank control', []],
];
const defaultRecords = [
  ['Control', '1', 24.0, 20.0], ['Control', '2', 24.2, 20.1], ['Control', '3', 23.9, 19.9],
  ['Sample', '1', 22.6, 20.0], ['Sample', '2', 22.5, 20.1], ['Sample', '3', 22.4, 19.9],
].map(([condition, replicate, target, reference]) => ({ condition, replicate, target, reference }));
const conceptualMethods = [
  ['Amplification', 'Increases the number of copies of a DNA region. A readout can report copy number or fluorescence.'],
  ['Reverse transcription', 'Creates a DNA representation of RNA. The resulting cDNA can be measured separately.'],
  ['Molecular cloning', 'Keeps copies of a DNA segment in a maintained library. A copy is distinct from a change to the original gene.'],
  ['Genome editing (including CRISPR)', 'Changes a DNA sequence. Establishing an edit requires evidence of sequence change.'],
  ['RNA interference', 'Reduces gene output through RNA-mediated silencing. The DNA sequence can stay the same.'],
  ['GAL4/UAS expression', 'A driver and a responder form a two-part system that controls an expression readout.'],
  ['Genetic rescue', 'A condition restores a lost phenotype and supports a causal interpretation when compared with controls.'],
];
const questions = [
  { prompt: 'A fictional sample starts as RNA and is represented as DNA for analysis. Which concept describes that change?',
    choices: ['Reverse transcription', 'Electrophoresis', 'Genome editing'], answer: 0,
    explanation: 'Reverse transcription represents an RNA template as cDNA.' },
  { prompt: 'A fictional gene has unchanged DNA but a reduced RNA readout due to RNA-mediated silencing. Which concept fits?',
    choices: ['Cloning', 'RNA interference', 'Genetic rescue'], answer: 1,
    explanation: 'RNA interference can reduce the RNA readout while the DNA sequence remains unchanged.' },
  { prompt: 'A fictional phenotype returns in an experimental comparison. Which concept describes restoring the phenotype?',
    choices: ['Size separation', 'Amplification', 'Genetic rescue'], answer: 2,
    explanation: 'A rescue restores the phenotype. Controls help establish how to interpret the return.' },
  { prompt: 'A cartoon reporter becomes visible only when its driver and responder are both present. Which model fits?',
    choices: ['Genome editing', 'GAL4/UAS expression', 'Reverse transcription'], answer: 1,
    explanation: 'The two-part GAL4/UAS model uses driver-dependent responder expression.' },
];

function finite(input, min, max, fallback) {
  const value = Number(input);
  return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}

export function amplificationProfile(initial, fraction, total) {
  const start = finite(initial, 1, 1000, 20);
  const efficiency = finite(fraction, 0, 1, 1);
  const cycles = Math.floor(finite(total, 0, 35, 18));
  const capacity = 1e9;
  return Array.from({ length: cycles + 1 }, (_, cycle) => ({
    cycle,
    units: capacity / (1 + (capacity / start - 1) / ((1 + efficiency) ** cycle)),
  }));
}

export function analyzeRelativeExpression(records) {
  const groups = new Map();
  for (const row of records) {
    if (!['Control', 'Sample'].includes(row.condition) || !Number.isFinite(row.target) || !Number.isFinite(row.reference) ||
        row.target < 1 || row.target > 45 || row.reference < 1 || row.reference > 45) return null;
    const values = groups.get(row.condition) ?? [];
    values.push(row.target - row.reference);
    groups.set(row.condition, values);
  }
  if (!groups.has('Control') || !groups.has('Sample')) return null;
  const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;
  const control = average(groups.get('Control'));
  const sample = average(groups.get('Sample'));
  const delta = sample - control;
  return { control, sample, delta, fold: 2 ** -delta };
}

const format = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

function csv(rows) {
  return rows.map(row => row.map(value => '"' + String(value ?? '').replaceAll('"', '""') + '"').join(',')).join('\r\n') + '\r\n';
}

function rois() {
  const grid = Array.from({ length: 80 }, (_, index) => {
    const x = index % 10;
    const y = Math.floor(index / 10);
    const left = Math.exp(-((x - 2.5) ** 2 + (y - 3.2) ** 2) / 3.5) * 122;
    const right = Math.exp(-((x - 7) ** 2 + (y - 4.2) ** 2) / 2.8) * 79;
    return Math.round(7 + (index * 13 % 11) + left + right);
  });
  return {
    grid,
    areas: [
      { id: 'left', name: 'Region A', indexes: [21, 22, 23, 31, 32, 33, 41, 42, 43] },
      { id: 'right', name: 'Region B', indexes: [36, 37, 38, 46, 47, 48, 56, 57, 58] },
      { id: 'far', name: 'Top-distant background', indexes: [0, 1, 2, 3, 4] },
      { id: 'near', name: 'Near-signal background', indexes: [24, 34, 44] },
    ],
  };
}

function summarizeRoi(grid, areas, signal, background) {
  const selected = areas.find(area => area.id === signal);
  const blank = areas.find(area => area.id === background);
  const mean = area => area.indexes.reduce((sum, index) => sum + grid[index], 0) / area.indexes.length;
  const intensity = mean(selected);
  const baseline = mean(blank);
  return { intensity, baseline, corrected: intensity - baseline, clipped: selected.indexes.filter(index => grid[index] === 255).length, pixels: selected.indexes.length };
}

export function createMolecularLab({ escapeHtml, download, announce, publishSynthetic }) {
  const esc = escapeHtml;
  let tab = 'amplification';
  let initial = 20;
  let efficiency = 92;
  let cycles = 18;
  let cycle = 0;
  let phase = 0;
  let gelScenario = 'valid';
  let expressionScenario = 'valid';
  let matched = true;
  let expression = defaultRecords.map(row => ({ ...row }));
  let exposure = 1;
  let sampleROI = 'left';
  let backgroundROI = 'far';
  let conceptIndex = 0;
  let answer = null;
  let status = '';

  function report(text) {
    status = text;
    announce?.(text);
  }

  function choices(items, selected) {
    return items.map(([value, label]) => '<option value="' + esc(value) + '"' + (String(value) === String(selected) ? ' selected' : '') + '>' + esc(label) + '</option>').join('');
  }

  function numeric(name, value, min, max, step = 1, label) {
    return '<input name="' + name + '" type="number" min="' + min + '" max="' + max + '" step="' + step
      + '" value="' + esc(value) + '" required' + (label ? ' aria-label="' + esc(label) + '"' : '') + '>';
  }

  function renderAmplification() {
    const profile = amplificationProfile(initial, efficiency / 100, cycles);
    const value = profile[cycle]?.units ?? initial;
    const maximum = Math.max(1, Math.log10(profile.at(-1).units));
    return '<div class="lab-grid"><section class="lab-card"><h3>Copy model</h3><p>Change the abstract copy efficiency, then step through the stages of a cycle. The signal is an idealized training calculation.</p>'
      + '<form data-molecular-form="amplification" class="lab-controls"><label class="lab-field">Starting units' + numeric('initial', initial, 1, 1000) + '</label>'
      + '<label class="lab-field">Copy efficiency (%)' + numeric('efficiency', efficiency, 0, 100) + '</label>'
      + '<label class="lab-field">Cycles to model' + numeric('cycles', cycles, 1, 35) + '</label><button type="submit">Update model</button></form>'
      + '<div class="lab-controls"><button type="button" data-molecular="phase"' + (cycle === cycles && phase === 3 ? ' disabled' : '') + '>Advance stage</button>'
      + '<button type="button" data-molecular="run">Run all cycles</button><button type="button" data-molecular="reset-cycle">Reset stages</button></div>'
      + '<p class="lab-result"><strong>Cycle ' + cycle + '</strong><br>' + esc(phases[phase]) + '<br>' + integer.format(value) + ' simulated units.</p></section>'
      + '<section class="lab-card"><h3>Amplification profile</h3>'
      + '<div role="img" aria-label="Simulated copy number per cycle on a logarithmic display" style="height:11rem;display:flex;align-items:end;gap:.15rem;border-bottom:1px solid #709084;padding:.4rem .2rem">'
      + profile.map(point => '<span title="' + esc('Cycle ' + point.cycle + ' · ' + integer.format(point.units) + ' units') + '" style="height:' + (4 + 96 * Math.log10(point.units) / maximum) + '%;min-width:0;flex:1;border-radius:.18rem .18rem 0 0;background:' + (point.cycle <= cycle ? '#277a69' : '#add0c6') + '"></span>').join('')
      + '</div><div style="display:flex;justify-content:space-between"><small>0 cycles</small><small>' + cycles + ' cycles</small></div>'
      + '<p><small>Bar height represents log₁₀ copies. Dark bars indicate cycles completed in the exercise.</small></p>'
      + '<button type="button" data-molecular="amplification-csv">Export profile</button></section></div>';
  }

  function getGel() {
    return gelLanes.map(([label, sizes], index) => [label, index === 1 && gelScenario === 'positive' ? [] : index === 4 && gelScenario === 'blank' ? [340] : sizes]);
  }

  function controlMessage(scenario, type) {
    if (scenario === 'blank') return 'The blank has signal. Hold the sample interpretation while its origin is unresolved.';
    if (scenario === 'positive') return 'The expected positive signal is missing. This exercise cannot distinguish true negatives from a failed run.';
    if (type === 'gel') return 'The controls behave as expected. The band in Sample A aligns with the positive control. Size alone does not establish identity.';
    return 'The synthetic controls behave as expected.';
  }

  function renderGel() {
    const lanes = getGel();
    return '<div class="lab-grid"><section class="lab-card"><h3>Interpret a synthetic gel</h3><p>Compare the sample bands with the size reference and the controls. Shorter fragments appear lower in this schematic.</p>'
      + '<form class="lab-controls" data-molecular-form="gel"><label class="lab-field">Control case<select name="scenario">' + choices(scenarios, gelScenario) + '</select></label>'
      + '<button type="submit">Load case</button></form><p class="lab-result">' + esc(controlMessage(gelScenario, 'gel')) + '</p>'
      + '<ul>' + lanes.map(([label, sizes]) => '<li><strong>' + esc(label) + '</strong> ' + (sizes.length ? sizes.join(', ') + ' size units' : 'No visible band') + '</li>').join('') + '</ul><button type="button" data-molecular="gel-csv">Export band readout</button></section>'
      + '<section class="lab-card"><h3>Lane view</h3><div role="img" aria-label="Synthetic gel with five labeled lanes. Exact band sizes are listed beside it." style="background:#0a2024;border-radius:.65rem;padding:.85rem;color:#d6f9eb">'
      + '<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.35rem">'
      + lanes.map(([label, sizes]) => '<div style="min-width:0;text-align:center"><small style="display:block;height:2.6rem">' + esc(label) + '</small>'
        + '<div style="height:13rem;position:relative;border:1px solid #2a5450;border-radius:.25rem;overflow:hidden">'
        + '<span aria-hidden="true" style="position:absolute;inset:.3rem 25% auto;height:.25rem;border:1px solid #528076"></span>'
        + sizes.map(size => '<span title="' + size + ' size units" style="position:absolute;top:' + (12 + (Math.log10(1200) - Math.log10(size)) * 71) + '%;left:12%;right:12%;height:.32rem;border-radius:.18rem;background:#92f7cd;box-shadow:0 0 .45rem #39d597"></span>').join('')
        + '</div></div>').join('') + '</div></div></section></div>';
  }

  function renderExpression() {
    const result = analyzeRelativeExpression(expression);
    const valid = expressionScenario === 'valid' && matched && result;
    return '<div class="lab-grid"><section class="lab-card"><h3>Synthetic Cq readings</h3><p>Compare a fictional target and reference across three training replicates per group.</p>'
      + '<form data-molecular-form="expression" class="lab-controls"><label class="lab-field">Control case<select name="scenario">' + choices(scenarios, expressionScenario) + '</select></label>'
      + '<label><input name="matched" type="checkbox"' + (matched ? ' checked' : '') + '> Assume similar amplification efficiencies near doubling</label>'
      + '<table aria-label="Synthetic target and reference Cq"><thead><tr><th scope="col">Group</th><th scope="col">Target</th><th scope="col">Reference</th></tr></thead><tbody>'
      + expression.map((row, index) => {
        const label = row.condition + ' ' + row.replicate;
        return '<tr><th scope="row">' + esc(label) + '</th><td>' + numeric('target-' + index, row.target, 1, 45, 0.01, label + ' target Cq') + '</td>'
          + '<td>' + numeric('reference-' + index, row.reference, 1, 45, 0.01, label + ' reference Cq') + '</td></tr>';
      }).join('') + '</tbody></table><button type="submit">Calculate expression</button></form></section>'
      + '<section class="lab-card"><h3>Comparative Cq</h3><p>' + esc(controlMessage(expressionScenario, 'expression')) + '</p>'
      + (valid ? '<div class="lab-result"><p>Mean control ΔCq <strong>' + format.format(result.control) + '</strong></p>'
        + '<p>Mean sample ΔCq <strong>' + format.format(result.sample) + '</strong></p><p>ΔΔCq <strong>' + format.format(result.delta)
        + '</strong></p><p>Relative expression <strong>' + format.format(result.fold) + '×</strong></p></div>'
        : '<p class="lab-result">A fold estimate needs valid controls and the equal-efficiency assumption in this exercise.</p>')
      + '<div class="lab-controls"><button type="button" data-molecular="expression-csv">Export synthetic Cq readings</button>'
      + (valid && publishSynthetic ? '<button type="button" data-molecular="expression-analysis">Send to Analysis</button>' : '') + '</div>'
      + '<p><small>ΔCq is target minus reference. The exercise uses 2⁻ΔΔCq with the control group as calibrator.</small></p></section></div>';
  }

  function renderImaging() {
    const data = rois();
    const measured = data.grid.map(value => Math.min(255, Math.round(value * exposure)));
    const foreground = data.areas.find(area => area.id === sampleROI).indexes;
    const background = data.areas.find(area => area.id === backgroundROI).indexes;
    const result = summarizeRoi(measured, data.areas, sampleROI, backgroundROI);
    return '<div class="lab-grid"><section class="lab-card"><h3>Region measurements</h3><p>Compare background-corrected signal across two synthetic regions. Clipped pixels have lost intensity information.</p>'
      + '<form data-molecular-form="imaging" class="lab-controls"><label class="lab-field">Signal region<select name="signal">' + choices(data.areas.slice(0, 2).map(area => [area.id, area.name]), sampleROI) + '</select></label>'
      + '<label class="lab-field">Background region<select name="background">' + choices(data.areas.slice(2).map(area => [area.id, area.name]), backgroundROI) + '</select></label>'
      + '<label class="lab-field">Simulated detector multiplier<select name="exposure">' + choices([[1, '1×'], [2, '2×'], [4, '4×']], exposure) + '</select></label><button type="submit">Measure pixels</button></form>'
      + '<div class="lab-result"><p>Signal mean <strong>' + format.format(result.intensity) + '</strong></p><p>Background mean <strong>' + format.format(result.baseline) + '</strong></p>'
      + '<p>Background-corrected mean <strong>' + format.format(result.corrected) + '</strong></p><p>Clipped signal pixels <strong>' + result.clipped + ' of ' + result.pixels + '</strong></p></div>'
      + '<button type="button" data-molecular="imaging-csv">Export region measurements</button></section>'
      + '<section class="lab-card"><h3>Synthetic image</h3><div role="img" aria-label="Simulated image. Cyan outlines mark the signal region and gold outlines mark the background region." style="display:grid;grid-template-columns:repeat(10,minmax(0,1fr));max-width:27rem;border-radius:.55rem;overflow:hidden;background:#08161e">'
      + measured.map((value, index) => '<span title="' + esc('Pixel ' + (index + 1) + ' intensity ' + value) + '" style="aspect-ratio:1;background:rgb(' + Math.round(value * 0.22) + ',' + Math.round(value * 0.76) + ',' + value + ');'
        + (foreground.includes(index) || background.includes(index) ? 'outline:1px solid ' + (foreground.includes(index) ? '#a5ffee' : '#f0cf7b') + ';outline-offset:-1px;' : '') + '"></span>').join('')
      + '</div><p><small>Values are simulated detector units on a scale from 0 to 255.</small></p></section></div>';
  }

  function renderConcepts() {
    const question = questions[conceptIndex];
    return '<div class="lab-grid"><section class="lab-card"><h3>Compare the readouts</h3><dl>'
      + conceptualMethods.map(([name, text]) => '<dt><strong>' + esc(name) + '</strong></dt><dd style="margin:0 0 .75rem">' + esc(text) + '</dd>').join('') + '</dl></section>'
      + '<section class="lab-card"><h3>Concept check</h3><form data-molecular-form="concepts" class="lab-controls">'
      + '<fieldset><legend>' + esc(question.prompt) + '</legend>' + question.choices.map((choice, index) =>
        '<label style="display:block"><input type="radio" name="answer" value="' + index + '"' + (answer === index ? ' checked' : '') + ' required> ' + esc(choice) + '</label>').join('')
      + '</fieldset><button type="submit">Check answer</button></form>'
      + (answer === null ? '' : '<p class="lab-result"><strong>' + (answer === question.answer ? 'Correct.' : 'Review the readout.') + '</strong> ' + esc(question.explanation) + '</p>')
      + '<button type="button" data-molecular="next-concept">Next scenario</button></section></div>';
  }

  const sections = { amplification: renderAmplification, gel: renderGel, expression: renderExpression, imaging: renderImaging, concepts: renderConcepts };

  function render() {
    return '<div class="lab-section"><h2>Molecular biology</h2><p>Use fictional inputs to practice interpreting amplification, gel, expression, and image readouts.</p>'
      + '<nav class="lab-controls" aria-label="Molecular workspace">' + tabs.map(([value, label]) => '<button type="button" data-molecular="tab-' + value + '" aria-pressed="' + (tab === value) + '">' + esc(label) + '</button>').join('') + '</nav>'
      + '<p role="status" tabindex="-1" data-molecular-status>' + esc(status) + '</p>' + sections[tab]()
      + '<details class="lab-card"><summary>References</summary><ul>' + sources.map(([label, url]) => '<li><a href="' + url + '" target="_blank" rel="noopener noreferrer">' + esc(label) + '</a></li>').join('') + '</ul></details></div>';
  }

  function expressionCsv(withMetadata) {
    const headings = ['condition', 'target_cq', 'reference_cq', 'replicate'];
    if (withMetadata) headings.push('data_kind', 'control_case', 'equal_efficiency_assumption');
    return csv([headings, ...expression.map(row => {
      const data = [row.condition, row.target, row.reference, row.replicate];
      if (withMetadata) data.push('synthetic_education', expressionScenario, matched);
      return data;
    })]);
  }

  function bind(root) {
    function refresh(selector = '[data-molecular-status]') {
      root.innerHTML = render();
      root.querySelector(selector)?.focus();
    }

    root.onsubmit = event => {
      const form = event.target;
      const action = form.dataset.molecularForm;
      if (!action) return;
      event.preventDefault();
      const data = new FormData(form);
      if (action === 'amplification') {
        initial = finite(data.get('initial'), 1, 1000, initial);
        efficiency = finite(data.get('efficiency'), 0, 100, efficiency);
        cycles = Math.floor(finite(data.get('cycles'), 1, 35, cycles));
        cycle = 0;
        phase = 0;
        report('Updated the synthetic amplification profile.');
      } else if (action === 'gel') {
        if (scenarios.some(([value]) => value === data.get('scenario'))) gelScenario = data.get('scenario');
        report('Loaded the selected control case.');
      } else if (action === 'expression') {
        if (scenarios.some(([value]) => value === data.get('scenario'))) expressionScenario = data.get('scenario');
        matched = data.has('matched');
        expression = expression.map((row, index) => ({ ...row,
          target: finite(data.get('target-' + index), 1, 45, row.target), reference: finite(data.get('reference-' + index), 1, 45, row.reference) }));
        report('Updated the relative expression exercise.');
      } else if (action === 'imaging') {
        if (['left', 'right'].includes(data.get('signal'))) sampleROI = data.get('signal');
        if (['far', 'near'].includes(data.get('background'))) backgroundROI = data.get('background');
        if (['1', '2', '4'].includes(data.get('exposure'))) exposure = Number(data.get('exposure'));
        report('Measured the selected signal and background regions.');
      } else if (action === 'concepts') {
        if (data.get('answer') === null) return;
        answer = Number(data.get('answer'));
        report(answer === questions[conceptIndex].answer ? 'Correct.' : 'Review the explanation.');
      }
      refresh();
    };

    root.onclick = event => {
      const button = event.target.closest('[data-molecular]');
      if (!button || button.disabled) return;
      const command = button.dataset.molecular;
      const targetTab = command.slice(4);
      const kind = 'synthetic_education';
      if (command.startsWith('tab-') && Object.hasOwn(sections, targetTab)) {
        tab = targetTab;
        status = '';
        refresh('[data-molecular="' + command + '"]');
        return;
      }
      if (command === 'phase') {
        phase = (phase % 3) + 1;
        if (phase === 3) cycle += 1;
        report(phases[phase]);
        refresh('[data-molecular="phase"]:not([disabled])');
      } else if (command === 'run' || command === 'reset-cycle') {
        cycle = command === 'run' ? cycles : 0;
        phase = command === 'run' ? 3 : 0;
        report(command === 'run' ? 'Completed the simulated cycles.' : 'Reset the amplification exercise.');
        refresh();
      } else if (command === 'next-concept') {
        conceptIndex = (conceptIndex + 1) % questions.length;
        answer = null;
        report('Loaded the next scenario.');
        refresh('[name="answer"]');
      } else if (command === 'expression-analysis' && publishSynthetic && expressionScenario === 'valid' && matched) {
        publishSynthetic({ title: 'Molecular lab · Synthetic Cq data', csv: expressionCsv(false), kind: 'gene' });
      } else if (command === 'expression-csv') {
        download('synthetic-expression.csv', expressionCsv(true), 'text/csv;charset=utf-8');
      } else if (command === 'amplification-csv') {
        const data = amplificationProfile(initial, efficiency / 100, cycles).map(point => [kind, point.cycle, point.units]);
        download('synthetic-amplification.csv', csv([['data_kind', 'cycle', 'simulated_units'], ...data]), 'text/csv;charset=utf-8');
      } else if (command === 'gel-csv') {
        const data = getGel().flatMap(([label, sizes]) => (sizes.length ? sizes : ['']).map(size => [kind, gelScenario, label, size]));
        download('synthetic-gel.csv', csv([['data_kind', 'scenario', 'lane', 'modeled_size'], ...data]), 'text/csv;charset=utf-8');
      } else if (command === 'imaging-csv') {
        const data = rois();
        const result = summarizeRoi(data.grid.map(value => Math.min(255, Math.round(value * exposure))), data.areas, sampleROI, backgroundROI);
        download('synthetic-image-measurements.csv', csv([['data_kind', 'signal_region', 'background_region', 'multiplier', 'mean_signal', 'mean_background', 'corrected_mean', 'clipped_pixels', 'signal_pixels'],
          [kind, sampleROI, backgroundROI, exposure, result.intensity, result.baseline, result.corrected, result.clipped, result.pixels]]), 'text/csv;charset=utf-8');
      }
    };
  }

  return { render, bind };
}
