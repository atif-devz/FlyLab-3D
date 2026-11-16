import * as THREE from 'three';
import { createFlyModel } from './fly-model.js';
import { createLarvaModel } from './larva-model.js';

export function createSpatialLab({ escapeHtml: e, announce }) {
  let stage = 'adult', status = '', session = null, renderer = null, serial = 0;
  let hitSource = null, scene = null, enabled = '';
  let initiating = false;

  function render() {
    return '<section class="lab-section"><h1>Spatial specimen viewer</h1><p>Inspect the schematic adult or third-instar larva in a compatible WebXR browser.</p>'
      + '<div class="lab-grid"><article class="lab-card"><h2>Specimen and session</h2><label class="lab-field"><span>Life stage</span>'
      + '<select data-xr-stage><option value="adult"' + (stage === 'adult' ? ' selected' : '') + '>Adult female</option>'
      + '<option value="larva"' + (stage === 'larva' ? ' selected' : '') + '>Third-instar larva</option></select></label>'
      + '<div class="lab-controls"><button type="button" data-xr="immersive-vr">Enter VR</button><button type="button" data-xr="immersive-ar">Place on a surface in AR</button></div>'
      + '<p>VR uses controller selection to switch between external and internal anatomy. In AR, aim at a surface and tap to place the specimen, then tap again to switch layers.</p>'
      + '<p class="lab-muted">Immersive sessions require a secure context and compatible hardware. The desktop models remain available under Anatomy.</p>'
      + '<p data-xr-status class="lab-status" role="status">' + e(status) + '</p></article>'
      + '<article class="lab-card"><h2>Session preview</h2><div data-xr-view class="xr-view"><p>Start a session to see the immersive view.</p></div>'
      + '<div class="lab-controls"><button type="button" data-xr-end disabled>End session</button></div></article></div></section>';
  }

  function cleanup() {
    hitSource?.cancel?.();
    hitSource = null;
    renderer?.setAnimationLoop(null);
    if (scene) {
      const geometry = new Set(), materials = new Set();
      scene.traverse(object => {
        if (object.geometry) geometry.add(object.geometry);
        if (object.material) for (const mat of Array.isArray(object.material) ? object.material : [object.material]) materials.add(mat);
      });
      geometry.forEach(item => item.dispose());
      materials.forEach(item => item.dispose());
    }
    renderer?.dispose();
    renderer?.domElement.remove();
    renderer = null;
    scene = null;
    session = null;
    enabled = '';
  }

  function unmount() {
    serial += 1;
    const active = session;
    if (active) void active.end().catch(() => {});
    cleanup();
  }

  function bind(root) {
    const message = text => {
      status = text;
      const node = root.querySelector('[data-xr-status]');
      if (node) node.textContent = text;
      announce(text);
    };
    root.addEventListener('change', event => {
      if (event.target.matches('[data-xr-stage]')) stage = event.target.value;
    });
    root.addEventListener('click', async event => {
      if (event.target.closest('[data-xr-end]')) { if (session) await session.end(); return; }
      const mode = event.target.closest('[data-xr]')?.dataset.xr;
      if (!mode || session || initiating) return;
      const api = globalThis.navigator?.xr;
      if (!api || !globalThis.isSecureContext) { message('WebXR is unavailable here. Use a compatible browser over localhost or HTTPS.'); return; }
      const attempt = ++serial;
      initiating = true;
      let candidate;
      try {
        const ar = mode === 'immersive-ar';
        candidate = await api.requestSession(mode, ar ? { requiredFeatures: ['hit-test'], optionalFeatures: ['local-floor'] } : { optionalFeatures: ['local-floor'] });
        if (attempt !== serial) { await candidate.end(); return; }
        enabled = mode;
        session = candidate;
        const container = root.querySelector('[data-xr-view]');
        container.replaceChildren();
        renderer = new THREE.WebGLRenderer({ alpha: ar, antialias: true });
        renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio ?? 1, 1.6));
        renderer.setSize(Math.max(280, container.clientWidth), 280);
        renderer.xr.enabled = true;
        renderer.xr.setReferenceSpaceType('local');
        container.append(renderer.domElement);
        scene = new THREE.Scene();
        if (!ar) scene.background = new THREE.Color('#e6efec');
        scene.add(new THREE.HemisphereLight(0xffffff, 0x879893, 2.2));
        const key = new THREE.DirectionalLight(0xfff4df, 2.2);
        key.position.set(3, 4, 1);
        scene.add(key);
        const camera = new THREE.PerspectiveCamera(52, Math.max(280, container.clientWidth) / 280, .02, 40);
        camera.position.set(0, .16, 1.25);
        const model = stage === 'larva' ? createLarvaModel(THREE) : createFlyModel(THREE);
        const exterior = new Set(stage === 'larva' ? ['larval-cuticle', 'mouth-hooks', 'spiracles'] : ['cuticle', 'eyes', 'antennae', 'proboscis', 'wings', 'legs', 'halteres']);
        const anchor = new THREE.Group();
        model.group.scale.setScalar(.105);
        model.group.rotation.y = -.45;
        anchor.position.set(0, -.16, -1.17);
        anchor.visible = !ar;
        anchor.add(model.group);
        scene.add(anchor);
        const reticle = new THREE.Mesh(new THREE.RingGeometry(.065, .095, 48).rotateX(-Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: 0x3f946a, side: THREE.DoubleSide }));
        reticle.matrixAutoUpdate = false;
        reticle.visible = false;
        scene.add(reticle);
        let layers = false;
        const applyLayer = () => {
          for (const [id, part] of Object.entries(model.structures)) part.visible = layers !== exterior.has(id);
        };
        applyLayer();
        candidate.addEventListener('end', () => {
          if (session !== candidate) return;
          cleanup();
          root.querySelector('[data-xr-end]')?.setAttribute('disabled', '');
          container.innerHTML = '<p>Session ended.</p>';
          message('Immersive session ended.');
        }, { once: true });
        await renderer.xr.setSession(candidate);
        if (attempt !== serial) return;
        if (ar) {
          const viewerSpace = await candidate.requestReferenceSpace('viewer');
          if (attempt !== serial) return;
          hitSource = await candidate.requestHitTestSource({ space: viewerSpace });
          if (attempt !== serial) { hitSource?.cancel(); return; }
        }
        candidate.addEventListener('select', () => {
          if (enabled !== mode) return;
          if (ar && !anchor.visible) {
            if (!reticle.visible) return;
            anchor.position.setFromMatrixPosition(reticle.matrix);
            anchor.position.y += .22;
            anchor.visible = true;
            reticle.visible = false;
          } else {
            layers = !layers;
            applyLayer();
          }
        });
        renderer.setAnimationLoop((_, frame) => {
          if (ar && !anchor.visible && frame && hitSource) {
            const hit = frame.getHitTestResults(hitSource)[0];
            const pose = hit?.getPose(renderer.xr.getReferenceSpace());
            reticle.visible = !!pose;
            if (pose) reticle.matrix.fromArray(pose.transform.matrix);
          }
          renderer.render(scene, camera);
        });
        root.querySelector('[data-xr-end]').disabled = false;
        message(ar ? 'AR started. Aim at a flat surface to place the specimen.' : 'VR started. Use controller selection to switch anatomical layers.');
      } catch (error) {
        if (candidate) await candidate.end().catch(() => {});
        if (attempt === serial) { cleanup(); message('Could not start this WebXR session. ' + (error?.message ?? 'Check device support.')); }
      } finally { initiating = false; }
    });
  }

  return { render, bind, unmount };
}

