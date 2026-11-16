// Original teaching geometry using the larval exterior of Jürgens et al.
// https://doi.org/10.1093/genetics/iyae129 and the CNS morphology in Clayworth
// et al. https://doi.org/10.1101/pdb.top108159 and Huser et al.
// https://doi.org/10.1371/journal.pone.0047518 as anatomical references.
export function createLarvaModel(THREE) {
  const group = new THREE.Group();
  const structures = {};
  group.name = 'Third-instar Drosophila larva';
  const globe = new THREE.SphereGeometry(1, 24, 16);
  const smallGlobe = new THREE.SphereGeometry(1, 14, 10);
  const pale = new THREE.Color(0xe0ce9d);
  const flank = new THREE.Color(0xc0a977);
  const fold = new THREE.Color(0xa48953);

  const surface = (color, options = {}) => new THREE.MeshStandardMaterial({
    color, roughness: .57, ...options,
  });
  const chitin = surface(0x4c2e22, { roughness: .43 });
  const mouthPlate = surface(0x866446);
  const tubeWall = surface(0xb77443, { roughness: .45 });
  const spiracleRing = surface(0x98532e, { roughness: .44 });
  const darkOpening = surface(0x39261c);
  const trachea = surface(0x5dada1, { roughness: .41 });
  const capillary = surface(0x83bbae, { roughness: .52 });
  const brainTissue = surface(0x9b75bf, { roughness: .48 });
  const brainDetail = surface(0xba96d3, { roughness: .55 });
  const nerveTissue = surface(0x7453ad, { roughness: .51 });
  const nerveFibre = surface(0x9c80ca, { roughness: .59 });
  const foregut = surface(0xc68e57);
  const midgut = surface(0xd8a96b);
  const hindgut = surface(0xb97648);

  function part(id, name, visible = true) {
    const container = new THREE.Group();
    container.name = name;
    container.userData.structureId = id;
    container.visible = visible;
    structures[id] = container;
    group.add(container);
    return container;
  }

  function mesh(parent, geometry, material) {
    const object = new THREE.Mesh(geometry, material);
    object.userData.structureId = parent.userData.structureId;
    parent.add(object);
    return object;
  }

  function oval(parent, position, radii, material, tilt = 0) {
    const solid = mesh(parent, Math.max(...radii) < .19 ? smallGlobe : globe, material);
    solid.position.fromArray(position);
    solid.scale.fromArray(radii);
    solid.rotation.z = tilt;
    return solid;
  }

  function tube(parent, nodes, radius, material, sections = 26, sides = 8) {
    const curve = new THREE.CatmullRomCurve3(nodes.map(position => new THREE.Vector3(...position)));
    return mesh(parent, new THREE.TubeGeometry(curve, sections, radius, sides, false), material);
  }

  const cuticle = part('larval-cuticle', 'Larval cuticle');
  const hooks = part('mouth-hooks', 'Mouth hooks');
  const spiracles = part('spiracles', 'Anterior and posterior spiracles');
  const tracheae = part('larval-tracheae', 'Larval tracheae', false);
  const brain = part('larval-brain', 'Larval brain lobes', false);
  const cord = part('larval-vnc', 'Larval ventral nerve cord', false);
  const gut = part('larval-gut', 'Larval gut', false);

  // Variations in radius give the single continuous cuticle twelve visible folds.
  const furrows = [.085, .157, .234, .319, .403, .488, .574, .663, .750, .836, .921];
  const radii = [.015, .29, .47, .61, .72, .80, .85, .86, .86, .85, .79, .64, .015];
  const profile = new THREE.SplineCurve(radii.map((radius, index) =>
    new THREE.Vector2(index / (radii.length - 1), radius)));
  function outline(t, angle) {
    const nearest = Math.min(...furrows.map(position => Math.abs(t - position)));
    const groove = Math.exp(-Math.pow(nearest / .012, 2));
    const width = profile.getPoint(t).y * (1 - .105 * groove);
    const back = Math.cos(angle);
    const side = Math.sin(angle);
    const bend = .22 * Math.sin(t * Math.PI) - .20 * t * t;
    const height = -.88 + .20 * Math.cos((t - .11) * Math.PI);
    const flankFullness = 1 + .033 * Math.cos(3 * angle + 1.5) * Math.sin(Math.PI * t);
    return [
      -2.86 + 5.84 * t + .095 * back * Math.sin(Math.PI * t),
      height + back * width * (back > 0 ? .89 : .73) * flankFullness,
      bend + side * width * flankFullness,
      groove,
    ];
  }

  const points = [];
  const colors = [];
  const faces = [];
  const axial = 144;
  const radial = 56;
  const tint = new THREE.Color();
  for (let row = 0; row <= axial; row++) {
    const t = row / axial;
    for (let col = 0; col <= radial; col++) {
      const angle = col / radial * Math.PI * 2;
      const [x, y, z, groove] = outline(t, angle);
      const mottling = .023 * (Math.sin(19 * angle + 298 * t) + Math.sin(13 * angle - 424 * t));
      points.push(x, y, z);
      tint.copy(flank)
        .lerp(pale, THREE.MathUtils.clamp(.65 + Math.cos(angle) * .32 + mottling, 0, 1))
        .lerp(fold, groove * .27);
      colors.push(tint.r, tint.g, tint.b);
      if (row < axial && col < radial) {
        const a = row * (radial + 1) + col;
        const b = a + radial + 1;
        faces.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  // The crossed seam uses coincident vertices so the skin can take a smooth sheen.
  const body = new THREE.BufferGeometry();
  body.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  body.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  body.setIndex(faces);
  body.computeVertexNormals();
  const normals = body.getAttribute('normal');
  const seamStart = new THREE.Vector3();
  const seamEnd = new THREE.Vector3();
  for (let row = 0; row <= axial; row++) {
    const a = row * (radial + 1);
    const b = a + radial;
    seamStart.fromBufferAttribute(normals, a);
    seamEnd.fromBufferAttribute(normals, b);
    seamStart.add(seamEnd).normalize();
    normals.setXYZ(a, seamStart.x, seamStart.y, seamStart.z);
    normals.setXYZ(b, seamStart.x, seamStart.y, seamStart.z);
  }
  mesh(cuticle, body, new THREE.MeshPhysicalMaterial({
    color: 0xffffff, vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: .75,
    roughness: .54, clearcoat: .24, clearcoatRoughness: .47, depthWrite: false,
  }));

  // Ventral denticle belts mark the crawling segments without covering the body in stripes.
  const denticleGeometry = new THREE.ConeGeometry(1, 1, 6);
  const denticles = new THREE.InstancedMesh(denticleGeometry, surface(0x987e51, {
    opacity: .58, transparent: true, depthWrite: false,
  }), (furrows.length - 3) * 14);
  denticles.userData.structureId = cuticle.userData.structureId;
  denticles.raycast = () => {};
  const tooth = new THREE.Object3D();
  let instance = 0;
  for (const t of furrows.slice(3)) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.PI + (i - 6.5) * .102;
      const [x, y, z] = outline(t + .021 + ((i % 2) * .009), angle);
      tooth.position.set(x, y - .008, z);
      tooth.rotation.set(angle, 0, -.55);
      tooth.scale.set(.019, .054, .013);
      tooth.updateMatrix();
      denticles.setMatrixAt(instance++, tooth.matrix);
    }
  }
  denticles.instanceMatrix.needsUpdate = true;
  cuticle.add(denticles);

  // The anterior hooks and pharyngeal supports are darker than the surrounding cuticle.
  for (const side of [-1, 1]) {
    oval(hooks, [-2.70, -.756, side * .076], [.24, .097, .064], mouthPlate, -.14 * side);
    tube(hooks, [
      [-2.78, -.755, side * .067],
      [-2.88, -.757, side * .091],
      [-2.96, -.817, side * .106],
      [-2.94, -.884, side * .108],
    ], .029, chitin, 21);
    oval(hooks, [-2.94, -.879, side * .107], [.042, .029, .024], chitin, -.51);
    for (let toothIndex = 0; toothIndex < 3; toothIndex++) {
      const x = -2.929 + toothIndex * .030;
      const y = -.872 + toothIndex * .027;
      tube(hooks, [[x + .025, y + .008, side * .109], [x, y, side * .116], [x - .011, y - .014, side * .119]], .013, chitin, 7);
    }

    const backZ = -.18 + side * .21;
    tube(spiracles, [[2.66, -.81, backZ], [2.79, -.61, backZ], [2.92, -.49, backZ]], .087, tubeWall, 17);
    oval(spiracles, [2.92, -.48, backZ], [.103, .089, .088], spiracleRing, .42);
    for (let pore = -1; pore <= 1; pore++) {
      oval(spiracles, [2.96, -.417, backZ + pore * .038], [.050, .017, .012], darkOpening, -.56);
    }
    const frontZ = .025 + side * .243;
    tube(spiracles, [[-2.29, -.59, frontZ], [-2.35, -.50, frontZ + side * .035], [-2.31, -.43, frontZ + side * .055]], .039, tubeWall, 11);
    for (let lobe = -1; lobe <= 1; lobe++) {
      oval(spiracles, [-2.36 + lobe * .041, -.420 + .012 * Math.abs(lobe), frontZ + side * .058], [.027, .032, .024], spiracleRing);
    }

    // The paired dorsal trunks run anterior–posterior, with shorter branches to organs.
    const trunk = [
      [-2.30, -.61, frontZ * .81], [-1.84, -.49, .08 + side * .20],
      [-1.16, -.40, .12 + side * .27], [-.43, -.35, .16 + side * .30],
      [.36, -.385, .14 + side * .27], [1.09, -.42, .08 + side * .28],
      [1.89, -.49, .01 + side * .25], [2.43, -.63, side * .19 - .12],
      [2.79, -.61, backZ],
    ];
    tube(tracheae, trunk, .046, trachea, 56, 10);
    const trunkCurve = new THREE.CatmullRomCurve3(trunk.map(position => new THREE.Vector3(...position)));
    for (let branchIndex = 1; branchIndex < 10; branchIndex++) {
      const start = trunkCurve.getPoint(branchIndex / 11);
      const [x, y, z] = start.toArray();
      const reach = .22 + .16 * Math.sin(branchIndex * Math.PI / 11);
      tube(tracheae, [
        [x, y, z], [x + .11, y - .13, z + side * (reach * .54)],
        [x + .18, y - .30, z + side * (reach * .82)],
        [x + .15, y - .46, z + side * (reach * .80)],
      ], .022, capillary, 14);
    }

    const lobeZ = .12 + side * .19;
    oval(brain, [-1.57, -.720, lobeZ], [.301, .247, .211], brainTissue, -.19);
    oval(brain, [-1.56, -.685, lobeZ + side * .081], [.208, .148, .110], brainDetail, -.23);
    oval(brain, [-1.38, -.776, lobeZ + side * .065], [.130, .135, .101], brainTissue, -.34);
    tube(brain, [
      [-1.44, -.83, lobeZ], [-1.38, -.93, .12 + side * .15], [-1.24, -.985, .12 + side * .10],
    ], .065, brainDetail, 18);
  }
  oval(brain, [-1.57, -.770, .12], [.174, .112, .145], brainTissue, .10);

  // The VNC is a compact set of fused neuromeres. Short portions of paired
  // segmental roots are represented within the selectable cord group.
  const cordSections = [
    [-1.20, -.990, .118, .158], [-1.04, -1.035, .128, .170],
    [-.88, -1.057, .128, .168], [-.72, -1.080, .120, .162],
    [-.56, -1.097, .113, .153], [-.40, -1.112, .105, .136],
    [-.26, -1.120, .095, .119], [-.13, -1.118, .081, .105],
    [0, -1.115, .067, .088], [.11, -1.10, .050, .060],
  ];
  for (const [x, y, depth, width] of cordSections) {
    oval(cord, [x, y, .12], [.158, depth, width], nerveTissue, -.12 + x * .04);
    for (const side of [-1, 1]) {
      tube(cord, [
        [x - .022, y - .014, .12 + side * width * .76],
        [x + .046, y - .044, .12 + side * (width + .046)],
        [x + .15, y - .047, .12 + side * (width + .121)],
      ], .016, nerveFibre, 9, 6);
    }
  }

  tube(gut, [[-2.62, -.76, .01], [-2.33, -.80, .05], [-2.02, -.83, .09], [-1.82, -.89, .14], [-1.55, -.85, .155], [-1.31, -.79, .20]], .054, foregut, 30);
  oval(gut, [-1.23, -.76, .20], [.18, .129, .143], foregut, -.12);
  tube(gut, [
    [-1.17, -.75, .23], [-.91, -.69, .35], [-.54, -.79, .47], [-.21, -.89, .50],
    [.12, -.98, .43], [.51, -.94, .24], [.66, -.78, -.035], [.51, -.71, -.32],
    [.12, -.78, -.41], [-.21, -.88, -.33], [-.35, -.95, -.18], [-.22, -1.062, -.03],
    [.22, -1.11, .06], [.71, -1.13, .11], [1.16, -1.20, .21], [1.52, -1.16, .19],
    [1.68, -1.00, -.01], [1.39, -.91, -.29], [1.16, -.96, -.334], [1.07, -1.08, -.22],
    [1.43, -1.22, -.13], [1.81, -1.23, .045], [2.17, -1.22, .12],
  ], .109, midgut, 110, 10);
  tube(gut, [[2.13, -1.22, .12], [2.34, -1.20, .11], [2.55, -1.12, .018], [2.65, -1.06, -.04], [2.79, -1.04, -.106]], .086, hindgut, 27, 10);

  function animate(timeSeconds, enabled) {
    const wave = enabled ? Math.sin(timeSeconds * Math.PI * .9) : 0;
    group.scale.set(1 + wave * .013, 1 - wave * .027, 1 - wave * .017);
  }

  return { group, structures, animate };
}
