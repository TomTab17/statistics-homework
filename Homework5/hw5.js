const $ = (id) => document.getElementById(id);
const fmt = (x) => x.toLocaleString("en");
function setS(key, text) {
  document
    .querySelectorAll(`[data-s="${key}"]`)
    .forEach((el) => (el.textContent = text));
}
const sleep = () => new Promise((r) => setTimeout(r, 0));
const sci = (x, d = 1) => (x === 0 ? "0" : x.toExponential(d));
function fmtT(ms) {
  if (ms >= 1) return `${ms.toFixed(1)} ms`;
  const us = ms * 1000;
  if (us >= 1) return `${us.toFixed(us >= 10 ? 0 : 1)} µs`;
  return `${Math.round(us * 1000)} ns`;
}
function timeIt(fn) {
  for (let r = 1; ; r *= 4) {
    const t0 = performance.now();
    for (let i = 0; i < r; i++) fn();
    const dt = performance.now() - t0;
    if (dt >= 15 || r >= 1 << 22) return dt / r;
  }
}
const powLabel = (e) =>
  e === 0
    ? "1"
    : e === 1
      ? "10"
      : `10<tspan dy="-5" font-size="8">${String(e).replace("-", "−")}</tspan>`;

function logChart(svg, series) {
  const W = 460,
    H = 250,
    l = 46,
    r = 12,
    t = 12,
    b = 28;
  const all = series
    .flatMap((s) => s.pts.map((p) => p[1]))
    .filter((v) => v > 0);
  const y0 = all.length ? Math.floor(Math.log10(Math.min(...all))) : -17,
    y1 = all.length
      ? Math.max(y0 + 1, Math.ceil(Math.log10(Math.max(...all))))
      : 0;
  const X = (v) => l + ((Math.log10(v) - 1) / 4) * (W - l - r),
    Y = (v) => H - b - ((Math.log10(v) - y0) / (y1 - y0)) * (H - b - t);
  const step = Math.ceil((y1 - y0) / 6);
  let h = "";
  for (let e = y0; e <= y1; e += step)
    h += `<line class="g-line" x1="${l}" y1="${Y(10 ** e)}" x2="${W - r}" y2="${Y(10 ** e)}"/><text class="c-axt" x="${l - 6}" y="${Y(10 ** e) + 3.5}" text-anchor="end">${powLabel(e)}</text>`;
  for (let e = 1; e <= 5; e++)
    h += `<text class="c-tick" x="${X(10 ** e)}" y="${H - 8}">${powLabel(e)}</text>`;
  for (const s of series) {
    const pts = s.pts.filter((p) => p[1] > 0);
    if (pts.length > 1)
      h += `<polyline class="ln ${s.cls}" points="${pts.map(([a, c]) => `${X(a).toFixed(1)},${Y(c).toFixed(1)}`).join(" ")}"/>`;
    for (const [a, c] of pts)
      h += `<circle class="dt ${s.cls}" cx="${X(a).toFixed(1)}" cy="${Y(c).toFixed(1)}" r="3"/>`;
  }
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = h;
}

function partitions(F) {
  const W = 460,
    H = 190,
    l = 8,
    r = 8,
    t = 10,
    b = 24,
    G = 480,
    gw = (F.b - F.a) / G;
  const ys = Array.from({ length: G }, (_, i) => F.f(F.a + (i + 0.5) * gw));
  const lo = Math.min(...ys),
    hi = Math.max(...ys),
    top = Math.max(hi, 0) * 1.06 || 1;
  const X = (x) => l + ((x - F.a) / (F.b - F.a)) * (W - l - r),
    Y = (y) => H - b - (y / top) * (H - b - t);
  const tk =
    F.b === Math.PI
      ? [
          [0, "0"],
          [Math.PI / 2, "π/2"],
          [Math.PI, "π"],
        ]
      : [
          [0, "0"],
          [0.5, "0.5"],
          [1, "1"],
        ];
  const base =
    `<line class="g-line" x1="${l}" y1="${Y(0)}" x2="${W - r}" y2="${Y(0)}"/>` +
    tk
      .map(
        ([v, s]) => `<text class="c-tick" x="${X(v)}" y="${H - 7}">${s}</text>`,
      )
      .join("");
  const curve = `<polyline class="crv" points="${ys.map((y, i) => `${X(F.a + (i + 0.5) * gw).toFixed(1)},${Y(y).toFixed(1)}`).join(" ")}"/>`;
  const rect = (x0, x1, y) =>
    `<rect class="c-area" x="${X(x0).toFixed(1)}" y="${Y(y).toFixed(1)}" width="${(X(x1) - X(x0)).toFixed(1)}" height="${(Y(0) - Y(y)).toFixed(1)}"/>`;

  let hR = base;
  const h = (F.b - F.a) / 8;
  for (let i = 0; i < 8; i++)
    hR += rect(F.a + i * h, F.a + (i + 1) * h, F.f(F.a + (i + 0.5) * h));
  $("pR").setAttribute("viewBox", `0 0 ${W} ${H}`);
  $("pR").innerHTML = hR + curve;

  let hL = base;
  const dy = (hi - lo) / 8 || 1;
  const lev = ys.map((y) => Math.min(7, Math.floor((y - lo) / dy)));
  for (let i = 0; i < G; ) {
    let k = i;
    while (k < G && lev[k] === lev[i]) k++;
    hL += rect(F.a + i * gw, F.a + k * gw, lo + lev[i] * dy);
    i = k;
  }
  for (let j = 0; j <= 8; j++)
    hL += `<line class="lvl" x1="${l}" y1="${Y(lo + j * dy).toFixed(1)}" x2="${W - r}" y2="${Y(lo + j * dy).toFixed(1)}"/>`;
  $("pL").setAttribute("viewBox", `0 0 ${W} ${H}`);
  $("pL").innerHTML = hL + curve;
}

