import { inventory } from './protocol-inventory.js';
import { blankPlan, normalizePlan, planChecks, encodePlan, decodePlan, planChecklist } from './plans-core.js';
import { analyses } from './analysis-core.js';

const storeKey = 'flylab.research.plans.v1';
const sourceById = new Map(inventory.map(source => [source.id, source]));
const roomPattern = /^([a-f0-9]{12})\.([a-f0-9]{40})$/;
function stored() {
  try {
    const items = JSON.parse(localStorage.getItem(storeKey) ?? '[]');
    return Array.isArray(items) ? items.slice(0, 20).map(item => ({ id: String(item.id), plan: normalizePlan(item.plan) })) : [];
  } catch { return []; }
}
function write(items) { try { localStorage.setItem(storeKey, JSON.stringify(items)); } catch { /* Keep plans in memory. */ } }

export function createResearchPlanner({ escapeHtml: e, download, announce }) {
  let plan = { ...blankPlan }, saved = stored(), selected = '', status = '', roomCode = '', revision = null, shared = null, pending = false;
  const isHttp = () => typeof location !== 'undefined' && ['http:', 'https:'].includes(location.protocol);

  function input(field, label, { type = 'text', placeholder = '', long = false } = {}) {
    return '<label class="lab-field"><span>' + label + '</span>'
      + (long ? '<textarea name="' + field + '" maxlength="800" rows="3" placeholder="' + e(placeholder) + '">' + e(plan[field]) + '</textarea>'
        : '<input name="' + field + '" type="' + type + '" value="' + e(plan[field]) + '" placeholder="' + e(placeholder) + '"' + (type === 'number' ? ' min="1" max="100000" step="1"' : ' maxlength="150"') + '>')
      + '</label>';
  }

  function option(value, label, choice) {
    return '<option value="' + e(value) + '"' + (choice === value ? ' selected' : '') + '>' + e(label) + '</option>';
  }
  function checkItems() {
    return planChecks(plan).map(([label, ok]) => '<li><span aria-hidden="true">' + (ok ? '✓' : '○')
      + '</span>' + e(label) + '<span class="sr-only">' + (ok ? 'Complete' : 'Still open') + '</span></li>').join('');
  }

  function render() {
    return '<section class="lab-section"><h1>Research planner</h1><p>Draft a study, link a published method, and share a review copy.</p>'
      + '<div class="lab-grid lab-grid--analysis"><form data-plan-form class="lab-card"><h2>Experimental design</h2>'
      + input('title', 'Plan name') + input('objective', 'Research question', { long: true }) + input('hypothesis', 'Hypothesis', { long: true })
      + '<label class="lab-field"><span>Published method</span><select name="protocol">' + option('', 'Choose a reference', plan.protocol)
      + inventory.map(source => option(source.id, source.title, plan.protocol)).join('') + '</select></label>'
      + '<div class="lab-fields">' + input('control', 'Control condition') + input('test', 'Comparison condition') + input('unit', 'Independent unit', { placeholder: 'e.g., vial or individual' })
      + input('replicates', 'Replicate target per group', { type: 'number' }) + '</div>' + input('outcome', 'Primary measured outcome', { long: true })
      + '<label class="lab-field"><span>Planned analysis</span><select name="assay">' + Object.entries(analyses).map(([key, entry]) => option(key, entry.title, plan.assay)).join('') + '</select></label>'
      + input('allocation', 'Allocation and blinding approach', { long: true }) + input('exclusions', 'Exclusions and missing observations', { long: true })
      + input('endpoint', 'Review checkpoint date', { type: 'date' })
      + '<div class="lab-controls"><button type="submit" class="protocol-primary">Save plan</button><button type="button" data-plan-action="new">New draft</button>'
      + '<button type="button" data-plan-action="json">Export plan JSON</button><button type="button" data-plan-action="checklist">Export checklist</button></div></form>'
      + '<div class="lab-card-stack"><article class="lab-card"><h2>Saved and shared plans</h2>'
      + (saved.length ? '<label class="lab-field"><span>Open a saved plan</span><select data-saved-plan>' + option('', 'Choose a plan', selected)
        + saved.map(item => option(item.id, item.plan.title || 'Untitled plan', selected)).join('') + '</select></label>' : '<p>Save a plan to find it here later.</p>')
      + '<label class="lab-field"><span>Open a shared FlyLab plan</span><input type="file" accept=".json,application/json" data-plan-file></label>'
      + '<p class="lab-muted">JSON exports contain the draft fields. Analysis datasets are kept in their own workspace.</p>'
      + '<p class="lab-status" role="status">' + e(status) + '</p></article>'
      + '<article class="lab-card"><h2>Design checks</h2><ul class="plan-checks" data-plan-checks>' + checkItems()
      + '</ul>' + (sourceById.has(plan.protocol) ? '<p><a href="' + e(sourceById.get(plan.protocol).url) + '" target="_blank" rel="noopener noreferrer">Open selected reference ↗</a></p>' : '') + '</article>'
      + '<article class="lab-card"><h2>Live review room</h2>'
      + (isHttp() ? '<p>With the optional FlyLab relay running, share a room code with a reviewer. Publishing sends the current plan draft to everyone holding the code.</p>'
        + '<label class="lab-field"><span>Room code</span><input data-room-code type="text" value="' + e(roomCode) + '" maxlength="53" autocomplete="off"></label>'
        + '<div class="lab-controls"><button data-plan-action="room-create" type="button"' + (pending ? ' disabled' : '') + '>Share draft in a new room</button>'
        + '<button data-plan-action="room-read" type="button"' + (pending ? ' disabled' : '') + '>Fetch shared draft</button>'
        + '<button data-plan-action="room-write" type="button"' + (pending || revision === null ? ' disabled' : '') + '>Publish an update</button></div>'
        + (shared ? '<p>' + e(shared.plan.title || 'Shared plan') + ' · revision ' + shared.revision + '</p><button type="button" data-plan-action="room-use">Open shared copy</button>' : '')
        : '<p>Use plan JSON for offline handoff. Run the optional FlyLab relay to enable live review rooms.</p>')
      + '</article></div></div></section>';
  }

  function bind(root) {
    function readForm() {
      const form = root.querySelector('[data-plan-form]');
      if (form) plan = normalizePlan(Object.fromEntries(new FormData(form)));
    }
    function redraw() { root.innerHTML = render(); announce(status); }
    function handleCode() {
      const current = root.querySelector('[data-room-code]')?.value.trim() ?? '';
      if (current !== roomCode) { roomCode = current; revision = null; shared = null; }
    }
    async function room(action) {
      if (!isHttp() || pending) return;
      handleCode();
      const creating = action === 'room-create';
      const reading = action === 'room-read';
      const match = roomPattern.exec(roomCode);
      if (!creating && !match) { status = 'Enter a FlyLab room code.'; redraw(); return; }
      if (!creating && !reading && revision === null) { status = 'Fetch the room draft before publishing an update.'; redraw(); return; }
      if (!reading && !plan.title) { status = 'Give the plan a name before sharing.'; redraw(); return; }
      pending = true;
      status = 'Contacting the FlyLab relay…';
      redraw();
      try {
        const route = '/api/flylab/rooms' + (creating ? '' : '/' + match[1]);
        const reply = await fetch(route, {
          method: creating ? 'POST' : reading ? 'GET' : 'PUT',
          headers: { 'Content-Type': 'application/json', ...(creating ? {} : { Authorization: 'Bearer ' + match[2] }) },
          cache: 'no-store',
          body: reading ? undefined : JSON.stringify(creating ? { plan } : { plan, revision }),
        });
        if (reply.status === 409) { revision = null; throw new Error('A newer revision exists. Fetch the shared draft before publishing.'); }
        if (!reply.ok) throw new Error(reply.status === 404 ? 'The relay or review room is unavailable.' : 'The relay rejected this request.');
        const payload = await reply.json();
        if (!Number.isSafeInteger(payload.revision)) throw new Error('The relay returned invalid room information.');
        if (creating && roomPattern.test(payload.code)) roomCode = payload.code;
        revision = payload.revision;
        shared = { plan: normalizePlan(payload.plan), revision };
        status = creating ? 'Room created. Share the room code privately.' : reading ? 'Shared draft fetched. Open it to edit a local copy.' : 'Shared revision updated.';
      } catch (error) { status = error.message; }
      finally { pending = false; redraw(); }
    }

    root.addEventListener('input', event => {
      if (event.target.matches('[data-room-code]')) handleCode();
      if (event.target.closest('[data-plan-form]')) {
        readForm();
        root.querySelector('[data-plan-checks]').innerHTML = checkItems();
      }
    });
    root.addEventListener('submit', event => {
      if (!event.target.matches('[data-plan-form]')) return;
      event.preventDefault();
      readForm();
      if (!plan.title) { status = 'Give the plan a name before saving.'; redraw(); return; }
      if (!selected) selected = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
      saved = [{ id: selected, plan }, ...saved.filter(item => item.id !== selected)].slice(0, 20);
      write(saved);
      status = 'Plan saved in this browser.';
      redraw();
    });
    root.addEventListener('change', async event => {
      if (event.target.matches('[data-saved-plan]')) {
        const item = saved.find(entry => entry.id === event.target.value);
        if (item) { selected = item.id; plan = { ...item.plan }; status = 'Saved plan opened.'; redraw(); }
      } else if (event.target.matches('[data-plan-file]') && event.target.files?.[0]) {
        try {
          const file = event.target.files[0];
          if (file.size > 32768) throw new Error('Use a FlyLab plan under 32 KiB.');
          plan = decodePlan(await file.text()); selected = ''; status = 'Shared plan opened as a local draft.';
        } catch (error) { status = error.message; }
        redraw();
      }
    });
    root.addEventListener('click', event => {
      const action = event.target.closest('[data-plan-action]')?.dataset.planAction;
      if (!action) return;
      readForm();
      if (action === 'new') { plan = { ...blankPlan }; selected = ''; status = 'New draft.'; redraw(); }
      else if (action === 'json') download('FlyLab_Research_Plan.json', encodePlan(plan), 'application/json;charset=utf-8');
      else if (action === 'checklist') download('FlyLab_Research_Plan_Checklist.txt', planChecklist(plan, sourceById.get(plan.protocol)), 'text/plain;charset=utf-8');
      else if (action === 'room-use' && shared) {
        plan = { ...shared.plan }; selected = ''; status = 'Shared copy opened. Save a local copy or publish changes to the room.'; redraw();
      } else if (action.startsWith('room-')) void room(action);
    });
  }

  return { render, bind };
}

