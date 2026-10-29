const $ = (id) => document.getElementById(id);
const sleep = () => new Promise((r) => setTimeout(r, 0));
const fmt = (x, d = 0) =>
  x.toLocaleString("en", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
const pct = (x, d = 1) => (100 * x).toFixed(d) + "%";
const sgn = (x, d) => (x < 0 ? "−" : "") + Math.abs(x).toFixed(d);
function setS(key, text) {
  document
    .querySelectorAll(`[data-s="${key}"]`)
    .forEach((el) => (el.textContent = text));
}

const N = 2000,
  KEEP = 30,
  SHOW = [10, 100, 1000],
  TAB = [10, 100, 1000, 2000],
  CPS = [
    1, 2, 3, 5, 7, 10, 15, 20, 30, 50, 70, 100, 150, 200, 300, 500, 700, 1000,
    1500, 2000,
  ];
const St = { p: 0.3, m: 5000, B: null, R: null, token: 0 };

const col = (r, n) => r.at[r.checkpoints.indexOf(n)];
function moments(a, scale = 1) {
  let s = 0,
    s2 = 0;
  for (const v of a) {
    s += v;
    s2 += v * v;
  }
  const k = a.length,
    mean = s / k;
  return {
    mean: mean * scale,
    var: ((s2 - k * mean * mean) / (k - 1)) * scale * scale,
  };
}
const sorted = (a) => Float64Array.from(a).sort();
const quant = (s, q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];

const phi = (x) => Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);

function nice(range, count) {
  const raw = range / count,
    e = Math.pow(10, Math.floor(Math.log10(raw))),
    f = raw / e;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * e;
}
function ticks(lo, hi, count = 5) {
  const st = nice(hi - lo, count),
    out = [];
  for (let v = Math.ceil(lo / st) * st; v <= hi + st * 1e-9; v += st)
    out.push(Math.abs(v) < st * 1e-9 ? 0 : v);
  return out;
}
const tickLabel = (v) => {
  const a = Math.abs(v);
  const s =
    a >= 1000
      ? fmt(v)
      : a >= 10 || a === 0
        ? String(Math.round(v))
        : String(+v.toPrecision(2));
  return s.replace("-", "−");
};
const powLabel = (e) =>
  e === 0
    ? "1"
    : e === 1
      ? "10"
      : `10<tspan dy="-5" font-size="8">${e}</tspan>`;

function chart(id, o) {
  const W = o.w || 460,
    H = o.h || 240,
    l = o.l ?? 46,
    r = 12,
    t = 12,
    b = 33;
  const tx = (v) => (o.xLog ? Math.log10(v) : v),
    ty = (v) => (o.yLog ? Math.log10(v) : v);
  const [x0, x1] = o.x.map(tx),
    [y0, y1] = o.y.map(ty);
  const X = (v) => l + ((tx(v) - x0) / (x1 - x0)) * (W - l - r),
    Y = (v) => H - b - ((ty(v) - y0) / (y1 - y0)) * (H - b - t);
  let h = `<defs><clipPath id="k-${id}"><rect x="${l}" y="${t}" width="${W - l - r}" height="${H - b - t}"/></clipPath></defs>`;
  const yt = o.yLog
    ? Array.from(
        { length: Math.floor(y1) - Math.ceil(y0) + 1 },
        (_, i) => Math.ceil(y0) + i,
      )
    : ticks(o.y[0], o.y[1], o.yN || 5);
  for (const v of yt) {
    const yy = o.yLog ? Y(10 ** v) : Y(v);
    h += `<line class="g-line" x1="${l}" y1="${yy}" x2="${W - r}" y2="${yy}"/><text class="c-axt" x="${l - 6}" y="${yy + 3.5}" text-anchor="end">${o.yLog ? powLabel(v) : tickLabel(v)}</text>`;
  }
  const xt = o.xLog
    ? o.xTicks || [1, 10, 100, 1000]
    : o.xTicks || ticks(o.x[0], o.x[1], 5);
  for (const v of xt)
    h += `<text class="c-tick" x="${X(v)}" y="${H - 15}">${tickLabel(v)}</text>`;
  if (o.xLabel)
    h += `<text class="c-axt" x="${W - r}" y="${H - 3}" text-anchor="end">${o.xLabel}</text>`;
  h += `<g clip-path="url(#k-${id})">`;
  for (const s of o.series) {
    const pts = s.pts.filter(
      ([a, c]) => (!o.xLog || a > 0) && (!o.yLog || c > 0),
    );
    if (s.line !== false && pts.length > 1)
      h += `<polyline class="${s.cls}" points="${pts.map(([a, c]) => `${X(a).toFixed(1)},${Y(c).toFixed(1)}`).join(" ")}"/>`;
    if (s.dots)
      for (const [a, c] of pts)
        h += `<circle class="${s.dots}" cx="${X(a).toFixed(1)}" cy="${Y(c).toFixed(1)}" r="3"/>`;
  }
  h += "</g>";
  const el = $(id);
  el.setAttribute("viewBox", `0 0 ${W} ${H}`);
  el.innerHTML = h;
}

