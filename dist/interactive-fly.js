const pi = Math.PI;
const tau = 2 * pi;
const animation = {
  normal: { label: 'Normal', seconds: 0 },
  groom: { label: 'Antenna grooming', seconds: 2.85 },
  clean: { label: 'Front-leg cleaning', seconds: 2.4 },
  posture: { label: 'Posture adjustment', seconds: 2.35 },
  proboscis: { label: 'Proboscis extension', seconds: 1.7 },
  flutter: { label: 'Wing flutter', seconds: 2.2 },
  walk: { label: 'Short walk', seconds: 2.95 },
  dance: { label: 'Dance', seconds: 3.75, playful: true },
  'special-dance': { label: 'Dance break', seconds: 4.65, playful: true },
  wave: { label: 'Wave', seconds: 2.75, playful: true },
  curious: { label: 'Curious fly', seconds: 2.5, playful: true },
  happy: { label: 'Happy fly', seconds: 2.4, playful: true },
  sleepy: { label: 'Sleepy fly', seconds: 4.1, playful: true },
  turn: { label: 'Turn around', seconds: 3.05, playful: true },
};
const natural = ['groom', 'clean', 'posture', 'proboscis', 'flutter', 'walk'];
const naturalTap = ['groom', 'clean', 'flutter', 'walk'];
const playful = ['dance', 'wave', 'groom', 'flutter', 'turn', 'walk', 'happy', 'sleepy'];
const front = [0, 3];
const sides = [-1, -1, -1, 1, 1, 1];
const tripods = [0, .5, 0, .5, 0, .5];
const keys = ['x', 'z', 'yaw', 'bodyY', 'bodyPitch', 'bodyRoll', 'headPitch', 'headYaw', 'proboscis', 'wing'];
const toeRest = [[-2.65, -1.72], [-.73, -2.59], [1.88, -2.43], [-2.65, 1.72], [-.73, 2.59], [1.88, 2.43]];
const aliases = {
  'wing-flutter': 'flutter', 'wing flutter': 'flutter', 'normal-mode': 'normal', 'antenna-grooming': 'groom',
  'walking': 'walk', 'turn-around': 'turn', 'twice': 'special-dance',
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smooth = n => { const t = clamp(n, 0, 1); return t * t * (3 - 2 * t); };
const wrap = n => n - Math.floor(n);
const yawDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
function makePose() {
  return {
    x: 0, z: 0, yaw: 0, bodyY: 0, bodyPitch: 0, bodyRoll: 0, headPitch: 0, headYaw: 0,
    antenna: [0, 0], proboscis: 0, wing: 0, feet: Array.from({ length: 6 }, () => [0, 0, 0]),
  };
}
function setToe(pose, index, x, y, z) {
  const toe = pose.feet[index];
  toe[0] = x;
  toe[1] = y;
  toe[2] = z;
}
function copyPose(from, to) {
  for (const key of keys) to[key] = from[key];
  to.antenna[0] = from.antenna[0];
  to.antenna[1] = from.antenna[1];
  for (let i = 0; i < 6; i++) setToe(to, i, ...from.feet[i]);
}
function blendPose(pose, from, alpha) {
  for (const key of keys) {
    pose[key] = key === 'yaw'
      ? from[key] + yawDelta(from[key], pose[key]) * alpha
      : from[key] + (pose[key] - from[key]) * alpha;
  }
  for (let axis = 0; axis < 2; axis++) pose.antenna[axis] = from.antenna[axis] + (pose.antenna[axis] - from.antenna[axis]) * alpha;
  for (let i = 0; i < 6; i++) {
    for (let axis = 0; axis < 3; axis++) pose.feet[i][axis] = from.feet[i][axis] + (pose.feet[i][axis] - from.feet[i][axis]) * alpha;
  }
}

function walkPosition(action, elapsed) {
  return action.startX + (action.endX - action.startX) * smooth(elapsed / action.duration);
}
function turnAngle(elapsed, duration, phase) {
  const p = clamp(elapsed / duration, 0, 1);
  const motion = p < .45 ? .5 * smooth(p / .45) : .5 + .5 * smooth((p - .55) / .45);
  return phase * tau * motion;
}

function walk(pose, action, elapsed, strength) {
  const frequency = 1.55;
  const stance = .6;
  pose.x = walkPosition(action, elapsed);
  pose.bodyY += .019 * strength * Math.cos(elapsed * frequency * 2 * tau);
  pose.bodyPitch += .014 * strength * Math.sin(elapsed * frequency * tau);
  pose.bodyRoll += .033 * strength * Math.sin(elapsed * frequency * tau);
  for (let i = 0; i < 6; i++) {
    const phase = wrap(elapsed * frequency + tripods[i]);
    const lift = phase >= stance ? (phase - stance) / (1 - stance) : 0;
    const started = elapsed - phase / frequency;
    const planted = walkPosition(action, started + stance / (frequency * 2));
    const landing = walkPosition(action, started + (1 + stance / 2) / frequency);
    // A stance foot stays fixed in world space while the body moves. The swing carries it to the next contact.
    const world = planted + (landing - planted) * smooth(lift);
    setToe(pose, i, (world - pose.x) * strength, Math.sin(pi * lift) * .235 * strength,
      sides[i] * .055 * Math.sin(pi * lift) * strength);
  }
}

function turn(pose, action, elapsed, strength) {
  const frequency = 4.1;
  const stance = .57;
  pose.yaw = turnAngle(elapsed, action.duration, action.sign);
  pose.headYaw += .12 * action.sign * strength;
  for (let i = 0; i < 6; i++) {
    const phase = wrap(elapsed * frequency + tripods[i]);
    const lift = phase >= stance ? (phase - stance) / (1 - stance) : 0;
    const started = elapsed - phase / frequency;
    const planted = turnAngle(started + stance / (frequency * 2), action.duration, action.sign);
    const landing = turnAngle(started + (1 + stance / 2) / frequency, action.duration, action.sign);
    const relative = planted + (landing - planted) * smooth(lift) - pose.yaw;
    const [x, z] = toeRest[i];
    const c = Math.cos(relative), s = Math.sin(relative);
    setToe(pose, i, clamp(x * c + z * s - x, -.66, .66) * strength, Math.sin(pi * lift) * .25 * strength,
      clamp(z * c - x * s - z, -.34, .34) * strength);
  }
}

function groom(pose, elapsed, duration, strength, variation) {
  const progress = elapsed / duration;
  const stroke = Math.sin(elapsed * tau * (2.65 + variation * .32));
  const sweep = smooth((.67 - progress) / .21);
  for (let side = 0; side < 2; side++) {
    const phase = side === 1 ? stroke : -stroke;
    const inward = Math.min(1.15, .97 + .1 * sweep + .055 * phase);
    const forefootLift = 1.09 + .9 * sweep + phase * (.045 + .067 * sweep);
    setToe(pose, front[side], (.17 + .055 * phase) * strength, forefootLift * strength, -sides[front[side]] * inward * strength);
    pose.antenna[side] += phase * .077 * sweep * strength;
  }
  pose.headPitch -= .055 * sweep * strength;
  pose.headYaw += stroke * .025 * strength;
  pose.bodyY += .017 * strength;
}
function cleanLegs(pose, elapsed, strength, variation) {
  const rub = Math.sin(elapsed * tau * (3 + variation * .4));
  for (let side = 0; side < 2; side++) {
    const i = front[side];
    const phase = sides[i] * rub;
    setToe(pose, i, (.13 + .14 * phase) * strength, (1.06 + .09 * phase) * strength,
      -sides[i] * (1.08 + .052 * phase) * strength);
  }
  pose.headPitch += .058 * strength;
}
function dance(pose, action, elapsed, strength) {
  const special = action.id === 'special-dance';
  const beat = elapsed * tau * (special ? 1.95 : 1.48);
  pose.yaw += ((special ? .48 : .30) * Math.sin(beat / 2) + .08 * Math.sin(beat)) * strength;
  pose.bodyRoll += Math.sin(beat) * .095 * strength;
  pose.bodyPitch += .082 * Math.cos(beat * 2) * strength;
  pose.bodyY += (.046 + .044 * Math.sin(beat * 2)) * strength;
  pose.headYaw += .12 * strength * Math.sin(beat / 2);
  pose.wing += (.08 + .24 * Math.sin(elapsed * tau * 15)) * smooth((Math.cos(beat) - .25) / .75) * strength;
  for (let i = 0; i < 6; i++) {
    const phase = beat + tripods[i] * tau;
    const lift = Math.max(0, Math.sin(phase));
    setToe(pose, i, Math.cos(phase) * .22 * strength, lift * ((i === 0 || i === 3) ? .67 : .26) * strength,
      sides[i] * Math.cos(phase) * .066 * strength);
  }
  if (special) {
    const flourish = Math.max(0, Math.sin((elapsed / action.duration - .55) * pi / .4)) ** 3 * smooth((elapsed / action.duration - .57) / .14);
    const i = action.sign < 0 ? 0 : 3;
    pose.feet[i][1] += .67 * flourish * strength;
  }
}
function wave(pose, action, elapsed, strength) {
  const i = action.sign < 0 ? 0 : 3;
  const turn = Math.sin(elapsed * tau * 2.5);
  setToe(pose, i, (-.09 + .17 * turn) * strength, (1.32 + .16 * turn) * strength, -sides[i] * (.29 + .21 * turn) * strength);
  pose.bodyRoll += action.sign * .061 * strength;
  pose.headYaw += action.sign * .125 * strength;
  pose.headPitch += .06 * strength * Math.cos(elapsed * tau * .77);
}

function play(pose, action, elapsed, pointerX, pointerY) {
  const progress = elapsed / action.duration;
  const strength = smooth(elapsed / .34) * smooth((action.duration - elapsed) / .44);
  const phase = elapsed * tau;
  switch (action.id) {
    case 'walk': walk(pose, action, elapsed, strength); break;
    case 'turn': turn(pose, action, elapsed, strength); break;
    case 'groom': groom(pose, elapsed, action.duration, strength, action.variation); break;
    case 'clean': cleanLegs(pose, elapsed, strength, action.variation); break;
    case 'dance':
    case 'special-dance': dance(pose, action, elapsed, strength); break;
    case 'wave': wave(pose, action, elapsed, strength); break;
    case 'posture':
      pose.bodyY += .056 * strength * Math.sin(pi * progress);
      pose.bodyPitch -= .062 * strength * Math.sin(phase * .59);
      pose.headPitch += .13 * strength * Math.sin(phase * .72);
      pose.headYaw += action.sign * .10 * strength * Math.sin(phase * .58);
      setToe(pose, action.sign < 0 ? 0 : 3, -.14 * strength, .17 * strength * Math.max(0, Math.sin(phase * 1.6)), 0);
      break;
    case 'proboscis': {
      const first = Math.max(0, 1 - Math.abs(progress - .46) / .22);
      const second = .42 * Math.max(0, 1 - Math.abs(progress - .72) / .12) * action.variation;
      pose.proboscis = (smooth(first) + smooth(second)) * strength;
      pose.headPitch += .10 * pose.proboscis;
      break;
    }
    case 'flutter':
      pose.wing += (.103 + .262 * Math.sin(phase * 17)) * strength * Math.max(0, Math.cos(phase * 1.45)) ** 4;
      pose.bodyPitch -= .035 * strength * Math.sin(phase * 1.35);
      break;
    case 'curious':
      pose.yaw += (pointerX * -.27 + .05 * Math.sin(phase * .6) * action.sign) * strength;
      pose.headYaw -= pointerX * .12 * strength;
      pose.headPitch += pointerY * .085 * strength;
      for (const i of front) {
        const lift = Math.max(0, Math.sin(phase * 1.18 + tripods[i] * tau));
        setToe(pose, i, -.20 * lift * strength, .41 * lift * strength, .12 * sides[i] * lift * strength);
      }
      break;
    case 'happy': {
      const pulse = Math.max(0, Math.sin(phase * 1.62)) ** 3;
      pose.bodyY += .115 * pulse * strength;
      pose.bodyPitch -= .078 * pulse * strength;
      pose.wing += (.124 + .29 * Math.sin(phase * 16.5)) * strength * pulse;
      for (const i of front) setToe(pose, i, -.18 * pulse * strength, .48 * pulse * strength, .12 * sides[i] * pulse * strength);
      break;
    }
    case 'sleepy':
      pose.bodyY -= .112 * strength;
      pose.bodyPitch += .047 * strength;
      pose.headPitch += .126 * strength;
      pose.wing *= 1 - strength;
      for (let i = 0; i < 2; i++) pose.antenna[i] += .095 * strength;
      break;
  }
}

// Grooming uses alternating head sweeps and leg rubbing, inspired by Seeds et al. (eLife 2014).
// For tripod coordination see Mendes et al. (eLife 2013). Timings and poses are illustrative.
export function createFlyAnimator({ random = Math.random, onState = () => {} } = {}) {
  const pose = makePose();
  const transitionPose = makePose();
  let active = false, paused = false, reduced = false, mode = 'scientific';
  let timestamp = null, clock = 0, idleAt = Infinity, blendAt = -10;
  let anchor = 0, direction = 1, current = null;
  let lastNatural = '', lastPlay = '', reported = '';
  let hoverX = 0, hoverY = 0, pointerX = 0, pointerY = 0;
  let hoverAt = -10, hoverStarted = -10, nextCurious = 0;
  let clicks = 0, lastClick = -10, helloAt = -10;

  const running = () => active && !paused && !reduced;
  function report(id, message) {
    if (id === reported && !message) return;
    reported = id;
    onState({ action: id, label: animation[id]?.label ?? 'Paused', ...(message ? { message } : {}) });
  }
  function sample() { return clamp(random(), 0, .999999999); }
  function choose(pool, previous) {
    if (!previous || !pool.includes(previous)) return pool[Math.floor(sample() * pool.length)];
    const skip = pool.indexOf(previous);
    const i = Math.floor(sample() * (pool.length - 1));
    return pool[i + Number(i >= skip)];
  }
  function schedule(first = false) { idleAt = clock + (first ? 3.8 : 6.8) + sample() * (first ? 3.4 : 9.5); }
  function start(id, origin, message) {
    if (!running() || !Object.hasOwn(animation, id) || (animation[id].playful && mode !== 'fun')) return false;
    if (current?.id === id && !message) return false;
    if (origin === 'hover' && current) return false;
    if (origin === 'click' && current?.origin === 'manual') return false;
    copyPose(pose, transitionPose);
    blendAt = clock;
    if (current?.id === 'walk') anchor = pose.x;
    if (id === 'normal') {
      current = null;
      schedule(true);
      report(id);
      return true;
    }
    const variation = sample();
    const sign = hoverX > .18 ? -1 : hoverX < -.18 ? 1 : variation > .5 ? 1 : -1;
    let endX = anchor;
    if (id === 'walk') {
      if (anchor < -.34) direction = -1;
      else if (anchor > .34) direction = 1;
      endX = clamp(anchor - direction * (.78 + variation * .22), -.95, .95);
    }
    current = { id, origin, start: clock, duration: animation[id].seconds * (id === 'groom' ? .92 + variation * .16 : 1),
      sign, variation, startX: anchor, endX };
    report(id, message);
    return true;
  }

  function configure(options = {}) {
    const wasRunning = running();
    const previousMode = mode;
    if (typeof options.active === 'boolean') active = options.active;
    if (typeof options.paused === 'boolean') paused = options.paused;
    if (typeof options.reducedMotion === 'boolean') reduced = options.reducedMotion;
    if (options.mode === 'scientific' || options.mode === 'fun') mode = options.mode;
    if (previousMode !== mode) {
      clicks = 0;
      lastClick = -10;
    }
    if (!running()) {
      timestamp = null;
      if (!active || reduced) {
        current = null;
        anchor = 0;
        hoverAt = hoverStarted = -10;
        pointerX = pointerY = 0;
        clicks = 0;
        blendAt = -10;
        idleAt = Infinity;
        if (active) report('paused');
        else reported = '';
      } else {
        if (previousMode !== mode && current && animation[current.id].playful) {
          current = null;
          blendAt = -10;
          schedule(true);
        }
        report('paused');
      }
      return;
    }
    if (!wasRunning) {
      timestamp = null;
      if (!Number.isFinite(idleAt)) schedule(true);
      report(current?.id ?? 'normal');
    } else if (previousMode !== mode && current && animation[current.id].playful) {
      current = null;
      blendAt = -10;
      schedule(true);
      report('normal');
    }
  }

  function request(action) {
    const id = typeof action === 'string' ? action.trim().toLowerCase() : '';
    return start(aliases[id] ?? id, 'manual');
  }

  function interact(type, detail) {
    if (!running()) return false;
    if (type === 'leave') {
      hoverAt = hoverStarted = -10;
      return true;
    }
    if (type === 'hover') {
      if (!detail || !Number.isFinite(detail.x) || !Number.isFinite(detail.y)) return false;
      if (clock - hoverAt > .76) hoverStarted = clock;
      hoverAt = clock;
      hoverX = clamp(detail.x, -1, 1);
      hoverY = clamp(detail.y, -1, 1);
      return true;
    }
    if (mode !== 'fun') {
      if (type !== 'click' || clock - lastClick < .7 || current?.origin === 'click' || current?.origin === 'manual') return false;
      const id = choose(naturalTap, lastNatural);
      if (!start(id, 'click')) return false;
      lastNatural = id;
      lastClick = clock;
      return true;
    }
    if (type === 'double-click') {
      clicks = 0;
      lastClick = clock;
      lastPlay = 'special-dance';
      return start('special-dance', 'double');
    }
    if (type !== 'click') return false;
    clicks = clock - lastClick < 3.15 ? clicks + 1 : 1;
    const elapsed = clock - lastClick;
    lastClick = clock;
    if (clicks >= 4 && clock - helloAt > 17) {
      clicks = 0;
      helloAt = clock;
      lastPlay = 'wave';
      return start('wave', 'hello', 'Hello, Scientist!');
    }
    if (elapsed < .29 || current?.origin === 'double' || (current?.origin === 'click' && clock - current.start < 1)) return false;
    const id = choose(playful, lastPlay);
    if (!start(id, 'click')) return false;
    lastPlay = id;
    return true;
  }

  function update(timeSeconds) {
    if (!running() || !Number.isFinite(timeSeconds)) return null;
    const delta = timestamp === null ? 0 : clamp(timeSeconds - timestamp, 0, .09);
    timestamp = timeSeconds;
    clock += delta;
    const hovered = clock - hoverAt < .85;
    const response = 1 - Math.exp(-delta * 6.5);
    pointerX += ((hovered ? hoverX : 0) - pointerX) * response;
    pointerY += ((hovered ? hoverY : 0) - pointerY) * response;
    if (current && clock - current.start >= current.duration) {
      if (current.id === 'walk') anchor = current.endX;
      current = null;
      schedule();
      report('normal');
    }

    if (!current && hovered && mode === 'fun' && clock >= nextCurious && clock - hoverStarted >= .24) {
      nextCurious = clock + 7.7 + sample() * 4.2;
      start('curious', 'hover');
    } else if (!current && clock >= idleAt) {
      const id = choose(natural, lastNatural);
      if (start(id, 'idle')) lastNatural = id;
      else schedule();
    }

    pose.x = anchor;
    pose.z = 0;
    pose.yaw = 0;
    pose.bodyY = .006 * Math.sin(clock * 1.61);
    pose.bodyPitch = 0;
    pose.bodyRoll = 0;
    pose.headPitch = .017 * Math.sin(clock * 1.19) + pointerY * .065;
    pose.headYaw = .016 * Math.sin(clock * 1.57) - pointerX * .077;
    pose.antenna[0] = .019 * Math.sin(clock * 2.41);
    pose.antenna[1] = .019 * Math.sin(clock * 2.79 + .75);
    pose.proboscis = 0;
    pose.wing = .012 * Math.sin(clock * 2.17);
    for (let i = 0; i < 6; i++) setToe(pose, i, 0, 0, 0);

    if (current) play(pose, current, clock - current.start, pointerX, pointerY);
    if (clock - blendAt < .21) blendPose(pose, transitionPose, smooth((clock - blendAt) / .21));
    return pose;
  }

  return { configure, request, interact, update };
}

