const toolAliases = {
  dish: 'inspect', medium: 'pipette', rinse: 'pipette', position: 'release',
  handling: 'release', forceps: 'release',
};

export function createBenchGeometry(THREE) {
  const group = new THREE.Group();
  group.name = 'Virtual dissection bench';
  group.visible = false;
  const dish = new THREE.Group();
  dish.visible = false;
  const effects = new THREE.Group();
  group.add(dish, effects);

  const stainless = new THREE.MeshStandardMaterial({ color: 0xa2b9bc, metalness: .46, roughness: .28 });
  const polished = new THREE.MeshStandardMaterial({ color: 0xe0edf0, metalness: .35, roughness: .21 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x304f59, metalness: .12, roughness: .41 });
  const teal = new THREE.MeshStandardMaterial({ color: 0x286b68, roughness: .44 });
  const clearTip = new THREE.MeshPhysicalMaterial({ color: 0xadced5, roughness: .17, transparent: true, opacity: .79, depthWrite: false });
  const surface = new THREE.MeshStandardMaterial({ color: 0xbbd0d0, roughness: .79, metalness: .04 });
  const translucent = new THREE.MeshPhysicalMaterial({ color: 0x92bdc3, roughness: .18, transparent: true, opacity: .47, depthWrite: false });
  const fluid = new THREE.MeshPhysicalMaterial({ color: 0xa8d8dc, roughness: .16, transparent: true, opacity: .4, depthWrite: false });
  const guides = new THREE.MeshBasicMaterial({ color: 0x527f88, transparent: true, opacity: .23, depthWrite: false });
  const notice = new THREE.MeshBasicMaterial({ color: 0xe16a63, transparent: true, opacity: .93, depthWrite: false });
  const mark = new THREE.MeshBasicMaterial({ color: 0x438a82, transparent: true, opacity: .82, depthWrite: false });

  function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }

  function rod(parent, from, to, startRadius, endRadius, material) {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const axis = end.clone().sub(start);
    const cylinder = mesh(parent, new THREE.CylinderGeometry(endRadius, startRadius, axis.length(), 12), material);
    cylinder.position.copy(start).addScaledVector(axis, .5);
    cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
    return cylinder;
  }

  function ring(parent, diameter, thickness, material, x = 0, y = 0, z = 0) {
    const object = mesh(parent, new THREE.TorusGeometry(diameter / 2, thickness, 9, 52), material, x, y, z);
    object.rotation.x = -Math.PI / 2;
    return object;
  }

  const dishRadius = 3.98;
  dish.scale.z = .67;
  mesh(dish, new THREE.CylinderGeometry(dishRadius, dishRadius - .09, .1, 104), surface, 0, -.082);
  ring(dish, (dishRadius - .04) * 2, .043, translucent);
  ring(dish, (dishRadius - .26) * 2, .021, translucent, 0, -.018);
  ring(dish, (dishRadius - .16) * 2, .008, guides, 0, .005);
  const dashGeometry = new THREE.BoxGeometry(.045, .008, .098);
  for (let index = 0; index < 32; index += 1) {
    const angle = index * Math.PI * 2 / 32;
    const radius = dishRadius - .31;
    mesh(dish, dashGeometry, guides, Math.sin(angle) * radius, -.024, Math.cos(angle) * radius).rotation.y = angle;
  }
  const bath = mesh(dish, new THREE.CircleGeometry(dishRadius - .27, 104), fluid, 0, -.024);
  bath.rotation.x = -Math.PI / 2;
  bath.visible = false;
  const meniscus = ring(dish, (dishRadius - .35) * 2, .013, fluid, 0, -.021);
  meniscus.visible = false;

  function forceps() {
    const body = new THREE.Group();
    const jaws = [];
    for (const sign of [-1, 1]) {
      const jaw = new THREE.Group();
      jaw.position.set(1.67, 0, sign * .075);
      rod(jaw, [-1.67, 0, 0], [-.99, 0, sign * .075], .019, .044, polished);
      rod(jaw, [-.99, 0, sign * .075], [0, 0, 0], .044, .079, stainless);
      jaws.push(jaw);
      body.add(jaw);
    }
    rod(body, [1.62, 0, 0], [2.5, 0, 0], .09, .095, dark);
    for (let index = 0; index < 5; index += 1) {
      rod(body, [1.81 + index * .12, -.078, 0], [1.81 + index * .12, .078, 0], .103, .103, stainless);
    }
    return { body, jaws };
  }

  function scissors() {
    const body = new THREE.Group();
    const jaws = [];
    for (const sign of [-1, 1]) {
      const jaw = new THREE.Group();
      jaw.position.x = .72;
      rod(jaw, [-.72, 0, 0], [0, 0, sign * .045], .018, .066, polished);
      rod(jaw, [0, 0, sign * .045], [.66, 0, -sign * .15], .052, .053, stainless);
      ring(jaw, .38, .054, dark, .89, 0, -sign * .19);
      jaws.push(jaw);
      body.add(jaw);
    }
    rod(body, [.72, -.075, 0], [.72, .075, 0], .07, .07, stainless);
    return { body, jaws };
  }

  function pipette() {
    const body = new THREE.Group();
    rod(body, [0, 0, 0], [.93, 0, 0], .024, .105, clearTip);
    rod(body, [.84, 0, 0], [1.27, 0, 0], .11, .14, stainless);
    rod(body, [1.18, 0, 0], [2.36, 0, 0], .15, .15, teal);
    rod(body, [2.32, 0, 0], [2.66, 0, 0], .106, .106, polished);
    rod(body, [2.62, 0, 0], [2.77, 0, 0], .147, .147, dark);
    return { body };
  }

  function probe(color) {
    const body = new THREE.Group();
    ring(body, .3, .023, color, .17);
    rod(body, [.32, 0, 0], [1.57, 0, 0], .026, .064, stainless);
    rod(body, [1.49, 0, 0], [2.16, 0, 0], .091, .093, dark);
    return { body };
  }

  function pin() {
    const body = new THREE.Group();
    rod(body, [0, 0, 0], [1.57, 0, 0], .014, .049, polished);
    mesh(body, new THREE.SphereGeometry(.126, 13, 9), teal, 1.61);
    return { body };
  }

  const tools = {
    orient: probe(stainless), inspect: probe(teal), open: scissors(), release: forceps(),
    stabilize: pin(), transfer: pipette(), pipette: pipette(),
  };
  for (const { body } of Object.values(tools)) {
    body.visible = false;
    group.add(body);
  }
  const markerTemplate = new THREE.Group();
  ring(markerTemplate, .42, .021, mark);
  const pinTemplate = pin().body;
  pinTemplate.rotation.z = 1.38;
  pinTemplate.scale.setScalar(.55);
  pinTemplate.position.set(0, .05, 0);
  const pinMarker = new THREE.Group();
  const damage = new THREE.Group();
  const droplet = mesh(group, new THREE.SphereGeometry(.08, 14, 10), clearTip);
  droplet.scale.set(.8, 1.28, .8);
  droplet.visible = false;
  ring(damage, .55, .024, notice);
  damage.visible = false;
  pinMarker.add(pinTemplate, markerTemplate);
  group.add(damage);

  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const xAxis = new THREE.Vector3();
  const yAxis = new THREE.Vector3();
  const zAxis = new THREE.Vector3();
  const rotation = new THREE.Matrix4();
  const markerOrientation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const previewPoint = new THREE.Vector3(2.56, -.6, -1.07);
  let selected = '';
  let action = null;
  let damageUntil = 0;
  let displayed = null;

  function effectiveTool(tool) { return toolAliases[tool] ?? tool; }

  function hideDisplayed() {
    if (displayed) displayed.visible = false;
    displayed = null;
  }

  function clear() {
    action = null;
    damageUntil = 0;
    damage.visible = false;
    effects.clear();
    dish.visible = false;
    bath.visible = false;
    meniscus.visible = false;
    droplet.visible = false;
    hideDisplayed();
  }

  return {
    group,
    setEnabled(enabled) {
      if (group.visible === enabled) return false;
      group.visible = enabled;
      if (!enabled) {
        clear();
        selected = '';
      }
      return true;
    },
    setTool(tool) {
      const key = effectiveTool(tool);
      const next = Object.hasOwn(tools, key) ? key : '';
      if (selected === next) return false;
      selected = next;
      return true;
    },
    setHeight(height) { dish.position.y = height; },
    apply(tool, point, now, instant, follow) {
      if (!group.visible) return false;
      if (tool === 'damage' && point) {
        damage.position.copy(point);
        damage.position.y += .04;
        damage.visible = true;
        damageUntil = now + 750;
        return true;
      }
      if (tool === 'dish') dish.visible = true;
      const addsMedium = ['medium', 'pipette', 'rinse'].includes(tool);
      if (addsMedium && !dish.visible) return false;
      if (addsMedium) {
        bath.visible = true;
        meniscus.visible = true;
      }
      const key = effectiveTool(tool);
      if (!Object.hasOwn(tools, key)) return false;
      const spot = point ? point.clone() : previewPoint.clone();
      if (tool === 'stabilize' && point) {
        const pinEffect = pinMarker.clone();
        pinEffect.position.copy(spot);
        pinEffect.position.z += spot.z < 0 ? -.16 : .16;
        pinEffect.position.y -= .03;
        effects.add(pinEffect);
      }
      if ((tool === 'open' || tool === 'release') && point) {
        const trace = markerTemplate.clone();
        trace.position.copy(spot);
        trace.position.y += .09;
        trace.scale.set(.72, .72, .38);
        trace.rotation.y = .55;
        effects.add(trace);
      }
      action = { key, start: now, point: spot, instant, addsMedium, follow };
      return true;
    },
    clear,
    update(now, camera, findTarget, redraw = false) {
      if (!group.visible) return false;
      let changed = false;
      if (action && now - action.start >= 920) {
        action = null;
        droplet.visible = false;
        changed = true;
      }
      if (damage.visible && now >= damageUntil) {
        damage.visible = false;
        changed = true;
      }
      if (damage.visible && redraw) damage.quaternion.copy(camera.quaternion).multiply(markerOrientation);
      const instrument = tools[action?.key ?? selected];
      if (!instrument) {
        const wasVisible = !!displayed;
        hideDisplayed();
        return changed || wasVisible;
      }
      if (displayed !== instrument.body) {
        hideDisplayed();
        displayed = instrument.body;
        displayed.visible = true;
        changed = true;
      }
      if (!action && !changed && !redraw) return false;
      const progress = action ? (now - action.start) / 920 : 0;
      const extension = action ? (action.instant ? 1 : Math.sin(Math.PI * progress)) : 0;
      const tip = action?.follow?.() ?? action?.point ?? findTarget() ?? previewPoint;
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      forward.set(0, 0, 1).applyQuaternion(camera.quaternion);
      xAxis.copy(right).multiplyScalar(.92).addScaledVector(up, .34).addScaledVector(forward, .21).normalize();
      yAxis.copy(forward).addScaledVector(xAxis, -xAxis.dot(forward)).normalize();
      zAxis.crossVectors(xAxis, yAxis);
      rotation.makeBasis(xAxis, yAxis, zAxis);
      const scale = THREE.MathUtils.clamp(camera.position.distanceTo(tip) * .077, .43, 1.04);
      displayed.position.copy(tip).addScaledVector(xAxis, (.55 - .49 * extension) * scale).addScaledVector(forward, .11 * scale);
      displayed.quaternion.setFromRotationMatrix(rotation);
      displayed.scale.setScalar(scale);
      if (instrument.jaws) {
        const gap = (action ? .32 - .28 * extension : .28) * (instrument === tools.open ? .83 : .43);
        instrument.jaws[0].rotation.y = -gap;
        instrument.jaws[1].rotation.y = gap;
      }
      droplet.visible = !!action?.addsMedium && !action.instant && progress >= .34 && progress < .72;
      if (droplet.visible) {
        const descent = (progress - .34) / .38;
        droplet.position.copy(tip);
        droplet.position.y = THREE.MathUtils.lerp(tip.y - .12, dish.position.y + .06, descent * descent);
      }
      return true;
    },
  };
}
