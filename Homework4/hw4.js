const $ = (id) => document.getElementById(id);
const fmt = (x, d = 0) =>
  x.toLocaleString("en", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
function setH(key, html) {
  document
    .querySelectorAll(`[data-s="${key}"]`)
    .forEach((el) => (el.innerHTML = html));
}
function setS(key, text) {
  document
    .querySelectorAll(`[data-s="${key}"]`)
    .forEach((el) => (el.textContent = text));
}

const NS = [5, 10, 20, 50, 100, 500, 1000],
  SHOW = [10, 100, 1000],
  NAMES = {
    binomial: "X ~ Bin(10, 0.3)",
    uniform: "X ~ Uniform{0, 1, …, 10}",
    geometric: "P(X = x) ∝ 0.6<sup>x</sup>, x = 0, …, 10",
  };
const St = { m: 2000, token: 0 };
const sleep = () => new Promise((r) => setTimeout(r, 0));

function stats(a) {
  const w = welford(a);
  return { mean: w.mean, sd: Math.sqrt(w.variance) };
}
const sdVar = (d, n) => Math.sqrt((d.m4 - (d.s2 ** 2 * (n - 3)) / (n - 1)) / n);

function ticks(lo, hi, count) {
  const raw = (hi - lo) / count,
    e = 10 ** Math.floor(Math.log10(raw)),
    f = raw / e,
    st = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * e,
    out = [];
  for (let v = Math.ceil(lo / st) * st; v <= hi + st * 1e-9; v += st)
    out.push(+v.toFixed(6));
  return out;
}

function svgBars(svg, edges, heights, lo, hi, o = {}) {
  const W = o.w || 320,
    H = o.h || 170,
    l = 8,
    r = 8,
    t = 10,
    b = 24;
  const ymax = Math.max(...heights) * 1.1 || 1;
  const X = (v) => l + ((v - lo) / (hi - lo)) * (W - l - r),
    Y = (v) => H - b - (v / ymax) * (H - b - t);
  let h = `<line class="g-line" x1="${l}" y1="${H - b}" x2="${W - r}" y2="${H - b}"/>`;
  heights.forEach((v, i) => {
    if (!v) return;
    const x0 = X(edges[i]),
      x1 = X(edges[i + 1]),
      w = Math.max(2, x1 - x0 - (x1 - x0 > 4 ? 1 : 0));
    h += `<rect class="c-bar" x="${((x0 + x1) / 2 - w / 2).toFixed(1)}" y="${Y(v).toFixed(1)}" width="${w.toFixed(1)}" height="${(H - b - Y(v)).toFixed(1)}"/>`;
  });
  if (o.mark != null)
    h += `<line class="c-ref" x1="${X(o.mark)}" y1="${t}" x2="${X(o.mark)}" y2="${H - b}"/>`;
  for (const v of o.ticks || ticks(lo, hi, 4))
    h += `<text class="c-tick" x="${X(v)}" y="${H - 7}">${v}</text>`;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.innerHTML = h;
}

function histogram(svg, a, lo, hi, mark, nb) {
  const w = (hi - lo) / nb,
    cnt = new Array(nb).fill(0);
  for (const v of a) {
    const i = Math.floor((v - lo) / w);
    if (i >= 0 && i < nb) cnt[i]++;
  }
  const edges = Array.from({ length: nb + 1 }, (_, i) => lo + i * w);
  svgBars(svg, edges, cnt, lo, hi, { mark });
}

async function render() {
  const my = ++St.token,
    key = $("sd").value,
    d = DISTS[key];
  St.m = +$("sm").value;
  const xs = d.pmf.map((_, x) => x);
  svgBars($("pmf"), xs.map((x) => x - 0.5).concat(10.5), d.pmf, -0.5, 10.5, {
    w: 460,
    h: 190,
    mark: d.mu,
    ticks: xs,
  });
  const r3 = (x) => +x.toFixed(3);
  setH("dName", NAMES[key]);
  setS("mu", String(r3(d.mu)));
  setS("s2", String(r3(d.s2)));
  setS("m", fmt(St.m));

  const res = [];
  for (const n of NS) {
    $("info").textContent = `Simulating n = ${fmt(n)}…`;
    await sleep();
    if (my !== St.token) return;
    const r = hackers(d, St.m, n);
    res.push({ n, m: stats(r.means), v: stats(r.vars), r });
  }
  $("info").textContent = `${fmt(St.m)} hackers × ${NS.length} values of n`;

  const c = (x, th, dg) =>
    `${x.toFixed(dg)} <span class="dim">(${th.toFixed(dg)})</span>`;
  $("tR").innerHTML =
    `<thead><tr><th><i class="nt">n</i></th><th>Average of <i class="nt">x̄</i></th><th>SD of <i class="nt">x̄</i></th><th>Average of <i class="nt">s²</i></th><th>SD of <i class="nt">s²</i></th></tr></thead><tbody>` +
    res
      .map(
        ({ n, m, v }) =>
          `<tr><td>${fmt(n)}</td><td class="c">${c(m.mean, d.mu, 3)}</td><td class="c">${c(m.sd, Math.sqrt(d.s2 / n), 3)}</td><td class="c">${c(v.mean, d.s2, 3)}</td><td class="c">${c(v.sd, sdVar(d, n), 3)}</td></tr>`,
      )
      .join("") +
    "</tbody>";

  const sm = 4 * Math.sqrt(d.s2 / SHOW[0]),
    mlo = Math.max(-0.05, Math.floor((d.mu - sm) * 10) / 10 - 0.05),
    mhi = Math.min(10.05, Math.ceil((d.mu + sm) * 10) / 10 + 0.05),
    mw = 0.1 * Math.max(1, Math.ceil((mhi - mlo) / 30 / 0.1));
  const vhi = d.s2 + 4 * sdVar(d, SHOW[0]),
    vw = Math.max(1, Math.ceil((vhi * 90) / 25)) / 90;
  const box = $("hist");
  box.innerHTML = "";
  for (const [k, title, lo, w, nb, mark] of [
    ["means", "Sampling means x̄", mlo, mw, Math.round((mhi - mlo) / mw), d.mu],
    ["vars", "Sampling variances s²", -0.005, vw, Math.ceil(vhi / vw), d.s2],
  ]) {
    const lab = document.createElement("p");
    lab.className = "rowlab";
    lab.textContent = title;
    box.appendChild(lab);
    for (const n of SHOW) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.innerHTML = `<small>n = ${fmt(n)}</small>`;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      cell.appendChild(svg);
      box.appendChild(cell);
      histogram(
        svg,
        res.find((q) => q.n === n).r[k],
        lo,
        lo + nb * w,
        mark,
        nb,
      );
    }
  }

  setS("biased5", ((d.s2 * 4) / 5).toFixed(2));
  setS("sd5", res[0].v.sd.toFixed(2));
  setS("sd1000", res.at(-1).v.sd.toFixed(3));
}
$("sd").onchange = render;
$("sm").onchange = render;

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
render();
