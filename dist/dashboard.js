import { protocolLessons } from './protocol-lessons.js';
import { trainingDefinitions } from './training-definitions.js';
import { inventory } from './protocol-inventory.js';

const lessonById = new Map(protocolLessons.map(lesson => [lesson.id, lesson]));
const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

function formatDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Recent' : date.format(parsed);
}

function actionButton(action, key, label, esc, className = 'small-button') {
  return '<button type="button" class="' + className + '" data-action="' + action + '" data-key="' + esc(key) + '">' + esc(label) + '</button>';
}

export function dashboardHtml(progress, esc) {
  const { plan, reports, drafts, recent, mode, completed } = progress.state;
  const ready = protocolLessons.length;
  const resume = recent.find(item => Object.hasOwn(drafts, item.lessonId))?.lessonId;
  const lessons = protocolLessons.map(lesson => {
    const active = Object.hasOwn(drafts, lesson.id);
    const meta = esc(lesson.stage === 'larva' ? 'Third-instar larva' : 'Adult');
    return '<article class="lab-lesson-card"><div class="lesson-meta">' + meta + ' · ' + lesson.steps.length + ' dissection actions</div>'
      + '<h3>' + esc(lesson.title) + '</h3><p>' + esc(trainingDefinitions[lesson.id].goal) + '</p>'
      + '<div class="dashboard-actions">' + actionButton('launch-lab', lesson.id, active ? 'Resume practice' : 'Open bench', esc, 'small-button protocol-primary')
      + actionButton('training-plan-toggle', lesson.id, plan.includes(lesson.id) ? 'Remove from plan' : 'Add to plan', esc, 'text-button') + '</div></article>';
  }).join('');

  const sequence = plan.length ? '<ol class="dashboard-queue">' + plan.map((id, index) => {
    const lesson = lessonById.get(id);
    return '<li><div class="queue-copy"><strong>' + esc(lesson.title) + '</strong><div>' + (completed.includes(id) ? 'Completed' : 'In plan') + '</div></div>'
      + '<div class="queue-controls">'
      + '<button type="button" class="text-button" data-action="training-plan-up" data-key="' + esc(id) + '" aria-label="Move ' + esc(lesson.title) + ' earlier" ' + (index === 0 ? 'disabled' : '') + '>↑</button>'
      + '<button type="button" class="text-button" data-action="training-plan-down" data-key="' + esc(id) + '" aria-label="Move ' + esc(lesson.title) + ' later" ' + (index === plan.length - 1 ? 'disabled' : '') + '>↓</button>'
      + '<button type="button" class="text-button" data-action="training-plan-toggle" data-key="' + esc(id) + '" aria-label="Remove ' + esc(lesson.title) + ' from plan">×</button></div></li>';
  }).join('') + '</ol>' + actionButton('training-plan-export', '', 'Export checklist', esc)
    : '<p>Add a dissection to build your training sequence.</p>';
  const history = reports.length ? '<ul class="training-history">' + reports.slice(0, 8).map(report =>
    '<li><div><strong>' + esc(lessonById.get(report.lessonId).title) + '</strong><small>' + esc(formatDate(report.completedAt)) + ' · ' + esc(report.score) + ' / ' + trainingDefinitions[report.lessonId].questions.length + ' concepts</small></div>'
    + actionButton('training-report-export', report.id, 'Report', esc, 'text-button') + '</li>').join('') + '</ul>'
    : '<p>Completed assessments will appear here.</p>';
  const recentHTML = recent.length ? '<ul class="training-history">' + recent.map(item =>
    '<li><div><strong>' + esc(lessonById.get(item.lessonId).title) + '</strong><small>' + esc(formatDate(item.at)) + '</small></div>'
    + actionButton('launch-lab', item.lessonId, Object.hasOwn(drafts, item.lessonId) ? 'Resume' : 'Reopen', esc, 'text-button') + '</li>').join('') + '</ul>'
    : '<p>Open a bench to begin a training session.</p>';

  return '<div class="dashboard-inner">'
    + '<section class="dashboard-intro" aria-labelledby="dashboard-title"><div><h1 id="dashboard-title">FlyLab 3D</h1>'
    + '<p><strong>Interactive Virtual Drosophila Research Laboratory</strong><br>Explore, learn, and experiment in a virtual <i>Drosophila</i> laboratory.</p>'
    + '<div class="dashboard-actions">'
    + (resume ? actionButton('launch-lab', resume, 'Resume last session', esc, 'small-button protocol-primary') : actionButton('mode', 'protocols', 'Browse protocol library', esc, 'small-button protocol-primary'))
    + actionButton('mode', 'labs', 'Open laboratories', esc) + actionButton('mode', 'anatomy', 'Explore 3D anatomy', esc) + actionButton('mode', 'living', 'Meet the interactive fly', esc) + '</div></div>'
    + '<div class="dashboard-stats" aria-label="Laboratory coverage"><div><strong>' + ready + '</strong><span>Training lessons</span></div><div><strong>' + inventory.length + '</strong><span>Published references</span></div><div><strong>' + completed.length + '/' + ready + '</strong><span>Lessons completed</span></div></div>'
    + '</section>'
    + '<div class="dashboard-columns"><div class="dashboard-main">'
    + '<section aria-labelledby="benches-title"><div class="dashboard-section-title"><h2 id="benches-title">Dissection benches</h2><span>Educational prototypes</span></div>'
    + '<div class="dashboard-lessons">' + lessons + '</div></section>'
    + '<section class="dashboard-block" aria-labelledby="history-title"><h2 id="history-title">Training records</h2>' + history + '</section>'
    + '</div><aside class="dashboard-aside" aria-label="Training preferences and plan">'
    + '<section class="dashboard-block"><h2>Practice mode</h2><div class="dashboard-modes" aria-label="Practice mode">'
    + ['guided', 'independent'].map(item => '<button type="button" class="small-button" data-action="training-mode" data-key="' + item + '" aria-pressed="' + (mode === item) + '">' + (item === 'guided' ? 'Guided' : 'Independent') + '</button>').join('')
    + '</div><p>' + (mode === 'guided' ? 'Landmark markers are shown when you start a lesson.' : 'Locate the anatomy yourself. You can reveal a marker if you need help.') + '</p></section>'
    + '<section class="dashboard-block"><h2>Training plan</h2>' + sequence + '</section>'
    + '<section class="dashboard-block"><h2>Recent sessions</h2>' + recentHTML + '</section>'
    + '<section class="dashboard-block researcher-preview" aria-labelledby="dashboard-researcher-title">'
    + '<h2 id="dashboard-researcher-title">About the Researcher</h2>'
    + '<div class="researcher-identity"><span class="researcher-avatar" aria-hidden="true">MA</span><div>'
    + '<h3>Muhammad Atif</h3><p class="researcher-role">Researcher &amp; FlyLab 3D Developer</p></div></div>'
    + '<p class="researcher-affiliation">Kookmin University, Seoul, South Korea</p>'
    + '<button class="small-button researcher-link" type="button" data-action="researcher-profile" aria-haspopup="dialog">Read researcher profile <span aria-hidden="true">↗</span></button></section>'
    + '</aside></div>'
    + '<section class="dashboard-note"><h2>Scientific scope</h2><p>The 3D specimens are schematic. Lessons are original educational prototypes based on linked methods and are awaiting expert review.</p>'
    + '<p><a href="https://www.virtualflybrain.org/" target="_blank" rel="noopener noreferrer">Explore reference neuroanatomy at Virtual Fly Brain ↗</a></p></section></div>';
}

