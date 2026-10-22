const ECC = (() => {
  const p = 2n ** 256n - 2n ** 32n - 977n;
  const n = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
  const G = [
    0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
    0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n,
  ];
  const O = null;

  const md = (a, m = p) => {
    const r = a % m;
    return r < 0n ? r + m : r;
  };
  function inv(a, m = p) {
    let [r0, r1] = [md(a, m), m],
      [s0, s1] = [1n, 0n];
    while (r1 !== 0n) {
      const q = r0 / r1;
      [r0, r1] = [r1, r0 - q * r1];
      [s0, s1] = [s1, s0 - q * s1];
    }
    return md(s0, m);
  }
  function powMod(b, e, m = p) {
    let r = 1n;
    b = md(b, m);
    while (e > 0n) {
      if (e & 1n) r = (r * b) % m;
      b = (b * b) % m;
      e >>= 1n;
    }
    return r;
  }

  function jDouble(P) {
    if (!P || P[1] === 0n) return O;
    const [X, Y, Z] = P;
    const A = (X * X) % p,
      B = (Y * Y) % p,
      C = (B * B) % p;
    const D = md(2n * ((X + B) ** 2n - A - C));
    const E = (3n * A) % p,
      F = (E * E) % p;
    const X3 = md(F - 2n * D);
    return [X3, md(E * (D - X3) - 8n * C), (2n * Y * Z) % p];
  }
  function jAddAffine(P, Q) {
    if (!Q) return P;
    if (!P) return [Q[0], Q[1], 1n];
    const [X1, Y1, Z1] = P;
    const Z1Z1 = (Z1 * Z1) % p;
    const U2 = (Q[0] * Z1Z1) % p,
      S2 = (((Q[1] * Z1) % p) * Z1Z1) % p;
    const H = md(U2 - X1),
      r = md(2n * (S2 - Y1));
    if (H === 0n) return r === 0n ? jDouble(P) : O;
    const HH = (H * H) % p,
      I = (4n * HH) % p,
      J = (H * I) % p,
      V = (X1 * I) % p;
    const X3 = md(r * r - J - 2n * V);
    return [X3, md(r * (V - X3) - 2n * Y1 * J), md((Z1 + H) ** 2n - Z1Z1 - HH)];
  }
  function toAffine(P) {
    if (!P) return O;
    const zi = inv(P[2]),
      zi2 = (zi * zi) % p;
    return [(P[0] * zi2) % p, (((P[1] * zi2) % p) * zi) % p];
  }
  function batchAffine(list) {
    const pre = [];
    let acc = 1n;
    for (const P of list) {
      pre.push(acc);
      acc = (acc * P[2]) % p;
    }
    let ia = inv(acc);
    const out = new Array(list.length);
    for (let i = list.length - 1; i >= 0; i--) {
      const zi = (ia * pre[i]) % p;
      ia = (ia * list[i][2]) % p;
      const zi2 = (zi * zi) % p;
      out[i] = [(list[i][0] * zi2) % p, (((list[i][1] * zi2) % p) * zi) % p];
    }
    return out;
  }

  function mul(k, P = G) {
    k = md(k, n);
    if (k === 0n || !P) return O;
    let R = O;
    for (let i = BigInt(k.toString(2).length) - 1n; i >= 0n; i--) {
      R = jDouble(R);
      if ((k >> i) & 1n) R = jAddAffine(R, P);
    }
    return toAffine(R);
  }
  const neg = (P) => (P ? [P[0], md(-P[1])] : O);
  const add = (P, Q) => (P ? toAffine(jAddAffine([P[0], P[1], 1n], Q)) : Q);

  const KOB = 256n;
  function encode(m) {
    for (let j = 0n; j < KOB; j++) {
      const x = BigInt(m) * KOB + j,
        y2 = md(x ** 3n + 7n),
        y = powMod(y2, (p + 1n) / 4n);
      if ((y * y) % p === y2) return { M: [x, y], j: Number(j) };
    }
    throw new Error("encoding failed");
  }
  const decode = (M) => Number(M[0] / KOB);

  function randBelow(limit) {
    const bytes = Math.ceil(limit.toString(16).length / 2);
    for (;;) {
      const b = crypto.getRandomValues(new Uint8Array(bytes));
      const x = BigInt(
        "0x" + Array.from(b, (v) => v.toString(16).padStart(2, "0")).join(""),
      );
      if (x < limit) return x;
    }
  }
  const keyGen = (bits) => {
    const k = 1n + randBelow(2n ** BigInt(bits));
    return { k, Q: mul(k) };
  };

  function encryptByte(m, Q) {
    const { M, j } = encode(m);
    const r = 1n + randBelow(n - 1n);
    const C1 = mul(r),
      S = mul(r, Q),
      C2 = add(M, S);
    return { m, M, j, r, S, C1, C2 };
  }
  function decryptPair(C1, C2, k) {
    const S = mul(k, C1),
      M = add(C2, neg(S));
    return { S, M, m: decode(M) };
  }

  function* bruteForce(Q, limit) {
    let R = O,
      k = 0n;
    for (;;) {
      for (let i = 0; i < 4096; i++) {
        k++;
        R = jAddAffine(R, G);
        const Z2 = (R[2] * R[2]) % p;
        if (R[0] === (Q[0] * Z2) % p && R[1] === (((Q[1] * Z2) % p) * R[2]) % p)
          return k;
        if (k >= limit) return null;
      }
      yield k;
    }
  }

  function* bsgs(Q, limit) {
    const m = BigInt(Math.ceil(Math.sqrt(Number(limit))));
    const table = new Map();
    let R = O,
      chunk = [];
    for (let j = 1n; j <= m; j++) {
      R = jAddAffine(R, G);
      chunk.push(R);
      if (chunk.length === 2048 || j === m) {
        const aff = batchAffine(chunk);
        aff.forEach((A, i) =>
          table.set(
            A[0].toString(36) + ":" + A[1].toString(36),
            j - BigInt(chunk.length) + 1n + BigInt(i),
          ),
        );
        chunk = [];
        yield { phase: "baby", done: j, m };
      }
    }
    const step = neg(mul(m));
    let T = [Q[0], Q[1], 1n];
    for (let i = 0n; i <= m; i += 2048n) {
      chunk = [];
      let hitO = null;
      for (let t = 0n; t < 2048n && i + t <= m; t++) {
        chunk.push(T);
        T = jAddAffine(T, step);
        if (!T) {
          hitO = (i + t + 1n) * m;
          break;
        }
      }
      const aff = batchAffine(chunk);
      for (let t = 0; t < aff.length; t++) {
        const j = table.get(
          aff[t][0].toString(36) + ":" + aff[t][1].toString(36),
        );
        if (j !== undefined) return { k: (i + BigInt(t)) * m + j, m };
      }
      if (hitO) return { k: hitO, m };
      yield { phase: "giant", done: i, m };
    }
    return { k: null, m };
  }

  return {
    mul,
    add,
    neg,
    encode,
    decode,
    keyGen,
    encryptByte,
    decryptPair,
    bruteForce,
    bsgs,
  };
})();
