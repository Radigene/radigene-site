// Radigene hero: engineered cells with CAR and reporter receptors; tracer particles dock on the reporters.
// Progressive enhancement: the SVG hero stays as the fallback (reduced motion, no WebGL, slow connection).
const fig = document.querySelector('.vizwrap');
const svg = fig && fig.querySelector('svg.viz');
if (fig && svg && !matchMedia('(prefers-reduced-motion: reduce)').matches) start().catch(() => {});

async function start() {
  const THREE = await import('./vendor/three.module.min.js');
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const rand = (a, b) => a + Math.random() * (b - a);

  const canvas = document.createElement('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', svg.getAttribute('aria-label') || 'Illustration of engineered cells and tracer particles');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const stack = document.createElement('div');
  stack.className = 'hero3d-stack';
  svg.parentNode.insertBefore(stack, svg);
  stack.appendChild(svg);
  stack.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 440 / 380, 0.1, 100);
  camera.position.set(0, 0, 16);
  scene.add(new THREE.AmbientLight(0xffffff, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fd6ff, 1.2);
  rim.position.set(-6, -2, -4);
  scene.add(rim);
  const root = new THREE.Group();
  scene.add(root);

  const P = {
    light: { body: 0xbcd0df, car: 0x2b6cb0, rep: 0xf2994a, tracer: 0x1479c9, glow: 0x4db1f0, ghost: 0xd3dfe8, op: 0.9 },
    dark: { body: 0x1d3a4d, car: 0x6fa8e0, rep: 0xf2994a, tracer: 0x4db1f0, glow: 0x4db1f0, ghost: 0x12232f, op: 0.85 },
  };
  const mats = {
    car: new THREE.MeshStandardMaterial({ roughness: 0.5 }),
    rep: new THREE.MeshStandardMaterial({ roughness: 0.4, emissive: 0xf2994a, emissiveIntensity: 0.25 }),
    tracer: new THREE.MeshBasicMaterial(),
    halo: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }),
    ghost: new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.7, roughness: 0.5 }),
  };
  const bodies = [];
  function applyPalette() {
    const c = dark.matches ? P.dark : P.light;
    mats.car.color.setHex(c.car);
    mats.rep.color.setHex(c.rep);
    mats.tracer.color.setHex(c.tracer);
    mats.halo.color.setHex(c.glow);
    mats.ghost.color.setHex(c.ghost);
    bodies.forEach((b) => { b.material.color.setHex(c.body); b.material.opacity = c.op; b.material.emissive.setHex(c.glow); });
  }

  // Geometry shared by all receptors
  const gStem = new THREE.CylinderGeometry(0.028, 0.028, 0.34, 6); gStem.translate(0, 0.17, 0);
  const gArm = new THREE.CylinderGeometry(0.028, 0.028, 0.24, 6); gArm.translate(0, 0.12, 0);
  const gStalk = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6); gStalk.translate(0, 0.2, 0);
  const gBall = new THREE.SphereGeometry(0.085, 14, 14);
  const up = new THREE.Vector3(0, 1, 0);

  const cells = [];
  const reporters = [];
  function makeCell(x, y, z, r, nCar, nRep) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(r, 40, 32),
      new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.35, emissiveIntensity: 0 })
    );
    group.add(body);
    bodies.push(body);
    const cell = { group, body, r, base: new THREE.Vector3(x, y, z), phase: rand(0, 6.28), speed: rand(0.35, 0.6), glow: 0, docked: 0, reps: [], wp: new THREE.Vector3() };
    body.userData.cell = cell;
    const n = nCar + nRep;
    const kinds = Array.from({ length: n }, (_, i) => (i < nRep ? 'rep' : 'car')).sort(() => Math.random() - 0.5);
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n;
      const phi = Math.acos(1 - 2 * k);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const dir = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
      const holder = new THREE.Group();
      holder.position.copy(dir).multiplyScalar(r * 0.98);
      holder.quaternion.setFromUnitVectors(up, dir);
      holder.scale.setScalar(1.3);
      if (kinds[i] === 'car') {
        holder.add(new THREE.Mesh(gStem, mats.car));
        for (const s of [-1, 1]) {
          const arm = new THREE.Mesh(gArm, mats.car);
          arm.position.y = 0.34;
          arm.rotation.z = s * 0.6;
          holder.add(arm);
        }
      } else {
        holder.add(new THREE.Mesh(gStalk, mats.rep));
        const ball = new THREE.Mesh(gBall, mats.rep);
        ball.position.y = 0.46;
        holder.add(ball);
        const tip = new THREE.Object3D();
        tip.position.y = 0.55;
        holder.add(tip);
        const rep = { tip, cell, by: null };
        cell.reps.push(rep);
        reporters.push(rep);
      }
      group.add(holder);
    }
    root.add(group);
    cells.push(cell);
    return cell;
  }
  makeCell(-2.7, 1.5, 0.2, 1.5, 16, 7);
  makeCell(1.4, -0.2, -0.4, 1.95, 22, 9);
  makeCell(-1.5, -2.6, 0.6, 1.25, 12, 6);
  makeCell(3.2, 2.7, -1.6, 1.05, 10, 5);
  // plain background cells, as in the SVG
  for (const [x, y, z, r] of [[3.9, -2.6, -2.2, 0.8], [-4.6, -0.3, -1.8, 0.7], [0.2, 3.4, -2.6, 0.75]]) {
    const g = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 20), mats.ghost);
    g.position.set(x, y, z);
    root.add(g);
  }
  applyPalette();
  dark.addEventListener('change', applyPalette);

  // Tracer particles
  const N = 56;
  const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 10), mats.tracer, N);
  const haloInst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.19, 10, 10), mats.halo, N);
  scene.add(haloInst, inst); // particles live in world space
  const BOX = { x: 4.4, y: 3.8, z: 2.0 };
  const parts = Array.from({ length: N }, () => ({
    p: new THREE.Vector3(rand(-BOX.x, BOX.x), rand(-BOX.y, BOX.y), rand(-BOX.z, BOX.z)),
    v: new THREE.Vector3(rand(-0.3, 0.3), rand(-0.3, 0.3), rand(-0.1, 0.1)),
    state: 0, rep: null, t: rand(0.5, 9),
  }));

  let hovered = null;
  const ray = new THREE.Raycaster();
  const pt = new THREE.Vector2();
  let px = 0, py = 0, ptx = 0, pty = 0;
  addEventListener('pointermove', (e) => {
    ptx = (e.clientX / innerWidth - 0.5) * 2;
    pty = (e.clientY / innerHeight - 0.5) * 2;
    const r = canvas.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) { hovered = null; return; }
    pt.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(pt, camera);
    const hit = ray.intersectObjects(bodies, false)[0];
    hovered = hit ? hit.object.userData.cell : null;
  }, { passive: true });

  function size() {
    const w = stack.clientWidth, h = stack.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(size).observe(stack);
  size();

  let visible = true;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0 }).observe(stack);

  const tmp = new THREE.Vector3(), tgt = new THREE.Vector3(), m4 = new THREE.Matrix4();
  const freeReps = (cell) => (cell ? cell.reps : reporters).filter((r) => !r.by);
  let last = null, time = 0, shown = false;

  function step(dt) {
    time += dt;

    // cells float and turn
    for (const c of cells) {
      c.group.position.set(c.base.x, c.base.y + Math.sin(time * c.speed + c.phase) * 0.14, c.base.z);
      c.group.rotation.y += dt * 0.12;
      c.group.rotation.x = Math.sin(time * 0.2 + c.phase) * 0.12;
      c.docked = 0;
    }
    px += (ptx - px) * 0.05; py += (pty - py) * 0.05;
    root.rotation.y = px * 0.22;
    root.rotation.x = py * 0.12;
    scene.updateMatrixWorld(true);
    for (const c of cells) c.group.getWorldPosition(c.wp);

    for (let i = 0; i < N; i++) {
      const q = parts[i];
      q.t -= dt;
      if (q.state === 0) {
        q.v.x += rand(-1, 1) * 0.9 * dt; q.v.y += rand(-1, 1) * 0.9 * dt; q.v.z += rand(-1, 1) * 0.4 * dt;
        if (Math.abs(q.p.x) > BOX.x) q.v.x -= Math.sign(q.p.x) * 1.6 * dt;
        if (Math.abs(q.p.y) > BOX.y) q.v.y -= Math.sign(q.p.y) * 1.6 * dt;
        if (Math.abs(q.p.z) > BOX.z) q.v.z -= Math.sign(q.p.z) * 1.6 * dt;
        q.v.multiplyScalar(1 - 0.6 * dt);
        if (q.v.length() > 0.9) q.v.setLength(0.9);
        q.p.addScaledVector(q.v, dt * 2);
        const hoverPull = hovered && q.p.distanceTo(hovered.wp) < 5.5 && Math.random() < dt * 1.5;
        if ((q.t <= 0 && Math.random() < dt * 0.7) || hoverPull) {
          const pool = freeReps(hoverPull ? hovered : null);
          if (pool.length) {
            let best = null, bd = 1e9;
            for (const r of pool) {
              r.tip.getWorldPosition(tmp);
              const d = tmp.distanceTo(q.p) + Math.random() * 2;
              if (d < bd) { bd = d; best = r; }
            }
            best.by = q; q.rep = best; q.state = 1;
          }
        }
      } else if (q.state === 1) {
        q.rep.tip.getWorldPosition(tgt);
        tmp.copy(tgt).sub(q.p);
        const d = tmp.length();
        tmp.normalize().multiplyScalar(3.2);
        q.v.lerp(tmp, Math.min(1, 2.2 * dt));
        q.p.addScaledVector(q.v, dt);
        if (d < 0.16) { q.state = 2; q.t = rand(3, 5); }
      } else {
        q.rep.tip.getWorldPosition(q.p);
        q.rep.cell.docked++;
        if (q.t <= 0) {
          q.rep.by = null; q.rep = null; q.state = 0; q.t = rand(5, 11);
          q.v.set(rand(-1, 1), rand(-1, 1), rand(-0.4, 0.4)).setLength(0.7);
        }
      }
      // keep free and seeking particles out of the cells
      if (q.state !== 2) {
        for (const c of cells) {
          tmp.copy(q.p).sub(c.wp);
          const d = tmp.length(), min = c.r + 0.15;
          if (d < min) q.p.copy(c.wp).addScaledVector(tmp.normalize(), min);
        }
      }
      m4.makeTranslation(q.p.x, q.p.y, q.p.z);
      inst.setMatrixAt(i, m4);
      haloInst.setMatrixAt(i, m4);
    }
    inst.instanceMatrix.needsUpdate = true;
    haloInst.instanceMatrix.needsUpdate = true;

    // a cell glows while tracers are bound to it
    for (const c of cells) {
      const target = Math.min(1, c.docked / 7);
      c.glow += (target - c.glow) * Math.min(1, 2.5 * dt);
      c.body.material.emissiveIntensity = c.glow * 0.6;
    }

  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    if (last === null) last = now;
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    step(dt);
    renderer.render(scene, camera);
    if (!shown) { shown = true; requestAnimationFrame(() => stack.classList.add('on')); }
  }
  // warm up about six seconds so some tracers are already docked on the first picture
  for (let i = 0; i < 200; i++) step(0.03);
  requestAnimationFrame(frame);
}
