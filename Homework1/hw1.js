const $ = (id) => document.getElementById(id);
const G0 = [1, 5],
  K0 = 6;
const str = (P) => (P === O ? "O" : `(${P[0]}, ${P[1]})`);
const same = (A, B) => A && B && A[0] === B[0] && A[1] === B[1];

const CURVE = [];
for (let x = 0; x < p; x++)
  for (let y = 0; y < p; y++)
    if (mod(y * y - x * x * x - 7) === 0) CURVE.push([x, y]);

/* figure */
const L = 36,
  T = 26,
  C = 21.5;
const sx = (x) => L + x * C,
  sy = (y) => T + (16 - y) * C;
function slope(P, Q) {
  return same(P, Q)
    ? mod(3 * P[0] * P[0] * inv(2 * P[1]))
    : mod((Q[1] - P[1]) * inv(Q[0] - P[0]));
}

function draw(s) {
  let h = "";
  for (let i = 0; i < p; i++) {
    h += `<line class="g-line" x1="${sx(i)}" y1="${sy(0)}" x2="${sx(i)}" y2="${sy(16)}"/><line class="g-line" x1="${sx(0)}" y1="${sy(i)}" x2="${sx(16)}" y2="${sy(i)}"/>`;
    if (i % 2 === 0)
      h += `<text class="g-tick" x="${sx(i)}" y="${sy(0) + 18}" text-anchor="middle">${i}</text><text class="g-tick" x="${sx(0) - 12}" y="${sy(i) + 3.5}" text-anchor="end">${i}</text>`;
  }
  h += `<text class="g-axis" x="${sx(16)}" y="${sy(0) + 32}" text-anchor="end">x</text><text class="g-axis" x="${sx(0) - 12}" y="${sy(16) - 12}" text-anchor="end">y</text>`;
  if (s.sym)
    h += `<line class="sym" x1="${sx(0)}" y1="${sy(8.5)}" x2="${sx(16)}" y2="${sy(8.5)}"/>`;
  const c = s.cons;
  if (c && c.line) {
    const lam = slope(c.P, c.Q);
    for (let x = 0; x < p; x++)
      h += `<circle class="lp" cx="${sx(x)}" cy="${sy(mod(c.P[1] + lam * (x - c.P[0])))}" r="2.5"/>`;
  }
  const path = s.path || [];
  for (let i = 1; i < path.length; i++)
    h += `<line class="jump${i === path.length - 1 && s.cur ? " last" : ""}" x1="${sx(path[i - 1][0])}" y1="${sy(path[i - 1][1])}" x2="${sx(path[i][0])}" y2="${sy(path[i][1])}"/>`;
  if (c && c.mirror && c.result)
    h += `<line class="refl" x1="${sx(c.mirror[0])}" y1="${sy(c.mirror[1])}" x2="${sx(c.result[0])}" y2="${sy(c.result[1])}"/>`;
  for (const P of CURVE) {
    const on =
      s.on === "all" ||
      path.some((Q) => same(P, Q)) ||
      (c && (same(P, c.P) || same(P, c.Q)));
    const cls = same(P, s.key)
      ? "key"
      : same(P, s.cur)
        ? "cur"
        : on
          ? "on"
          : "";
    h += `<circle class="pt ${cls}${cls === "cur" || cls === "key" ? " pop" : ""}" cx="${sx(P[0])}" cy="${sy(P[1])}" r="${cls ? 6 : 4.5}"/>`;
  }
  if (c)
    for (const P of [c.P, c.Q])
      h += `<circle class="ring" cx="${sx(P[0])}" cy="${sy(P[1])}" r="10"/>`;
  if (c && c.mirror)
    h += `<circle class="ghost pop" cx="${sx(c.mirror[0])}" cy="${sy(c.mirror[1])}" r="7"/>`;
  if (s.key)
    h += `<circle class="ring key" cx="${sx(s.key[0])}" cy="${sy(s.key[1])}" r="11"/>`;
  for (const [P, t, cls] of s.labels || []) {
    const left = P[0] > 13;
    h += `<text class="lbl ${cls || ""}" x="${sx(P[0]) + (left ? -12 : 12)}" y="${sy(P[1]) + (P[1] > 15 ? 16 : -9)}" text-anchor="${left ? "end" : "start"}">${t}</text>`;
  }
  $("grid").innerHTML = h;
  $("cap").innerHTML = `<b>${s.title}</b><span>${s.text}</span>`;
}

