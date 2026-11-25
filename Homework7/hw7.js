const $ = (id) => document.getElementById(id);
const fmt = (x) => x.toLocaleString("en");
const NS = "http://www.w3.org/2000/svg";
const expDraw = () => -Math.log(1 - Math.random());
const normPdf = (z) => Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI);

function runningMeans() {
  const W = 460,
    H = 250,
    l = 34,
    r = 10,
    t = 10,
    b = 26,
    N = 5000,
    y0 = 0,
    y1 = 2.5;
  const X = (n) => l + (Math.log10(n) / Math.log10(N)) * (W - l - r),
    Y = (v) => H - b - ((v - y0) / (y1 - y0)) * (H - b - t);
  let h = `<defs><clipPath id="cpR"><rect x="${l}" y="${t}" width="${W - l - r}" height="${H - b - t}"/></clipPath></defs>`;
  for (const v of [0, 0.5, 1, 1.5, 2, 2.5])
    h += `<line class="g-line" x1="${l}" y1="${Y(v)}" x2="${W - r}" y2="${Y(v)}"/><text class="c-axt" x="${l - 6}" y="${Y(v) + 3.5}" text-anchor="end">${v}</text>`;
  for (const n of [1, 10, 100, 1000])
    h += `<text class="c-tick" x="${X(n)}" y="${H - 8}">${fmt(n)}</text>`;
  h += `<g clip-path="url(#cpR)">`;
  for (let p = 0; p < 20; p++) {
    let s = 0;
    const pts = [];
    for (let n = 1; n <= N; n++) {
      s += expDraw();
      if (n < 50 || n % 10 === 0)
        pts.push(`${X(n).toFixed(1)},${Y(s / n).toFixed(1)}`);
    }
    h += `<polyline class="pth" points="${pts.join(" ")}"/>`;
  }
  for (const sg of [1, -1]) {
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const n = N ** (i / 80);
      pts.push(
        `${X(n).toFixed(1)},${Y(1 + (sg * 2) / Math.sqrt(n)).toFixed(1)}`,
      );
    }
    h += `<polyline class="band" points="${pts.join(" ")}"/>`;
  }
  h += `<line class="c-ref" x1="${l}" y1="${Y(1)}" x2="${W - r}" y2="${Y(1)}"/></g>`;
  $("fRun").setAttribute("viewBox", `0 0 ${W} ${H}`);
  $("fRun").innerHTML = h;
}

function cltPanels() {
  const box = $("fClt"),
    M = 20000,
    lo = -3.5,
    hi = 4.5,
    nb = 40,
    w = (hi - lo) / nb;
  box.innerHTML = "";
  for (const n of [1, 10, 100]) {
    const cnt = new Array(nb).fill(0);
    for (let j = 0; j < M; j++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += expDraw();
      const z = Math.sqrt(n) * (s / n - 1),
        k = Math.floor((z - lo) / w);
      if (k >= 0 && k < nb) cnt[k]++;
    }
    const W = 460,
      H = 150,
      l = 8,
      r = 8,
      t = 10,
      b = 24;
    const dens = cnt.map((c) => c / (M * w)),
      ymax = Math.max(...dens, normPdf(0)) * 1.08;
    const X = (v) => l + ((v - lo) / (hi - lo)) * (W - l - r),
      Y = (v) => H - b - (v / ymax) * (H - b - t);
    let h = `<line class="g-line" x1="${l}" y1="${Y(0)}" x2="${W - r}" y2="${Y(0)}"/>`;
    dens.forEach((d, i) => {
      if (d) {
        const x0 = X(lo + i * w);
        h += `<rect class="c-bar" x="${(x0 + 0.5).toFixed(1)}" y="${Y(d).toFixed(1)}" width="${(X(lo + (i + 1) * w) - x0 - 1).toFixed(1)}" height="${(Y(0) - Y(d)).toFixed(1)}"/>`;
      }
    });
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const z = lo + ((hi - lo) * i) / 160;
      pts.push(`${X(z).toFixed(1)},${Y(normPdf(z)).toFixed(1)}`);
    }
    h += `<polyline class="crv" points="${pts.join(" ")}"/>`;
    for (const v of [-2, 0, 2, 4])
      h += `<text class="c-tick" x="${X(v)}" y="${H - 7}">${String(v).replace("-", "−")}</text>`;
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.innerHTML = `<small>n = ${n}</small>`;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = h;
    cell.appendChild(svg);
    box.appendChild(cell);
  }
}

const SENS = 0.99,
  FPR = 0.05;
