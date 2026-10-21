const p = 17;
const O = null;
const mod = (a) => ((a % p) + p) % p;

// Modular inverse
function inv(a) {
  let r = 1;
  for (let i = 0; i < p - 2; i++) r = mod(r * a);
  return r;
}

// Point addition
function add(P, Q) {
  if (P === O) return Q;
  if (Q === O) return P;
  const [x1, y1] = P,
    [x2, y2] = Q;
  if (x1 === x2 && mod(y1 + y2) === 0) return O;
  const lambda =
    x1 === x2 ? mod(3 * x1 * x1 * inv(2 * y1)) : mod((y2 - y1) * inv(x2 - x1));
  const x3 = mod(lambda * lambda - x1 - x2);
  const y3 = mod(lambda * (x1 - x3) - y1);
  return [x3, y3];
}

// Returns [G, 2G...] by repeated addition.
function multiples(G, k) {
  const list = [];
  let R = O;
  for (let i = 1; i <= k; i++) {
    R = add(R, G);
    list.push(R);
  }
  return list;
}

// Returns kG by double-and-add
function mulDA(G, k) {
  let R = O;
  for (const bit of k.toString(2)) {
    R = add(R, R); // doubling
    if (bit === "1") R = add(R, G); // addition
  }
  return R;
}