const M0 = multiples(G0, 8);
const name = (i) => (i === 1 ? "G" : i + "G");
const labelsTo = (i) => M0.slice(0, i).map((P, j) => [P, name(j + 1)]);

function thirdText(i) {
  const P = M0[i - 2],
    R = M0[i - 1],
    mir = [R[0], mod(-R[1])];
  if (i === 2)
    return "The tangent at G meets the curve in exactly one other point.";
  if (same(mir, P))
    return `Here the third point is ${name(i - 1)} itself: the line is tangent to the curve at ${name(i - 1)}.`;
  if (same(mir, G0))
    return "Here the third point is G itself: the line is tangent to the curve at G.";
  return "Besides the two operands, the line meets the curve in exactly one other point.";
}
// construction of iG
function cons(i) {
  const P = M0[i - 2],
    R = M0[i - 1];
  return { P, Q: G0, line: true, mirror: [R[0], mod(-R[1])], result: R };
}
const VIEWS = {
  curve: () => ({
    on: "all",
    sym: true,
    title: "The curve y² ≡ x³ + 7 (mod 17)",
    text: "17 points on the grid, plus the point at infinity O. The dashed line shows the symmetry y ↔ 17 − y.",
  }),
  base: () => ({
    path: [G0],
    cur: G0,
    labels: [[G0, "G"]],
    title: "Base point G = (1, 5)",
    text: "5² = 25 ≡ 8 and 1³ + 7 = 8 (mod 17): G lies on the curve.",
  }),
  add: () => ({
    path: M0.slice(0, 3),
    cons: cons(3),
    cur: M0[2],
    sym: true,
    labels: [
      [G0, "P = G"],
      [M0[1], "Q = 2G"],
      [M0[2], "P + Q"],
    ],
    title: "G + 2G = (5, 9)",
    text: "The line through P and Q (small dots) meets the curve at a third point (dashed circle); its reflection is P + Q.",
  }),
  m: (i) =>
    i === 1
      ? {
          path: [G0],
          cur: G0,
          labels: [[G0, "G"]],
          title: "1G = (1, 5)",
          text: "The starting point: one copy of G.",
        }
      : {
          path: M0.slice(0, i),
          cons: cons(i),
          cur: M0[i - 1],
          labels: labelsTo(i),
          title: `${i}G = ${name(i - 1)} + G = ${str(M0[i - 1])}`,
          text: `${i === 2 ? "Tangent at G" : `Line through ${name(i - 1)} and G`}, third intersection ${str([M0[i - 1][0], mod(-M0[i - 1][1])])}, reflected to ${str(M0[i - 1])}.${i > 2 && thirdText(i).startsWith("Here") ? " " + thirdText(i) : ""}`,
        },
  key: () => ({
    path: M0.slice(0, K0),
    key: M0[K0 - 1],
    labels: labelsTo(K0 - 1).concat([[M0[K0 - 1], "Q = 6G", "key"]]),
    title: `Toy public key Q = ${str(M0[K0 - 1])}`,
    text: "Five additions lead from G to Q = 6G. Q alone gives no hint of how many steps it took.",
  }),
  anim: () => frame(),
};

