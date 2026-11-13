// Scroll-driven particle field: one point cloud morphs between shapes,
// one shape per chapter of the page (see data-stage in index.html).
(() => {
  const canvas = document.getElementById('gl');
  const gl = canvas && (canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }));
  if (!gl) { document.documentElement.classList.add('no-gl'); return; }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 760px)').matches;
  const N = mobile ? 9000 : 18000;
  const TAU = Math.PI * 2;

  // ---------- per-particle randoms ----------
  const rnd = new Float32Array(N * 4);
  const dir = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 4; k++) rnd[i * 4 + k] = Math.random();
    const u = Math.random() * 2 - 1, t = Math.random() * TAU, s = Math.sqrt(1 - u * u);
    dir[i * 3] = s * Math.cos(t); dir[i * 3 + 1] = u; dir[i * 3 + 2] = s * Math.sin(t);
  }
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };

  // ---------- shapes ----------
  const build = (fn) => { const a = new Float32Array(N * 3); for (let i = 0; i < N; i++) fn(i, a, i * 3); return a; };

  // sigil: ring, vertical axis, eye-shaped orbit and small planets
  const sigil = build((i, a, o) => {
    const k = rnd[i * 4 + 2], w = 0.022;
    let x, y, z = gauss() * 0.03;
    if (k < 0.24) { const t = Math.random() * TAU; x = Math.cos(t) * 1.0; y = Math.sin(t) * 1.0; }
    else if (k < 0.42) { x = (Math.random() * 2 - 1) * 3.1; y = (Math.random() < 0.5 ? 1 : -1) * 1.45 * (1 - (x / 3.1) ** 2); }
    else if (k < 0.58) { y = gauss() * 1.1; y = Math.max(-2.7, Math.min(2.7, y)); x = 0; }
    else if (k < 0.65) { x = gauss() * 0.7; y = 0; }
    else if (k < 0.76) {
      const P = [[-2.35, 0.95, 0.2], [2.25, -1.05, 0.16], [1.05, 2.45, 0.12], [-1.4, -2.3, 0.1]][Math.floor(Math.random() * 4)];
      const t = Math.random() * TAU; x = P[0] + Math.cos(t) * P[2]; y = P[1] + Math.sin(t) * P[2];
    }
    else if (k < 0.82) { x = gauss() * 0.07; y = gauss() * 0.07; }
    else { const t = Math.random() * TAU, r = 1.6 + Math.abs(gauss()) * 1.6; x = Math.cos(t) * r * 1.3; y = Math.sin(t) * r * 0.9; z = gauss() * 0.8; }
    const S = 0.72;
    a[o] = (x + gauss() * w) * S; a[o + 1] = (y + gauss() * w) * S; a[o + 2] = z * S;
  });

  const galaxy = build((i, a, o) => {
    const arm = Math.floor(rnd[i * 4] * 3), r = Math.pow(Math.random(), 0.6) * 5.5;
    const t = arm / 3 * TAU + r * 0.9 + gauss() * 0.35;
    a[o] = Math.cos(t) * r + gauss() * 0.3; a[o + 1] = gauss() * 0.35 * (1 + r * 0.15); a[o + 2] = Math.sin(t) * r * 0.75 + gauss() * 0.3;
  });

  // mountain at sunset: lit ridge, faint slopes, sun disc behind the peak, cloud band
  const PEAKS = [[0.7, 2.1, 1.05], [-2.2, 0.9, 0.8], [-3.9, 0.3, 0.7], [3.0, 0.75, 0.75], [4.8, 0.1, 0.6], [-0.9, 1.0, 0.9]];
  const ridge = (x) => Math.max(...PEAKS.map(([c, h, s]) => h - Math.abs(x - c) * s)) + Math.sin(x * 7.3) * 0.04 + Math.sin(x * 17.1) * 0.02;
  const mountain = build((i, a, o) => {
    const k = rnd[i * 4 + 2];
    let x, y, z = gauss() * 0.05;
    if (k < 0.42) { x = (Math.random() - 0.5) * 11; y = ridge(x) + gauss() * 0.025; }
    else if (k < 0.72) { x = (Math.random() - 0.5) * 11; const top = ridge(x); y = top - Math.pow(Math.random(), 0.55) * (top + 2.4); z = gauss() * 0.15; }
    else if (k < 0.86) { const t = Math.random() * TAU, r = k < 0.8 ? 0.62 : Math.sqrt(Math.random()) * 0.6; x = 0.7 + Math.cos(t) * r; y = 1.75 + Math.sin(t) * r; z = -0.6; if (y < ridge(x)) { y = ridge(x) + 0.05; } }
    else { x = (Math.random() - 0.5) * 11; y = -1.0 + gauss() * 0.22; z = 0.4 + gauss() * 0.3; }
    a[o] = x; a[o + 1] = y - 0.3; a[o + 2] = z;
  });

  // hourglass: glass outline, frame rings, sand above, falling stream, pile below
  const hourglass = build((i, a, o) => {
    const k = rnd[i * 4 + 2], H = 2.3;
    const rad = (y) => 0.1 + 1.25 * Math.pow(Math.abs(y) / H, 0.85);
    let x, y, z;
    if (k < 0.4) { y = (Math.random() * 2 - 1) * H; const t = Math.random() * TAU, r = rad(y); x = Math.cos(t) * r; z = Math.sin(t) * r; }
    else if (k < 0.55) { y = (Math.random() < 0.5 ? 1 : -1) * (H + 0.12); const t = Math.random() * TAU, r = 1.55 + gauss() * 0.04; x = Math.cos(t) * r; z = Math.sin(t) * r; }
    else if (k < 0.62) { const t = Math.floor(Math.random() * 3) / 3 * TAU + 0.5; y = (Math.random() * 2 - 1) * (H + 0.1); x = Math.cos(t) * 1.55; z = Math.sin(t) * 1.55; }
    else if (k < 0.78) { y = 0.5 + Math.random() * 1.2; const t = Math.random() * TAU, r = Math.sqrt(Math.random()) * rad(y) * 0.92; x = Math.cos(t) * r; z = Math.sin(t) * r; }
    else if (k < 0.86) { y = -Math.random() * (H - 0.5); x = gauss() * 0.02; z = gauss() * 0.02; }
    else { const h = Math.random() * 0.7; y = -H + h; const t = Math.random() * TAU, r = Math.sqrt(Math.random()) * (1 - h / 0.7) * rad(-H) * 0.9; x = Math.cos(t) * r; z = Math.sin(t) * r; }
    a[o] = x; a[o + 1] = y; a[o + 2] = z;
  });

  // bloom: 3D rose curve petals
  const bloom = build((i, a, o) => {
    const layer = Math.floor(rnd[i * 4 + 2] * 4), k = 5, t = Math.random() * TAU;
    const rad = Math.abs(Math.cos(k * t / 2)) * (2.0 + layer * 0.7) * Math.sqrt(Math.random() * 0.85 + 0.15);
    const lift = (rad * rad) * 0.12 - layer * 0.2;
    const tt = t + layer * 0.3;
    a[o] = Math.cos(tt) * rad + gauss() * 0.05; a[o + 1] = Math.sin(tt) * rad * 0.9 + gauss() * 0.05; a[o + 2] = lift + gauss() * 0.08;
  });

  // full moon: sphere with thinned-out crater patches and a faint halo
  const CRATERS = Array.from({ length: 14 }, () => { const u = Math.random() * 2 - 1, t = Math.random() * TAU, s = Math.sqrt(1 - u * u); return [s * Math.cos(t), u, s * Math.sin(t), 0.12 + Math.random() * 0.25]; });
  const moon = build((i, a, o) => {
    const R = 2.2;
    if (rnd[i * 4 + 2] < 0.12) { const t = Math.random() * TAU, r = R + 0.25 + Math.abs(gauss()) * 0.9; a[o] = Math.cos(t) * r; a[o + 1] = Math.sin(t) * r; a[o + 2] = gauss() * 0.3; return; }
    for (let tries = 0; tries < 6; tries++) {
      const u = Math.random() * 2 - 1, t = Math.random() * TAU, s = Math.sqrt(1 - u * u);
      const px = s * Math.cos(t), py = u, pz = s * Math.sin(t);
      const inCrater = CRATERS.some(([cx, cy, cz, cr]) => (px - cx) ** 2 + (py - cy) ** 2 + (pz - cz) ** 2 < cr * cr);
      if (!inCrater || Math.random() < 0.3 || tries === 5) { a[o] = px * R; a[o + 1] = py * R; a[o + 2] = pz * R; return; }
    }
  });

  const field = build((i, a, o) => {
    if (rnd[i * 4 + 2] < 0.35) { // milky way band
      const x = (Math.random() - 0.5) * 22; a[o] = x; a[o + 1] = x * 0.32 + gauss() * 0.7; a[o + 2] = -4 - Math.random() * 6; return;
    }
    a[o] = (Math.random() - 0.5) * 20; a[o + 1] = (Math.random() - 0.5) * 12; a[o + 2] = -Math.random() * 12 + 2;
  });

  const portrait = build((i, a, o) => { // placeholder until the photo is sampled
    const t = Math.random() * TAU, r = Math.sqrt(Math.random()) * 1.8;
    a[o] = Math.cos(t) * r; a[o + 1] = Math.sin(t) * r; a[o + 2] = gauss() * 0.1;
  });

  const shapes = [sigil, galaxy, mountain, hourglass, bloom, moon, field, portrait];
  // per-stage look: [offsetX desktop, offsetY desktop, offsetY mobile, dim, moonlight share, spin speed, rotation allowed]
  const LOOK = [
    [2.75, 1.0, 2.35, 1.0, 0.1, 0.0, 0],
    [0, 0, 0, 0.7, 0.5, 0.05, 1],
    [1.0, 0, 0.3, 0.5, 0.06, 0.0, 0],
    [0, 0, 0, 0.6, 0.12, 0.18, 1],
    [0, 0, 0, 0.8, 0.3, 0.08, 1],
    [2.6, 0, 0, 0.62, 0.85, 0.06, 1],
    [0, 0, 0, 0.55, 0.6, 0.015, 1],
    [2.3, 0, 2.05, 1.0, 0.0, 0.0, 0],
  ];
  const lastStage = shapes.length - 1;

  // ---------- GL setup ----------
  const vs = `
    attribute vec3 aPos; attribute vec4 aRnd; attribute vec3 aPhoto;
    uniform mat4 uProj; uniform float uTime, uPixel, uSize, uHolo, uPhoto, uRot, uTiltX, uTiltY, uScale;
    uniform vec3 uOffset;
    varying vec3 vCol; varying float vA;
    vec3 gold(float r) { return r < .5 ? vec3(.93,.72,.4) : r < .75 ? vec3(1.,.9,.7) : r < .9 ? vec3(.9,.5,.2) : vec3(1.,.97,.9); }
    vec3 moon(float r) { return r < .55 ? vec3(.86,.89,.95) : r < .85 ? vec3(.66,.73,.88) : vec3(1.,.93,.82); }
    void main() {
      vec3 p = aPos * uScale;
      float t = uTime;
      p += .035 * vec3(sin(t*.7 + aRnd.x*40.), cos(t*.6 + aRnd.y*40.), sin(t*.5 + aRnd.z*40.));
      float c = cos(uRot + uTiltX), s = sin(uRot + uTiltX);
      p = vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z);
      float c2 = cos(uTiltY), s2 = sin(uTiltY);
      p = vec3(p.x, c2*p.y - s2*p.z, s2*p.y + c2*p.z);
      p += uOffset;
      vec4 mv = vec4(p + vec3(0., 0., -7.5), 1.);
      gl_Position = uProj * mv;
      float sz = uSize * (.45 + aRnd.w * aRnd.w * 1.6);
      gl_PointSize = clamp(sz * uPixel / -mv.z, 1., 40.);
      vec3 col = aRnd.y < uHolo ? moon(aRnd.z) : gold(aRnd.z);
      vCol = mix(col, aPhoto * vec3(1.08, .9, .7), uPhoto);
      vA = (.5 + .5 * sin(t * (1. + aRnd.x * 2.) + aRnd.y * 60.)) * .6 + .4;
      vA *= smoothstep(-22., -4., mv.z);
    }`;
  const fs = `
    precision mediump float;
    uniform float uDim;
    varying vec3 vCol; varying float vA;
    void main() {
      float d = length(gl_PointCoord - .5);
      float a = smoothstep(.5, 0., d); a *= a;
      gl_FragColor = vec4(vCol * a * vA * uDim, 1.);
    }`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn(e); document.documentElement.classList.add('no-gl'); return; }
  gl.useProgram(prog);

  const pos = new Float32Array(N * 3);
  const photo = new Float32Array(N * 3).fill(0.8);
  const buf = (data, name, size, usage) => {
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, usage || gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    return b;
  };
  const posBuf = buf(pos, 'aPos', 3, gl.DYNAMIC_DRAW);
  buf(rnd, 'aRnd', 4);
  const photoBuf = buf(photo, 'aPhoto', 3);
  const U = {};
  ['uProj', 'uTime', 'uPixel', 'uSize', 'uHolo', 'uPhoto', 'uRot', 'uTiltX', 'uTiltY', 'uScale', 'uOffset', 'uDim'].forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  gl.clearColor(0.024, 0.02, 0.016, 1);

  let W = 0, H = 0, aspect = 1;
  const FOV = 50 * Math.PI / 180;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
    W = canvas.width = Math.round(innerWidth * dpr); H = canvas.height = Math.round(innerHeight * dpr);
    gl.viewport(0, 0, W, H);
    aspect = W / H;
    const f = 1 / Math.tan(FOV / 2), nr = 0.1, fr = 100;
    gl.uniformMatrix4fv(U.uProj, false, new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (fr + nr) / (nr - fr), -1, 0, 0, 2 * fr * nr / (nr - fr), 0]));
    gl.uniform1f(U.uPixel, H / (2 * Math.tan(FOV / 2)));
    gl.uniform1f(U.uSize, mobile ? 0.05 : 0.042);
  };
  resize(); addEventListener('resize', resize);

  // ---------- portrait sampling ----------
  const img = new Image();
  img.onload = () => {
    try {
      const S = 140, c = document.createElement('canvas'); c.width = c.height = S;
      const x2 = c.getContext('2d', { willReadFrequently: true }); x2.drawImage(img, 0, 0, S, S);
      const d = x2.getImageData(0, 0, S, S).data;
      let n = 0, guard = 0;
      while (n < N && guard++ < N * 80) {
        const x = Math.random() * S | 0, y = Math.random() * S | 0;
        const dx = x / S - 0.5, dy = y / S - 0.47;
        if (dx * dx * 1.1 + dy * dy > 0.2) continue;
        const k = (y * S + x) * 4, r = d[k] / 255, g = d[k + 1] / 255, b = d[k + 2] / 255;
        const lum = 0.3 * r + 0.59 * g + 0.11 * b;
        if (Math.random() > Math.pow(lum, 1.1) * 1.6 + 0.015) continue;
        portrait[n * 3] = dx * 4.4; portrait[n * 3 + 1] = -dy * 4.4; portrait[n * 3 + 2] = lum * 0.6 + gauss() * 0.02;
        photo[n * 3] = Math.min(1, r * 1.25); photo[n * 3 + 1] = Math.min(1, g * 1.25); photo[n * 3 + 2] = Math.min(1, b * 1.25);
        n++;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, photoBuf); gl.bufferData(gl.ARRAY_BUFFER, photo, gl.STATIC_DRAW);
      lastS = -1; // force re-morph
    } catch (e) { /* tainted canvas (file://) — keep the placeholder disc */ }
  };
  img.src = canvas.dataset.portrait || 'img/portrait-face.jpg';

  // ---------- scroll → stage ----------
  const anchors = [...document.querySelectorAll('[data-stage]')];
  const targetStage = () => {
    const mid = innerHeight * 0.5;
    for (let i = 0; i < anchors.length; i++) {
      const r = anchors[i].getBoundingClientRect();
      if (r.bottom < mid && i < anchors.length - 1) continue;
      const st = +anchors[i].dataset.stage;
      const prev = i > 0 ? +anchors[i - 1].dataset.stage : st;
      // blend in during the first 35% of a viewport after the section top crosses mid
      const p = Math.min(1, Math.max(0, (mid - r.top) / (innerHeight * 0.35)));
      return r.top > mid ? prev : prev + (st - prev) * p;
    }
    return 0;
  };

  let s = 1.0, lastS = -1; // start from the nebula and assemble into the hero shape
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; }, { passive: true });

  const ease = (x) => x * x * (3 - 2 * x);
  const morph = () => {
    const a = Math.min(Math.floor(s), lastStage), b = Math.min(a + 1, lastStage), f = s - a;
    const A = shapes[a], B = shapes[b];
    for (let i = 0; i < N; i++) {
      const delay = rnd[i * 4 + 3] * 0.35;
      const fi = ease(Math.min(1, Math.max(0, (f - delay) / 0.65)));
      const burst = Math.sin(fi * Math.PI) * (0.6 + rnd[i * 4] * 1.6);
      const o = i * 3;
      pos[o] = A[o] + (B[o] - A[o]) * fi + dir[o] * burst;
      pos[o + 1] = A[o + 1] + (B[o + 1] - A[o + 1]) * fi + dir[o + 1] * burst;
      pos[o + 2] = A[o + 2] + (B[o + 2] - A[o + 2]) * fi + dir[o + 2] * burst;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
  };
  const lookAt = (k) => {
    const a = Math.min(Math.floor(s), lastStage), b = Math.min(a + 1, lastStage), f = ease(s - a);
    return LOOK[a][k] + (LOOK[b][k] - LOOK[a][k]) * f;
  };

  let rot = 0, last = performance.now(), visible = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) { last = performance.now(); requestAnimationFrame(frame); } });

  function frame(now) {
    if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const tgt = targetStage();
    s += (tgt - s) * (reduce ? 1 : Math.min(1, dt * 2.6));
    if (Math.abs(s - tgt) < 1e-4) s = tgt;
    if (Math.abs(s - lastS) > 1e-5) { morph(); lastS = s; }

    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    if (!reduce) rot += dt * lookAt(5);
    const narrow = aspect < 0.9;
    const ox = narrow ? 0 : lookAt(0) * Math.min(1, aspect / 1.6);
    const oy = narrow ? lookAt(2) : lookAt(1);
    gl.uniform1f(U.uTime, reduce ? 0 : now / 1000);
    const pw = Math.max(0, s - (lastStage - 1));
    let r = rot % TAU; if (r > Math.PI) r -= TAU;
    gl.uniform1f(U.uRot, r * lookAt(6));
    gl.uniform1f(U.uTiltX, mouse.x * (0.5 - pw * 0.3));
    gl.uniform1f(U.uTiltY, mouse.y * 0.3);
    gl.uniform3f(U.uOffset, ox, oy, 0);
    gl.uniform1f(U.uScale, narrow ? 0.62 : 1);
    gl.uniform1f(U.uDim, lookAt(3) * (narrow ? 0.85 : 1));
    gl.uniform1f(U.uHolo, lookAt(4));
    gl.uniform1f(U.uPhoto, pw);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, N);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