const P = 1e6,
  NK = [10, 100, 1000, 1e4, 1e5];
let token = 0;

async function renderEx1() {
  const my = ++token,
    F = FUNCS[+$("sf").value];
  partitions(F);
  const rows = [];
  for (const n of NK) {
    $("info").textContent = `Computing N = K = ${fmt(n)}…`;
    await sleep();
    if (my !== token) return;
    const R = riemann(F.f, F.a, F.b, n),
      L = lebesgue(F.f, F.a, F.b, n, P);
    rows.push({
      n,
      eR: Math.abs(R - F.exact),
      eL: Math.abs(L.est - F.exact),
      tR: timeIt(() => riemann(F.f, F.a, F.b, n)),
      tL: timeIt(() => lebesgue(F.f, F.a, F.b, n, P)),
    });
  }
  $("info").textContent = `Grid for the Lebesgue sums: P = ${fmt(P)} cells`;
  $("tC").innerHTML =
    `<thead><tr><th>N = K</th><th>Riemann error</th><th>Time</th><th>Lebesgue error</th><th>Time</th></tr></thead><tbody>` +
    rows
      .map(
        (q) =>
          `<tr><td>${fmt(q.n)}</td><td class="c">${sci(q.eR)}</td><td class="c">${fmtT(q.tR)}</td><td class="c">${sci(q.eL)}</td><td class="c">${fmtT(q.tL)}</td></tr>`,
      )
      .join("") +
    "</tbody>";
  logChart($("cC"), [
    { cls: "l1", pts: rows.map((q) => [q.n, q.eR]) },
    { cls: "l2", pts: rows.map((q) => [q.n, q.eL]) },
  ]);
  $("cNote").textContent = rows.some((q) => q.eR === 0 || q.eL === 0)
    ? "Errors equal to 0 (exact in double precision) are not drawn."
    : "";
}

async function staticEx1() {
  const out = [];
  for (const F of FUNCS) {
    await sleep();
    const R = riemann(F.f, F.a, F.b, 1000),
      L = lebesgue(F.f, F.a, F.b, 1000, P).est;
    out.push(
      `<tr><td>${F.name}</td><td>${F.dom}</td><td>${F.ex}</td><td class="c">${R.toFixed(10)}</td><td class="c">${sci(Math.abs(R - F.exact))}</td><td class="c">${L.toFixed(10)}</td><td class="c">${sci(Math.abs(L - F.exact))}</td></tr>`,
    );
  }
  $("tS").innerHTML =
    `<thead><tr><th><i class="nt">f(x)</i></th><th>Interval</th><th><i class="nt">I</i></th><th>R<sub>1000</sub></th><th>Error</th><th>L<sub>1000</sub></th><th>Error</th></tr></thead><tbody>` +
    out.join("") +
    "</tbody>";

  const step = FUNCS[2];
  setS("odd", sci(Math.abs(riemann(step.f, 0, 1, 1001) - step.exact)));
  await sleep();
  setS("tR", fmtT(timeIt(() => riemann(Math.sin, 0, Math.PI, 1e4))));
  await sleep();
  setS("tL", fmtT(timeIt(() => lebesgue(Math.sin, 0, Math.PI, 1e5, P))));

  const pr = [];
  for (const n of [10, 100, 1000, 1e4, 1e5, 1e6]) {
    await sleep();
    pr.push(
      `<tr><td>${fmt(n)}</td><td class="c">1</td><td class="c">0</td><td class="c">${sci(thomaeRational(n), 2)}</td><td class="c">0</td></tr>`,
    );
  }
  $("tP").innerHTML =
    `<thead><tr><th><i class="nt">N</i></th><th>D, rational</th><th>D, irrational</th><th>T, rational</th><th>T, irrational</th></tr></thead><tbody>` +
    pr.join("") +
    "</tbody>";
}

