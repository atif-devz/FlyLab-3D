import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createFlyModel } from './fly-model.js';
import { createLarvaModel } from './larva-model.js';
import { createBenchGeometry } from './bench-geometry.js';

const tools = [
  ['orient', 'Orientation probe'], ['stabilize', 'Support pin'], ['open', 'Opening tool'],
  ['inspect', 'Inspection probe'], ['release', 'Fine forceps'], ['transfer', 'Transfer pipette'],
];
const labels = {
  'mouth-hooks': 'Mouth hooks', 'larval-cuticle': 'Larval body wall', spiracles: 'Spiracles',
  'larval-gut': 'Larval gut', 'larval-brain': 'Brain lobes',
  'imaginal-discs': 'Wing imaginal discs', 'eye-discs': 'Eye-antennal discs',
  cuticle: 'Adult body wall', 'male-abdomen': 'Male abdominal wall', gut: 'Adult gut', crop: 'Crop',
  eyes: 'Compound eyes', wings: 'Wings', legs: 'Legs', ovaries: 'Paired ovaries', testes: 'Paired testes',
  'accessory-glands': 'Accessory glands',
};

function step(title, tool, target, instruction, outcome, transition = '') {
  return { title, tool, target, instruction, outcome, transition };
}

export const expandedLessons = [
  {
    id: 'imaginal-discs', title: 'Larval imaginal discs', stage: 'Third-instar larva', model: 'larva',
    shell: 'larval-cuticle', target: 'imaginal-discs', exterior: ['mouth-hooks', 'spiracles'],
    reveal: ['imaginal-discs', 'eye-discs', 'larval-brain'],
    intro: 'Distinguish paired wing discs from anterior eye-antennal discs and the nearby brain lobes.',
    source: ['Dissection and immunostaining of imaginal discs', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4542997/'],
    steps: [
      step('Orient the larva', 'orient', 'mouth-hooks', 'Identify the anterior mouth hooks before locating the developing discs.', 'Anterior orientation established.'),
      step('Support the body wall', 'stabilize', 'larval-cuticle', 'Select supporting body wall away from the delicate tissues.', 'The body wall is supported.'),
      step('Expose the internal preparation', 'open', 'larval-cuticle', 'Open the virtual body wall to inspect the structures beneath it.', 'The paired discs and neighboring brain lobes are visible.', 'open'),
      step('Identify a wing disc', 'inspect', 'imaginal-discs', 'Select the paired wing discs laterally in the thoracic region. The eye-antennal discs lie farther anteriorly.', 'The wing discs are distinguished from the eye-antennal discs.'),
      step('Release the attached discs', 'release', 'larval-cuticle', 'Choose the surrounding attachment rather than pinching the epithelial sac.', 'The virtual attachments are released.', 'release'),
      step('Transfer the paired discs', 'transfer', 'imaginal-discs', 'Move the disc preparation to the receiving well for inspection.', 'Both flat epithelial sacs are retained in the isolated preparation.', 'transfer'),
    ],
  },
  {
    id: 'larval-gut', title: 'Larval gut', stage: 'Third-instar larva', model: 'larva',
    shell: 'larval-cuticle', target: 'larval-gut', exterior: ['mouth-hooks', 'spiracles'], reveal: ['larval-gut', 'larval-brain'],
    intro: 'Follow the foregut into the digestive tract and retain its anterior junction during isolation.',
    source: ['Functional analysis of the larval feeding circuit', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3991465/'],
    steps: [
      step('Orient the larva', 'orient', 'mouth-hooks', 'Locate the anterior feeding structures that lead into the foregut.', 'Anterior orientation established.'),
      step('Support the specimen', 'stabilize', 'larval-cuticle', 'Select the body wall as the support point.', 'The specimen is held by its body wall.'),
      step('Expose the gut', 'open', 'larval-cuticle', 'Open the virtual wall and leave the coiled tract undisturbed.', 'The gut and its anterior junction are visible.', 'open'),
      step('Follow digestive continuity', 'inspect', 'larval-gut', 'Trace the gut from the anterior proventricular region through the coiled tract.', 'The gut is identified by continuity and position.'),
      step('Release surrounding tissue', 'release', 'larval-cuticle', 'Select supporting wall to free the virtual attachments. Retain the anterior junction.', 'The virtual tract is free of its surroundings.', 'release'),
      step('Transfer the gut', 'transfer', 'larval-gut', 'Move the continuous digestive tract into the receiving well.', 'The virtual gut remains continuous through transfer.', 'transfer'),
    ],
  },
  {
    id: 'adult-gut', title: 'Adult gut', stage: 'Adult female', model: 'adult',
    shell: 'cuticle', target: 'gut', exterior: ['eyes', 'wings', 'legs'], reveal: ['gut', 'crop', 'ovaries'],
    intro: 'Recognize the crop as a foregut pouch and distinguish the gut from neighboring reproductive tissue.',
    source: ['Whole-mount immunostaining of the adult gastrointestinal tract', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4430120/'],
    steps: [
      step('Locate the abdomen', 'orient', 'cuticle', 'Identify the posterior body region behind the thorax.', 'The shell around the adult abdomen is identified.'),
      step('Support the fly', 'stabilize', 'cuticle', 'Select the outside of the body as a support point.', 'The outside of the specimen bears the support.'),
      step('Reveal abdominal anatomy', 'open', 'cuticle', 'Expose the abdominal cavity without touching the gut itself.', 'The digestive and reproductive structures are visible.', 'open'),
      step('Identify the crop', 'inspect', 'crop', 'Select the small digestive pouch branching from the foregut.', 'The crop is a foregut branch; the coiled gut continues posteriorly.'),
      step('Free the digestive preparation', 'release', 'cuticle', 'Choose surrounding material and retain the continuous gut.', 'The digestive preparation is freed without crushing its wall.', 'release'),
      step('Transfer the digestive tract', 'transfer', 'gut', 'Move the digestive tract and connected crop into the receiving well.', 'The crop and gut are shown together in the well.', 'transfer'),
    ],
    companions: ['crop'],
  },
  {
    id: 'ovaries', title: 'Adult ovaries', stage: 'Adult female', model: 'adult',
    shell: 'cuticle', target: 'ovaries', exterior: ['eyes', 'wings', 'legs'], reveal: ['gut', 'crop', 'ovaries'],
    intro: 'Identify the paired ovaries and their bundles of ovarioles and egg chambers.',
    source: ['Drosophila ovary dissection for ex vivo preparation', 'https://www.jove.com/t/20101/drosophila-melanogaster-ovary-dissection-technique-for-ex-vivo-tissue'],
    steps: [
      step('Identify the abdominal region', 'orient', 'cuticle', 'Select the outer shell over the reproductive tract.', 'The abdominal region is found.'),
      step('Support the body', 'stabilize', 'cuticle', 'Keep the support outside the developing egg chambers.', 'The reproductive preparation is supported from the shell.'),
      step('Reveal the ovaries', 'open', 'cuticle', 'Open the virtual abdominal wall to expose its contents.', 'The paired ovaries are visible beside the digestive tract.', 'open'),
      step('Recognize the ovarioles', 'inspect', 'ovaries', 'Look for elongated bundles containing successive egg chambers.', 'Ovariole bundles distinguish the ovaries from the coiled gut.'),
      step('Release surrounding attachments', 'release', 'cuticle', 'Work on surrounding material and preserve the egg chamber bundles.', 'The virtual ovarian pair is freed.', 'release'),
      step('Transfer the ovarian pair', 'transfer', 'ovaries', 'Lift the preparation into the receiving well.', 'The paired ovaries remain visible with ovarioles intact.', 'transfer'),
    ],
  },
  {
    id: 'testes', title: 'Adult testes', stage: 'Adult male abdomen', model: 'male',
    shell: 'male-abdomen', target: 'testes', exterior: [], reveal: ['testes', 'accessory-glands'],
    intro: 'Work on a separate male abdominal schematic. Distinguish the paired coiled testes from the accessory glands.',
    source: ['Cytological analysis of Drosophila testes', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4089415/'],
    steps: [
      step('Orient the abdomen', 'orient', 'male-abdomen', 'Locate the male abdominal preparation on the dissection stage.', 'The separate male preparation is selected.'),
      step('Support abdominal wall', 'stabilize', 'male-abdomen', 'Place the support at the wall.', 'The preparation is held outside the reproductive tract.'),
      step('Expose the reproductive tract', 'open', 'male-abdomen', 'Reveal the schematic tract inside the abdominal wall.', 'The testes and accessory glands are visible.', 'open'),
      step('Identify the coiled testes', 'inspect', 'testes', 'Use the paired coiled shape to distinguish the testes from the glands.', 'The paired testes are distinguished from accessory structures.'),
      step('Separate accessory tissue', 'release', 'accessory-glands', 'Select the accessory gland region to free the preparation while retaining both testes.', 'The glands remain behind as the testes are freed.', 'release'),
      step('Transfer the testes', 'transfer', 'testes', 'Move the paired testes into the receiving well.', 'The paired testes are isolated for anatomical inspection.', 'transfer'),
    ],
  },
];

function addPart(model, id) {
  const part = new THREE.Group();
  part.name = labels[id];
  part.userData.structureId = id;
  model.structures[id] = part;
  model.group.add(part);
  return part;
}

function surface(parent, geometry, material, point, scale) {
  const object = new THREE.Mesh(geometry, material);
  object.position.fromArray(point);
  if (scale) object.scale.fromArray(scale);
  parent.add(object);
  return object;
}

function makeAdditionalAnatomy(model, type) {
  const sphere = new THREE.SphereGeometry(1, 28, 20);
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: .58 });
  if (type === 'male') {
    const wall = addPart(model, 'male-abdomen');
    const testes = addPart(model, 'testes');
    const glands = addPart(model, 'accessory-glands');
    const brown = mat(0x946744);
    const rim = mat(0x795138);
    for (let i = 0; i < 5; i += 1) {
      const width = Math.sin((i + 1) / 6 * Math.PI) * .5 + .18;
      surface(wall, sphere, i % 2 ? rim : brown, [i * .52 - 1, -.24, 0], [.52, width, width * 1.17]);
    }
    const orange = mat(0xe8a557);
    const gland = mat(0x91bec1);
    for (const sign of [-1, 1]) {
      const points = [];
      for (let i = 0; i <= 65; i += 1) {
        const t = i / 65;
        const angle = t * Math.PI * 4.4;
        const radius = .16 + .20 * t;
        points.push(new THREE.Vector3(-.24 + Math.sin(angle) * radius, -.16 + Math.cos(angle) * radius * .65,
          sign * (.38 + t * .15)));
      }
      surface(testes, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 90, .055, 10), orange, [0, 0, 0]);
      const duct = new THREE.CatmullRomCurve3([[.04, -.20, sign * .44], [.28, -.38, sign * .32], [.59, -.38, sign * .12]].map(value => new THREE.Vector3(...value)));
      surface(testes, new THREE.TubeGeometry(duct, 23, .034, 8), orange, [0, 0, 0]);
      const lobe = surface(glands, sphere, gland, [.44, -.44, sign * .25], [.35, .13, .10]);
      lobe.rotation.y = sign * .48;
    }
    return;
  }
  const wing = addPart(model, 'imaginal-discs');
  const eye = addPart(model, 'eye-discs');
  const discSurf = mat(0xe4b456);
  const discFold = mat(0xb38435);
  const eyeDisc = mat(0x8ad6b7);
  for (const sign of [-1, 1]) {
    const z = .08 + sign * .43;
    const pouch = surface(wing, sphere, discSurf, [-.98, -.57, z], [.31, .205, .076]);
    pouch.rotation.z = sign * .17;
    const hinge = surface(wing, sphere, discFold, [-.76, -.51, z], [.16, .14, .071]);
    hinge.rotation.z = .42;
    surface(eye, sphere, eyeDisc, [-1.99, -.57, .08 + sign * .275], [.22, .15, .06]).rotation.z = -.25;
  }
}

function createWorkbench(host, lesson, onPick) {
  const model = lesson.model === 'adult' ? createFlyModel(THREE)
    : lesson.model === 'larva' ? createLarvaModel(THREE) : { group: new THREE.Group(), structures: {} };
  if (lesson.id === 'imaginal-discs' || lesson.model === 'male') makeAdditionalAnatomy(model, lesson.model);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe4eeed);
  scene.add(model.group, new THREE.HemisphereLight(0xfff9eb, 0xa4b2b6, 2.1));
  const key = new THREE.DirectionalLight(0xf7fcff, 2.3);
  key.position.set(-4, 8, 4);
  scene.add(key);
  const bench = createBenchGeometry(THREE);
  const floor = lesson.model === 'male' ? -1.15 : -1.94;
  bench.setHeight(floor);
  bench.setEnabled(true);
  bench.apply('dish', null, performance.now() - 1000, true);
  scene.add(bench.group);
  const receiver = new THREE.Mesh(
    new THREE.TorusGeometry(1.47, .046, 10, 64), new THREE.MeshStandardMaterial({ color: 0x5d8a8f, roughness: .52 }),
  );
  receiver.rotation.x = -Math.PI / 2;
  receiver.visible = false;
  scene.add(receiver);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute('aria-label', 'Orbit and select structures in the dissection specimen');
  renderer.domElement.style.display = 'block';
  host.replaceChildren(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(41, 1, .05, 75);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.minDistance = 1.6;
  orbit.maxDistance = 25;
  const box = new THREE.Box3();
  const center = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const cursor = new THREE.Vector2();
  const marker = new THREE.Mesh(new THREE.RingGeometry(.18, .225, 32),
    new THREE.MeshBasicMaterial({ color: 0x54ebcf, side: THREE.DoubleSide, depthTest: false, transparent: true }));
  marker.renderOrder = 5;
  marker.visible = false;
  scene.add(marker);

  const relevant = [lesson.shell, ...lesson.exterior, ...lesson.reveal];
  const shellSurfaces = new Set();
  const unreplaced = new Set();
  model.structures[lesson.shell].traverse(item => {
    if (item.isMesh && item.material) {
      const originals = Array.isArray(item.material) ? item.material : [item.material];
      const mats = originals.map(c => c.clone());
      item.material = Array.isArray(item.material) ? mats : mats[0];
      mats.forEach(material => shellSurfaces.add(material));
      originals.forEach(material => unreplaced.add(material));
    }
  });

  const centers = new Map();
  function location(id) {
    const item = model.structures[id];
    if (!item) return null;
    if (!centers.has(id)) {
      item.updateWorldMatrix(true, true);
      centers.set(id, box.setFromObject(item).getCenter(center).clone().sub(item.position));
    }
    return centers.get(id).clone().add(item.position);
  }

  let target = '';
  let guided = true;
  let canPick = true;
  let frameId = 0;
  let move;
  let cameraMove;
  let pointerStart;
  let released = false;
  let opened = false;

  function fit(id) {
    const point = id && location(id);
    const span = point ? box.setFromObject(model.structures[id]).getSize(new THREE.Vector3()).length() : 6.5;
    const base = point ?? new THREE.Vector3(lesson.model === 'male' ? .15 : .2, -.4, 0);
    const range = Math.max(3.4, Math.min(span * 1.35, 11.4));
    const destination = base.clone().add(new THREE.Vector3(-.34, .60, -.73).normalize().multiplyScalar(range));
    if (frameId) cameraMove = { from: camera.position.clone(), to: destination, aimFrom: orbit.target.clone(), aimTo: base, start: performance.now() };
    else {
      orbit.target.copy(base);
      camera.position.copy(destination);
      camera.updateProjectionMatrix();
      orbit.update();
    }
  }

  function resize() {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function colorShell(opacity) {
    for (const material of shellSurfaces) {
      material.opacity = opacity;
      material.transparent = opacity < 1;
      material.depthWrite = opacity > .75;
      material.needsUpdate = true;
    }
  }

  function updateVisibility() {
    const initial = [lesson.shell, ...lesson.exterior];
    const visible = new Set(move || receiver.visible ? [lesson.target, ...(lesson.companions ?? [])]
      : opened ? [lesson.shell, ...lesson.reveal] : initial);
    for (const [id, object] of Object.entries(model.structures)) object.visible = visible.has(id);
    colorShell(opened ? .16 : 1);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  fit();
  updateVisibility();
  const progress = now => {
    frameId = requestAnimationFrame(progress);
    if (cameraMove) {
      const portion = Math.min((now - cameraMove.start) / 450, 1);
      const ease = 1 - (1 - portion) ** 3;
      camera.position.lerpVectors(cameraMove.from, cameraMove.to, ease);
      orbit.target.lerpVectors(cameraMove.aimFrom, cameraMove.aimTo, ease);
      if (portion === 1) cameraMove = null;
    }
    if (move) {
      const portion = Math.min((now - move.start) / 620, 1);
      for (const { item, from, to } of move.items) item.position.lerpVectors(from, to, 1 - (1 - portion) ** 2);
      if (portion === 1) move = null;
    }
    orbit.update();
    const spot = target && location(target);
    marker.visible = !!(spot && canPick && guided);
    if (marker.visible) {
      marker.position.copy(spot);
      marker.quaternion.copy(camera.quaternion);
    }
    bench.update(now, camera, () => spot || null, true);
    renderer.render(scene, camera);
  };

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', event => { pointerStart = [event.clientX, event.clientY]; });
  canvas.addEventListener('pointerup', event => {
    if (!canPick || !pointerStart || Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 7) return;
    const rectangle = canvas.getBoundingClientRect();
    cursor.set((event.clientX - rectangle.left) / rectangle.width * 2 - 1, 1 - (event.clientY - rectangle.top) / rectangle.height * 2);
    raycaster.setFromCamera(cursor, camera);
    if (marker.visible && raycaster.ray.distanceSqToPoint(marker.position) < .23 ** 2) {
      onPick(target, marker.position.clone());
      return;
    }
    const visible = relevant.map(id => model.structures[id]).filter(part => part?.visible);
    const hits = raycaster.intersectObjects(visible, true);
    for (const hit of hits) {
      let object = hit.object;
      while (object && !object.userData.structureId) object = object.parent;
      const id = object?.userData.structureId;
      if (id && (id !== lesson.shell || !opened || target === lesson.shell)) {
        onPick(id, hit.point);
        return;
      }
    }
  });

  frameId = requestAnimationFrame(progress);

  return {
    view({ expected, tool, guides, active }) {
      target = expected ?? '';
      guided = guides;
      canPick = active;
      bench.setTool(tool);
    },
    perform(current, point) {
      const focus = point ?? location(current.target);
      bench.apply(current.tool, focus, performance.now(), false, () => location(current.target));
      if (current.transition === 'open') {
        opened = true;
        updateVisibility();
      } else if (current.transition === 'release') {
        released = true;
        if (lesson.shell !== current.target) model.structures[current.target].visible = false;
      } else if (current.transition === 'transfer' && released) {
        const origin = location(lesson.target);
        if (!origin) return;
        const destination = new THREE.Vector3(0.55, -.44, -2.2);
        const travel = destination.clone().sub(origin);
        const items = [lesson.target, ...(lesson.companions ?? [])].map(id => {
          const item = model.structures[id];
          return { item, from: item.position.clone(), to: item.position.clone().add(travel) };
        });
        receiver.position.set(destination.x, floor + .022, destination.z);
        receiver.visible = true;
        move = { items, start: performance.now() };
        updateVisibility();
        cameraMove = { from: camera.position.clone(), to: destination.clone().add(new THREE.Vector3(-3.4, 4.2, -5.1)),
          aimFrom: orbit.target.clone(), aimTo: destination, start: performance.now() };
      }
    },
    fit,
    warn(id, point) { bench.apply('damage', point ?? location(id), performance.now(), false); },
    dispose() {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      orbit.dispose();
      const geometries = new Set();
      const materials = new Set(unreplaced);
      scene.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) {
          const list = Array.isArray(object.material) ? object.material : [object.material];
          list.forEach(material => materials.add(material));
        }
      });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

export function createExpandedDissection({ escapeHtml, download, announce }) {
  let lesson = expandedLessons[0];
  let index = 0;
  let selected = '';
  let guides = true;
  let feedback = '';
  let history = [];
  let incorrect = 0;
  let node;
  let workbench;
  let bindings;

  function render() {
    return '<section class="lab-section" data-expanded-dissection><header><h2>Expanded dissection</h2>' +
      '<p>Follow a guided sequence on an interactive schematic specimen.</p></header>' +
      '<label class="lab-field">Preparation <select data-extended-lesson>' +
      expandedLessons.map(item => '<option value="' + item.id + '"' + (item === lesson ? ' selected' : '') + '>' + item.title + '</option>').join('') +
      '</select></label><div class="lab-grid"><article class="lab-card"><div data-extended-scene style="height:clamp(280px,51vh,550px);border-radius:12px;overflow:hidden;background:#e4eeed"></div>' +
      '<div class="lab-controls"><button type="button" data-extended-fit="specimen">Frame preparation</button><button type="button" data-extended-fit="landmark">Frame landmark</button>' +
      '<label><input type="checkbox" data-extended-guides' + (guides ? ' checked' : '') + '> Show visual guide</label></div></article>' +
      '<article class="lab-card" data-extended-panel></article></div></section>';
  }

  function update() {
    if (!node) return;
    const panel = node.querySelector('[data-extended-panel]');
    const current = lesson.steps[index];
    const available = index >= 3 ? [lesson.shell, ...lesson.reveal] : [lesson.shell, ...lesson.exterior];
    const focused = document.activeElement;
    const focusId = node.contains(focused) && focused.id;
    panel.innerHTML = '<p>' + lesson.stage + ' · Schematic educational simulation</p><h3>' + lesson.title + '</h3><p>' +
      lesson.intro + '</p><progress max="' + lesson.steps.length + '" value="' + index + '" aria-label="Completed actions"></progress>' +
      (current ? '<h4>Step ' + (index + 1) + ' of ' + lesson.steps.length + ' · ' + current.title + '</h4><p>' + current.instruction + '</p>' +
        '<div class="lab-controls" aria-label="Virtual tools">' + tools.map(([id, name]) => '<button id="ext-tool-' + id + '" type="button" data-extended-tool="' + id +
          '" aria-pressed="' + (selected === id) + '">' + name + '</button>').join('') +
        '</div><label class="lab-field">Apply the selected tool to <select id="ext-target" data-extended-target><option value="">Choose a structure</option>' +
        available.map(id => '<option value="' + id + '">' + labels[id] + '</option>').join('') + '</select></label>' +
        '<button id="ext-apply" type="button" data-extended-apply>Apply tool</button>' :
        '<p class="lab-result">Preparation complete. Inspect the transferred anatomy and review the source before working with specimens.</p>' +
        '<p>' + incorrect + ' incorrect action' + (incorrect === 1 ? '' : 's') + ' recorded.</p><button id="ext-export" type="button" data-extended-export>Download training record</button>') +
      '<p data-extended-feedback role="status" class="lab-result">' + escapeHtml(feedback) + '</p>' +
      '<div class="lab-controls"><button id="ext-reset" type="button" data-extended-reset>Restart preparation</button>' +
      '<a href="' + lesson.source[1] + '" target="_blank" rel="noopener noreferrer">' + lesson.source[0] + ' ↗</a></div>';
    if (focusId) node.querySelector('#' + focusId)?.focus();
    workbench?.view({ expected: current?.target, tool: selected, guides, active: !!current });
  }

  function perform(id, point) {
    const current = lesson.steps[index];
    if (!current) return;
    if (selected !== current.tool || id !== current.target) {
      incorrect += 1;
      feedback = !selected ? 'Select a tool first.' : selected !== current.tool
        ? 'This step needs a different tool. Re-read the action and choose a tool that fits.'
        : 'That structure is not the intended landmark. Use the specimen orientation and anatomy cues.';
      workbench?.warn(id, point);
    } else {
      feedback = current.outcome;
      workbench?.perform(current, point);
      history.push({ action: current.title, tool: tools.find(([id]) => id === selected)[1], structure: labels[id] });
      index += 1;
      selected = '';
    }
    announce(feedback);
    update();
  }

  function reset() {
    index = 0;
    feedback = '';
    selected = '';
    history = [];
    incorrect = 0;
    workbench?.dispose();
    workbench = null;
    const host = node.querySelector('[data-extended-scene]');
    try {
      workbench = createWorkbench(host, lesson, perform);
    } catch {
      host.textContent = '3D rendering is unavailable on this device. Use the structure selector to practice each action.';
    }
    update();
  }

  function bind(root) {
    unmount();
    node = root.matches?.('[data-expanded-dissection]') ? root : root.querySelector('[data-expanded-dissection]');
    if (!node) return;
    bindings = new AbortController();
    const { signal } = bindings;
    node.addEventListener('change', event => {
      if (event.target.matches('[data-extended-lesson]')) {
        lesson = expandedLessons.find(item => item.id === event.target.value) ?? lesson;
        reset();
      } else if (event.target.matches('[data-extended-guides]')) {
        guides = event.target.checked;
        update();
      }
    }, { signal });
    node.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.extendedTool) {
        selected = button.dataset.extendedTool;
        update();
      } else if (button.matches('[data-extended-apply]')) {
        perform(node.querySelector('[data-extended-target]').value);
      } else if (button.matches('[data-extended-reset]')) {
        reset();
      } else if (button.dataset.extendedFit) {
        workbench?.fit(button.dataset.extendedFit === 'landmark' ? lesson.steps[index]?.target ?? lesson.target : index === lesson.steps.length ? lesson.target : null);
      } else if (button.matches('[data-extended-export]')) {
        const rows = ['origin,preparation,step,tool,structure,incorrect_actions', ...history.map(entry =>
          ['synthetic', lesson.id, entry.action, entry.tool, entry.structure, incorrect].map(value => '"' + String(value).replaceAll('"', '""') + '"').join(','))];
        download('flylab-dissection-' + lesson.id + '.csv', rows.join('\n') + '\n', 'text/csv');
      }
    }, { signal });
    reset();
  }

  function unmount() {
    bindings?.abort();
    workbench?.dispose();
    workbench = null;
    node = null;
  }

  return { render, bind, unmount };
}
