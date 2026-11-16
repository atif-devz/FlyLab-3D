import { inventory } from './protocol-inventory.js';
import { protocolLessons } from './protocol-lessons.js';
import { trainingDefinitions } from './training-definitions.js';
import { scoreAssessment } from './training-progress.js';

const lessonById = new Map(protocolLessons.map(lesson => [lesson.id, lesson]));
const stageNames = { adult: 'Adult', larva: 'Larva', embryo: 'Embryo', pupa: 'Pupa', multiple: 'Multiple stages' };
const tools = [
  ['orient', 'Orient', 'reset'],
  ['stabilize', 'Stabilize', 'anchor'],
  ['open', 'Open', 'scissors'],
  ['release', 'Release', 'forceps'],
  ['transfer', 'Transfer', 'transfer'],
  ['inspect', 'Inspect', 'search'],
];
const toolById = new Map(tools.map(([id, name]) => [id, name]));
const stages = Object.entries(stageNames);
const categories = [...new Set(inventory.map(item => item.category))].sort();
const publishers = [...new Set(inventory.map(item => item.publisher))].sort();
const protectedTissue = new Set(['brain', 'ventral-nerve-cord', 'larval-brain', 'larval-vnc']);
const emptyMetrics = () => ({ tool: 0, target: 0, protected: 0, setup: 0, guide: false });

