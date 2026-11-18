const $ = (id) => document.getElementById(id);
const fmt = (x) => x.toLocaleString("en");
const pct = (x) => `${(100 * x).toFixed(1)}%`;
const fp = (p) => (p < 1e-3 ? p.toExponential(1) : p.toFixed(3));
const LABEL = {
  all: "All departments",
  A: "Department A",
  B: "Department B",
  C: "Department C",
  D: "Department D",
  E: "Department E",
  F: "Department F",
};

const pairsOf = (sel) =>
  RECORDS.filter((r) => sel === "all" || r.dept === sel).map((r) => [
    r.gender,
    r.admit,
  ]);

function table(id, head, rows) {
  $(id).innerHTML =
    `<thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>` +
    rows
      .map(
        (r) =>
          `<tr><td>${r[0]}</td>${r
            .slice(1)
            .map((c) => `<td class="c">${c}</td>`)
            .join("")}</tr>`,
      )
      .join("") +
    "</tbody>";
}

function render() {
  const sel = $("sd").value,
    T = contingency(pairsOf(sel)),
    p = pValue(T.chi2, T.df),
    crit = critical(T.df, 0.05);
  $("info").textContent = `n = ${fmt(T.tot)} applicants`;

  table(
    "tO",
    ['<i class="nt">X \\ F</i>', ...T.fs, "Total"],
    [
      ...T.xs.map((x, i) => [x, ...T.n[i].map(fmt), fmt(T.row[i])]),
      ["Total", ...T.col.map(fmt), fmt(T.tot)],
    ],
  );
  const r4 = (v) => (v / T.tot).toFixed(4);
  table(
    "tJ",
    ['<i class="nt">X \\ F</i>', ...T.fs, '<i class="nt">f<sub>i·</sub></i>'],
    [
      ...T.xs.map((x, i) => [x, ...T.n[i].map(r4), r4(T.row[i])]),
      ["f<sub>·j</sub>", ...T.col.map(r4), "1"],
    ],
  );
  table(
    "tFX",
    ['<i class="nt">X</i>', ...T.fs, "Total"],
    [
      ...T.xs.map((x, i) => [
        x,
        ...T.n[i].map((v) => pct(v / T.row[i])),
        "100%",
      ]),
      ["All (marginal)", ...T.col.map((v) => pct(v / T.tot)), "100%"],
    ],
  );
  table(
    "tXF",
    ['<i class="nt">X</i>', ...T.fs, "All (marginal)"],
    [
      ...T.xs.map((x, i) => [
        x,
        ...T.n[i].map((v, j) => pct(v / T.col[j])),
        pct(T.row[i] / T.tot),
      ]),
      ["Total", ...T.fs.map(() => "100%"), "100%"],
    ],
  );

  const cells = [];
  T.xs.forEach((x, i) =>
    T.fs.forEach((f, j) => {
      const o = T.n[i][j],
        e = T.exp[i][j];
      cells.push([
        `${x}, ${f}`,
        fmt(o),
        e.toFixed(2),
        ((o - e) ** 2 / e).toFixed(3),
      ]);
    }),
  );
  cells.push(["Total", fmt(T.tot), T.tot.toFixed(2), T.chi2.toFixed(3)]);
  table(
    "tE",
    [
      "Cell",
      '<i class="nt">n<sub>ij</sub></i>',
      '<i class="nt">E<sub>ij</sub></i>',
      '<i class="nt">(n − E)²/E</i>',
    ],
    cells,
  );

  const minE = Math.min(...T.exp.flat());
  $("res").innerHTML =
    `χ² = ${T.chi2.toFixed(2)},&nbsp;&nbsp; df = ${T.df},&nbsp;&nbsp; p = ${fp(p)}<br>` +
    `critical value at 5%: ${crit.toFixed(3)},&nbsp;&nbsp; smallest E<sub>ij</sub> = ${minE.toFixed(1)}`;

  const rates = T.xs
    .map((x, i) => `${pct(T.n[i][0] / T.row[i])} of ${x.toLowerCase()}`)
    .join(" and ");
  $("verdict").innerHTML =
    `<strong>${LABEL[sel]}.</strong> ` +
    `${rates} applicants were ${T.fs[0].toLowerCase()}, against ${pct(T.col[0] / T.tot)} overall. ` +
    `χ² = ${T.chi2.toFixed(2)} with ${T.df} degree${T.df > 1 ? "s" : ""} of freedom gives p = ${fp(p)}` +
    (p < 0.05
      ? `, below 0.05 (χ² is above the critical value ${crit.toFixed(3)}): independence is rejected, and in these data gender and admission are statistically dependent.`
      : `, above 0.05 (χ² is below the critical value ${crit.toFixed(3)}): independence is not rejected, and the difference between the rates is compatible with chance.`) +
    (minE < 5
      ? " Some expected counts are below 5, so the χ² approximation is not reliable."
      : "");
}

function departments() {
  const rows = [];
  for (const d of [...Object.keys(UCB), "all"]) {
    const T = contingency(pairsOf(d)),
      w = T.xs.indexOf("Female"),
      m = T.xs.indexOf("Male");
    rows.push([
      d === "all" ? "All" : d,
      fmt(T.tot),
      pct(T.row[w] / T.tot),
      pct(T.col[0] / T.tot),
      pct(T.n[m][0] / T.row[m]),
      pct(T.n[w][0] / T.row[w]),
      T.chi2.toFixed(2),
      fp(pValue(T.chi2, T.df)),
    ]);
  }
  table(
    "tD",
    [
      "Department",
      "Applicants",
      "Women",
      "Admitted",
      "Men admitted",
      "Women admitted",
      "χ²",
      "p-value",
    ],
    rows,
  );
}

$("sd").onchange = render;
render();
departments();
