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

  const infinity = build((i, a, o) => {
    if (rnd[i * 4 + 2] < 0.22) { // dust around
      const r = 1.2 + Math.random() * 3.5, t = Math.random() * TAU;
      a[o] = Math.cos(t) * r * 1.3; a[o + 1] = gauss() * 1.1; a[o + 2] = Math.sin(t) * r * 0.6;
      return;
    }
    const t = Math.random() * TAU, d = 1 + Math.sin(t) ** 2, A = 2.3;
    const x = A * Math.cos(t) / d, y = A * Math.sin(t) * Math.cos(t) / d;
    const w = 0.06 + 0.1 * Math.random() ** 3;
    a[o] = x + gauss() * w; a[o + 1] = y + gauss() * w; a[o + 2] = Math.sin(t * 2) * 0.35 + gauss() * w;
  });

  const nebula = build((i, a, o) => {
    const arm = Math.floor(rnd[i * 4] * 3), r = Math.pow(Math.random(), 0.6) * 5.5;
    const t = arm / 3 * TAU + r * 0.9 + gauss() * 0.35;
    a[o] = Math.cos(t) * r + gauss() * 0.3; a[o + 1] = gauss() * 0.35 * (1 + r * 0.15); a[o + 2] = Math.sin(t) * r * 0.75 + gauss() * 0.3;
  });

  // double helix: two strands — the technical and the visual line
  const helix = build((i, a, o) => {
    const strand = rnd[i * 4 + 1] < 0.5 ? 0 : 1, x = (Math.random() - 0.5) * 11;
    if (rnd[i * 4 + 2] < 0.12) { // rungs
      const ph = Math.round(x * 2) / 2 * 1.3, k = Math.random() * 2 - 1;
      a[o] = Math.round(x * 2) / 2; a[o + 1] = Math.cos(ph) * 1.05 * k; a[o + 2] = Math.sin(ph) * 1.05 * k;
      return;
    }
    const ph = x * 1.3 + strand * Math.PI, w = 0.07;
    a[o] = x + gauss() * w; a[o + 1] = Math.cos(ph) * 1.05 + gauss() * w; a[o + 2] = Math.sin(ph) * 1.05 + gauss() * w;
  });

  const torus = build((i, a, o) => {
    const u = Math.random() * TAU, v = Math.random() * TAU, R = 2.3, r = 0.08 + 0.32 * Math.random() ** 2;
    const rr = rnd[i * 4 + 2] < 0.15 ? R + gauss() * 0.9 : R;
    a[o] = (rr + r * Math.cos(v)) * Math.cos(u); a[o + 1] = (rr + r * Math.cos(v)) * Math.sin(u); a[o + 2] = r * Math.sin(v) + (rr !== R ? gauss() * 0.4 : 0);
  });

  // bloom: 3D rose curve petals
  const bloom = build((i, a, o) => {
    const layer = Math.floor(rnd[i * 4 + 2] * 4), k = 5, t = Math.random() * TAU;
    const rad = Math.abs(Math.cos(k * t / 2)) * (2.0 + layer * 0.7) * Math.sqrt(Math.random() * 0.85 + 0.15);
    const lift = (rad * rad) * 0.12 - layer * 0.2;
    const tt = t + layer * 0.3;
    a[o] = Math.cos(tt) * rad + gauss() * 0.05; a[o + 1] = Math.sin(tt) * rad * 0.9 + gauss() * 0.05; a[o + 2] = lift + gauss() * 0.08;
  });

  const sphere = build((i, a, o) => {
    const k = i + 0.5, phi = Math.acos(1 - 2 * k / N), th = Math.PI * (1 + Math.sqrt(5)) * k;
    const r = rnd[i * 4 + 2] < 0.18 ? 2.2 + Math.random() * 1.8 : 2.2;
    a[o] = Math.cos(th) * Math.sin(phi) * r; a[o + 1] = Math.cos(phi) * r; a[o + 2] = Math.sin(th) * Math.sin(phi) * r;
  });

  const field = build((i, a, o) => {
    a[o] = (Math.random() - 0.5) * 20; a[o + 1] = (Math.random() - 0.5) * 12; a[o + 2] = -Math.random() * 12 + 2;
  });

  const portrait = build((i, a, o) => { // placeholder until the photo is sampled
    const t = Math.random() * TAU, r = Math.sqrt(Math.random()) * 1.8;
    a[o] = Math.cos(t) * r; a[o + 1] = Math.sin(t) * r; a[o + 2] = gauss() * 0.1;
  });

  const shapes = [infinity, nebula, helix, torus, bloom, sphere, field, portrait];
  // per-stage look: [offsetX desktop, offsetY desktop, offsetY mobile, dim, holo amount, spin]
  const LOOK = [
    [3.0, 0.75, 2.2, 1.0, 0.18, 0.12],
    [0, 0, 0, 0.75, 0.45, 0.05],
    [1.0, 0, 0, 0.45, 0.5, 0.0],
    [0, 0, 0, 1.0, 0.35, 0.1],
    [0, 0, 0, 0.85, 0.85, 0.08],
    [2.6, 0, 0, 0.6, 0.3, 0.15],
    [0, 0, 0, 0.5, 0.4, 0.02],
    [2.3, 0, 2.05, 1.0, 0.0, 0.0],
  ];
  const lastStage = shapes.length - 1;

  // ---------- GL setup ----------
  const vs = `
    attribute vec3 aPos; attribute vec4 aRnd; attribute vec3 aPhoto;
    uniform mat4 uProj; uniform float uTime, uPixel, uSize, uHolo, uPhoto, uRot, uTiltX, uTiltY, uScale;
    uniform vec3 uOffset;
    varying vec3 vCol; varying float vA;
    vec3 lime(float r) { return r < .55 ? vec3(.79,.95,.42) : r < .78 ? vec3(.92,1.,.82) : vec3(.95,.82,.48); }
    vec3 holo(float r) { return r < .35 ? vec3(.72,.55,1.) : r < .68 ? vec3(1.,.55,.81) : vec3(.5,.9,1.); }
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
      vec3 col = aRnd.y < uHolo ? holo(aRnd.z) : lime(aRnd.z);
      vCol = mix(col, aPhoto, uPhoto);
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
  gl.clearColor(0.02, 0.027, 0.02, 1);

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
    gl.uniform1f(U.uRot, r * (1 - pw));
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