const KS = [
  ...new Set(
    Array.from({ length: 181 }, (_, i) =>
      Math.round(10 ** ((i * Math.log10(N)) / 180)),
    ),
  ),
];
const MODES = {
  S: { f: (s, k) => s, c: (k) => k, w: (k) => Math.sqrt(k) },
  A: { f: (s, k) => s / k, c: () => 1, w: (k) => 1 / Math.sqrt(k) },
  N: { f: (s, k) => s / Math.sqrt(k), c: (k) => Math.sqrt(k), w: () => 1 },
};
function traj(id, r, mode) {
  const M = MODES[mode],
    sd = Math.sqrt(r.s2);
  const paths = r.paths.map((P) => KS.map((k) => [k, M.f(P[k], k)]));
  const mean = KS.map((k) => [k, r.mu * M.c(k)]);
  const up = KS.map((k) => [k, r.mu * M.c(k) + 2 * sd * M.w(k)]),
    dn = KS.map((k) => [k, r.mu * M.c(k) - 2 * sd * M.w(k)]);
  let lo, hi;
  if (mode === "A") [lo, hi] = r.kind === "bernoulli" ? [0, 1] : [-1, 1];
  else {
    const all = paths.flat().map((q) => q[1]);
    lo = Math.min(...all, dn.at(-1)[1]);
    hi = Math.max(...all, up.at(-1)[1]);
    const pad = (hi - lo) * 0.05;
    lo -= pad;
    hi += pad;
  }
  chart(id, {
    x: [1, N],
    xLog: true,
    y: [lo, hi],
    xLabel: "k (log scale)",
    series: [
      ...paths.map((pts) => ({ cls: "pth", pts })),
      { cls: "bnd", pts: up },
      { cls: "bnd", pts: dn },
      { cls: "mn", pts: mean },
    ],
  });
}

function hist(svg, values, r, n, mode, lo, hi, o = {}) {
  const sc = mode === "S" ? 1 : mode === "A" ? 1 / n : 1 / Math.sqrt(n);
  const step = r.lattice * sc,
    off = (r.kind === "rademacher" ? n % 2 : 0) * sc;
  const srt = sorted(values),
    span = (quant(srt, 0.9995) - quant(srt, 0.0005)) * sc;
  const w = step * Math.max(1, Math.ceil(span / 30 / step));
  const e0 = off + step * Math.floor((lo - off) / step) - step / 2;
  const nb = Math.ceil((hi - e0) / w),
    cnt = new Array(nb).fill(0);
  for (const v of values) {
    const i = Math.floor((v * sc - e0) / w);
    if (i >= 0 && i < nb) cnt[i]++;
  }
  const dens = cnt.map((c) => c / (values.length * w));
  let ymax = Math.max(...dens);
  if (o.curve) ymax = Math.max(ymax, o.curve(0));
  const W = 320,
    H = 170,
    l = 8,
    rr = 8,
    t = 10,
    b = 24;
  const X = (v) => l + ((v - lo) / (hi - lo)) * (W - l - rr),
    Y = (v) => H - b - (v / (ymax * 1.1)) * (H - b - t);
  let h = `<line class="g-line" x1="${l}" y1="${H - b}" x2="${W - rr}" y2="${H - b}"/>`;
  dens.forEach((d, i) => {
    if (!d) return;
    const a = Math.max(lo, e0 + i * w),
      z = Math.min(hi, e0 + (i + 1) * w),
      x = X(a),
      ww = Math.max(2.5, X(z) - x - (X(z) - x > 4 ? 1 : 0)),
      xx = ww > X(z) - x ? (X(a) + X(z)) / 2 - ww / 2 : x;
    h += `<rect class="c-bar" x="${xx.toFixed(1)}" y="${Y(d).toFixed(1)}" width="${ww.toFixed(1)}" height="${(H - b - Y(d)).toFixed(1)}"/>`;
  });
  if (o.curve) {
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const x = lo + ((hi - lo) * i) / 120;
      pts.push(`${X(x).toFixed(1)},${Y(o.curve(x)).toFixed(1)}`);
    }
    h += `<polyline class="crv" points="${pts.join(" ")}"/>`;
  }
  if (o.mark != null && o.mark >= lo && o.mark <= hi)
    h += `<line class="c-ref" x1="${X(o.mark)}" y1="${t}" x2="${X(o.mark)}" y2="${H - b}"/>`;
  for (const v of ticks(lo, hi, 4))
    h += `<text class="c-tick" x="${X(v)}" y="${H - 7}">${tickLabel(v)}</text>`;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = h;
}

