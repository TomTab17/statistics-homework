const FUNCS = [
  {
    name: "sin x",
    dom: "[0, π]",
    f: (x) => Math.sin(x),
    a: 0,
    b: Math.PI,
    exact: 2,
    ex: "2",
  },
  {
    name: "x<sup>2</sup>",
    dom: "[0, 1]",
    f: (x) => x * x,
    a: 0,
    b: 1,
    exact: 1 / 3,
    ex: "1/3",
  },
  {
    name: "1 if x &lt; 0.5, 3 if x ≥ 0.5",
    dom: "[0, 1]",
    f: (x) => (x < 0.5 ? 1 : 3),
    a: 0,
    b: 1,
    exact: 2,
    ex: "2",
  },
  {
    name: "|x − 0.5|",
    dom: "[0, 1]",
    f: (x) => Math.abs(x - 0.5),
    a: 0,
    b: 1,
    exact: 0.25,
    ex: "1/4",
  },
  {
    name: "1/√x",
    dom: "(0, 1]",
    f: (x) => 1 / Math.sqrt(x),
    a: 0,
    b: 1,
    exact: 2,
    ex: "2",
  },
  {
    name: "1 if x &lt; 0.5, 0 if x ≥ 0.5",
    dom: "[0, 1]",
    f: (x) => (x < 0.5 ? 1 : 0),
    a: 0,
    b: 1,
    exact: 0.5,
    ex: "1/2",
  },
  {
    name: "sin x / x",
    dom: "[0, π]",
    f: (x) => (x === 0 ? 1 : Math.sin(x) / x),
    a: 0,
    b: Math.PI,
    exact: 1.851937051982466,
    ex: "Si(π) = 1.8519370520",
  },
];

function riemann(f, a, b, n) {
  const h = (b - a) / n;
  let s = 0;
  for (let i = 0; i < n; i++) s += f(a + (i + 0.5) * h);
  return s * h;
}

function lebesgue(f, a, b, k, m) {
  const h = (b - a) / m,
    v = new Float64Array(m);
  let lo = Infinity,
    hi = -Infinity;
  for (let i = 0; i < m; i++) {
    v[i] = f(a + (i + 0.5) * h);
    if (v[i] < lo) lo = v[i];
    if (v[i] > hi) hi = v[i];
  }
  const dy = (hi - lo) / k || 1,
    cnt = new Float64Array(k);
  for (let i = 0; i < m; i++)
    cnt[Math.min(k - 1, Math.floor((v[i] - lo) / dy))]++;
  let low = 0;
  for (let j = 0; j < k; j++) low += (lo + j * dy) * cnt[j] * h;
  const up = low + dy * (b - a);
  return { low, up, est: (low + up) / 2 };
}

const gcd = (p, q) => {
  while (q) [p, q] = [q, p % q];
  return p;
};

function thomaeRational(n) {
  let s = 0;
  for (let i = 0; i < n; i++) s += gcd(2 * i + 1, 2 * n) / (2 * n);
  return s / n;
}