export function createProtocolLab({ progress, esc, icon, findPart, onEnter, onStep, onApply, onSetup, onReplay, onWarning, onChange, announce }) {
  const filters = { search: '', stage: '', category: '', publisher: '', format: '' };
  let lesson = null;
  let index = 0;
  let pending = false;
  let phase = 'setup';
  let ready = new Set();
  let answers = [];
  let report = null;
  let metrics = emptyMetrics();
  let startedAt = '';
  let mode = 'guided';
  let tool = '';
  let guided = true;
  let message = '';
  let error = false;

  function current() { return lesson?.steps[index] ?? null; }
  function definition() { return lesson ? trainingDefinitions[lesson.id] : null; }
  function previousExtractions() {
    return new Set((lesson?.steps ?? []).slice(0, index).flatMap(step => step.after?.extract ?? []));
  }

  function saveState() {
    if (lesson && phase !== 'result') progress.saveDraft(lesson.id,
      { index, pending, phase, ready: [...ready], guided, answers, metrics, startedAt, mode });
  }

  function refresh() {
    saveState();
    onChange();
  }

  function replay() {
    if (!lesson) return;
    const preparations = definition().readiness.filter(item => ready.has(item.id));
    const completedSteps = phase === 'setup' ? [] : lesson.steps.slice(0, index + Number(pending));
    onReplay?.(preparations, completedSteps);
  }

  function prepareStep() {
    pending = false;
    tool = '';
    message = '';
    error = false;
    onStep(current(), previousExtractions());
    refresh();
  }

  function restart() {
    phase = 'setup';
    index = 0;
    pending = false;
    tool = '';
    report = null;
    ready = new Set();
    answers = definition().questions.map(() => null);
    mode = progress.state.mode;
    guided = mode === 'guided';
    metrics = emptyMetrics();
    startedAt = new Date().toISOString();
    message = '';
    error = false;
  }

  function restore(saved) {
    if (!saved || !['setup', 'practice', 'assessment'].includes(saved.phase)) return;
    const questions = definition().questions;
    const validReady = new Set(definition().readiness.map(item => item.id));
    if (!Array.isArray(saved.ready)) return;
    ready = new Set(saved.ready.filter(id => validReady.has(id)));
    if (saved.phase !== 'setup' && ready.size !== validReady.size) return;
    phase = saved.phase;
    index = Number.isInteger(saved.index) ? Math.max(0, Math.min(saved.index, lesson.steps.length - 1)) : 0;
    pending = phase === 'assessment' || (phase === 'practice' && saved.pending === true);
    if (phase === 'assessment') index = lesson.steps.length - 1;
    if (phase === 'setup') index = 0;
    answers = questions.map((item, i) => Number.isInteger(saved.answers?.[i]) && Object.hasOwn(item.choices, saved.answers[i]) ? saved.answers[i] : null);
    mode = saved.mode === 'independent' ? 'independent' : 'guided';
    guided = saved.guided === true;
    for (const key of ['tool', 'target', 'protected', 'setup']) {
      metrics[key] = Number.isInteger(saved.metrics?.[key]) ? Math.max(0, saved.metrics[key]) : 0;
    }
    metrics.guide = saved.metrics?.guide === true;
    if (typeof saved.startedAt === 'string' && Number.isFinite(Date.parse(saved.startedAt))) startedAt = saved.startedAt;
    if (pending) message = current().feedback;
  }

  function open(id) {
    const next = lessonById.get(id);
    if (!next) return;
    lesson = next;
    restart();
    restore(progress.draft(next.id));
    progress.recordVisit(next.id);
    onEnter(next.stage);
    onStep(current(), previousExtractions());
    replay();
    if (pending) onApply(current(), extracted(), true);
    refresh();
    announce(next.title + (phase === 'setup' ? ', bench preparation' : ', saved session restored'));
  }

  function exit() {
    lesson = null;
    pending = false;
    onChange();
  }

  function extracted() {
    const moved = previousExtractions();
    if (pending) for (const id of current()?.after?.extract ?? []) moved.add(id);
    return moved;
  }

  function attempt(target, point) {
    const step = current();
    if (!step || pending || phase !== 'practice') return;
    const tooFar = point && step.point && Math.hypot(...point.map((value, axis) => value - step.point[axis])) > .48;
    if (!tool || tool !== step.tool || target !== step.target || tooFar) {
      if (!tool) message = 'Choose a tool, then apply it to the landmark.';
      else if (['open', 'release', 'stabilize'].includes(tool) && protectedTissue.has(target)) {
        message = 'Protected neural tissue. Move to the surrounding tissue or the support landmark.';
        metrics.protected += 1;
        onWarning?.(target, point);
      } else if (target !== step.target || tooFar) {
        message = 'Try the anatomical landmark described in the step.';
        metrics.target += 1;
      } else {
        message = 'Choose a different tool for this action.';
        metrics.tool += 1;
      }
      error = true;
      refresh();
      announce(message);
      return;
    }
    pending = true;
    error = false;
    message = step.feedback;
    onApply(step, extracted(), false, point);
    refresh();
    announce(message);
  }

  function action(action, key) {
    if (action === 'protocol-open') open(key);
    else if (action === 'protocol-library') exit();
    else if (action === 'protocol-prep' && phase === 'setup' && lesson) {
      const item = definition().readiness.find(entry => entry.id === key);
      if (!item || ready.has(key)) return;
      if (key === 'medium' && !ready.has('dish')) {
        metrics.setup += 1;
        error = true;
        message = 'Place the dissection dish before adding medium.';
      } else {
        ready.add(key);
        error = false;
        message = item.label + ' completed.';
        onSetup?.(item, current());
      }
      refresh();
      announce(message);
    } else if (action === 'protocol-begin' && phase === 'setup' && lesson && ready.size === definition().readiness.length) {
      phase = 'practice';
      metrics.guide ||= guided;
      prepareStep();
      announce('Practice started, step 1 of ' + lesson.steps.length);
    } else if (action === 'protocol-tool' && current() && !pending && phase === 'practice') {
      if (!toolById.has(key)) return;
      tool = key;
      message = '';
      error = false;
      refresh();
    } else if (action === 'protocol-target') attempt(current()?.target);
    else if (action === 'protocol-markers' && phase === 'practice') {
      guided = !guided;
      metrics.guide ||= guided;
      refresh();
    } else if (action === 'protocol-restart' && lesson) {
      restart();
      onStep(current(), new Set());
      replay();
      refresh();
      announce('Lesson restarted');
    } else if (action === 'protocol-back' && index > 0 && phase === 'practice') {
      index -= 1;
      prepareStep();
      replay();
      announce('Step ' + (index + 1) + ' of ' + lesson.steps.length);
    } else if (action === 'protocol-next' && pending && phase === 'practice') {
      if (index + 1 < lesson.steps.length) {
        index += 1;
        prepareStep();
        announce('Step ' + (index + 1) + ' of ' + lesson.steps.length);
      } else {
        phase = 'assessment';
        refresh();
        announce('Complete the concept assessment');
      }
    } else if (action === 'protocol-answer' && phase === 'assessment') {
      const [questionIndex, answer] = String(key).split(':').map(Number);
      const question = definition().questions[questionIndex];
      if (!question || !Number.isInteger(answer) || !Object.hasOwn(question.choices, answer)) return;
      answers[questionIndex] = answer;
      refresh();
    } else if (action === 'protocol-assess' && phase === 'assessment' && answers.every(Number.isInteger)) {
      const completedAt = new Date().toISOString();
      report = {
        id: lesson.id + '-' + completedAt, lessonId: lesson.id, mode, startedAt, completedAt,
        completedSteps: lesson.steps.length, answers: [...answers], score: scoreAssessment(lesson.id, answers), metrics: { ...metrics },
      };
      phase = 'result';
      progress.complete(report);
      onChange();
      announce(lesson.title + ' completed with ' + report.score + ' of ' + definition().questions.length + ' concepts correct');
    } else if (action === 'protocol-clear') {
      for (const name of Object.keys(filters)) filters[name] = '';
      onChange();
    }
  }

  function options(valueList, selected, anyLabel) {
    return '<option value="">' + anyLabel + '</option>' + valueList.map(([key, title]) =>
      '<option value="' + esc(key) + '"' + (key === selected ? ' selected' : '') + '>' + esc(title) + '</option>').join('');
  }

  function filterControls() {
    return '<h2>Explore the catalog</h2>'
      + '<div class="field"><label for="protocol-stage">Life stage</label><select id="protocol-stage" data-protocol-filter="stage">' + options(stages, filters.stage, 'All life stages') + '</select></div>'
      + '<div class="field"><label for="protocol-category">Category</label><select id="protocol-category" data-protocol-filter="category">' + options(categories.map(name => [name, name]), filters.category, 'All categories') + '</select></div>'
      + '<div class="field"><label for="protocol-publisher">Source</label><select id="protocol-publisher" data-protocol-filter="publisher">' + options(publishers.map(name => [name, name]), filters.publisher, 'All sources') + '</select></div>'
      + '<div class="field"><label for="protocol-format">Format</label><select id="protocol-format" data-protocol-filter="format">' + options([['interactive', '3D lesson available'], ['reference', 'Reference only']], filters.format, 'All formats') + '</select></div>'
      + '<button type="button" class="text-button protocol-clear" data-action="protocol-clear">Reset filters</button>'
      + '<button type="button" class="wide-button inventory-export" data-action="training-inventory-export">Export catalog CSV</button>';
  }

  function sourcesHTML() {
    return '<details class="protocol-references"><summary>Published methods</summary><ul>' + (lesson.references ?? []).map(source =>
      '<li><a href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">' + esc(source.title) + '</a></li>').join('') + '</ul></details>';
  }

  function sidebar() {
    if (!lesson) return filterControls();
    const step = current();
    const total = lesson.steps.length;
    const count = Math.min(index + Number(pending), total);
    const target = step.landmark ?? findPart(step.target)?.name ?? step.target;
    const data = definition();
    const header = '<button type="button" class="text-button protocol-library-button" data-action="protocol-library">← Protocol library</button>'
      + '<h2 class="protocol-sidebar-title">' + esc(lesson.title) + '</h2>'
      + '<p class="lesson-scope">Educational prototype · ' + (mode === 'guided' ? 'Guided' : 'Independent') + '</p>';
    const feedback = message ? '<p class="protocol-feedback' + (error ? ' error' : '') + '" role="status">' + esc(message) + '</p>' : '';
    if (phase === 'setup') {
      return header + '<div class="training-section"><h3>Prepare the bench</h3><p>' + esc(data.goal) + '</p></div>'
        + '<div class="readiness-list">' + data.readiness.map(item => '<button type="button" class="readiness-item" data-action="protocol-prep" data-key="' + esc(item.id) + '" ' + (ready.has(item.id) ? 'disabled' : '') + '>'
          + '<span aria-hidden="true" class="readiness-check">' + (ready.has(item.id) ? '✓' : '') + '</span><span><strong>' + esc(item.label) + '</strong><small>' + esc(item.detail) + '</small></span></button>').join('') + '</div>'
        + '<button type="button" class="wide-button protocol-primary" data-action="protocol-begin" ' + (ready.size === data.readiness.length ? '' : 'disabled') + '>Start practice ' + icon('arrow', 14) + '</button>'
        + feedback + '<div class="training-utilities"><button type="button" class="text-button" data-action="training-checklist" data-key="' + esc(lesson.id) + '">Download checklist</button></div>' + sourcesHTML();
    }
    if (phase === 'assessment') {
      return header + '<div class="training-section"><h3>Check your understanding</h3><p>All ' + total + ' virtual actions are complete. Answer each question to record the session.</p></div>'
        + '<div class="training-questions">' + data.questions.map((item, questionIndex) => '<fieldset><legend>' + esc(item.prompt) + '</legend>'
          + item.choices.map((choice, answer) => '<label><input type="radio" name="question-' + questionIndex + '" data-protocol-answer="' + questionIndex + ':' + answer + '" ' + (answers[questionIndex] === answer ? 'checked' : '') + '><span>' + esc(choice) + '</span></label>').join('') + '</fieldset>').join('') + '</div>'
        + '<button type="button" class="wide-button protocol-primary" data-action="protocol-assess" ' + (answers.every(Number.isInteger) ? '' : 'disabled') + '>Score assessment</button>' + sourcesHTML();
    }
    if (phase === 'result') {
      return header + '<div class="training-section"><h3>Training result</h3><p>' + count + ' / ' + total + ' actions completed · ' + report.score + ' / ' + data.questions.length + ' concepts correct</p></div>'
        + '<ul class="result-checklist">' + data.criteria.map(item => '<li>' + esc(item) + '</li>').join('') + '</ul>'
        + '<div class="training-section"><h3>Practice feedback</h3><p>' + metrics.tool + ' tool mistakes · ' + metrics.target + ' landmark mistakes · ' + metrics.protected + ' protected-tissue warnings</p><p>' + esc(data.failure) + '</p></div>'
        + '<ol class="concept-review">' + data.questions.map((item, index) => '<li><strong>' + (answers[index] === item.answer ? 'Correct' : 'Review') + '</strong> ' + esc(item.explanation) + '</li>').join('') + '</ol>'
        + '<button type="button" class="wide-button protocol-primary" data-action="training-report-export" data-key="' + esc(report.id) + '">Download training report</button>'
        + '<button class="text-button protocol-clear" type="button" data-action="protocol-restart">Practice again</button>' + sourcesHTML();
    }
    const progressBar = '<div class="protocol-progress"><label for="lesson-progress">Step ' + (index + 1) + ' of ' + total + '</label><progress id="lesson-progress" max="' + total + '" value="' + count + '"></progress></div>';
    const palette = '<fieldset class="protocol-tools" ' + (pending ? 'disabled' : '') + '><legend>Tools</legend>' + tools.map(([value, name, glyph]) =>
      '<button type="button" data-action="protocol-tool" data-key="' + value + '" aria-pressed="' + (tool === value) + '">' + icon(glyph, 13) + esc(name) + '</button>').join('') + '</fieldset>';
    const controls = pending
      ? '<button type="button" class="wide-button protocol-primary" data-action="protocol-next">' + (index + 1 === total ? 'Start assessment' : 'Next step') + icon('arrow', 14) + '</button>'
      : guided ? '<button type="button" class="wide-button apply-landmark" data-action="protocol-target" ' + (tool ? '' : 'disabled') + '>Apply to ' + esc(target) + '</button>'
      : '<label class="landmark-choice">Keyboard target<select data-protocol-target ' + (tool ? '' : 'disabled') + '><option value="">Choose a visible structure</option>'
        + step.visible.map(id => '<option value="' + esc(id) + '">' + esc(findPart(id)?.name ?? id) + '</option>').join('') + '</select></label>';
    return header + progressBar + '<h3 class="lesson-step-title">' + esc(step.title) + '</h3><p class="lesson-instruction">' + esc(step.instruction) + '</p>' + palette + controls + feedback
      + '<div class="lesson-nav"><button type="button" class="text-button" data-action="protocol-back" ' + (!index ? 'disabled' : '') + '>Previous step</button>'
      + '<button type="button" class="text-button" data-action="protocol-restart">Restart</button></div>'
      + '<label class="marker-setting"><input type="checkbox" data-protocol-guided ' + (guided ? 'checked' : '') + '> Show landmark on model</label>' + sourcesHTML();
  }

  function featured() {
    return protocolLessons.map(item => '<article class="featured-protocol"><div class="lesson-meta">' + stageNames[item.stage] + ' · ' + item.steps.length + ' steps</div>'
      + '<h2>' + esc(item.title) + '</h2><p>' + esc(item.description) + '</p>'
      + '<button type="button" class="wide-button protocol-primary" data-action="protocol-open" data-key="' + esc(item.id) + '">' + (progress.draft(item.id) ? 'Resume lesson' : progress.state.completed.includes(item.id) ? 'Practice again' : 'Start 3D lesson') + icon('arrow', 14) + '</button></article>').join('');
  }

  function recordDetails(item) {
    const groups = [['Tissue', item.tissue], ['Instruments', item.instruments], ['Materials', item.reagents], ['Prerequisites', item.prerequisites],
      ['Procedure overview', item.procedure], ['Expected outcomes', item.outcomes], ['Troubleshooting', item.troubleshooting], ['Safety notes', item.safety]];
    return '<details class="record-details"><summary>Methods record</summary><dl>'
      + '<dt>Citation</dt><dd>' + esc(item.citation || item.publisher) + '</dd>'
      + (item.doi ? '<dt>DOI</dt><dd>' + esc(item.doi) + '</dd>' : '')
      + '<dt>Source check</dt><dd>' + esc(item.verification?.date) + ' · ' + esc(item.verification?.sourceStatus?.replaceAll('-', ' ')) + '</dd>'
      + '<dt>Evidence</dt><dd>' + (item.validation?.procedure === 'published-method' ? 'Published method' : 'Institutional reference')
      + (item.lesson ? ' · Educational prototype awaiting review' : '') + '</dd>'
      + groups.filter(([, values]) => values?.length).map(([title, values]) => '<dt>' + title + '</dt><dd>' + values.map(esc).join(' · ') + '</dd>').join('')
      + '</dl></details>';
  }

  function resultCards() {
    const terms = filters.search.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const results = inventory.filter(item => {
      if (filters.stage && item.stage !== filters.stage && item.stage !== 'multiple') return false;
      if (filters.category && item.category !== filters.category) return false;
      if (filters.publisher && item.publisher !== filters.publisher) return false;
      if (filters.format && (filters.format === 'interactive') !== !!item.lesson) return false;
      const searchable = [item.title, item.summary, item.category, item.publisher, item.stage, stageNames[item.stage], ...item.tissue, ...item.instruments, ...item.outcomes].join(' ').toLowerCase();
      return terms.every(term => searchable.includes(term));
    });
    const heading = '<p class="protocol-count" role="status">' + results.length + ' of ' + inventory.length + ' references</p>';
    if (!results.length) return heading + '<div class="protocol-empty">No matches. Try a different search or clear the filters.</div>';
    return heading + '<div class="protocol-results">' + results.map(item =>
      '<article class="reference-card"><div class="lesson-meta">' + esc(item.publisher) + ' · ' + esc(stageNames[item.stage]) + ' · ' + esc(item.category) + '</div>'
      + '<h3>' + esc(item.title) + '</h3><p>' + esc(item.summary) + '</p><div class="reference-actions">'
      + '<a href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">Read source ↗</a>'
      + (item.lesson ? '<button type="button" class="text-button" data-action="protocol-open" data-key="' + esc(item.lesson) + '">Practice in 3D ' + icon('arrow', 12) + '</button>' : '<span>Reference only</span>')
      + '</div>' + recordDetails(item) + '</article>').join('') + '</div>';
  }

  function library() {
    return '<div class="protocol-library-inner"><header class="protocol-heading"><h1>Protocol library</h1>'
      + '<p>Practice fruit fly dissections using the adult and third-instar larval models. Browse the linked methods for lab-specific procedures.</p></header>'
      + '<div class="featured-protocols" aria-label="Interactive 3D lessons">' + featured() + '</div>'
      + '<section class="protocol-index" aria-labelledby="index-heading"><div class="protocol-index-head"><h2 id="index-heading">Published methods</h2>'
      + '<div class="search">' + icon('search') + '<label for="protocol-search" class="sr-only">Search protocols</label><input id="protocol-search" data-protocol-filter="search" type="search" placeholder="Search by tissue, method or source" value="' + esc(filters.search) + '"></div></div>'
      + '<div id="protocol-results">' + resultCards() + '</div></section></div>';
  }

  return {
    get lesson() { return lesson; },
    get tool() { return tool; },
    get step() { return current(); },
    get marker() {
      const step = current();
      return step && guided && !pending && phase === 'practice'
        ? { id: step.target, point: step.point, label: step.landmark ?? findPart(step.target)?.name ?? step.target }
        : null;
    },
    get completeStep() { return pending; },
    get phase() { return phase; },
    get stageText() { return lesson && ({ setup: 'Prepare the bench', assessment: 'Review the preparation', result: 'Training complete' }[phase] ?? current().title); },
    get extracted() { return extracted(); },
    attempt,
    action,
    replay,
    sidebar,
    library,
    resultCards,
    setFilter(name, value) { if (Object.hasOwn(filters, name)) filters[name] = value; },
  };
}

