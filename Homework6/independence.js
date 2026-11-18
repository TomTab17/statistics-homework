function contingency(pairs) {
  const xs = [...new Set(pairs.map((p) => p[0]))],
    fs = [...new Set(pairs.map((p) => p[1]))];
  const n = xs.map(() => fs.map(() => 0));
  for (const [x, f] of pairs) n[xs.indexOf(x)][fs.indexOf(f)]++;
  const row = n.map((r) => r.reduce((a, b) => a + b, 0)),
    col = fs.map((_, j) => n.reduce((a, r) => a + r[j], 0)),
    tot = row.reduce((a, b) => a + b, 0),
    exp = row.map((ri) => col.map((cj) => (ri * cj) / tot));
  let chi2 = 0;
  for (let i = 0; i < xs.length; i++)
    for (let j = 0; j < fs.length; j++)
      chi2 += (n[i][j] - exp[i][j]) ** 2 / exp[i][j];
  const df = (xs.length - 1) * (fs.length - 1);
  return { xs, fs, n, row, col, tot, exp, chi2, df };
}

function lnGamma(z) {
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5)
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  z -= 1;
  let s = c[0];
  for (let i = 1; i < 9; i++) s += c[i] / (z + i);
  const t = z + 7.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(s)
  );
}

function gammaQ(a, x) {
  if (x <= 0) return 1;
  const pre = Math.exp(-x + a * Math.log(x) - lnGamma(a));
  if (x < a + 1) {
    let t = 1 / a,
      s = t;
    for (let k = 1; k < 1000 && t > 1e-17 * s; k++) {
      t *= x / (a + k);
      s += t;
    }
    return 1 - pre * s;
  }
  let b = x + 1 - a,
    c = 1e300,
    d = 1 / b,
    h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = 1 / (an * d + b);
    c = b + an / c;
    h *= d * c;
    if (Math.abs(d * c - 1) < 1e-16) break;
  }
  return pre * h;
}

const pValue = (chi2, df) => gammaQ(df / 2, chi2 / 2);

function critical(df, alpha) {
  let lo = 0,
    hi = 100 * df;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (pValue(mid, df) > alpha) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
