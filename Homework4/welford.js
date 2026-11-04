function welford(xs) {
  let mean = 0,
    ss = 0,
    k = 0;
  for (const x of xs) {
    k++;
    const d = x - mean;
    mean += d / k;
    ss += d * (x - mean);
  }
  return { n: k, mean, ss, variance: k > 1 ? ss / (k - 1) : 0 };
}

function scoreDist(weights) {
  const tot = weights.reduce((a, b) => a + b, 0),
    pmf = weights.map((w) => w / tot);
  const cdf = [];
  pmf.reduce((s, q, i) => (cdf[i] = s + q), 0);
  const mu = pmf.reduce((s, q, x) => s + q * x, 0),
    s2 = pmf.reduce((s, q, x) => s + q * (x - mu) ** 2, 0),
    m4 = pmf.reduce((s, q, x) => s + q * (x - mu) ** 4, 0);
  function draw() {
    const u = Math.random();
    let x = 0;
    while (x < 10 && u > cdf[x]) x++;
    return x;
  }
  return { pmf, mu, s2, m4, draw };
}

const binom = [];
for (let x = 0, c = 1; x <= 10; x++) {
  binom.push(c * 0.3 ** x * 0.7 ** (10 - x));
  c = (c * (10 - x)) / (x + 1);
}
const DISTS = {
  binomial: scoreDist(binom),
  uniform: scoreDist(new Array(11).fill(1)),
  geometric: scoreDist(Array.from({ length: 11 }, (_, x) => 0.6 ** x)),
};

function hackers(dist, m, n) {
  const means = new Float64Array(m),
    vars = new Float64Array(m),
    xs = new Float64Array(n);
  for (let j = 0; j < m; j++) {
    for (let i = 0; i < n; i++) xs[i] = dist.draw();
    const w = welford(xs);
    means[j] = w.mean;
    vars[j] = w.variance;
  }
  return { m, n, means, vars };
}
