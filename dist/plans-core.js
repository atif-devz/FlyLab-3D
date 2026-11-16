export const blankPlan = {
  title: '', objective: '', protocol: '', hypothesis: '', control: '', test: '', unit: '', replicates: '', outcome: '',
  endpoint: '', exclusions: '', allocation: '', assay: 'summary',
};
const fields = Object.keys(blankPlan);
const multiline = new Set(['objective', 'hypothesis', 'outcome', 'exclusions', 'allocation']);
export const analysesForPlanning = ['summary', 'preference', 'feeding', 'spikes', 'survival', 'development', 'gene', 'microscopy'];

export function normalizePlan(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Choose a FlyLab plan file.');
  return Object.fromEntries(fields.map(field => {
    const value = typeof input[field] === 'string' ? input[field].trim().slice(0, multiline.has(field) ? 800 : 150) : blankPlan[field];
    return [field, field === 'assay' && !analysesForPlanning.includes(value) ? 'summary' : value];
  }));
}

export function planChecks(plan) {
  const parsed = new Date(plan.endpoint + 'T00:00:00Z');
  const day = Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === plan.endpoint;
  return [
    ['Research question and hypothesis', !!(plan.title && plan.objective && plan.hypothesis)],
    ['A named control and comparison', !!(plan.control && plan.test && plan.control.toLowerCase() !== plan.test.toLowerCase())],
    ['Independent unit and replicate target', !!plan.unit && /^\d+$/.test(plan.replicates) && Number(plan.replicates) > 0 && Number(plan.replicates) <= 100000],
    ['Defined outcome and analysis', !!(plan.outcome && plan.assay)],
    ['Allocation and exclusion criteria', !!(plan.allocation && plan.exclusions)],
    ['Protocol reference and checkpoint date', !!plan.protocol && day],
  ];
}

export function encodePlan(plan) {
  return JSON.stringify({ format: 'flylab-plan', version: 1, plan: normalizePlan(plan) }, null, 2) + '\n';
}
export function decodePlan(text) {
  const document = JSON.parse(text);
  if (document?.format !== 'flylab-plan' || document.version !== 1) throw new Error('Use a version 1 FlyLab plan file.');
  return normalizePlan(document.plan);
}

export function planChecklist(plan, source) {
  const lines = ['FlyLab 3D · Experimental planning worksheet', '', plan.title, '', plan.objective, '', 'Hypothesis', plan.hypothesis, '',
    'Groups', 'Control: ' + plan.control, 'Comparison: ' + plan.test, 'Independent unit: ' + plan.unit, 'Replicate target per group: ' + plan.replicates,
    '', 'Primary outcome', plan.outcome, 'Analysis: ' + plan.assay, 'Checkpoint date: ' + plan.endpoint,
    '', 'Allocation and blinding', plan.allocation, '', 'Exclusions and missing observations', plan.exclusions, '', 'Planning checks'];
  for (const [label, ok] of planChecks(plan)) lines.push((ok ? '[x] ' : '[ ] ') + label);
  if (source) lines.push('', 'Published reference', source.title, source.url);
  lines.push('', 'This worksheet records a design draft for review.');
  return lines.join('\n') + '\n';
}