function histGrid(id, mode, rows) {
  const box = $(id);
  box.innerHTML = "";
  for (const row of rows) {
    const { r, title, range, curve } = row;
    const sc = (n) =>
      mode === "S" ? 1 : mode === "A" ? 1 / n : 1 / Math.sqrt(n);
    let [lo, hi] = range || [Infinity, -Infinity];
    if (!range) {
      for (const n of SHOW) {
        const s = sorted(col(r, n));
        lo = Math.min(lo, quant(s, 0.0005) * sc(n));
        hi = Math.max(hi, quant(s, 0.9995) * sc(n));
      }
      const pad = (hi - lo) * 0.06 + 0.5 * sc(SHOW[0]) * r.lattice;
      lo -= pad;
      hi += pad;
    }
    const lab = document.createElement("p");
    lab.className = "rowlab";
    lab.innerHTML = title;
    box.appendChild(lab);
    for (const n of SHOW) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.innerHTML = `<small>n = ${fmt(n)}</small>`;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      cell.appendChild(svg);
      box.appendChild(cell);
      const mark =
        mode === "S" ? n * r.mu : mode === "A" ? r.mu : Math.sqrt(n) * r.mu;
      hist(svg, col(r, n), r, n, mode, lo, hi, {
        mark: curve ? null : mark,
        curve,
      });
    }
  }
}

function table(id, head, rows) {
  $(id).innerHTML =
    `<thead><tr>${head.map((x) => `<th>${x}</th>`).join("")}</tr></thead><tbody>` +
    rows
      .map(
        (rw) =>
          `<tr>${rw.map((x, i) => `<td${i ? ' class="c"' : ""}>${x}</td>`).join("")}</tr>`,
      )
      .join("") +
    "</tbody>";
}
const nt = (s) => `<i class="nt">${s}</i>`;
const num = (x, d) => (x < 0 ? "−" : "") + fmt(Math.abs(x), d);
const sciH = (x) => {
  const e = Math.floor(Math.log10(x));
  return `${(x / 10 ** e).toFixed(2)} × 10<sup>${String(e).replace("-", "−")}</sup>`;
};

function renderTraj() {
  const { B, R } = St;
  traj("tSB", B, "S");
  traj("tSR", R, "S");
  traj("tAB", B, "A");
  traj("tAR", R, "A");
  traj("tNB", B, "N");
  traj("tNR", R, "N");
  const inside = (r) => {
    const a = col(r, N),
      c = N * r.mu,
      w = 2 * Math.sqrt(N * r.s2);
    let k = 0;
    for (const v of a) if (Math.abs(v - c) <= w) k++;
    return k / a.length;
  };
  setS("in2B", pct(inside(B)));
  setS("in2R", pct(inside(R)));
  const rng = (r) => {
    const s = sorted(col(r, N));
    return `${sgn(s[0] / N, 3)} and ${sgn(s.at(-1) / N, 3)}`;
  };
  setS("avgB", rng(B));
  setS("avgR", rng(R));
  setS("nB", moments(col(B, N), 1 / Math.sqrt(N)).mean.toFixed(2));
  setS("nBth", (Math.sqrt(N) * St.p).toFixed(2));
}

