import { protocolLessons } from './protocol-lessons.js';

const assignmentKind = 'flylab-assignment';
const reportKind = 'flylab-assignment-progress';
const version = 1;
const storageKey = 'flylab.course.v1';
const maximumFileSize = 256 * 1024;
const maximumSubmissions = 100;
const lessonById = new Map(protocolLessons.map(lesson => [lesson.id, lesson]));
const panes = [['compose', 'Assignment composer'], ['learn', 'Learner progress'], ['review', 'Instructor review']];
const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

function cleanText(value, maximum) {
  return typeof value === 'string' ? value.trim().slice(0, maximum) : '';
}

function validId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{12,64}$/.test(value);
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 13) + '-course';
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function timestamp(value) {
  if (typeof value !== 'string' || value.length > 40 || !Number.isFinite(Date.parse(value))) return '';
  return new Date(value).toISOString();
}

export function validateAssignment(input) {
  if (!input || input.kind !== assignmentKind || input.version !== version || !validId(input.id)) {
    throw new Error('Choose a FlyLab assignment file.');
  }
  const title = cleanText(input.title, 100);
  const instructions = cleanText(input.instructions, 1200);
  const due = input.due ?? '';
  if (!title || (due !== '' && !validDate(due))) throw new Error('The assignment needs a title and a valid optional due date.');
  if (!Array.isArray(input.lessons) || !input.lessons.length || input.lessons.length > lessonById.size ||
      new Set(input.lessons).size !== input.lessons.length || !input.lessons.every(id => lessonById.has(id))) {
    throw new Error('The assignment must contain unique FlyLab dissection lessons.');
  }
  return { kind: assignmentKind, version, id: input.id, title, instructions, due, lessons: [...input.lessons] };
}

function readEntry(entry, allowed) {
  if (!entry || !allowed.has(entry.lessonId)) return null;
  const completedAt = timestamp(entry.completedAt);
  if (!completedAt || !Number.isInteger(entry.total) || entry.total < 1 || entry.total > 100 ||
      !Number.isInteger(entry.score) || entry.score < 0 || entry.score > entry.total) return null;
  return { lessonId: entry.lessonId, completedAt, score: entry.score, total: entry.total };
}

export function summarizeCourseReports(records, assignment) {
  const reports = new Map();
  const allowed = new Set(assignment.lessons);
  for (const record of Array.isArray(records) ? records : []) {
    const lesson = lessonById.get(record?.lessonId);
    if (!lesson || record.completedSteps !== lesson.steps.length) continue;
    const entry = readEntry({ lessonId: record.lessonId, completedAt: record.completedAt, score: record.score,
      total: Array.isArray(record.answers) ? record.answers.length : 0 }, allowed);
    if (!entry || (reports.has(entry.lessonId) && reports.get(entry.lessonId).completedAt >= entry.completedAt)) continue;
    reports.set(entry.lessonId, entry);
  }
  return assignment.lessons.flatMap(id => reports.has(id) ? [reports.get(id)] : []);
}

export function validateCourseProgress(input, assignment) {
  if (!input || input.kind !== reportKind || input.version !== version || !validId(input.submissionId) || !timestamp(input.exportedAt)) {
    throw new Error('Choose a FlyLab learner progress file.');
  }
  if (input.assignmentId !== assignment.id) throw new Error('This progress file belongs to a different assignment.');
  if (!Array.isArray(input.reports) || input.reports.length > assignment.lessons.length) throw new Error('The progress file contains an invalid report list.');
  const allowed = new Set(assignment.lessons);
  const reports = input.reports.map(entry => readEntry(entry, allowed));
  if (reports.some(entry => !entry) || new Set(reports.map(entry => entry.lessonId)).size !== reports.length) {
    throw new Error('Each completed lesson must have a valid score and completion date.');
  }
  return { kind: reportKind, version, submissionId: input.submissionId, assignmentId: assignment.id,
    exportedAt: timestamp(input.exportedAt), alias: cleanText(input.alias, 40), reports };
}