const REF = [
  [0.5, "0.382924922548026"],
  [1, "0.682689492137086"],
  [1.5, "0.866385597462284"],
  [2, "0.954499736103642"],
  [2.5, "0.987580669348448"],
  [3, "0.997300203936740"],
  [3.5, "0.999534741841929"],
  [4, "0.999936657516334"],
  [4.5, "0.999993204653751"],
  [5, "0.999999426696856"],
  [5.5, "0.999999962020875"],
  [6, "0.999999998026825"],
  [6.5, "0.999999999919680"],
  [7, "0.999999999997440"],
  [7.5, "0.999999999999936"],
  [8, "0.999999999999999"],
];
const TAIL = [
  [6, 506797346],
  [7, 390682215445],
  [8, 803734397655348],
];
const METHODS = [
  ["Simpson, n = 20", (x) => cdfSimpson(x, 20)],
  ["Simpson, n = 200", (x) => cdfSimpson(x, 200)],
  ["erf power series", cdfErfSeries],
  ["Abramowitz–Stegun 7.1.26", cdfAS],
  ["My method", normcdf],
];

async function renderEx2() {
  const pts = [[0, 0.5]];
  for (const [x, p] of REF) pts.push([x, (1 + +p) / 2], [-x, (1 - p) / 2]);
  const shown = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8];
  const err = (f, x, v) => sci(Math.abs(f(x) - v));
  $("tN").innerHTML =
    `<thead><tr><th><i class="nt">x</i></th><th>Wikipedia <i class="nt">p</i></th><th>My <i class="nt">Φ(x)</i></th><th>Error</th><th>erf series</th><th>A–S 7.1.26</th><th>Simpson, <i class="nt">n</i> = 200</th></tr></thead><tbody>` +
    shown
      .map((x) => {
        const v = pts.find((q) => q[0] === x)[1],
          p = x === 0 ? "0" : REF.find((q) => q[0] === x)[1];
        return `<tr><td>${x}</td><td class="c">${p}</td><td class="c">${normcdf(x).toFixed(16)}</td><td class="c">${err(normcdf, x, v)}</td><td class="c">${err(cdfErfSeries, x, v)}</td><td class="c">${err(cdfAS, x, v)}</td><td class="c">${err((y) => cdfSimpson(y, 200), x, v)}</td></tr>`;
      })
      .join("") +
    "</tbody>";
  setS("es8", sci(Math.abs(cdfErfSeries(8) - pts.find((q) => q[0] === 8)[1])));

  const rel = (f, x, v) => sci(Math.abs(f(x) - v) / v);
  $("tT").innerHTML =
    `<thead><tr><th><i class="nt">x</i></th><th>Wikipedia <i class="nt">N</i></th><th><i class="nt">1/(2N)</i></th><th>My <i class="nt">Φ(x)</i></th><th>Rel. error</th><th>erf series</th><th>A–S 7.1.26</th><th>Simpson, <i class="nt">n</i> = 200</th></tr></thead><tbody>` +
    TAIL.map(([k, N]) => {
      const v = 1 / (2 * N),
        x = -k;
      return `<tr><td>${x}</td><td class="c">${fmt(N)}</td><td class="c">${v.toExponential(String(N).length - 1)}</td><td class="c">${normcdf(x).toExponential(14)}</td><td class="c">${rel(normcdf, x, v)}</td><td class="c">${rel(cdfErfSeries, x, v)}</td><td class="c">${rel(cdfAS, x, v)}</td><td class="c">${rel((y) => cdfSimpson(y, 200), x, v)}</td></tr>`;
    }).join("") +
    "</tbody>";

  const xs = Float64Array.from({ length: 1e5 }, () => Math.random() * 16 - 8);
  const rows = [];
  for (const [name, f] of METHODS) {
    await sleep();
    let s = 0;
    for (let i = 0; i < 1e4; i++) s += f(xs[i]);
    const t0 = performance.now();
    for (const x of xs) s += f(x);
    const ns = ((performance.now() - t0) * 1e6) / xs.length;
    const me = Math.max(...pts.map(([x, v]) => Math.abs(f(x) - v)));
    rows.push([name, me, ns, s]);
  }
  $("tE").innerHTML =
    `<thead><tr><th>Method</th><th>Max error</th><th>Time per evaluation</th></tr></thead><tbody>` +
    rows
      .map(
        ([name, me, ns]) =>
          `<tr><td>${name}</td><td class="c">${sci(me)}</td><td class="c">${Math.round(ns)} ns</td></tr>`,
      )
      .join("") +
    "</tbody>";
  setS("tAS", `${Math.round(rows[3][2])} ns`);
  setS("tMy", `${Math.round(rows[4][2])} ns`);
}

$("sf").onchange = renderEx1;

const tabs = [...document.querySelectorAll('[role="tab"]')];
function show(id, push) {
  for (const t of tabs) {
    const on = t.getAttribute("aria-controls") === id;
    t.setAttribute("aria-selected", on);
    $(t.getAttribute("aria-controls")).hidden = !on;
  }
  if (push) history.replaceState(null, "", "#" + id);
}
tabs.forEach((t) =>
  t.addEventListener("click", () => show(t.getAttribute("aria-controls"), 1)),
);
show(location.hash === "#ex2" ? "ex2" : "ex1");
addEventListener("hashchange", () =>
  show(location.hash === "#ex2" ? "ex2" : "ex1"),
);
renderEx1().then(staticEx1).then(renderEx2);
