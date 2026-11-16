export function createFlyModel(THREE) {
  const group = new THREE.Group();
  const gaitFrame = new THREE.Group();
  const torsoFrame = new THREE.Group();
  group.add(gaitFrame);
  gaitFrame.add(torsoFrame);
  const structures = {};
  const wingPivots = [];
  const antennaPivots = [];
  const legRig = [];
  const up = new THREE.Vector3(0, 1, 0);
  const sphereGeometry = new THREE.SphereGeometry(1, 36, 24);
  const mediumGeometry = new THREE.SphereGeometry(1, 20, 14);
  const smallGeometry = new THREE.SphereGeometry(1, 13, 9);
  const opticalGeometry = new THREE.SphereGeometry(1, 10, 6);
  const amber = material(0xb97c42, 0.55);
  const ochre = material(0xd39856, 0.63);
  const honey = material(0xd6a568, 0.58);
  const shell = material(0x9a6338, 0.51);
  const dark = material(0x462d27, 0.54);
  const seta = material(0x2b211e, 0.65);
  const red = material(0x8c181b, 0.32);
  const magenta = material(0xb54161, 0.54);
  const pink = material(0xe77b9a, 0.48);
  const violet = material(0x8259c8, 0.56);
  const lavender = material(0xb28fdf, 0.57);
  const turquoise = material(0x52d4c5, 0.48);
  const amberOrgan = material(0xf3aa54, 0.5);
  const gold = material(0xffc776, 0.52);
  const cream = material(0xfbd7ac, 0.65);

  function material(color, roughness, settings = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness, ...settings });
  }

  function vector(point) {
    return new THREE.Vector3(...point);
  }

  function part(id, label) {
    const container = new THREE.Group();
    container.name = label;
    container.userData.structureId = id;
    structures[id] = container;
    (id === 'legs' ? gaitFrame : torsoFrame).add(container);
    return container;
  }

  function attach(parent, object, shadows = false) {
    object.castShadow = shadows;
    object.receiveShadow = shadows;
    object.userData.structureId = parent.userData.structureId;
    parent.add(object);
    return object;
  }

  function ellipsoid(parent, position, scale, surface, tilt = 0, shadows = false) {
    const radius = Math.max(...scale);
    const geometry = radius > 0.44 ? sphereGeometry : radius > 0.175 ? mediumGeometry : smallGeometry;
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.position.fromArray(position);
    mesh.scale.fromArray(scale);
    mesh.rotation.z = tilt;
    return attach(parent, mesh, shadows);
  }

  function segment(parent, start, end, radiusA, radiusB, surface, sides = 10) {
    const a = vector(start);
    const b = vector(end);
    const distance = a.distanceTo(b);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusB, radiusA, distance, sides), surface);
    mesh.position.copy(a).lerp(b, 0.5);
    mesh.quaternion.setFromUnitVectors(up, b.sub(a).normalize());
    return attach(parent, mesh);
  }

  function tube(parent, nodes, radius, surface, sections = 32, closed = false) {
    const curve = new THREE.CatmullRomCurve3(nodes.map(vector), closed, 'centripetal');
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, sections, radius, 7, closed), surface);
    return attach(parent, mesh);
  }

  // Deterministic variation keeps the adult's setae and pigmentation stable across visits.
  let randomState = 91821;
  function random() {
    randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
    return randomState / 4294967296;
  }

  function bristles(parent, hairs) {
    const geometry = new THREE.CylinderGeometry(0.04, 1, 1, 5);
    const instances = new THREE.InstancedMesh(geometry, seta, hairs.length);
    const transform = new THREE.Object3D();
    hairs.forEach(([from, to, width], index) => {
      const a = vector(from);
      const b = vector(to);
      transform.position.copy(a).lerp(b, 0.5);
      transform.scale.set(width, a.distanceTo(b), width);
      transform.quaternion.setFromUnitVectors(up, b.sub(a).normalize());
      transform.updateMatrix();
      instances.setMatrixAt(index, transform.matrix);
    });
    instances.instanceMatrix.needsUpdate = true;
    // Surface details must not intercept a selection intended for the parent structure.
    instances.raycast = () => {};
    return attach(parent, instances);
  }

  function ringSurface(parent, positionAt, colorAt, rows, columns) {
    const positions = [];
    const colors = [];
    const faces = [];
    for (let row = 0; row <= rows; row++) {
      const t = row / rows;
      for (let column = 0; column <= columns; column++) {
        const angle = column / columns * Math.PI * 2;
        positions.push(...positionAt(t, angle));
        colors.push(...colorAt(t, angle).toArray());
        if (row < rows && column < columns) {
          const a = row * (columns + 1) + column;
          const b = a + columns + 1;
          faces.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(faces);
    geometry.computeVertexNormals();
    return attach(parent, new THREE.Mesh(geometry, material(0xffffff, 0.59, { vertexColors: true })), true);
  }

  const cuticle = part('cuticle', 'Cuticle');
  const eyes = part('eyes', 'Compound eyes');
  const antennae = part('antennae', 'Antennae');
  const proboscis = part('proboscis', 'Proboscis');
  const wings = part('wings', 'Wings');
  const halteres = part('halteres', 'Halteres');
  const legs = part('legs', 'Legs');
  const brain = part('brain', 'Brain');
  const cord = part('ventral-nerve-cord', 'Ventral nerve cord');
  const crop = part('crop', 'Crop');
  const gut = part('gut', 'Gut');
  const tracheae = part('tracheae', 'Tracheae');
  const heart = part('heart', 'Dorsal vessel');
  const ovaries = part('ovaries', 'Ovaries');

  // Separate pivots retain independent layer visibility and the original surface meshes.
  const headShell = attach(cuticle, new THREE.Group());
  const headEyes = attach(eyes, new THREE.Group());
  const headAntennae = attach(antennae, new THREE.Group());
  const headMouth = attach(proboscis, new THREE.Group());
  const mouthHinge = attach(headMouth, new THREE.Group());
  const headPivots = [headShell, headEyes, headAntennae, headMouth];

  ellipsoid(headShell, [-1.72, 0.10, 0], [0.72, 0.70, 0.71], ochre, -0.10, true);
  ellipsoid(cuticle, [-1.22, -0.05, 0], [0.39, 0.33, 0.45], shell, 0, true);
  ellipsoid(cuticle, [-0.28, 0.05, 0], [1.06, 0.83, 0.77], amber, 0.14, true);
  ellipsoid(cuticle, [-0.40, 0.34, 0], [0.89, 0.58, 0.70], ochre, 0.15, true);
  ellipsoid(cuticle, [0.58, 0.40, 0], [0.57, 0.40, 0.51], honey, -0.20, true);
  ellipsoid(cuticle, [-0.95, -0.36, 0], [0.49, 0.42, 0.53], honey, 0.08, true);

  // Each tergite has a gently overlapping posterior edge. Pigment fades down the flanks.
  const boundaries = [0, 0.18, 0.35, 0.51, 0.66, 0.80, 0.92, 1];
  function segmentProgress(t) {
    const next = boundaries.findIndex((boundary) => boundary > t);
    if (next < 0) return 1;
    return (t - boundaries[next - 1]) / (boundaries[next] - boundaries[next - 1]);
  }

  function abdomenAt(t, angle) {
    const spindle = Math.max(0.004, Math.sin(Math.PI * (0.115 + t * 0.884)));
    const outline = Math.pow(spindle, 0.66) * (1.14 - t * 0.30);
    const overlap = 1 + 0.040 * Math.sin(Math.PI * segmentProgress(t));
    const y = Math.cos(angle);
    return [
      0.41 + t * 2.78 + (1 - y) * 0.07 * Math.sin(Math.PI * t),
      -0.10 - t * 0.15 + y * outline * overlap * (y < 0 ? 0.55 : 0.73),
      Math.sin(angle) * outline * overlap * 0.82,
    ];
  }

  const dorsalAmber = new THREE.Color(0xd6a05b);
  const ventralAmber = new THREE.Color(0xb48550);
  const bandPigment = new THREE.Color(0x483129);
  const boundaryTint = new THREE.Color(0x8a5938);
  ringSurface(cuticle, abdomenAt, (t, angle) => {
    const dorsal = THREE.MathUtils.smoothstep(Math.cos(angle), -0.53, 0.56);
    const progress = segmentProgress(t);
    const pigment = THREE.MathUtils.smoothstep(progress, 0.54, 0.90) * dorsal * 0.94;
    return ventralAmber.clone()
      .lerp(dorsalAmber, dorsal)
      .lerp(bandPigment, pigment)
      .lerp(boundaryTint, THREE.MathUtils.smoothstep(progress, 0.94, 1) * 0.28)
      .multiplyScalar(0.96 + 0.09 * random());
  }, 154, 72);
  ellipsoid(cuticle, [3.13, -0.24, 0], [0.14, 0.09, 0.14], shell, 0.07, true);

  const cuticleHairs = [];
  const headHairs = [];
  for (let i = 0; i < 250; i++) {
    const x = -0.39 + (random() - 0.5) * 1.70;
    const width = Math.sqrt(Math.max(0, 1 - ((x + 0.39) / 0.91) ** 2));
    const a = (random() - 0.5) * Math.PI * 0.98;
    const y = 0.32 + Math.cos(a) * 0.57 * width + x * 0.13;
    const z = Math.sin(a) * 0.70 * width;
    const length = 0.04 + 0.07 * random();
    cuticleHairs.push([[x, y, z], [x + 0.55 * length, y + Math.cos(a) * length, z + Math.sin(a) * length], 0.005 + random() * 0.005]);
  }
  for (let i = 0; i < 190; i++) {
    const t = Math.max(0.10, random() * 0.93);
    const a = (random() - 0.5) * Math.PI * 1.44;
    const [x, y, z] = abdomenAt(t, a);
    const length = 0.048 + 0.06 * random();
    cuticleHairs.push([[x, y, z], [x + 0.67 * length, y + Math.cos(a) * length, z + Math.sin(a) * length], 0.004 + random() * 0.004]);
  }
  for (const s of [-1, 1]) {
    const eyeBase = [-1.70, 0.17, s * 0.52];
    const eyeSize = [0.60, 0.63, 0.44];
    const eyeShell = ellipsoid(headEyes, eyeBase, eyeSize, red, 0, true);
    eyeShell.rotation.x = s * -0.15;
    const eyeRim = ellipsoid(headShell, [-1.64, 0.16, s * 0.49], [0.63, 0.67, 0.39], shell);
    eyeRim.rotation.x = s * -0.12;

    const facetSurface = material(0xffffff, 0.33);
    const facets = new THREE.InstancedMesh(opticalGeometry, facetSurface, 620);
    const transform = new THREE.Object3D();
    const lens = new THREE.Color();
    const eyeCenter = vector(eyeBase);
    const eyeScale = vector(eyeSize);
    const axis = new THREE.Vector3(0, 0, 1);
    const outer = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < facets.count; i++) {
      const forward = -0.06 + 1.06 * (i + 0.5) / facets.count;
      const radius = Math.sqrt(1 - forward ** 2);
      const angle = i * goldenAngle;
      outer.set(radius * Math.cos(angle), radius * Math.sin(angle), s * forward);
      normal.copy(outer).divide(eyeScale).normalize().applyQuaternion(eyeShell.quaternion);
      transform.position.copy(outer).multiply(eyeScale).applyQuaternion(eyeShell.quaternion).add(eyeCenter);
      transform.position.addScaledVector(normal, 0.0025);
      transform.quaternion.setFromUnitVectors(axis, normal);
      const diameter = 0.027 + 0.0025 * random();
      transform.scale.set(diameter, diameter, 0.012);
      transform.updateMatrix();
      facets.setMatrixAt(i, transform.matrix);
      lens.setHSL(0.984 + random() * 0.023, 0.67 + random() * 0.16, 0.20 + random() * 0.13);
      facets.setColorAt(i, lens);
    }
    facets.instanceMatrix.needsUpdate = true;
    facets.instanceColor.needsUpdate = true;
    facets.raycast = () => {};
    attach(headEyes, facets);

    headHairs.push(
      [[-1.99, 0.61, s * 0.35], [-2.17, 0.92, s * 0.47], 0.021],
      [[-1.63, 0.72, s * 0.37], [-1.47, 1.00, s * 0.53], 0.020],
    );
    cuticleHairs.push(
      [[-0.77, 0.83, s * 0.39], [-0.70, 1.09, s * 0.55], 0.018],
      [[-0.38, 0.83, s * 0.58], [-0.32, 0.99, s * 0.86], 0.019],
      [[0.36, 0.74, s * 0.30], [0.57, 1.00, s * 0.42], 0.022],
      [[0.65, 0.62, s * 0.33], [0.91, 0.86, s * 0.55], 0.019],
    );

    const antennaHinge = attach(headAntennae, new THREE.Group());
    antennaPivots.push({ pivot: antennaHinge, base: vector([-2.35, 0.11, s * 0.184]), side: s });
    ellipsoid(antennaHinge, [-2.35, 0.11, s * 0.184], [0.13, 0.13, 0.115], shell, -0.25);
    ellipsoid(antennaHinge, [-2.47, 0.15, s * 0.216], [0.19, 0.17, 0.118], amber, -0.34);
    const arista = [[-2.53, 0.23, s * 0.24], [-2.63, 0.43, s * 0.29], [-2.80, 0.62, s * 0.37], [-2.94, 0.73, s * 0.43]];
    tube(antennaHinge, arista, 0.015, dark, 16);
    const antennaHairs = [];
    for (let i = 0; i < 8; i++) {
      const t = 0.14 + i * 0.105;
      const x = -2.53 - 0.41 * t;
      const y = 0.23 + 0.50 * t;
      const z = s * (0.24 + 0.19 * t);
      const length = 0.16 * Math.sin(Math.PI * (t + 0.04));
      antennaHairs.push([[x, y, z], [x + length * 0.1, y + length * 0.78, z + s * length * 0.54], 0.009]);
      antennaHairs.push([[x, y, z], [x - length * 0.88, y + length * 0.15, z - s * length * 0.08], 0.009]);
    }
    bristles(antennaHinge, antennaHairs);

    const haltereStart = [0.61, -0.03, s * 0.60];
    const haltereTip = [0.93, -0.25, s * 0.99];
    ellipsoid(halteres, haltereStart, [0.10, 0.10, 0.12], shell);
    segment(halteres, haltereStart, haltereTip, 0.062, 0.049, honey);
    ellipsoid(halteres, haltereTip, [0.15, 0.09, 0.14], honey, -0.45);
  }
  bristles(cuticle, cuticleHairs);
  bristles(headShell, headHairs);

  // The three dorsal ocelli form a small triangle above the antennae.
  ellipsoid(headShell, [-1.93, 0.74, 0], [0.085, 0.030, 0.074], dark);
  for (const s of [-1, 1]) {
    ellipsoid(headShell, [-1.68, 0.80, s * 0.14], [0.067, 0.025, 0.061], dark);
    ellipsoid(mouthHinge, [-2.33, -0.48, s * 0.112], [0.20, 0.16, 0.14], honey, -0.60);
    ellipsoid(mouthHinge, [-2.45, -0.63, s * 0.080], [0.13, 0.095, 0.105], shell, -0.51);
  }
  ellipsoid(mouthHinge, [-2.22, -0.37, 0], [0.25, 0.23, 0.31], dark, -0.52);

  const wingMembrane = new THREE.MeshPhysicalMaterial({
    color: 0xc8d9dc,
    roughness: 0.35,
    metalness: 0.06,
    side: THREE.DoubleSide,
    opacity: 0.38,
    transparent: true,
    depthWrite: false,
    iridescence: 0.25,
    iridescenceIOR: 1.27,
  });
  const leadingVein = material(0x8c816a, 0.60, { transparent: true, opacity: 0.90, depthWrite: false });
  const fineVein = material(0xa0997c, 0.63, { transparent: true, opacity: 0.78, depthWrite: false });
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(-0.09, 0.39, s * 0.68);
    attach(wings, pivot);
    wingPivots.push({ pivot, side: s });
    const wingAt = (t, v) => {
      const width = 0.82 * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.71) * (0.64 + 0.57 * t) + 0.012;
      const chord = (v - 0.44) * 2 * width;
      return [
        3.32 * t - chord * 0.41,
        0.05 + 0.12 * Math.sin(Math.PI * t) + 0.32 * t + chord * 0.25 + 0.12 * chord ** 2,
        s * (1.33 * t + 0.39 * Math.sin(Math.PI * t / 2) + chord * 0.84),
      ];
    };
    const rows = 32;
    const columns = 12;
    const vertices = [];
    const indices = [];
    for (let row = 0; row <= rows; row++) {
      for (let column = 0; column <= columns; column++) {
        vertices.push(...wingAt(row / rows, column / columns));
        if (row < rows && column < columns) {
          const a = row * (columns + 1) + column;
          const b = a + columns + 1;
          indices.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const membrane = attach(pivot, new THREE.Mesh(geometry, wingMembrane));
    membrane.renderOrder = 1;
    ellipsoid(pivot, [0.08, 0.00, 0.00], [0.17, 0.089, 0.15], shell);

    function vein(sample, radius, surface) {
      const points = Array.from({ length: 13 }, (_, index) => {
        const [t, v] = sample(index / 12);
        const [x, y, z] = wingAt(t, v);
        return [x, y + 0.014, z];
      });
      const mesh = tube(pivot, points, radius, surface, 26);
      mesh.renderOrder = 2;
    }
    // Leading and trailing margins and the main radiating fields of the adult wing.
    vein((t) => [t, 0.997], 0.018, leadingVein);
    vein((t) => [t, 0.004], 0.010, fineVein);
    vein((t) => [0.91 * t, 0.51 + 0.413 * (1 - (1 - t) ** 2)], 0.015, leadingVein);
    vein((t) => [0.99 * t, 0.48 + 0.25 * Math.sin(t * 1.46)], 0.010, fineVein);
    vein((t) => [t, 0.47 + 0.09 * Math.sin(t * Math.PI)], 0.013, leadingVein);
    vein((t) => [0.93 * t, 0.47 - 0.20 * t ** 0.5], 0.012, fineVein);
    vein((t) => [0.83 * t, 0.44 - 0.36 * t ** 0.82], 0.013, leadingVein);
    vein((t) => [0.596 + 0.023 * t, 0.297 + 0.267 * t], 0.010, fineVein);
    vein((t) => [0.429 - 0.02 * t, 0.185 + 0.172 * t], 0.010, fineVein);
    const wingHairs = [];
    for (let i = 0; i < 36; i++) {
      const t = 0.18 + i * 0.022;
      const [x, y, z] = wingAt(t, 1);
      wingHairs.push([[x, y, z], [x + 0.055, y + 0.016, z + s * (0.05 + 0.02 * random())], 0.004]);
    }
    bristles(pivot, wingHairs);
  }

  for (const s of [-1, 1]) {
    const route = [
      [[-0.91, -0.45, s * 0.51], [-1.02, -0.68, s * 0.76], [-1.53, -0.93, s * 1.33], [-1.91, -1.61, s * 1.64], [-2.65, -1.87, s * 1.72]],
      [[-0.18, -0.59, s * 0.59], [-0.22, -0.83, s * 0.87], [-0.34, -0.96, s * 1.66], [-0.30, -1.65, s * 2.21], [-0.73, -1.87, s * 2.59]],
      [[0.45, -0.48, s * 0.50], [0.47, -0.77, s * 0.79], [1.14, -0.91, s * 1.61], [1.46, -1.65, s * 2.09], [1.88, -1.87, s * 2.43]],
    ];
    for (const [index, [hip, socket, knee, shin, foot]] of route.entries()) {
      const coxa = attach(legs, new THREE.Group());
      const femur = attach(legs, new THREE.Group());
      const tibia = attach(legs, new THREE.Group());
      const tarsus = attach(legs, new THREE.Group());
      const limbName = (s < 0 ? 'Near ' : 'Far ') + ['front', 'middle', 'hind'][index] + ' leg ';
      coxa.name = limbName + 'coxa';
      femur.name = limbName + 'femur';
      tibia.name = limbName + 'tibia';
      tarsus.name = limbName + 'tarsus';
      ellipsoid(coxa, hip, [0.16, 0.16, 0.16], shell);
      segment(coxa, hip, socket, 0.125, 0.107, amber);
      segment(femur, socket, knee, 0.112, 0.071, ochre);
      ellipsoid(femur, knee, [0.092, 0.092, 0.092], shell);
      segment(tibia, knee, shin, 0.073, 0.044, honey);
      ellipsoid(tibia, shin, [0.051, 0.051, 0.051], shell);
      const start = vector(shin);
      const end = vector(foot);
      for (let t = 0; t < 5; t++) {
        const from = start.clone().lerp(end, 1 - (1 - t / 5) ** 1.45);
        const to = start.clone().lerp(end, 1 - (1 - (t + 1) / 5) ** 1.45);
        const radius = 0.043 - t * 0.004;
        segment(tarsus, from.toArray(), to.toArray(), radius, radius * 0.76, t < 2 ? amber : shell, 7);
        ellipsoid(tarsus, from.toArray(), [radius * 1.10, radius, radius * 1.10], dark);
      }
      for (const offset of [-0.043, 0.043]) {
        const endpoint = [foot[0] + (foot[0] - shin[0]) * 0.13, foot[1] - 0.023, foot[2] + offset];
        const hook = [endpoint[0] - (foot[0] - shin[0]) * 0.03, endpoint[1] - 0.029, endpoint[2] + offset * 0.3];
        tube(tarsus, [foot, endpoint, hook], 0.014, dark, 7);
      }

      for (const [parent, from, to, width] of [[femur, socket, knee, 0.094], [tibia, knee, shin, 0.055], [tarsus, shin, foot, 0.028]]) {
        const legHairs = [];
        for (let i = 0; i < 16; i++) {
          const f = 0.16 + i * 0.046;
          const x = THREE.MathUtils.lerp(from[0], to[0], f);
          const y = THREE.MathUtils.lerp(from[1], to[1], f);
          const z = THREE.MathUtils.lerp(from[2], to[2], f);
          const angle = i * 2.39;
          const dy = Math.cos(angle);
          const dz = Math.sin(angle);
          const length = width + random() * 0.07;
          legHairs.push([[x, y + dy * width, z + dz * width], [x - 0.6 * length, y + dy * length * 1.5, z + dz * length * 1.5], 0.0048]);
        }
        bristles(parent, legHairs);
      }

      const base = vector(socket);
      const restKnee = vector(knee);
      const lower = restKnee.clone().sub(base);
      const upper = start.clone().sub(restKnee);
      const kneeAxis = start.clone().sub(base).normalize();
      const bend = lower.clone().addScaledVector(kneeAxis, -lower.dot(kneeAxis)).normalize();
      legRig.push({
        side: s, front: index === 0, coxa, femur, tibia, tarsus, base, restKnee,
        restShin: start, restFoot: end, bend,
        femurLength: lower.length(), tibiaLength: upper.length(),
        femurAxis: lower.normalize(), tibiaAxis: upper.normalize(),
        tarsusBack: start.clone().sub(end),
        groomBack: new THREE.Vector3(.76, -.12, s * .64).normalize().multiplyScalar(start.distanceTo(end)),
      });
    }
  }

  for (const s of [-1, 1]) {
    ellipsoid(brain, [-1.76, 0.31, s * 0.236], [0.35, 0.305, 0.29], violet, s * 0.11);
    ellipsoid(brain, [-1.71, 0.25, s * 0.48], [0.27, 0.25, 0.18], lavender, -0.22);
    ellipsoid(brain, [-1.71, 0.20, s * 0.63], [0.20, 0.20, 0.095], violet, -0.29);
    ellipsoid(brain, [-1.93, 0.21, s * 0.142], [0.19, 0.16, 0.14], lavender, -0.34);
    tube(brain, [[-1.76, 0.39, s * 0.14], [-1.64, 0.49, s * 0.32], [-1.42, 0.42, s * 0.38]], 0.047, lavender, 16);
    tube(cord, [[-1.78, 0.08, s * 0.086], [-1.66, -0.19, s * 0.088], [-1.20, -0.40, s * 0.070], [-0.90, -0.49, s * 0.069]], 0.055, lavender, 20);
    for (const x of [-0.69, -0.30, 0.10]) {
      tube(cord, [[x, -0.49, s * 0.11], [x + 0.075, -0.50, s * 0.26], [x + 0.17, -0.61, s * 0.50]], 0.034, lavender, 15);
    }
  }
  ellipsoid(brain, [-1.80, 0.26, 0], [0.29, 0.26, 0.28], violet);
  ellipsoid(cord, [-0.39, -0.47, 0], [0.63, 0.13, 0.19], violet, 0.04);
  ellipsoid(cord, [-0.64, -0.44, 0], [0.23, 0.15, 0.20], lavender, 0.07);
  ellipsoid(cord, [-0.12, -0.47, 0], [0.21, 0.13, 0.16], lavender, 0.03);
  ellipsoid(cord, [0.18, -0.47, 0], [0.19, 0.13, 0.13], violet, -0.02);

  // The crop is an expandable foregut pouch, connected by a narrow duct.
  ellipsoid(crop, [0.92, -0.41, 0.05], [0.43, 0.23, 0.31], gold, 0.06);
  ellipsoid(crop, [1.18, -0.38, 0.02], [0.33, 0.21, 0.27], amberOrgan, 0.09);
  tube(crop, [[-0.65, -0.09, 0.03], [-0.38, -0.21, 0.05], [0.05, -0.27, 0.09], [0.55, -0.39, 0.10]], 0.054, gold, 25);
  tube(gut, [[-2.17, -0.30, 0], [-1.77, -0.13, 0], [-1.33, -0.04, 0], [-0.88, -0.026, 0], [-0.65, -0.09, 0.03]], 0.052, gold, 24);
  ellipsoid(gut, [-0.61, -0.08, 0.045], [0.18, 0.14, 0.14], amberOrgan, -0.20);
  tube(gut, [
    [-0.59, -0.09, 0.06], [0.01, -0.16, 0.10], [0.53, 0.02, 0.11],
    [1.01, 0.23, 0.21], [1.54, 0.25, 0.31], [1.95, 0.08, 0.25],
    [2.12, -0.16, 0.04], [1.70, -0.32, -0.07], [1.19, -0.31, -0.23],
    [0.88, -0.02, -0.33], [1.10, 0.24, -0.36], [1.61, 0.32, -0.24],
    [2.18, 0.17, -0.15], [2.45, 0.03, -0.04],
  ], 0.112, amberOrgan, 75);
  tube(gut, [[2.45, 0.03, -0.04], [2.69, -0.04, 0], [2.89, -0.14, 0], [3.03, -0.20, 0]], 0.067, gold, 18);

  for (const s of [-1, 1]) {
    const trunks = [[-1.01, 0.14, s * 0.39], [-0.54, 0.19, s * 0.51], [0.20, 0.11, s * 0.53], [0.86, 0.09, s * 0.53], [1.42, 0.09, s * 0.55], [1.99, 0.05, s * 0.47], [2.49, -0.02, s * 0.36], [2.80, -0.11, s * 0.17]];
    tube(tracheae, trunks, 0.046, turquoise, 46);
    tube(tracheae, [[-1.01, 0.14, s * 0.39], [-1.32, 0.29, s * 0.38], [-1.67, 0.48, s * 0.39], [-1.94, 0.46, s * 0.32]], 0.027, turquoise, 18);
    for (const [x, y, z] of trunks.slice(1, -1)) {
      tube(tracheae, [[x, y, z], [x + 0.03, y + 0.15, z + s * 0.065], [x + 0.09, y + 0.30, z - s * 0.17]], 0.027, turquoise, 14);
      tube(tracheae, [[x, y, z], [x - 0.08, y - 0.15, z + s * 0.09], [x - 0.02, y - 0.28, z - s * 0.04]], 0.026, turquoise, 14);
      tube(tracheae, [[x + 0.03, y + 0.15, z + s * 0.065], [x + 0.20, y + 0.17, z + s * 0.081], [x + 0.27, y + 0.24, z + s * 0.02]], 0.015, turquoise, 12);
    }
  }

  tube(heart, [[-1.48, 0.50, 0], [-0.85, 0.60, 0], [-0.15, 0.60, 0], [0.49, 0.47, 0], [0.93, 0.51, 0], [1.44, 0.51, 0]], 0.057, magenta, 42);
  tube(heart, [[0.88, 0.51, 0], [1.34, 0.53, 0], [1.92, 0.47, 0], [2.36, 0.34, 0], [2.78, 0.16, 0]], 0.082, magenta, 36);
  for (const [x, y] of [[1.17, 0.53], [1.53, 0.52], [1.89, 0.47], [2.24, 0.38], [2.55, 0.26]]) {
    ellipsoid(heart, [x, y, 0], [0.145, 0.105, 0.105], magenta, -0.11);
    for (const s of [-1, 1]) {
      tube(heart, [[x, y, 0], [x - 0.03, y - 0.08, s * 0.19], [x - 0.12, y - 0.16, s * 0.32]], 0.022, pink, 12);
    }
  }

  // Ovarioles are gathered in two ovaries, with larger late egg chambers at their bases.
  for (const s of [-1, 1]) {
    const base = [2.47, -0.39, s * 0.14];
    for (let i = 0; i < 10; i++) {
      const a = i * 2.39996;
      const y = -0.20 + Math.sin(a) * (0.115 + random() * 0.12);
      const z = s * (0.39 + Math.cos(a) * 0.15);
      const endX = 1.22 + 0.30 * random();
      const centerX = 1.91 + 0.24 * random();
      tube(ovaries, [[endX, y, z], [centerX, y - 0.044, z], base], 0.023, pink, 18);
      ellipsoid(ovaries, [endX + 0.16, y, z], [0.12, 0.043, 0.048], pink, -0.13);
      ellipsoid(ovaries, [(endX + centerX) / 2, y - 0.012, z], [0.127, 0.063, 0.060], cream, -0.16);
      ellipsoid(ovaries, [centerX, y - 0.046, z - s * 0.039], [0.21, 0.095, 0.083], cream, -0.18);
    }
    tube(ovaries, [base, [2.64, -0.40, s * 0.09], [2.79, -0.42, 0]], 0.046, pink, 15);
  }
  tube(ovaries, [[2.78, -0.42, 0], [2.89, -0.39, 0], [3.04, -0.31, 0]], 0.063, pink, 12);

  for (const id of ['brain', 'ventral-nerve-cord', 'crop', 'gut', 'tracheae', 'heart', 'ovaries']) {
    structures[id].visible = false;
  }

  function animate(timeSeconds, enabled = true) {
    const t = enabled ? timeSeconds : 0;
    for (const { pivot, side } of wingPivots) {
      const flick = Math.pow(Math.max(0, Math.sin(t * 1.47 + side * 0.6)), 18) * Math.sin(t * 33) * 0.037;
      pivot.rotation.x = enabled ? side * (0.014 * Math.sin(t * 2.3) + flick) : 0;
    }
  }

  const math = THREE.MathUtils;
  const headBase = new THREE.Vector3(-1.18, -0.02, 0);
  const mouthBase = new THREE.Vector3(-2.15, -0.32, 0);
  const headTurn = new THREE.Quaternion();
  const angles = new THREE.Euler();
  const origin = new THREE.Vector3();
  const knee = new THREE.Vector3();
  const shin = new THREE.Vector3();
  const foot = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const bend = new THREE.Vector3();
  const tarsusBack = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const projected = new THREE.Vector3();

  function finite(value) {
    return Number.isFinite(value) ? value : 0;
  }

  function rotateAbout(pivot, base) {
    projected.copy(base).multiply(pivot.scale).applyQuaternion(pivot.quaternion);
    pivot.position.copy(base).sub(projected);
  }

  function pointBone(bone, restOrigin, restAxis, start, end) {
    direction.subVectors(end, start).normalize();
    bone.quaternion.setFromUnitVectors(restAxis, direction);
    projected.copy(restOrigin).applyQuaternion(bone.quaternion);
    bone.position.copy(start).sub(projected);
  }

  function solveLeg(leg, offset) {
    const lift = math.clamp(finite(offset?.[1]), 0, leg.front ? 2.22 : .85);
    const x = math.clamp(finite(offset?.[0]), -.72, .72);
    const spread = leg.front ? 1.28 : .42;
    const z = math.clamp(finite(offset?.[2]), -spread, spread);
    foot.copy(leg.restFoot).add(direction.set(x, lift, z));

    if (leg.front) {
      // The fore tarsi sweep in front of the eyes, staying outboard beside the head.
      const ahead = 1 - math.smoothstep(foot.x, -2.54, -2.18);
      const inwardLimit = math.lerp(1.17, math.lerp(.97, .46, ahead), math.smoothstep(lift, .48, 1.38));
      foot.z = leg.side * Math.max(inwardLimit, foot.z * leg.side);
    }

    tarsusBack.copy(leg.tarsusBack);
    if (leg.front) {
      const inward = leg.restFoot.z * leg.side - foot.z * leg.side;
      const tuck = math.smoothstep(lift, .55, 1.8) * math.smoothstep(inward, .13, .72);
      if (tuck) tarsusBack.lerp(leg.groomBack, tuck).setLength(leg.tarsusBack.length());
    }
    shin.copy(foot).add(tarsusBack);
    origin.copy(leg.base).applyQuaternion(torsoFrame.quaternion).add(torsoFrame.position);

    // Limit the ankle to the femur/tibia reach while keeping the tarsus above its rest floor.
    const maximum = leg.femurLength + leg.tibiaLength - .0001;
    axis.subVectors(shin, origin);
    if (axis.lengthSq() > maximum * maximum) shin.copy(origin).addScaledVector(axis, maximum / axis.length());
    const lowestShin = leg.restFoot.y + tarsusBack.y;
    if (shin.y < lowestShin) {
      shin.y = lowestShin;
      axis.subVectors(shin, origin);
      const horizontal = Math.hypot(axis.x, axis.z);
      const horizontalLimit = Math.sqrt(Math.max(0, maximum * maximum - axis.y * axis.y));
      if (horizontal > horizontalLimit) {
        shin.x = origin.x + axis.x * horizontalLimit / horizontal;
        shin.z = origin.z + axis.z * horizontalLimit / horizontal;
      }
    }

    axis.subVectors(shin, origin);
    const distance = Math.max(.0001, axis.length());
    axis.divideScalar(distance);
    const along = (leg.femurLength ** 2 - leg.tibiaLength ** 2 + distance ** 2) / (2 * distance);
    const height = Math.sqrt(Math.max(0, leg.femurLength ** 2 - along ** 2));
    bend.copy(leg.bend).applyQuaternion(torsoFrame.quaternion);
    bend.addScaledVector(axis, -bend.dot(axis)).normalize();
    if (leg.front && lift > .46) {
      // Raise the fore-knee outboard before the tarsus sweeps in toward the antenna.
      direction.set(0, 0, leg.side).addScaledVector(axis, -leg.side * axis.z).normalize();
      bend.lerp(direction, .84 * math.smoothstep(lift, .46, 1.5)).normalize();
    }
    knee.copy(origin).addScaledVector(axis, along).addScaledVector(bend, height);
    foot.copy(shin).sub(tarsusBack);

    // Each transform rotates the existing mesh over a fixed-length joint, including its bristles.
    leg.coxa.quaternion.copy(torsoFrame.quaternion);
    leg.coxa.position.copy(torsoFrame.position);
    pointBone(leg.femur, leg.base, leg.femurAxis, origin, knee);
    pointBone(leg.tibia, leg.restKnee, leg.tibiaAxis, knee, shin);
    direction.subVectors(foot, shin).normalize();
    projected.copy(leg.tarsusBack).normalize().negate();
    leg.tarsus.quaternion.setFromUnitVectors(projected, direction);
    projected.copy(leg.restShin).applyQuaternion(leg.tarsus.quaternion);
    leg.tarsus.position.copy(shin).sub(projected);
  }

  const rig = {
    applyPose(pose) {
      gaitFrame.position.set(math.clamp(finite(pose.x), -1.35, 1.35), 0, math.clamp(finite(pose.z), -.9, .9));
      gaitFrame.rotation.y = finite(pose.yaw) % (Math.PI * 2);
      torsoFrame.position.y = math.clamp(finite(pose.bodyY), -.16, .23);
      torsoFrame.rotation.set(math.clamp(finite(pose.bodyRoll), -.13, .13), 0,
        math.clamp(finite(pose.bodyPitch), -.13, .13), 'ZYX');
      headTurn.setFromEuler(angles.set(0, math.clamp(finite(pose.headYaw), -.23, .23),
        math.clamp(finite(pose.headPitch), -.23, .23), 'YZX'));
      for (const pivot of headPivots) {
        pivot.quaternion.copy(headTurn);
        rotateAbout(pivot, headBase);
      }
      for (let i = 0; i < antennaPivots.length; i++) {
        const { pivot, base, side } = antennaPivots[i];
        const input = Array.isArray(pose.antenna) ? pose.antenna[i] : pose.antenna;
        const amount = math.clamp(finite(input), -.27, .27);
        pivot.rotation.set(side * amount * .36, -side * amount * .58, amount * .72);
        rotateAbout(pivot, base);
      }
      const extension = math.clamp(finite(pose.proboscis), 0, 1);
      mouthHinge.scale.set(1 + .29 * extension, 1 + .22 * extension, 1);
      mouthHinge.rotation.z = -.20 * extension;
      rotateAbout(mouthHinge, mouthBase);

      const wing = math.clamp(finite(pose.wing), -.30, .62);
      for (const { pivot, side } of wingPivots) pivot.rotation.x = -side * wing;
      for (let i = 0; i < legRig.length; i++) solveLeg(legRig[i], pose.feet?.[i]);
    },

    reset() {
      gaitFrame.position.set(0, 0, 0);
      gaitFrame.quaternion.identity();
      torsoFrame.position.set(0, 0, 0);
      torsoFrame.quaternion.identity();
      for (const pivot of headPivots) {
        pivot.position.set(0, 0, 0);
        pivot.quaternion.identity();
      }
      for (const { pivot } of antennaPivots) {
        pivot.position.set(0, 0, 0);
        pivot.quaternion.identity();
      }
      mouthHinge.position.set(0, 0, 0);
      mouthHinge.quaternion.identity();
      mouthHinge.scale.set(1, 1, 1);
      for (const leg of legRig) {
        for (const bone of [leg.coxa, leg.femur, leg.tibia, leg.tarsus]) {
          bone.position.set(0, 0, 0);
          bone.quaternion.identity();
        }
      }
      for (const { pivot } of wingPivots) pivot.rotation.x = 0;
    },
  };

  return { group, structures, animate, rig };
}
