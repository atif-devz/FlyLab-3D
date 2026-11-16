import { analyses } from './analysis-core.js';
import { inventory } from './protocol-inventory.js';

const recordById = new Map(inventory.map(record => [record.id, record]));
const storagePrefix = 'flylab.experiment-builder.v1:';
const archiveFormat = 'flylab-experiment';
const archiveVersion = 1;
const identifier = /^[a-z0-9_-]{1,80}$/i;
const stages = {
  '': 'Stage not recorded', embryo: 'Embryo', l1: 'First-instar larva', l2: 'Second-instar larva',
  l3: 'Third-instar larva', pupa: 'Pupa', adult: 'Adult',
};
const sexes = { '': 'Sex not recorded', female: 'Female', male: 'Male', mixed: 'Mixed' };
const origins = {
  planned: 'Design only', education: 'Training record', synthetic: 'Synthetic simulation',
  imported: 'Imported experimental observations',
};
const relatedStations = {
  Dissection: ['expanded', 'Dissection workspace'],
  Imaging: ['microscopy', 'Imaging workspace'],
  Behavior: ['behavior', 'Behavior workspace'],
  Physiology: ['neuro', 'Recording workspace'],
  Genetics: ['genetics', 'Genetics workspace'],
  Husbandry: ['genetics', 'Stock organizer'],
};
const fieldLengths = {
  title: 160, question: 1200, hypothesis: 1000, genotype: 250, stockId: 120,
  unit: 120, sampleSize: 6, control: 300, comparison: 300, endpoint: 400,
  conditions: 1000, concentration: 120, materialsReference: 250, protocolVersion: 160,
  datasetLabel: 300, analysisNotes: 800, referenceText: 1600,
};
const analysisNames = Object.fromEntries(Object.entries(analyses).map(([id, analysis]) => [id, analysis.title]));

function clean(value, limit) { return typeof value === 'string' ? value.trim().slice(0, limit) : ''; }
function selectValue(value, options, fallback = '') { return typeof value === 'string' && Object.hasOwn(options, value) ? value : fallback; }