/* 1.4 */
function working(P, Q) {
  const [x1, y1] = P,
    [x2, y2] = Q,
    lam = slope(P, Q),
    R = add(P, Q);
  const l = same(P, Q)
    ? `3x₁² · (2y₁)⁻¹ = ${3 * x1 * x1} · ${2 * y1}⁻¹ ≡ ${mod(3 * x1 * x1)} · ${inv(2 * y1)}`
    : `(y₂ − y₁) · (x₂ − x₁)⁻¹ = (${y2} − ${y1}) · (${x2} − ${x1})⁻¹ ≡ ${mod(y2 - y1)} · ${mod(x2 - x1)}⁻¹ ≡ ${mod(y2 - y1)} · ${inv(x2 - x1)}`;
  return `<table class="work">
    <tr><td>λ</td><td>= ${l}</td><td>≡ ${lam}</td></tr>
    <tr><td>x₃</td><td>= λ² − x₁ − x₂ = ${lam * lam} − ${x1} − ${x2}</td><td>≡ ${R[0]}</td></tr>
    <tr><td>y₃</td><td>= λ(x₁ − x₃) − y₁ = ${lam} · (${x1} − ${R[0]}) − ${y1}</td><td>≡ ${R[1]}</td></tr></table>`;
}
(function buildMultiples() {
  const list = multiples(G0, K0);
  let h = `<article class="step" id="s14" data-view="m" data-i="1"><span class="num">1.4</span><h3>Computing G, 2G, …, kG</h3>
    <p>With <span class="m">k = 6</span> I start from <span class="m">G</span> and add <span class="m">G</span> five times. Each card shows the calculation for one addition: <span class="m">(x₁, y₁)</span> is the previous multiple and <span class="m">(x₂, y₂) = G</span>, and everything is reduced modulo 17.</p>
    <div class="box"><div class="res" style="border:0;margin:0;padding:0"><span>1G = G</span><b>(1, 5)</b></div></div></article>`;
  for (let i = 2; i <= K0; i++) {
    const P = list[i - 2];
    h += `<article class="step" data-view="m" data-i="${i}"><div class="box">
      <p class="note" style="margin-bottom:8px">${i === 2 ? "Doubling: both operands are G, so the tangent formula applies." : `Chord through ${name(i - 1)} = ${str(P)} and G = (1, 5).${thirdText(i).startsWith("Here") ? " " + thirdText(i) + " The chord formula still works, since the two points are different." : ""}`}</p>
      ${working(P, G0)}
      <div class="res"><span>${i}G = ${name(i - 1)} + G</span><b>${str(list[i - 1])}</b></div></div></article>`;
  }
  $("mults").innerHTML = h;
  $("out").innerHTML =
    list.map((P, i) => `${i + 1}G = ${str(P)}`).join("<br>") +
    `<br><span class="q">TOY PUBLIC KEY  Q = ${K0}G = ${str(list[K0 - 1])}</span>`;
  $("pk").textContent = "Q = " + str(list[K0 - 1]);
  $("da").innerHTML =
    `mulDA(G, ${K0}) = ${str(mulDA(G0, K0))} <span class="note">(same as above)</span><br>` +
    `mulDA(G, 1000) = ${str(mulDA(G0, 1000))} = G <span class="note">(1000 = 111 · 9 + 1, and 9G = O)</span>`;
})();

/* 1.6 */
const A = { k: 6, f: 0, timer: null };
const frames = () => {
  const a = [[1, 0]];
  for (let i = 2; i <= A.k; i++) for (let ph = 0; ph < 4; ph++) a.push([i, ph]);
  return a;
};
function frame() {
  const fs = frames(),
    [i, ph] = fs[A.f],
    last = A.f === fs.length - 1;
  $("aprog").textContent =
    `Move ${A.f + 1} of ${fs.length} · computing ${name(i)}`;
  if (i === 1) {
    const s = {
      path: [G0],
      cur: G0,
      labels: [[G0, "G"]],
      title: "Start: R = G",
      text: "The running result R starts from the base point.",
    };
    if (last) {
      s.key = G0;
      s.cur = null;
      s.labels = [[G0, "Q = G", "key"]];
      s.title = "Toy public key Q = 1G = (1, 5)";
    }
    return s;
  }
  const P = M0[i - 2],
    R = M0[i - 1],
    mir = [R[0], mod(-R[1])],
    lam = slope(P, G0),
    dbl = i === 2;
  const s = {
    path: M0.slice(0, ph === 3 ? i : i - 1),
    labels: labelsTo(ph === 3 ? i : i - 1),
    cons: { P, Q: G0 },
  };
  if (ph === 0) {
    s.title = `${name(i)} = ${name(i - 1)} + G`;
    s.text = dbl
      ? "Both operands are G: this addition is a doubling."
      : `Operands: ${name(i - 1)} = ${str(P)} and G = (1, 5).`;
  }
  if (ph >= 1) s.cons.line = true;
  if (ph === 1) {
    s.title = `Slope λ ≡ ${lam} (mod 17)`;
    s.text = `${dbl ? "Tangent at G" : "Line through the two points"}: the small dots are its 17 points modulo 17.`;
  }
  if (ph >= 2) s.cons.mirror = mir;
  if (ph === 2) {
    s.title = `Third intersection ${str(mir)}`;
    s.text = thirdText(i);
  }
  if (ph === 3) {
    s.cons.result = R;
    s.cur = R;
    s.title = `${name(i)} = ${str(R)}`;
    s.text = `Reflecting the third point (y → 17 − y) gives the next multiple.`;
    if (last) {
      s.key = R;
      s.cur = null;
      s.labels[i - 1] = [R, `Q = ${i}G`, "key"];
      s.title = `Toy public key Q = ${i}G = ${str(R)}`;
    }
  }
  return s;
}
function stop() {
  clearTimeout(A.timer);
  A.timer = null;
  $("aplay").textContent = "Play";
}
function tick() {
  if (A.f >= frames().length - 1) return stop();
  A.f++;
  draw(frame());
  A.timer = setTimeout(tick, +$("aspeed").value);
}
$("aplay").onclick = () => {
  if (A.timer) return stop();
  if (A.f >= frames().length - 1) A.f = 0;
  setActive(document.querySelector('[data-view="anim"]'));
  draw(frame());
  $("aplay").textContent = "Pause";
  A.timer = setTimeout(tick, +$("aspeed").value);
};
$("astep").onclick = () => {
  stop();
  if (A.f < frames().length - 1) A.f++;
  setActive(document.querySelector('[data-view="anim"]'));
  draw(frame());
};
$("areset").onclick = () => {
  stop();
  A.f = 0;
  draw(frame());
};
$("ak").onchange = () => {
  A.k = Math.min(8, Math.max(1, Math.round(+$("ak").value) || 1));
  $("ak").value = A.k;
  stop();
  A.f = 0;
  draw(frame());
};