const bayesTest = (p) => (SENS * p) / (SENS * p + FPR * (1 - p));
function diagnostic() {
  $("tDx").tBodies[0].innerHTML = [0.001, 0.01, 0.1, 0.2]
    .map((p) => {
      const q1 = bayesTest(p),
        q2 = bayesTest(q1);
      return `<tr><td>${+(p * 100).toFixed(1)}%</td><td class="c">${(q1 * 100).toFixed(1)}%</td><td class="c">${(q2 * 100).toFixed(1)}%</td></tr>`;
    })
    .join("");
}

const PRIORS = [
  ["Flat, Beta(1, 1)", 1, 1],
  ["Centered, Beta(10, 10)", 10, 10],
  ["Wrong, Beta(2, 18)", 2, 18],
];
const G = 4000,
  TH = Array.from({ length: G - 1 }, (_, i) => (i + 1) / G);

function betaGrid(a, b) {
  const lg = TH.map((x) => (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x)),
    mx = Math.max(...lg),
    d = lg.map((v) => Math.exp(v - mx)),
    z = d.reduce((s, v) => s + v, 0) / G;
  return d.map((v) => v / z);
}

function summary(a, b) {
  const d = betaGrid(a, b),
    q = (p) => {
      let c = d[0] / (2 * G);
      for (let i = 1; i < d.length; i++) {
        const s = (d[i - 1] + d[i]) / (2 * G);
        if (c + s >= p) return TH[i - 1] + (p - c) / (s * G);
        c += s;
      }
      return 1;
    };
  return { mean: a / (a + b), lo: q(0.025), hi: q(0.975) };
}

function bayesPlot() {
  const [, a, b] = PRIORS[+$("sp").value],
    n = +$("sn").value,
    k = Math.round(0.7 * n);
  const curves = [
    ["l3", betaGrid(a, b)],
    ["l1", betaGrid(k + 1, n - k + 1)],
    ["l2", betaGrid(a + k, b + n - k)],
  ];
  const W = 460,
    H = 240,
    l = 8,
    r = 8,
    t = 10,
    b2 = 24,
    ymax = Math.max(...curves.flatMap((c) => c[1])) * 1.06;
  const X = (v) => l + v * (W - l - r),
    Y = (v) => H - b2 - (v / ymax) * (H - b2 - t);
  let h = `<line class="g-line" x1="${l}" y1="${Y(0)}" x2="${W - r}" y2="${Y(0)}"/>`;
  for (const v of [0, 0.2, 0.4, 0.6, 0.8, 1])
    h += `<text class="c-tick" x="${X(v)}" y="${H - 7}">${v}</text>`;
  for (const [cls, d] of curves) {
    const pts = [];
    for (let i = 0; i < d.length; i += 4)
      pts.push(`${X(TH[i]).toFixed(1)},${Y(d[i]).toFixed(1)}`);
    h += `<polyline class="ln ${cls}" points="${pts.join(" ")}"/>`;
  }
  $("fB").setAttribute("viewBox", `0 0 ${W} ${H}`);
  $("fB").innerHTML = h;
  const s = summary(a + k, b + n - k);
  $("bNote").textContent =
    `k = ${fmt(k)} of n = ${fmt(n)}. Posterior Beta(${a + k}, ${b + n - k}): mean ${s.mean.toFixed(3)}, 95% credible interval [${s.lo.toFixed(3)}, ${s.hi.toFixed(3)}].` +
    (a === 1 && b === 1
      ? " With a flat prior the posterior coincides with the normalized likelihood."
      : "");
}

function bayesTable() {
  const ns = [10, 100, 1000];
  $("tB").innerHTML =
    `<thead><tr><th>Prior</th>${ns.map((n) => `<th><i class="nt">n</i> = ${fmt(n)}<br /><i class="nt">k</i> = ${fmt(Math.round(0.7 * n))}</th>`).join("")}</tr></thead><tbody>` +
    PRIORS.map(
      ([name, a, b]) =>
        `<tr><td>${name}</td>${ns
          .map((n) => {
            const s = summary(
              a + Math.round(0.7 * n),
              b + n - Math.round(0.7 * n),
            );
            return `<td class="c">${s.mean.toFixed(3)}<br /><span class="dim">[${s.lo.toFixed(3)}, ${s.hi.toFixed(3)}]</span></td>`;
          })
          .join("")}</tr>`,
    ).join("") +
    "</tbody>";
}

$("sp").onchange = bayesPlot;
$("sn").onchange = bayesPlot;

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
diagnostic();
bayesPlot();
bayesTable();
runningMeans();
cltPanels();
