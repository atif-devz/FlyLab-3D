import { protocolLessons } from './protocol-lessons.js';
import { trainingDefinitions } from './training-definitions.js';

const storageKey = 'flylab.training.v1';
const lessonById = new Map(protocolLessons.map(lesson => [lesson.id, lesson]));
const emptyState = () => ({ mode: 'guided', plan: [], recent: [], drafts: {}, reports: [], completed: [] });

function load() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (value) return {
      mode: value.mode === 'independent' ? 'independent' : 'guided',
      plan: Array.isArray(value.plan) ? value.plan.filter(id => lessonById.has(id)) : [],
      recent: Array.isArray(value.recent) ? value.recent.filter(item => lessonById.has(item?.lessonId)) : [],
      drafts: value.drafts && typeof value.drafts === 'object' ? value.drafts : {},
      reports: Array.isArray(value.reports) ? value.reports.filter(item => lessonById.has(item?.lessonId) && Array.isArray(item.answers)) : [],
      completed: Array.isArray(value.completed) ? value.completed.filter(id => lessonById.has(id)) : [],
    };
    const previous = JSON.parse(localStorage.getItem('flybio.protocol-completions.v1') ?? '[]');
    return { ...emptyState(), completed: Array.isArray(previous) ? previous.filter(id => lessonById.has(id)) : [] };
  } catch {
    return emptyState();
  }
}

export function createTrainingProgress() {
  const state = load();
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* In-memory progress remains available. */ }
  }
  return {
    state,
    recordVisit(id) {
      if (!lessonById.has(id)) return;
      state.recent = [{ lessonId: id, at: new Date().toISOString() }, ...state.recent.filter(item => item.lessonId !== id)].slice(0, 4);
      save();
    },
    draft(id) { return Object.hasOwn(state.drafts, id) ? state.drafts[id] : null; },
    saveDraft(id, draft) {
      if (!lessonById.has(id)) return;
      state.drafts[id] = draft;
      save();
    },
    complete(report) {
      if (!lessonById.has(report.lessonId)) return;
      delete state.drafts[report.lessonId];
      state.reports = [report, ...state.reports.filter(item => item.id !== report.id)].slice(0, 25);
      state.completed = [...new Set([...state.completed, report.lessonId])];
      save();
    },
    setMode(mode) {
      state.mode = mode === 'independent' ? 'independent' : 'guided';
      save();
    },
    togglePlan(id) {
      if (!lessonById.has(id)) return;
      state.plan = state.plan.includes(id) ? state.plan.filter(item => item !== id) : [...state.plan, id];
      save();
    },
    movePlan(id, direction) {
      const index = state.plan.indexOf(id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= state.plan.length) return;
      [state.plan[index], state.plan[next]] = [state.plan[next], state.plan[index]];
      save();
    },
  };
}

export function scoreAssessment(id, answers) {
  const prompts = trainingDefinitions[id].questions;
  return prompts.reduce((score, prompt, index) => score + Number(prompt.answer === answers[index]), 0);
}

export function trainingReport(report) {
  const lesson = lessonById.get(report.lessonId);
  const data = trainingDefinitions[report.lessonId];
  if (!lesson || !data) return '';
  const lines = [
    'FlyLab 3D — Training report', '', lesson.title,
    'Completed (UTC): ' + report.completedAt,
    'Mode: ' + (report.mode === 'independent' ? 'Independent practice' : 'Guided practice'),
    'Simulation status: Educational prototype awaiting expert review.',
    '', 'Objective', data.goal,
    '', 'Procedure',
    ...data.readiness.map(item => '[x] ' + item.label),
    ...lesson.steps.map(step => '[x] ' + step.title),
    '', 'Results',
    'Procedure: ' + report.completedSteps + ' / ' + lesson.steps.length + ' required actions',
    'Knowledge: ' + report.score + ' / ' + data.questions.length,
    'Tool mistakes: ' + report.metrics.tool,
    'Landmark mistakes: ' + report.metrics.target,
    'Protected-tissue warnings: ' + report.metrics.protected,
    'Setup order warnings: ' + report.metrics.setup,
    'Visual guide used: ' + (report.metrics.guide ? 'Yes' : 'No'),
    '', 'Concept review',
    ...data.questions.flatMap((item, index) => [item.prompt,
      'Selected: ' + (item.choices[report.answers[index]] ?? 'Unanswered'),
      'Correct: ' + item.choices[item.answer], item.explanation]),
    '', 'Sources', ...lesson.references.map(source => source.title + ' — ' + source.url),
    '', 'The results above describe a virtual training attempt.'
  ];
  return lines.join('\n') + '\n';
}

export function trainingPlan(ids) {
  const lines = ['FlyLab 3D — Training plan', '', 'Educational simulations'];
  for (const id of ids) {
    const lesson = lessonById.get(id);
    const data = trainingDefinitions[id];
    if (!lesson || !data) continue;
    lines.push('', lesson.title, data.goal, '', 'Readiness',
      ...data.readiness.map(item => '[ ] ' + item.label), '', 'Practice',
      ...lesson.steps.map(item => '[ ] ' + item.title),
      '[ ] Submit concept assessment', '', 'Simulated endpoint',
      ...data.criteria.map(item => '[ ] ' + item), '', 'Published methods',
      ...lesson.references.map(source => source.title + ' — ' + source.url));
  }
  return lines.join('\n') + '\n';
}