frame();

/* scroll-driven figure */
let active = null;
function setActive(el) {
  if (el === active) return;
  if (active) active.classList.remove("active");
  if (active && active.dataset.view === "anim") stop();
  active = el;
  el.classList.add("active");
  draw(VIEWS[el.dataset.view](+el.dataset.i));
}
const stepEls = [...document.querySelectorAll(".step")];
function onScroll() {
  const y = innerHeight * (innerWidth <= 920 ? 0.72 : 0.5);
  let pick = stepEls[0];
  for (const el of stepEls) if (el.getBoundingClientRect().top < y) pick = el;
  const animEl = $("s16"),
    ar = animEl.getBoundingClientRect();
  if (A.timer && ar.bottom > 0 && ar.top < innerHeight) pick = animEl;
  setActive(pick);
  $("totoc").classList.toggle(
    "show",
    $("toc").getBoundingClientRect().bottom < 0,
  );
}
let raf = 0;
addEventListener(
  "scroll",
  () => {
    if (!raf)
      raf = requestAnimationFrame(() => {
        raf = 0;
        onScroll();
      });
  },
  { passive: true },
);
addEventListener("resize", onScroll);
onScroll();

/* Part 2 */
const order = (G) => {
  let n = 1,
    R = G;
  while (R !== O) {
    R = add(R, G);
    n++;
  }
  return n;
};
const bits = (P) =>
  [4, 3, 2, 1, 0]
    .map((i) => (P[0] >> i) & 1)
    .concat([4, 3, 2, 1, 0].map((i) => (P[1] >> i) & 1));