function secureUrl(value) {
  try {
    const url = new URL(clean(value, 520));
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

function toCitation(value) {
  const doi = /^doi:\s*(10\.\d{4,9}\/[^\s]+)$/i.exec(value);
  if (doi) return secureUrl('https://doi.org/' + doi[1]);
  const pmid = /^pmid:\s*(\d{1,12})$/i.exec(value);
  if (pmid) return 'https://pubmed.ncbi.nlm.nih.gov/' + pmid[1] + '/';
  return secureUrl(value);
}

export function parseExperimentReferences(text) {
  const references = clean(text, fieldLengths.referenceText).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const results = [];
  for (const entry of references) {
    const url = toCitation(entry);
    if (!url) throw new Error('Enter one HTTPS URL, DOI: identifier or PMID: identifier per reference line.');
    if (!results.includes(url)) results.push(url);
  }
  if (results.length > 10) throw new Error('Record at most ten additional references.');
  return results;
}

function snapshot(record) {
  if (!record) return null;
  return {
    id: record.id, title: record.title, url: record.url, doi: record.doi ?? '',
    verified: record.verification?.date ?? '', publisher: record.publisher,
  };
}

function referenceSnapshot(value, protocolId) {
  if (!value || value.id !== protocolId) return snapshot(recordById.get(protocolId));
  const url = secureUrl(value.url);
  if (!url || !clean(value.title, 400)) return snapshot(recordById.get(protocolId));
  return { id: protocolId, title: clean(value.title, 400), url, doi: clean(value.doi, 250), verified: clean(value.verified, 24), publisher: clean(value.publisher, 160) };
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? 'fly-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

function isoDate(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error('The experiment has an invalid creation or update date.');
  return new Date(value).toISOString();
}

export function normalizeExperiment(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || typeof value.id !== 'string' || !identifier.test(value.id)) throw new Error('This experiment has an invalid identifier.');
  const experiment = Object.fromEntries(Object.entries(fieldLengths).map(([key, limit]) => [key, clean(value[key], limit)]));
  const protocolId = typeof value.protocolId === 'string' && identifier.test(value.protocolId) ? value.protocolId : '';
  return {
    ...experiment, id: value.id, species: 'Drosophila melanogaster',
    sampleSize: typeof value.sampleSize === 'string' ? value.sampleSize.trim() : '',
    createdAt: isoDate(value.createdAt), updatedAt: isoDate(value.updatedAt),
    revision: Number.isSafeInteger(value.revision) && value.revision >= 0 ? value.revision : 0,
    derivedFrom: typeof value.derivedFrom === 'string' && identifier.test(value.derivedFrom) ? value.derivedFrom : '',
    stage: selectValue(value.stage, stages), sex: selectValue(value.sex, sexes),
    origin: selectValue(value.origin, origins, 'planned'), analysis: selectValue(value.analysis, analysisNames, 'summary'),
    protocolId, citation: referenceSnapshot(value.citation, protocolId),
  };
}

export function createExperimentDraft(previous) {
  const timestamp = new Date().toISOString();
  return normalizeExperiment({
    ...previous, id: newId(), createdAt: timestamp, updatedAt: timestamp, revision: 0,
    derivedFrom: previous?.id ?? '', title: previous?.title ? previous.title.slice(0, fieldLengths.title - 8) + ' (copy)' : '',
  });
}

export function encodeExperiment(experiment) {
  return JSON.stringify({ format: archiveFormat, version: archiveVersion, experiment: normalizeExperiment(experiment) }, null, 2) + '\n';
}

export function decodeExperiment(text) {
  let document;
  try { document = JSON.parse(text); } catch { throw new Error('Use a valid FlyLab experiment JSON file.'); }
  if (document?.format !== archiveFormat || document.version !== archiveVersion) throw new Error('Use a version 1 FlyLab experiment file.');
  if (!Object.hasOwn(origins, document.experiment?.origin)) throw new Error('The experiment archive has an unrecognized data origin.');
  if (document.experiment?.sampleSize != null && typeof document.experiment.sampleSize !== 'string') {
    throw new Error('The experiment archive has an invalid sample size.');
  }
  const experiment = normalizeExperiment(document.experiment);
  validateExperiment(experiment, false);
  return experiment;
}

function validateExperiment(experiment, requireTitle) {
  if (requireTitle && !experiment.title) throw new Error('Enter an experiment title before saving.');
  if (experiment.sampleSize && (!/^[1-9]\d{0,5}$/.test(experiment.sampleSize) || Number(experiment.sampleSize) > 100000)) {
    throw new Error('Enter a whole-number sample size from 1 to 100,000, or leave it blank.');
  }
  return parseExperimentReferences(experiment.referenceText);
}

export function experimentReport(value) {
  const experiment = normalizeExperiment(value);
  const references = validateExperiment(experiment, false);
  const field = (name, value) => name + ' — ' + (value || 'Not recorded');
  return [
    'FlyLab 3D experiment record', '', experiment.title || 'Untitled experiment',
    field('Experiment ID', experiment.id), field('Revision', String(experiment.revision)),
    field('Created', experiment.createdAt), field('Last saved revision', experiment.updatedAt),
    ...(experiment.derivedFrom ? [field('Copied from', experiment.derivedFrom)] : []),
    '', 'Research design', field('Question', experiment.question), field('Hypothesis', experiment.hypothesis),
    field('Organism', experiment.species), field('Stage', stages[experiment.stage]), field('Sex', sexes[experiment.sex]),
    field('Genotype', experiment.genotype), field('Stock ID', experiment.stockId),
    field('Biological unit', experiment.unit), field('Planned independent units per group', experiment.sampleSize),
    field('Control', experiment.control), field('Comparison', experiment.comparison),
    field('Conditions', experiment.conditions), field('Recorded concentration and unit', experiment.concentration),
    field('Materials reference', experiment.materialsReference), field('Primary outcome', experiment.endpoint),
    '', 'Methods and analysis', field('Protocol version or lab SOP', experiment.protocolVersion),
    field('Data origin', origins[experiment.origin]), field('Dataset label', experiment.datasetLabel),
    field('Analysis', analysisNames[experiment.analysis]), field('Analysis notes', experiment.analysisNotes),
    ...(experiment.citation ? ['', 'Catalog citation snapshot', experiment.citation.title, experiment.citation.url,
      field('DOI', experiment.citation.doi), field('Catalog source check', experiment.citation.verified)] : []),
    ...(references.length ? ['', 'Additional references', ...references] : []),
    '', 'This record describes design and data provenance. Dataset files, assay results, and training completion are maintained in their own workspaces.',
  ].join('\n') + '\n';
}

function experimentStorage() {
  const memory = new Map();
  function persisted(id) {
    const entry = globalThis.localStorage?.getItem(storagePrefix + id);
    return entry ? normalizeExperiment(JSON.parse(entry)) : null;
  }
  function list() {
    const result = new Map(memory);
    try {
      const { localStorage } = globalThis;
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith(storagePrefix)) continue;
        try {
          const experiment = persisted(key.slice(storagePrefix.length));
          if (experiment && (result.get(experiment.id)?.revision ?? -1) < experiment.revision) result.set(experiment.id, experiment);
        } catch { /* An invalid entry must not prevent opening other experiments. */ }
      }
    } catch { /* Storage may be unavailable in a private or local-file session. */ }
    return [...result.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  function save(record) {
    let previous;
    try { previous = persisted(record.id); } catch { /* Keep memory storage available. */ }
    previous = [previous, memory.get(record.id)].filter(Boolean).sort((a, b) => b.revision - a.revision)[0];
    if (previous && previous.revision !== record.revision) throw new Error('A newer revision exists. Reopen the saved record or duplicate this draft before saving.');
    const next = { ...record, updatedAt: new Date().toISOString(), revision: record.revision + 1 };
    let durable = false;
    try {
      if (globalThis.localStorage) {
        globalThis.localStorage.setItem(storagePrefix + record.id, JSON.stringify(next));
        durable = true;
      }
    } catch { /* The new revision remains available for this session. */ }
    memory.set(next.id, next);
    return { next, durable };
  }
  return { list, save };
}

export function createExperimentBuilder({ escapeHtml: escape, download, announce }) {
  const storage = experimentStorage();
  let draft = createExperimentDraft();
  let status = '';
  let revisionStamp = 0;

  function addReference(value) {
    try {
      const url = secureUrl(value);
      if (!url) throw new Error('This record has no HTTPS reference to add.');
      const references = parseExperimentReferences(draft.referenceText);
      if (references.includes(url)) {
        status = 'This reference is already in the draft.';
      } else {
        const referenceText = [...references, url].join('\n');
        if (referenceText.length > fieldLengths.referenceText) throw new Error('The draft reference field is full.');
        parseExperimentReferences(referenceText);
        draft = normalizeExperiment({ ...draft, referenceText });
        status = 'Reference added to the draft. Save the experiment to keep it in this browser.';
        revisionStamp += 1;
      }
      announce(status);
      return true;
    } catch (error) {
      announce('Could not add the reference. ' + error.message);
      return false;
    }
  }

  function input(name, label, long = false) {
    const value = escape(draft[name]);
    return '<label class="lab-field"><span>' + label + '</span>' + (long
      ? '<textarea name="' + name + '" rows="2" maxlength="' + fieldLengths[name] + '">' + value + '</textarea>'
      : '<input name="' + name + '" value="' + value + '" maxlength="' + fieldLengths[name] + '"'
        + (name === 'sampleSize' ? ' inputmode="numeric"' : '') + '>') + '</label>';
  }

  function option(value, label, selected) {
    return '<option value="' + escape(value) + '"' + (value === selected ? ' selected' : '') + '>' + escape(label) + '</option>';
  }

  function fieldSelect(key, name, choices) {
    return '<label class="lab-field"><span>' + name + '</span><select name="' + key + '">'
      + Object.entries(choices).map(([value, label]) => option(value, label, draft[key])).join('') + '</select></label>';
  }

  function citationPanel() {
    const record = recordById.get(draft.protocolId);
    const archived = draft.citation;
    if (!record && !archived) return '<p>Choose a catalog method to attach its citation.</p>';
    const source = record ?? archived;
    const publisher = clean(source.publisher, 160);
    const date = record?.verification?.date ?? archived?.verified;
    const sourceStatus = record ? 'Catalog entry' : 'Citation snapshot from the imported record';
    return '<p class="lab-provenance">' + escape([sourceStatus, publisher, date ? 'Source checked ' + date : ''].filter(Boolean).join(' · ')) + '</p>'
      + '<p><a href="' + escape(source.url) + '" target="_blank" rel="noopener noreferrer">' + escape(source.title) + ' ↗</a>'
      + (source.doi ? '<br><small>DOI ' + escape(source.doi) + '</small>' : '') + '</p>'
      + (record?.lesson ? '<p>The linked bench is an educational simulation.</p>' : '');
  }

  function workspaceButtons(options) {
    const record = recordById.get(draft.protocolId);
    const stage = draft.stage === 'adult' ? 'adult' : draft.stage === 'l3' ? 'larva' : '';
    const lessonStage = record?.lesson?.startsWith('larval-') ? 'l3' : 'adult';
    const separateBench = record?.lesson && typeof options.openLesson === 'function';
    const matchingBench = separateBench && (!draft.stage || draft.stage === lessonStage);
    const station = record && relatedStations[record.category];
    const launch = (action, label) => '<button type="button" data-experiment-action="' + action + '">' + label + '</button>';
    return '<div class="lab-controls">'
      + (stage && typeof options.openAnatomy === 'function' ? launch('anatomy', stage === 'adult' ? 'Explore adult female reference model' : 'Explore third-instar larva') : '')
      + (matchingBench ? launch('lesson', 'Open linked training bench') : '')
      + (!matchingBench && station && typeof options.openStation === 'function' ? launch('related', 'Open ' + station[1]) : '')
      + (typeof options.openStation === 'function' ? launch('analysis', 'Open Data Analysis') : '')
      + '</div>'
      + (separateBench && !matchingBench ? '<p>The linked training bench uses a different developmental stage.</p>' : '')
      + '<p>These links open the workspaces. Keep raw data and experiment outcomes in their respective tools.</p>';
  }

  function render() {
    const records = storage.list();
    const selectedSavedId = records.some(record => record.id === draft.id) ? draft.id : '';
    const unresolved = draft.protocolId && !recordById.has(draft.protocolId);
    return '<section class="lab-section"><h1>Experiment Builder</h1>'
      + '<p>Connect a research question to a specimen, a published method and an analysis plan.</p>'
      + '<div class="lab-grid"><form class="lab-card" data-experiment-form><h2>Research design</h2>'
      + '<p class="lab-provenance"><i>Drosophila melanogaster</i> · ' + escape(draft.id)
      + (draft.revision ? ' · Revision ' + draft.revision : '') + '</p>'
      + input('title', 'Experiment title') + input('question', 'Research question', true) + input('hypothesis', 'Hypothesis', true)
      + '<h3>Specimen and groups</h3><div class="lab-fields">'
      + fieldSelect('stage', 'Developmental stage', stages) + fieldSelect('sex', 'Sex', sexes)
      + input('genotype', 'Genotype as recorded') + input('stockId', 'Stock or specimen identifier')
      + input('unit', 'Independent biological unit') + input('sampleSize', 'Planned units per group')
      + input('control', 'Control group') + input('comparison', 'Comparison group') + '</div>'
      + input('conditions', 'Conditions and comparison notes', true) + input('concentration', 'Recorded treatment concentration and unit')
      + '<h3>Method and outcome</h3><label class="lab-field"><span>Published method</span><select name="protocolId">'
      + option('', 'Choose a catalog reference', draft.protocolId)
      + (unresolved ? option(draft.protocolId, 'Archived reference', draft.protocolId) : '')
      + inventory.map(record => option(record.id, record.title, draft.protocolId)).join('') + '</select></label>'
      + input('protocolVersion', 'Protocol version or lab SOP identifier') + input('materialsReference', 'Materials record or reference')
      + input('endpoint', 'Primary outcome', true)
      + '<h3>Data and analysis</h3><div class="lab-fields">'
      + fieldSelect('origin', 'Data origin', origins) + fieldSelect('analysis', 'Analysis method', analysisNames) + '</div>'
      + input('datasetLabel', 'Dataset name or accession') + input('analysisNotes', 'Analysis settings and assumptions', true)
      + input('referenceText', 'Other references, one HTTPS URL, DOI: or PMID: per line', true)
      + '<div class="lab-controls"><button type="submit" class="protocol-primary">Save experiment</button>'
      + '<button type="button" data-experiment-action="export">Export JSON</button>'
      + '<button type="button" data-experiment-action="report">Download report</button></div></form>'
      + '<div class="lab-card-stack"><article class="lab-card"><h2>Saved experiments</h2>'
      + '<label class="lab-field"><span>Resume a saved record</span><select data-experiment-resume>'
      + option('', 'Choose a saved experiment', selectedSavedId)
      + records.map(record => option(record.id, record.title + ' · Revision ' + record.revision, draft.id)).join('') + '</select></label>'
      + '<div class="lab-controls"><button type="button" data-experiment-action="new">New draft</button>'
      + '<button type="button" data-experiment-action="duplicate">Duplicate current draft</button></div>'
      + '<label class="lab-field"><span>Open an experiment JSON file</span><input type="file" accept=".json,application/json" data-experiment-import></label>'
      + '<p class="lab-muted">Saved design metadata stays in this browser. Use JSON to move it to another device.</p>'
      + '<p class="lab-status" data-experiment-status role="status">' + escape(status) + '</p></article>'
      + '<article class="lab-card"><h2>Source and next steps</h2><div data-experiment-citation>' + citationPanel() + '</div>'
      + '<div data-experiment-connections></div></article></div></div></section>';
  }

  function bind(root, options = {}) {
    function refreshConnections() {
      root.querySelector('[data-experiment-citation]').innerHTML = citationPanel();
      root.querySelector('[data-experiment-connections]').innerHTML = workspaceButtons(options);
    }
    function reportStatus(message) {
      status = message;
      root.querySelector('[data-experiment-status]').textContent = message;
      announce?.(message);
    }
    function redraw(message) {
      status = message;
      root.innerHTML = render();
      refreshConnections();
      announce?.(message);
    }
    function readForm() {
      const form = root.querySelector('[data-experiment-form]');
      if (!form) return;
      const values = Object.fromEntries(new FormData(form));
      if (values.protocolId !== draft.protocolId) values.citation = snapshot(recordById.get(values.protocolId));
      draft = normalizeExperiment({ ...draft, ...values });
    }

    refreshConnections();
    root.addEventListener('input', event => {
      if (!event.target.closest('[data-experiment-form]')) return;
      revisionStamp += 1;
      readForm();
      if (['protocolId', 'stage'].includes(event.target.name)) refreshConnections();
    });

    root.addEventListener('submit', event => {
      if (!event.target.matches('[data-experiment-form]')) return;
      event.preventDefault();
      revisionStamp += 1;
      readForm();
      try {
        validateExperiment(draft, true);
        const { next, durable } = storage.save(draft);
        draft = next;
        redraw(durable ? 'Experiment saved in this browser.' : 'Experiment saved for this session. Export JSON to keep a copy.');
      } catch (error) { reportStatus(error.message); }
    });

    root.addEventListener('change', async event => {
      const target = event.target;
      if (target.matches('[data-experiment-resume]') && target.value) {
        const record = storage.list().find(item => item.id === target.value);
        if (record) {
          revisionStamp += 1;
          draft = record;
          redraw('Saved experiment opened.');
        }
      } else if (target.matches('[data-experiment-import]') && target.files?.[0]) {
        const attempt = ++revisionStamp;
        try {
          const file = target.files[0];
          if (file.size > 32768) throw new Error('Use a FlyLab experiment JSON file under 32 KiB.');
          const record = decodeExperiment(await file.text());
          if (attempt !== revisionStamp || !root.isConnected) return;
          const alreadySaved = storage.list().some(item => item.id === record.id);
          draft = alreadySaved ? createExperimentDraft(record) : record;
          redraw(alreadySaved ? 'Imported as a copy. The saved experiment is intact.' : 'Experiment imported. Save it to this browser to resume later.');
        } catch (error) {
          if (attempt === revisionStamp && root.isConnected) reportStatus(error.message);
        } finally { target.value = ''; }
      }
    });

    root.addEventListener('click', event => {
      const action = event.target.closest('[data-experiment-action]')?.dataset.experimentAction;
      if (!action) return;
      revisionStamp += 1;
      readForm();
      try {
        const record = recordById.get(draft.protocolId);
        if (action === 'new' || action === 'duplicate') {
          draft = createExperimentDraft(action === 'duplicate' ? draft : undefined);
          redraw(action === 'duplicate' ? 'Draft copied with a new experiment ID.' : 'New experiment draft.');
        } else if (action === 'export' || action === 'report') {
          validateExperiment(draft, false);
          const exportJson = action === 'export';
          download('flylab-experiment-' + draft.id + (exportJson ? '.json' : '.txt'),
            exportJson ? encodeExperiment(draft) : experimentReport(draft),
            exportJson ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8');
        } else if (action === 'anatomy') options.openAnatomy?.(draft.stage === 'adult' ? 'adult' : 'larva');
        else if (action === 'lesson' && record?.lesson) options.openLesson?.(record.lesson);
        else if (action === 'related' && record && relatedStations[record.category]) options.openStation?.(relatedStations[record.category][0]);
        else if (action === 'analysis') options.openStation?.('analysis');
      } catch (error) { reportStatus(error.message); }
    });
  }

  return { render, bind, addReference };
}
