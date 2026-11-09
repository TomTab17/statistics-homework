const SQRT2PI = Math.sqrt(2 * Math.PI);
const phi = (x) => Math.exp((-x * x) / 2) / SQRT2PI;

function normcdf(x) {
  const a = Math.abs(x);
  if (a < 2.5) {
    let t = x,
      s = x;
    for (let k = 1; Math.abs(t) > 1e-17 * Math.abs(s); k++) {
      t *= (x * x) / (2 * k + 1);
      s += t;
    }
    return 0.5 + phi(x) * s;
  }
  let f = a,
    c = a,
    d = 0;
  for (let k = 1; k < 500; k++) {
    d = 1 / (a + k * d);
    c = a + k / c;
    f *= c * d;
    if (Math.abs(c * d - 1) < 1e-16) break;
  }
  const tail = phi(a) / f;
  return x < 0 ? tail : 1 - tail;
}

function cdfSimpson(x, n) {
  const h = x / n;
  let s = phi(0) + phi(x);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * phi(i * h);
  return 0.5 + (s * h) / 3;
}

function erfSeries(z) {
  let t = z,
    s = z;
  for (let k = 1; k < 1000; k++) {
    t *= (-z * z) / k;
    const u = t / (2 * k + 1);
    s += u;
    if (Math.abs(u) < 1e-17 * Math.abs(s)) break;
  }
  return (2 / Math.sqrt(Math.PI)) * s;
}

function erfAS(z) {
  const a = Math.abs(z),
    t = 1 / (1 + 0.3275911 * a),
    p =
      t *
      (0.254829592 +
        t *
          (-0.284496736 +
            t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return Math.sign(z) * (1 - p * Math.exp(-a * a));
}

const cdfErfSeries = (x) => 0.5 * (1 + erfSeries(x / Math.SQRT2));
const cdfAS = (x) => 0.5 * (1 + erfAS(x / Math.SQRT2));