function pearson(a, b) {
  const n = a.length,
    ma = a.reduce((s, v) => s + v, 0) / n,
    mb = b.reduce((s, v) => s + v, 0) / n;
  let c = 0,
    va = 0,
    vb = 0;
  for (let i = 0; i < n; i++) {
    c += (a[i] - ma) * (b[i] - mb);
    va += (a[i] - ma) ** 2;
    vb += (b[i] - mb) ** 2;
  }
  return c / Math.sqrt(va * vb);
}
function bars(id, vals, labs, o = {}) {
  const W = 460,
    H = 190,
    l = 10,
    b = 26,
    t = 18,
    w = (W - 2 * l) / vals.length,
    max = o.max || Math.max(1, ...vals),
    ph = H - b - t;
  let h = "";
  if (o.ref != null) {
    const y = H - b - (o.ref / max) * ph;
    h += `<line class="c-ref" x1="${l}" y1="${y}" x2="${W - l}" y2="${y}"/><text class="c-reft" x="${W - l}" y="${t - 6}" text-anchor="end">dashed line: ideal ${o.ref}</text>`;
  }
  vals.forEach((v, i) => {
    const bh = (v / max) * ph,
      x = l + i * w + w * 0.14;
    h +=
      v > 0
        ? `<rect class="c-bar" x="${x}" y="${H - b - bh}" width="${w * 0.72}" height="${bh}" rx="3"/>`
        : `<rect class="c-zero" x="${x}" y="${H - b - 2}" width="${w * 0.72}" height="2"/>`;
    if (v > 0 || o.fmt)
      h += `<text class="c-val" x="${x + w * 0.36}" y="${H - b - bh - 5}">${o.fmt ? o.fmt(v) : v}</text>`;
    h += `<text class="c-tick" x="${x + w * 0.36}" y="${H - 8}">${labs[i]}</text>`;
  });
  const el = $(id);
  el.setAttribute("viewBox", `0 0 ${W} ${H}`);
  el.innerHTML = h;
}
function scatter(id, ks, vs, n) {
  const W = 460,
    H = 200,
    l = 34,
    b = 28,
    t = 10,
    r = 12;
  const X = (k) => l + (k / n) * (W - l - r),
    Y = (v) => H - b - (v / 16) * (H - b - t);
  let h = "";
  for (const v of [0, 4, 8, 12, 16])
    h += `<line class="g-line" x1="${l}" y1="${Y(v)}" x2="${W - r}" y2="${Y(v)}"/><text class="c-tick" x="${l - 12}" y="${Y(v) + 3.5}">${v}</text>`;
  ks.forEach((k, i) => {
    h += `<circle class="c-dot" cx="${X(k)}" cy="${Y(vs[i])}" r="4.5"/><text class="c-tick" x="${X(k)}" y="${H - 8}">${k}</text>`;
  });
  const el = $(id);
  el.setAttribute("viewBox", `0 0 ${W} ${H}`);
  el.innerHTML = h;
}
function stats(G) {
  const n = order(G),
    pts = multiples(G, n - 1),
    ks = pts.map((_, i) => i + 1);
  const xs = pts.map((P) => P[0]),
    ys = pts.map((P) => P[1]);
  const count = (a) =>
    Array.from({ length: p }, (_, v) => a.filter((u) => u === v).length);
  const cx = count(xs),
    cy = count(ys),
    idx = Array.from({ length: p }, (_, i) => i);
  // 2.1
  let R = O,
    h = "";
  for (let k = 1; k <= 2 * n; k++) {
    R = add(R, G);
    h += `<span class="${R === O ? "inf" : ""}${k > n ? " rep" : ""}">${k}G = <b>${str(R)}</b></span>`;
  }
  $("seq").innerHTML = h;
  // 2.2
  bars("hx", cx, idx);
  bars("hy", cy, idx);
  // 2.3
  const B = pts.map(bits),
    ones = B[0].map((_, j) => B.reduce((s, r) => s + r[j], 0) / B.length);
  bars(
    "hb",
    ones,
    ["x₄", "x₃", "x₂", "x₁", "x₀", "y₄", "y₃", "y₂", "y₁", "y₀"],
    { max: 1, ref: 0.5, fmt: (v) => v.toFixed(2) },
  );
  // 2.5
  scatter("sx", ks, xs, n);
  scatter("sy", ks, ys, n);
  const fix = (v) => (Math.abs(v) < 0.005 ? "0.00" : v.toFixed(2));
  // 2.6
  const nb = Math.ceil(Math.log2(n)),
    av = [],
    all = [];
  const kG = (k) => (k % n === 0 ? O : pts[(k % n) - 1]);
  for (let i = 0; i < nb; i++) {
    let s = 0,
      c = 0;
    for (const k of ks) {
      const Q = kG(k ^ (1 << i));
      if (Q === O) continue;
      const a = bits(kG(k)),
        b2 = bits(Q),
        d = a.filter((v, j) => v !== b2[j]).length / 10;
      s += d;
      c++;
      all.push(d);
    }
    av.push(c ? s / c : 0);
  }
  // baseline
  let bs = 0,
    bc = 0;
  for (const P of pts)
    for (const Q of pts)
      if (P !== Q) {
        const a = bits(P),
          b2 = bits(Q);
        bs += a.filter((v, j) => v !== b2[j]).length / 10;
        bc++;
      }
  bars(
    "ha",
    av,
    av.map((_, i) => "bit " + i),
    { max: 1, ref: 0.5, fmt: (v) => v.toFixed(2) },
  );
  const bind = {
    n,
    n1: n - 1,
    dx: cx.filter(Boolean).length,
    dy: cy.filter(Boolean).length,
    rx: fix(pearson(ks, xs)),
    ry: fix(pearson(ks, ys)),
    av: Math.round((all.reduce((s, v) => s + v, 0) / all.length) * 100) + "%",
    base: Math.round((bs / bc) * 100) + "%",
  };
  document
    .querySelectorAll("[data-b]")
    .forEach((el) => (el.textContent = bind[el.dataset.b]));
}

const BASES = CURVE.filter((P) => order(P) >= 6);
$("sg").innerHTML = BASES.map(
  (P, i) => `<option value="${i}">${str(P)} · order ${order(P)}</option>`,
).join("");
$("sg").value = BASES.findIndex((P) => same(P, G0));
$("sg").onchange = () => stats(BASES[+$("sg").value]);
stats(G0);
