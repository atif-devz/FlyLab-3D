import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createFlyModel } from './fly-model.js';
import { createLarvaModel } from './larva-model.js';
import { createBenchGeometry } from './bench-geometry.js';
import { createFlyAnimator } from './interactive-fly.js';

const homeTarget = new THREE.Vector3(0.16, -0.46, 0);
const cameras = {
  default: [-6.0, 3.55, -9.25],
  side: [0, 1.0, -11.0],
  top: [0, 11.3, -0.35],
  front: [-11.3, 0.95, 0],
};

export function createViewer({ primary, secondary, onPick, onLabel, onLandmark, onFlyState }) {
  const scene = new THREE.Scene();
  const specimens = { adult: createFlyModel(THREE), larva: createLarvaModel(THREE) };
  let active = specimens.adult;
  for (const specimen of Object.values(specimens)) {
    specimen.group.visible = specimen === active;
    scene.add(specimen.group);
  }

  scene.add(new THREE.HemisphereLight(0xfff7e7, 0xa99a8c, 2.05));
  const lights = [
    [0xffeed5, 3.0, [-4, 8, -5]],
    [0xe4f0ff, 1.05, [2, 2, 6]],
    [0xfff6e2, 2.1, [6, 5, 1]],
  ];
  for (const [color, strength, position] of lights) {
    const light = new THREE.DirectionalLight(color, strength);
    light.position.set(...position);
    scene.add(light);
  }

  const mask = document.createElement('canvas');
  mask.width = mask.height = 128;
  const context = mask.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 1, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(67,62,50,.31)');
  gradient.addColorStop(.35, 'rgba(79,75,60,.21)');
  gradient.addColorStop(.7, 'rgba(94,89,73,.07)');
  gradient.addColorStop(1, 'rgba(101,98,83,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(8.6, 5.5),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(mask), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(.16, -1.96, 0);
  scene.add(shadow);
  const dish = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.25, .028, 10, 64),
    new THREE.MeshStandardMaterial({ color: 0x659d9e, roughness: .42, transparent: true, opacity: .5 }));
  rim.rotation.x = -Math.PI / 2;
  const well = new THREE.Mesh(new THREE.CircleGeometry(1.22, 64),
    new THREE.MeshStandardMaterial({ color: 0xa2cacc, roughness: .35, transparent: true, opacity: .28, depthWrite: false }));
  well.rotation.x = -Math.PI / 2;
  well.position.y = -.02;
  dish.add(rim, well);
  dish.visible = false;
  scene.add(dish);
  const bench = createBenchGeometry(THREE);
  bench.setHeight(-1.99);
  scene.add(bench.group);

  function makeView(container, label) {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0xffffff, 0);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.localClippingEnabled = true;
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('aria-label', label);
    container.prepend(renderer.domElement);
    return { renderer, container, camera: new THREE.PerspectiveCamera(37, 1, .08, 140) };
  }

  const first = makeView(primary, 'Interactive fruit fly specimen');
  const control = new OrbitControls(first.camera, first.renderer.domElement);
  control.enableDamping = true;
  control.autoRotateSpeed = .85;
  control.minDistance = 2.5;
  control.maxDistance = 36;
  control.target.copy(homeTarget);
  control.saveState();
  let second = null;
  let secondControl = null;
  let compare = false;
  let motion = false;
  let labels = false;
  let selected = null;
  let landmark = null;
  let benchHover = null;
  let extracted = new Set();
  const travel = new THREE.Vector3(3.65, -.13, -.45);
  const partCenters = new Map();
  const originalPositions = new Map();
  const intendedPositions = new Map();
  let transferInProgress = false;
  let activeLayer = null;
  let primaryData = new Map();
  let comparisonData = new Map();
  let extent = [0, 1];
  let hasChanges = true;
  const fly = createFlyAnimator({ onState: onFlyState });
  let flyOptions = { active: false, mode: 'scientific', paused: false, reducedMotion: false, react: false };
  let flyEnabled = false;
  let flyPosed = false;
  let tapTimer = null;
  let lastTap = null;

  function clearFlyTap() {
    if (tapTimer !== null) clearTimeout(tapTimer);
    tapTimer = null;
    lastTap = null;
  }

  function clearFlyPose() {
    if (!flyPosed) return;
    specimens.adult.rig.reset();
    shadow.position.x = .16;
    shadow.position.z = 0;
    flyPosed = false;
    hasChanges = true;
  }

  function syncFly() {
    const visible = flyOptions.active && active === specimens.adult && !compare && !bench.group.visible
      && primary.clientWidth > 0 && primary.clientHeight > 0 && !document.hidden;
    flyEnabled = visible && !flyOptions.paused && !flyOptions.reducedMotion;
    fly.configure({ ...flyOptions, active: visible });
    if (!flyEnabled || !flyOptions.react) clearFlyTap();
    if (!visible || flyOptions.reducedMotion) clearFlyPose();
  }
  document.addEventListener('visibilitychange', syncFly);

  const shell = new Map();
  const paints = new Map();
  for (const [id, part] of Object.values(specimens).flatMap(specimen => Object.entries(specimen.structures))) {
    originalPositions.set(id, part.position.clone());
    const entries = [];
    const materials = new Map();
    part.traverse(object => {
      if (!object.material) return;
      const single = !Array.isArray(object.material);
      const original = single ? [object.material] : object.material;
      const copies = original.map(material => {
        if (!materials.has(material)) materials.set(material, material.clone());
        return materials.get(material);
      });
      object.material = single ? copies[0] : copies;
    });
    for (const material of materials.values()) {
      entries.push({ material, color: material.color?.clone(), emission: material.emissive?.clone(), intensity: material.emissiveIntensity });
      if (id === 'cuticle' || id === 'larval-cuticle') shell.set(material, { opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite });
    }
    paints.set(id, entries);
  }

  const crossSection = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const box = new THREE.Box3();
  const focusBounds = new THREE.Box3();
  const focusPoint = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const cameraStep = new THREE.Vector3();
  const cameraMove = new THREE.Vector3();
  const dim = new THREE.Vector3();
  let targetPosition = null;
  let targetFocus = null;

  function paint(values) {
    const scale = Math.max(1, Math.abs(extent[0]), Math.abs(extent[1]));
    const min = extent[0] / scale;
    const max = extent[1] / scale;
    for (const [id, entries] of paints) {
      const value = values.get(id);
      const intensity = max === min ? .5 : (value / scale - min) / (max - min);
      const color = value === undefined ? null : new THREE.Color(0x81d1b3).lerp(new THREE.Color(0x23538c), Math.min(1, Math.max(0, intensity)));
      for (const base of entries) {
        const { material } = base;
        if (base.color) material.color.copy(color ?? base.color);
        if (base.emission) {
          material.emissive.copy(id === selected ? new THREE.Color(0x326d55) : base.emission);
          material.emissiveIntensity = id === selected ? .44 : base.intensity;
        }
      }
    }
  }

  function fitCamera(view) {
    const { container, renderer, camera } = view;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.zoom = Math.min(1, camera.aspect * 1.12);
    camera.updateProjectionMatrix();
  }

  const observer = new ResizeObserver(() => {
    fitCamera(first);
    if (second && compare) fitCamera(second);
    syncFly();
    hasChanges = true;
  });
  observer.observe(primary);
  observer.observe(secondary);
  fitCamera(first);

  function findCenter(id) {
    if (!active.structures[id]) return null;
    active.group.updateMatrixWorld(true);
    box.setFromObject(active.structures[id]);
    return box.isEmpty() ? null : box.getCenter(focusPoint);
  }

  function project(center, callback, id) {
    if (!center) {
      callback(null);
      return;
    }
    projected.copy(center).project(first.camera);
    if (Math.abs(projected.x) > .96 || Math.abs(projected.y) > .96 || Math.abs(projected.z) > 1) {
      callback(null);
      return;
    }
    callback(id, (projected.x + 1) / 2 * primary.clientWidth, (1 - projected.y) / 2 * primary.clientHeight);
  }

  function setExtract(ids, immediate) {
    extracted = new Set(ids);
    transferInProgress = false;
    partCenters.clear();
    for (const [id, part] of Object.entries(active.structures)) {
      const origin = originalPositions.get(id);
      const intended = origin.clone();
      if (extracted.has(id)) {
        const location = findCenter(id);
        if (location) partCenters.set(id, location.clone().add(origin).sub(part.position).add(travel));
        intended.add(travel);
      }
      intendedPositions.set(id, intended);
      if (immediate) part.position.copy(intended);
      else if (part.position.distanceToSquared(intended) > .0001) transferInProgress = true;
    }
    dish.visible = !!partCenters.size;
    if (dish.visible) {
      dish.position.set(0, 0, 0);
      for (const center of partCenters.values()) dish.position.add(center);
      dish.position.divideScalar(partCenters.size);
      dish.position.y -= active === specimens.larva ? .53 : .57;
    }
    hasChanges = true;
  }

  function render() {
    paint(primaryData);
    first.renderer.render(scene, first.camera);
    if (compare && second) {
      second.camera.position.copy(first.camera.position);
      second.camera.quaternion.copy(first.camera.quaternion);
      secondControl.target.copy(control.target);
      paint(comparisonData);
      second.renderer.render(scene, second.camera);
    }
    const part = active.structures[selected];
    project(labels && part?.visible && !compare ? findCenter(selected) : null, onLabel, selected);
    if (onLandmark) {
      const center = landmark?.point
        ? landmarkPoint.set(...landmark.point)
        : landmark && findCenter(landmark.id);
      project(center, onLandmark, landmark?.id);
    }
  }

  const landmarkPoint = new THREE.Vector3();
  const benchPoint = new THREE.Vector3();
  const start = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (targetPosition) {
      first.camera.position.lerp(targetPosition, .15);
      control.target.lerp(targetFocus, .15);
      if (first.camera.position.distanceToSquared(targetPosition) < 0.0001 && control.target.distanceToSquared(targetFocus) < 0.0001) {
        first.camera.position.copy(targetPosition);
        control.target.copy(targetFocus);
        targetPosition = null;
      }
      hasChanges = true;
    }
    if (control.update()) hasChanges = true;
    if (transferInProgress) {
      transferInProgress = false;
      for (const [id, part] of Object.entries(active.structures)) {
        const target = intendedPositions.get(id);
        if (part.position.distanceToSquared(target) <= .00015) part.position.copy(target);
        else {
          part.position.lerp(target, .13);
          transferInProgress = true;
        }
      }
      hasChanges = true;
    }
    if (flyEnabled) {
      const pose = fly.update((now - start) / 1000);
      if (pose) {
        specimens.adult.rig.applyPose(pose);
        shadow.position.x = .16 + pose.x;
        shadow.position.z = pose.z;
        flyPosed = true;
        hasChanges = true;
      }
    } else if (motion && !flyOptions.active && !document.hidden && primary.clientWidth > 0) {
      active.animate?.((now - start) / 1000, true);
      hasChanges = true;
    }
    if (bench.update(now, first.camera, () => benchHover ?? (landmark?.point
      ? benchPoint.set(...landmark.point) : landmark && findCenter(landmark.id)), hasChanges)) hasChanges = true;
    if (hasChanges) {
      render();
      hasChanges = false;
    }
  }
  control.addEventListener('start', () => { targetPosition = null; });
  control.addEventListener('change', () => { hasChanges = true; });

  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const flyPointer = new THREE.Vector3();
  function createPicker(view) {
    const canvas = view.renderer.domElement;
    let pressed = null;
    let recentHover = -Infinity;
    const reactive = () => view === first && flyEnabled && flyOptions.react;
    function hit(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.set(2 * (event.clientX - rect.left) / rect.width - 1, 1 - 2 * (event.clientY - rect.top) / rect.height);
      ray.setFromCamera(pointer, view.camera);
      const available = Object.values(active.structures).filter(part => part.visible);
      return ray.intersectObjects(available, true).find(entry => {
        if (['cuticle', 'larval-cuticle'].includes(entry.object.userData.structureId)) {
          if (activeLayer !== null && crossSection.distanceToPoint(entry.point) < 0) return false;
          if (entry.object.material.opacity < .27) return false;
        }
        return !!entry.object.userData.structureId;
      });
    }
    canvas.addEventListener('pointerdown', event => {
      if (event.button === 0 && event.isPrimary !== false) pressed = { id: event.pointerId, x: event.clientX, y: event.clientY };
      else pressed = null;
    });
    canvas.addEventListener('pointerup', event => {
      const slop = reactive() && event.pointerType === 'touch' ? 11 : 5;
      if (pressed && pressed.id === event.pointerId && Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) < slop) {
        const entry = hit(event);
        if (entry && reactive()) {
          const now = performance.now();
          if (flyOptions.mode === 'fun') {
            const double = lastTap && now - lastTap.time <= 320
              && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) <= 26;
            clearFlyTap();
            if (double) fly.interact('double-click');
            else {
              lastTap = { time: now, x: event.clientX, y: event.clientY };
              tapTimer = setTimeout(() => {
                clearFlyTap();
                if (reactive()) fly.interact('click');
              }, 320);
            }
          } else fly.interact('click');
        } else onPick(entry?.object.userData.structureId ?? null, entry?.point.toArray());
      }
      pressed = null;
    });
    canvas.addEventListener('pointercancel', () => { pressed = null; });
    canvas.addEventListener('pointermove', event => {
      if (!event.buttons && event.pointerType === 'mouse') {
        const now = performance.now();
        if (reactive() && now - recentHover < 34) return;
        recentHover = now;
        const entry = hit(event);
        canvas.classList.toggle('over-part', !!entry);
        if (reactive()) {
          flyPointer.set(shadow.position.x - .16, -.27, shadow.position.z).project(first.camera);
          const dx = pointer.x - flyPointer.x;
          const dy = pointer.y - flyPointer.y;
          if (entry || Math.hypot(dx, dy) < .32) {
            const side = first.camera.matrixWorld.elements[2] >= 0 ? -1 : 1;
            fly.interact('hover', { x: THREE.MathUtils.clamp(side * dx / .42, -1, 1), y: THREE.MathUtils.clamp(-dy / .42, -1, 1) });
          } else fly.interact('leave');
        }
        if (bench.group.visible && view === first) {
          benchHover = entry?.point ?? null;
          hasChanges = true;
        }
      }
    });
    canvas.addEventListener('pointerleave', () => {
      canvas.classList.remove('over-part');
      if (reactive()) fly.interact('leave');
      if (benchHover) {
        benchHover = null;
        hasChanges = true;
      }
    });
  }
  createPicker(first);

  function orient(name = 'default', move = true) {
    const direction = cameras[name] ?? cameras.default;
    if (move) {
      targetPosition = new THREE.Vector3(...direction);
      targetFocus = homeTarget;
    } else {
      first.camera.position.set(...direction);
      control.target.copy(homeTarget);
      control.update();
    }
    hasChanges = true;
  }
  orient('default', false);
  requestAnimationFrame(frame);

  function keyOrbit(event) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const orbit = new THREE.Spherical().setFromVector3(first.camera.position.clone().sub(control.target));
    if (event.key === 'ArrowLeft') orbit.theta -= .12;
    if (event.key === 'ArrowRight') orbit.theta += .12;
    if (event.key === 'ArrowUp') orbit.phi -= .12;
    if (event.key === 'ArrowDown') orbit.phi += .12;
    first.camera.position.setFromSpherical(orbit.makeSafe()).add(control.target);
    control.update();
  }
  first.renderer.domElement.addEventListener('keydown', keyOrbit);

  return {
    setSpecimen(stage) {
      const specimen = specimens[stage];
      if (!specimen || specimen === active) return;
      clearFlyTap();
      clearFlyPose();
      setExtract([], true);
      active.animate?.(0, false);
      active.group.visible = false;
      active = specimen;
      active.group.visible = true;
      shadow.position.y = stage === 'larva' ? -1.64 : -1.96;
      bench.setHeight(shadow.position.y - .03);
      bench.clear();
      benchHover = null;
      landmark = null;
      selected = null;
      syncFly();
      hasChanges = true;
    },
    configureFly(options) {
      if (flyOptions.mode !== options.mode || flyOptions.react !== options.react) clearFlyTap();
      if (flyOptions.mode === 'fun' && options.mode === 'scientific') clearFlyPose();
      flyOptions = options;
      syncFly();
    },
    playFly(action) {
      return flyEnabled && fly.request(action);
    },
    setLandmark(value) {
      landmark = value;
      hasChanges = true;
    },
    setBench(enabled) {
      if (bench.setEnabled(Boolean(enabled))) {
        benchHover = null;
        hasChanges = true;
      }
      syncFly();
    },
    setBenchTool(tool) {
      if (bench.setTool(tool)) {
        benchHover = null;
        hasChanges = true;
      }
    },
    applyBenchAction(tool, { id, point, instant = false } = {}) {
      const target = point?.length === 3 && point.every(Number.isFinite)
        ? benchPoint.set(...point)
        : findCenter(id);
      const follow = tool === 'transfer' && id ? () => findCenter(id) : undefined;
      const accepted = bench.apply(tool, target, performance.now(), instant, follow);
      if (accepted) hasChanges = true;
      return accepted;
    },
    clearBenchActions() {
      bench.clear();
      benchHover = null;
      hasChanges = true;
    },
    setExtract,
    update({ visible, selection, opacity, clipping, labelVisible, rotating, moving, backgrounds, range }) {
      for (const [id, part] of Object.entries(active.structures)) part.visible = visible.has(id);
      for (const [material, original] of shell) {
        material.opacity = opacity * original.opacity;
        const transparent = opacity < 1 || original.transparent;
        material.depthWrite = opacity < .7 ? false : original.depthWrite;
        const plane = clipping === null ? null : [crossSection];
        if (material.transparent !== transparent || !!material.clippingPlanes !== !!plane) material.needsUpdate = true;
        material.transparent = transparent;
        material.clippingPlanes = plane;
      }
      activeLayer = clipping;
      if (clipping !== null) crossSection.constant = clipping;
      selected = selection;
      labels = labelVisible;
      control.autoRotate = rotating;
      if (motion && !moving && !flyOptions.active) active.animate?.(0, false);
      motion = moving;
      primaryData = backgrounds[0] ?? new Map();
      comparisonData = backgrounds[1] ?? new Map();
      extent = range;
      hasChanges = true;
    },
    setCompare(enabled) {
      compare = enabled;
      syncFly();
      if (enabled && !second) {
        second = makeView(secondary, 'Comparison fruit fly specimen');
        createPicker(second);
        secondControl = new OrbitControls(second.camera, second.renderer.domElement);
        secondControl.minDistance = control.minDistance;
        secondControl.maxDistance = control.maxDistance;
        secondControl.addEventListener('start', () => { targetPosition = null; });
        secondControl.addEventListener('change', () => {
          first.camera.position.copy(second.camera.position);
          control.target.copy(secondControl.target);
          control.update();
          hasChanges = true;
        });
        second.renderer.domElement.addEventListener('keydown', keyOrbit);
      }
      fitCamera(first);
      if (enabled) fitCamera(second);
      hasChanges = true;
    },
    orient,
    zoom(amount) {
      targetPosition = null;
      cameraStep.copy(first.camera.position).sub(control.target);
      const distance = THREE.MathUtils.clamp(cameraStep.length() * amount, control.minDistance, control.maxDistance);
      first.camera.position.copy(cameraStep.setLength(distance)).add(control.target);
      control.update();
      hasChanges = true;
    },
    focus(id, view) {
      active.group.updateMatrixWorld(true);
      focusBounds.makeEmpty();
      for (const partId of extracted.has(id) ? extracted : [id]) {
        const part = active.structures[partId];
        if (!part) continue;
        box.setFromObject(part);
        if (extracted.has(partId)) box.translate(cameraStep.copy(intendedPositions.get(partId)).sub(part.position));
        focusBounds.union(box);
      }
      if (focusBounds.isEmpty()) return;
      const center = focusBounds.getCenter(focusPoint);
      focusBounds.getSize(dim);
      const distance = Math.max(3.2, Math.min(dim.length() * 1.6, 9.2));
      if (view && cameras[view]) cameraMove.set(...cameras[view]).sub(homeTarget);
      else cameraMove.copy(first.camera.position).sub(control.target);
      cameraMove.setLength(distance);
      targetFocus = center.clone();
      targetPosition = targetFocus.clone().add(cameraMove);
    },
    save() {
      render();
      const source = first.renderer.domElement;
      const canvas = document.createElement('canvas');
      const right = compare && second ? second.renderer.domElement : null;
      canvas.width = source.width + (right?.width ?? 0);
      canvas.height = source.height;
      const ctx = canvas.getContext('2d');
      const softLight = ctx.createRadialGradient(canvas.width * .5, canvas.height * .42, 0, canvas.width * .5, canvas.height * .42, canvas.width * .66);
      softLight.addColorStop(0, '#ffffff');
      softLight.addColorStop(1, '#e8edeb');
      ctx.fillStyle = softLight;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(source, 0, 0);
      if (right) ctx.drawImage(right, source.width, 0);
      return canvas;
    },
  };
}