function readSavedCourse() {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    return { assignment: validateAssignment(data?.assignment), submissionId: validId(data?.submissionId) ? data.submissionId : newId() };
  } catch {
    return { assignment: null, submissionId: newId() };
  }
}

function saveCourse(assignment, submissionId) {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ assignment, submissionId }));
  } catch {
    // The current session remains usable when browser storage is unavailable.
  }
}

async function readJsonFile(file) {
  if (file.size > maximumFileSize) throw new Error('The file exceeds the 256 KB import limit.');
  try {
    return JSON.parse(await file.text());
  } catch {
    throw new Error('The file could not be read as JSON.');
  }
}

function csvCell(value) {
  let string = String(value ?? '');
  if (typeof value !== 'number' && /^[\s]*[=+\-@\t\r\n]/.test(string)) string = "'" + string;
  return '"' + string.replaceAll('"', '""') + '"';
}

function csv(rows) {
  return '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function createCourseLab({ escapeHtml, download, announce, readTrainingReports }) {
  const esc = escapeHtml;
  let { assignment, submissionId } = readSavedCourse();
  let pane = 'compose';
  let submissions = new Map();
  let status = '';
  let alias = '';
  let busy = false;

  function report(message) {
    status = message;
    announce?.(message);
  }

  function replaceAssignment(next) {
    if (assignment?.id !== next.id) {
      submissionId = newId();
      submissions.clear();
    }
    assignment = next;
    saveCourse(assignment, submissionId);
  }

  function assignmentDetails() {
    if (!assignment) return '<p>Load or create an assignment to get started.</p>';
    return '<h3>' + esc(assignment.title) + '</h3>'
      + (assignment.due ? '<p>Suggested due date <time datetime="' + esc(assignment.due) + '">' + esc(assignment.due) + '</time></p>' : '')
      + (assignment.instructions ? '<p style="white-space:pre-wrap">' + esc(assignment.instructions) + '</p>' : '');
  }

  function renderComposer() {
    const chosen = new Set(assignment?.lessons ?? lessonById.keys());
    return '<div class="lab-grid"><section class="lab-card"><h3>Compose an assignment</h3>'
      + '<form class="lab-controls" data-course-form="compose"><label class="lab-field">Assignment title<input name="title" maxlength="100" required value="' + esc(assignment?.title ?? '') + '" placeholder="e.g. Neuroanatomy practical"></label>'
      + '<label class="lab-field">Due date<input name="due" type="date" value="' + esc(assignment?.due ?? '') + '"></label>'
      + '<label class="lab-field">Learner instructions<textarea name="instructions" rows="3" maxlength="1200" placeholder="Optional objectives or reflection prompts">' + esc(assignment?.instructions ?? '') + '</textarea></label>'
      + '<fieldset><legend>Required lessons</legend>' + protocolLessons.map(lesson => '<label style="display:block"><input type="checkbox" name="lessons" value="' + esc(lesson.id) + '"' + (chosen.has(lesson.id) ? ' checked' : '') + '> ' + esc(lesson.title) + '</label>').join('')
      + '</fieldset><button type="submit">Save assignment</button></form></section>'
      + '<section class="lab-card"><h3>Share assignment</h3>' + assignmentDetails()
      + (assignment ? '<p>Send the assignment JSON file to learners. They can open it in their own FlyLab workspace and export a separate progress file.</p><button type="button" data-course="assignment-export">Export assignment JSON</button>' : '')
      + '</section></div>';
  }

  function getReports() {
    return assignment ? summarizeCourseReports(readTrainingReports?.(), assignment) : [];
  }

  function assignmentImport(label) {
    return '<label class="lab-field">' + label + '<input type="file" accept=".json,application/json" data-course-file="assignment"' + (busy ? ' disabled' : '') + '></label>';
  }

  function renderLearner() {
    const reports = getReports();
    const records = new Map(reports.map(entry => [entry.lessonId, entry]));
    return '<div class="lab-grid"><section class="lab-card">' + assignmentDetails()
      + (assignment ? '<p><strong>' + reports.length + ' of ' + assignment.lessons.length + '</strong> required lessons complete in this browser.</p><ul>'
        + assignment.lessons.map(id => {
          const record = records.get(id);
          return '<li><strong>' + esc(lessonById.get(id).title) + '</strong> · ' + (record ? record.score + ' of ' + record.total + ' concepts correct' : 'Ready to start') + '</li>';
        }).join('') + '</ul><p>Open Protocols to complete the listed 3D lessons, then return here to export your progress.</p>' : '')
      + assignmentImport('Import assignment JSON') + '</section><section class="lab-card"><h3>Share your progress</h3>'
      + '<p>The file includes the latest local score for each completed required lesson. You may add a course alias to help an instructor identify your packet.</p>'
      + '<form class="lab-controls" data-course-form="progress"><label class="lab-field">Course alias (optional)<input name="alias" maxlength="40" value="' + esc(alias) + '"></label>'
      + '<button type="submit"' + (!assignment ? ' disabled' : '') + '>Export learner progress JSON</button></form></section></div>';
  }

  function aggregate() {
    if (!assignment) return [];
    return assignment.lessons.map(lessonId => {
      const completed = [...submissions.values()].flatMap(packet => packet.reports.filter(entry => entry.lessonId === lessonId));
      const mean = completed.length ? completed.reduce((total, item) => total + 100 * item.score / item.total, 0) / completed.length : null;
      return { lessonId, title: lessonById.get(lessonId).title, completed: completed.length, received: submissions.size, mean };
    });
  }

  function renderReviewer() {
    return '<div class="lab-grid"><section class="lab-card"><h3>Import completed work</h3>'
      + assignmentImport('Load the course assignment JSON')
      + (assignment ? '<p>Active assignment <strong>' + esc(assignment.title) + '</strong></p>'
        + '<label class="lab-field">Add learner progress JSON files<input type="file" accept=".json,application/json" data-course-file="progress" multiple' + (busy ? ' disabled' : '') + '></label>' : '<p>Load an assignment before importing learner progress.</p>')
      + '<p>Progress packets are self-reported simulation records. Review imports stay in this browser session.</p></section>'
      + '<section class="lab-card"><h3>Module summary</h3>'
      + (submissions.size ? '<p><strong>' + submissions.size + '</strong> distinct progress packets received.</p><ul>' + aggregate().map(item =>
        '<li><strong>' + esc(item.title) + '</strong> · ' + item.completed + ' of ' + item.received + ' completed'
        + (item.mean === null ? '' : ' · Mean score ' + numberFormat.format(item.mean) + '%') + '</li>').join('')
        + '</ul><details><summary>Individual packets</summary><ul>' + [...submissions.values()].map((packet, index) =>
          '<li>' + esc(packet.alias || 'Packet ' + (index + 1)) + ' · ' + packet.reports.length + ' of ' + assignment.lessons.length + ' complete</li>').join('')
        + '</ul></details><button type="button" data-course="summary-export">Export module summary CSV</button>'
        : '<p>Imported packets will appear here.</p>') + '</section></div>';
  }

  function render() {
    return '<div class="lab-section"><h2>Learning and assessment</h2><p>Assign dissection lessons and collect browser-local training results through exchangeable files.</p>'
      + '<nav class="lab-controls" aria-label="Course workspace">' + panes.map(([id, label]) =>
        '<button type="button" data-course="' + id + '" aria-pressed="' + (id === pane) + '">' + esc(label) + '</button>').join('') + '</nav>'
      + '<p role="status" tabindex="-1" data-course-status>' + esc(status) + '</p>'
      + (pane === 'compose' ? renderComposer() : pane === 'learn' ? renderLearner() : renderReviewer()) + '</div>';
  }

  function bind(root) {
    function refresh(selector = '[data-course-status]') {
      root.innerHTML = render();
      root.querySelector(selector)?.focus();
    }

    root.onsubmit = event => {
      const form = event.target;
      const operation = form.dataset.courseForm;
      if (!operation) return;
      event.preventDefault();
      if (busy) return;
      const data = new FormData(form);
      if (operation === 'compose') {
        try {
          const title = cleanText(data.get('title'), 100);
          const instructions = cleanText(data.get('instructions'), 1200);
          const due = cleanText(data.get('due'), 10);
          const lessons = data.getAll('lessons');
          const staysSame = assignment && assignment.title === title && assignment.instructions === instructions && assignment.due === due
            && assignment.lessons.join('\n') === lessons.join('\n');
          const next = validateAssignment({ kind: assignmentKind, version, id: staysSame ? assignment.id : newId(), title, instructions, due, lessons });
          replaceAssignment(next);
          report('Assignment saved. Export the JSON file to share it.');
        } catch (error) {
          report(error.message);
          const message = root.querySelector('[data-course-status]');
          if (message) message.textContent = status;
          return;
        }
      } else if (operation === 'progress' && assignment) {
        alias = cleanText(data.get('alias'), 40);
        const packet = { kind: reportKind, version, assignmentId: assignment.id, submissionId,
          exportedAt: new Date().toISOString(), alias, reports: getReports() };
        download('flylab-learner-progress.json', JSON.stringify(packet, null, 2) + '\n', 'application/json');
        report('Exported progress for ' + packet.reports.length + ' completed lessons.');
      }
      refresh();
    };

    root.onclick = event => {
      const button = event.target.closest('[data-course]');
      if (!button || button.disabled) return;
      const action = button.dataset.course;
      if (panes.some(([id]) => id === action)) {
        pane = action;
        status = '';
        refresh('[data-course="' + action + '"]');
      } else if (action === 'assignment-export' && assignment) {
        download('flylab-assignment.json', JSON.stringify(assignment, null, 2) + '\n', 'application/json');
      } else if (action === 'summary-export' && assignment && submissions.size) {
        const rows = aggregate().map(item => [assignment.title, item.title, item.received, item.completed, item.mean === null ? '' : Math.round(item.mean * 100) / 100]);
        download('flylab-course-summary.csv', csv([['assignment', 'lesson', 'packets_received', 'completed', 'mean_score_pct'], ...rows]), 'text/csv;charset=utf-8');
      }
    };

    root.onchange = async event => {
      const operation = event.target.dataset.courseFile;
      const files = [...(event.target.files ?? [])];
      if (!operation || busy || !files.length) return;
      busy = true;
      const boundHandler = root.onchange;
      report(operation === 'assignment' ? 'Reading the assignment file…' : 'Reading progress files…');
      refresh();
      if (operation === 'assignment') {
        try {
          replaceAssignment(validateAssignment(await readJsonFile(files[0])));
          report('Loaded the assignment "' + assignment.title + '".');
        } catch (error) {
          report(error.message);
        }
      } else if (operation === 'progress' && assignment) {
        let accepted = 0;
        let skipped = files.length > maximumSubmissions ? files.length - maximumSubmissions : 0;
        let firstError = '';
        for (const file of files.slice(0, maximumSubmissions)) {
          try {
            const packet = validateCourseProgress(await readJsonFile(file), assignment);
            const existing = submissions.get(packet.submissionId);
            if (existing && existing.exportedAt >= packet.exportedAt) {
              skipped += 1;
            } else if (!existing && submissions.size >= maximumSubmissions) {
              throw new Error('This reviewer session holds 100 distinct progress packets.');
            } else {
              submissions.set(packet.submissionId, packet);
              accepted += 1;
            }
          } catch (error) {
            skipped += 1;
            if (!firstError) firstError = error.message;
          }
        }
        report('Imported ' + accepted + ' progress packets. Skipped ' + skipped + '.' + (firstError ? ' ' + firstError : ''));
      }
      busy = false;
      if (root.isConnected !== false && boundHandler === root.onchange && root.querySelector('[data-course-status]')) refresh();
    };
  }

  return { render, bind };
}