function renderDist() {
  const { B, R, p } = St,
    q = p * (1 - p);
  const bt = `Bernoulli, p = ${p}`;
  histGrid("hS", "S", [
    { r: B, title: bt },
    { r: R, title: "Rademacher" },
  ]);
  setS("relB10", Math.sqrt((1 - p) / (10 * p)).toFixed(2));
  setS("relB1000", Math.sqrt((1 - p) / (1000 * p)).toFixed(3));
  table(
    "tS",
    [
      nt("n"),
      `Bernoulli mean (${nt("np")})`,
      `Bernoulli variance (${nt("np(1 − p)")})`,
      `Rademacher mean (0)`,
      `Rademacher variance (${nt("n")})`,
    ],
    TAB.map((n) => {
      const a = moments(col(B, n)),
        c = moments(col(R, n));
      return [
        fmt(n),
        `${num(a.mean, 2)} <span class="dim">(${num(n * p, 1)})</span>`,
        `${num(a.var, 2)} <span class="dim">(${num(n * q, 1)})</span>`,
        `${num(c.mean, 2)} <span class="dim">(0)</span>`,
        `${num(c.var, 1)} <span class="dim">(${fmt(n)})</span>`,
      ];
    }),
  );

  histGrid("hA", "A", [
    { r: B, title: bt, range: [-0.02, 1.02] },
    { r: R, title: "Rademacher", range: [-1.04, 1.04] },
  ]);
  const far = (r, n, e) => {
    const a = col(r, n);
    let k = 0;
    for (const v of a) if (Math.abs(v / n - r.mu) > e + 1e-12) k++;
    return k / a.length;
  };
  chart("cL", {
    x: [1, N],
    xLog: true,
    y: [0, 1],
    xLabel: "n (log scale)",
    series: [
      {
        cls: "ln l1",
        pts: CPS.map((n) => [n, far(B, n, 0.05)]),
        dots: "dt l1",
      },
      {
        cls: "ln l2",
        pts: CPS.map((n) => [n, far(R, n, 0.05)]),
        dots: "dt l2",
      },
    ],
  });
  const f3 = (x) => (x === 0 ? "0" : x.toFixed(4));
  table(
    "tL",
    [
      nt("n"),
      `Bernoulli ${nt("ε = 0.1")}`,
      `Bernoulli ${nt("ε = 0.05")}`,
      `Rademacher ${nt("ε = 0.1")}`,
      `Rademacher ${nt("ε = 0.05")}`,
    ],
    TAB.map((n) => [
      fmt(n),
      f3(far(B, n, 0.1)),
      f3(far(B, n, 0.05)),
      f3(far(R, n, 0.1)),
      f3(far(R, n, 0.05)),
    ]),
  );
  setS("lR100", f3(far(R, 100, 0.05)));
  setS("lR2000", f3(far(R, 2000, 0.05)));
  setS("lB100", f3(far(B, 100, 0.05)));
  setS("lB2000", f3(far(B, 2000, 0.05)));
  setS("pq", q.toFixed(2));

  histGrid("hN", "N", [
    { r: B, title: bt },
    { r: R, title: "Rademacher", range: [-4.4, 4.4] },
  ]);
  setS("nB10", (Math.sqrt(10) * p).toFixed(2));
  setS("nB1000", (Math.sqrt(1000) * p).toFixed(2));

  const vSer = (r) => {
    const v = CPS.map((n) => moments(col(r, n)).var);
    return [
      CPS.map((n, i) => [n, v[i]]),
      CPS.map((n, i) => [n, v[i] / (n * n)]),
      CPS.map((n, i) => [n, v[i] / n]),
    ];
  };
  for (const [id, r] of [
    ["vB", B],
    ["vR", R],
  ]) {
    const [s1, s2, s3] = vSer(r),
      all = [...s1, ...s2, ...s3].map((q) => q[1]);
    const lo = Math.floor(Math.log10(Math.min(...all, r.s2 / N))),
      hi = Math.ceil(Math.log10(Math.max(...all, N * r.s2)));
    chart(id, {
      x: [1, N],
      xLog: true,
      yLog: true,
      y: [10 ** lo, 10 ** hi],
      h: 220,
      xLabel: "n (log scale)",
      series: [
        { cls: "ln l1 thin", pts: CPS.map((n) => [n, n * r.s2]) },
        { cls: "ln l2 thin", pts: CPS.map((n) => [n, r.s2 / n]) },
        { cls: "ln l3 thin", pts: CPS.map((n) => [n, r.s2]) },
        { line: false, pts: s1, dots: "dt l1" },
        { line: false, pts: s2, dots: "dt l2" },
        { line: false, pts: s3, dots: "dt l3" },
      ],
    });
  }
  table(
    "tV",
    [
      nt("n"),
      `Var ${nt("S<sub>n</sub>")} B`,
      `Var ${nt("S<sub>n</sub>/n")} B`,
      `Var ${nt("S<sub>n</sub>/√n")} B`,
      `Var ${nt("S<sub>n</sub>")} R`,
      `Var ${nt("S<sub>n</sub>/n")} R`,
      `Var ${nt("S<sub>n</sub>/√n")} R`,
    ],
    [
      ...TAB.map((n) => {
        const a = moments(col(B, n)).var,
          c = moments(col(R, n)).var;
        return [
          fmt(n),
          a.toFixed(1),
          sciH(a / (n * n)),
          (a / n).toFixed(3),
          c.toFixed(0),
          sciH(c / (n * n)),
          (c / n).toFixed(3),
        ];
      }),
      [
        "theory",
        `${q.toFixed(2)} ${nt("n")}`,
        `${q.toFixed(2)}/${nt("n")}`,
        q.toFixed(3),
        nt("n"),
        `1/${nt("n")}`,
        "1.000",
      ],
    ],
  );

  histGrid("hC", "N", [
    {
      r: R,
      title: "Rademacher · S<sub>n</sub>/√n with the N(0, 1) density",
      range: [-4, 4],
      curve: phi,
    },
  ]);
}

function renderInterp() {
  const { B, R, m } = St;
  table(
    "tQ",
    [
      nt("n"),
      `Bernoulli ${nt("S<sub>n</sub>/n")}`,
      `Rademacher ${nt("S<sub>n</sub>")}`,
      `Rademacher ${nt("S<sub>n</sub>/n")}`,
    ],
    TAB.map((n) => {
      const b = sorted(col(B, n)),
        c = sorted(col(R, n));
      const iv = (s, k, d) =>
        `${num(quant(s, 0.025) * k, d)} to ${num(quant(s, 0.975) * k, d)}`;
      return [fmt(n), iv(b, 1 / n, 3), iv(c, 1, 0), iv(c, 1 / n, 3)];
    }),
  );

  const tot = (r) => col(r, N).reduce((s, v) => s + v, 0);
  setS("TB", (tot(B) / (m * N)).toFixed(4));
  setS("TR", sgn(tot(R) / Math.sqrt(m * N), 2));
}

async function run() {
  const my = ++St.token;
  St.m = +$("sm").value;
  setS("m", fmt(St.m));
  setS("p", String(St.p));
  setS("seP", `${(50 / Math.sqrt(St.m)).toFixed(2)} percentage points`);
  const res = {};
  for (const kind of ["bernoulli", "rademacher"]) {
    const g = Walk.simulate(kind, St.p, N, St.m, CPS, KEEP);
    let r;
    while (!(r = g.next()).done) {
      $("info").textContent =
        `Simulating ${kind === "bernoulli" ? "Bernoulli" : "Rademacher"} attackers… ${Math.round(100 * r.value)}%`;
      await sleep();
      if (my !== St.token) return;
    }
    res[kind] = r.value;
  }
  St.B = res.bernoulli;
  St.R = res.rademacher;
  $("info").innerHTML =
    `<b>${fmt(St.m)}</b> attackers × <b>${fmt(N)}</b> systems × 2 models = <b>${fmt(2 * St.m * N)}</b> simulated attempts`;
  renderTraj();
  renderDist();
  renderInterp();
}
$("sm").onchange = run;

function onScroll() {
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

let moved = false;
["wheel", "touchstart", "keydown", "pointerdown"].forEach((e) =>
  addEventListener(e, () => (moved = true), { passive: true }),
);
(async () => {
  onScroll();
  await run();
  if (location.hash && !moved) $(location.hash.slice(1))?.scrollIntoView();
})();
