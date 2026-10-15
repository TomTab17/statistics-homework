const Wallet = (() => {
  const subtle = globalThis.crypto.subtle;

  /* byte helpers */
  const toHex = (b) =>
    Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  const fromHex = (h) =>
    Uint8Array.from(h.match(/../g) || [], (x) => parseInt(x, 16));
  const concat = (...arrs) => {
    const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
    let o = 0;
    for (const a of arrs) {
      out.set(a, o);
      o += a.length;
    }
    return out;
  };
  const utf8 = (s) => new TextEncoder().encode(s.normalize("NFKD"));
  const toBig = (b) => BigInt("0x" + (toHex(b) || "0"));
  const fromBig = (x, len) => fromHex(x.toString(16).padStart(len * 2, "0"));
  const ser32 = (i) =>
    Uint8Array.of(i >>> 24, (i >>> 16) & 255, (i >>> 8) & 255, i & 255);

  /* SHA-2 */
  const sha256 = async (data) =>
    new Uint8Array(await subtle.digest("SHA-256", data));
  async function hmacSha512(key, data) {
    const k = await subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"],
    );
    return new Uint8Array(await subtle.sign("HMAC", k, data));
  }
  async function pbkdf2Sha512(password, salt, iterations, bytes) {
    const k = await subtle.importKey("raw", password, "PBKDF2", false, [
      "deriveBits",
    ]);
    const bits = await subtle.deriveBits(
      { name: "PBKDF2", salt, iterations, hash: "SHA-512" },
      k,
      bytes * 8,
    );
    return new Uint8Array(bits);
  }

  /* Keccak-f[1600] */
  const RC = [
    "0000000000000001",
    "0000000000008082",
    "800000000000808a",
    "8000000080008000",
    "000000000000808b",
    "0000000080000001",
    "8000000080008081",
    "8000000000008009",
    "000000000000008a",
    "0000000000000088",
    "0000000080008009",
    "000000008000000a",
    "000000008000808b",
    "800000000000008b",
    "8000000000008089",
    "8000000000008003",
    "8000000000008002",
    "8000000000000080",
    "000000000000800a",
    "800000008000000a",
    "8000000080008081",
    "8000000000008080",
    "0000000080000001",
    "8000000080008008",
  ].map((h) => [parseInt(h.slice(8), 16) | 0, parseInt(h.slice(0, 8), 16) | 0]);
  // Rotation offsets r[x + 5y].
  const ROT = [
    0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8,
    18, 2, 61, 56, 14,
  ];

  function rotl(lo, hi, n) {
    if (n === 0) return [lo, hi];
    if (n === 32) return [hi, lo];
    if (n < 32)
      return [(lo << n) | (hi >>> (32 - n)), (hi << n) | (lo >>> (32 - n))];
    n -= 32;
    return [(hi << n) | (lo >>> (32 - n)), (lo << n) | (hi >>> (32 - n))];
  }

  function keccakF(s) {
    const C = new Int32Array(10),
      B = new Int32Array(50);
    for (let round = 0; round < 24; round++) {
      // θ
      for (let x = 0; x < 5; x++) {
        C[2 * x] =
          s[2 * x] ^
          s[2 * x + 10] ^
          s[2 * x + 20] ^
          s[2 * x + 30] ^
          s[2 * x + 40];
        C[2 * x + 1] =
          s[2 * x + 1] ^
          s[2 * x + 11] ^
          s[2 * x + 21] ^
          s[2 * x + 31] ^
          s[2 * x + 41];
      }
      for (let x = 0; x < 5; x++) {
        const a = (x + 4) % 5,
          b = (x + 1) % 5;
        const [rl, rh] = rotl(C[2 * b], C[2 * b + 1], 1);
        const dl = C[2 * a] ^ rl,
          dh = C[2 * a + 1] ^ rh;
        for (let y = 0; y < 5; y++) {
          s[2 * (x + 5 * y)] ^= dl;
          s[2 * (x + 5 * y) + 1] ^= dh;
        }
      }
      // ρ and π: B[y, 2x + 3y] = rot(A[x, y])
      for (let x = 0; x < 5; x++)
        for (let y = 0; y < 5; y++) {
          const i = x + 5 * y,
            j = y + 5 * ((2 * x + 3 * y) % 5);
          const [l, h] = rotl(s[2 * i], s[2 * i + 1], ROT[i]);
          B[2 * j] = l;
          B[2 * j + 1] = h;
        }
      // χ
      for (let y = 0; y < 5; y++)
        for (let x = 0; x < 5; x++) {
          const i = x + 5 * y,
            i1 = ((x + 1) % 5) + 5 * y,
            i2 = ((x + 2) % 5) + 5 * y;
          s[2 * i] = B[2 * i] ^ (~B[2 * i1] & B[2 * i2]);
          s[2 * i + 1] = B[2 * i + 1] ^ (~B[2 * i1 + 1] & B[2 * i2 + 1]);
        }
      // ι
      s[0] ^= RC[round][0];
      s[1] ^= RC[round][1];
    }
  }

  // Sponge with rate 136 bytes, capacity 512 bits, 32-byte output.
  function sponge256(data, suffix) {
    const rate = 136,
      s = new Int32Array(50);
    const blocks = Math.floor(data.length / rate) + 1;
    const padded = new Uint8Array(blocks * rate);
    padded.set(data);
    padded[data.length] ^= suffix;
    padded[padded.length - 1] ^= 0x80;
    for (let b = 0; b < blocks; b++) {
      for (let j = 0; j < rate; j++) {
        const byte = padded[b * rate + j],
          lane = j >> 3,
          k = j & 7;
        s[2 * lane + (k >> 2)] ^= byte << (8 * (k & 3));
      }
      keccakF(s);
    }
    const out = new Uint8Array(32);
    for (let j = 0; j < 32; j++)
      out[j] = (s[2 * (j >> 3) + ((j & 7) >> 2)] >>> (8 * (j & 3))) & 255;
    return out;
  }
  const keccak256 = (data) => sponge256(data, 0x01);
  const sha3_256 = (data) => sponge256(data, 0x06);

  /* secp256k1 */
  const P = 2n ** 256n - 2n ** 32n - 977n;
  const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
  const G = [
    0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
    0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n,
  ];
  const md = (a, m = P) => ((a % m) + m) % m;
  function powMod(b, e, m) {
    let r = 1n;
    b = md(b, m);
    while (e > 0n) {
      if (e & 1n) r = (r * b) % m;
      b = (b * b) % m;
      e >>= 1n;
    }
    return r;
  }
  // Jacobian coordinates (X, Y, Z) represent (X/Z², Y/Z³); null is the point at infinity.
  function jDouble(Q) {
    if (!Q || Q[1] === 0n) return null;
    const [X, Y, Z] = Q;
    const A = (X * X) % P,
      B = (Y * Y) % P,
      C = (B * B) % P;
    const D = md(2n * ((X + B) ** 2n - A - C));
    const E = (3n * A) % P,
      F = (E * E) % P;
    const X3 = md(F - 2n * D);
    return [X3, md(E * (D - X3) - 8n * C), (2n * Y * Z) % P];
  }
  function jAdd(Q1, Q2) {
    if (!Q1) return Q2;
    if (!Q2) return Q1;
    const [X1, Y1, Z1] = Q1,
      [X2, Y2, Z2] = Q2;
    const Z1Z1 = (Z1 * Z1) % P,
      Z2Z2 = (Z2 * Z2) % P;
    const U1 = (X1 * Z2Z2) % P,
      U2 = (X2 * Z1Z1) % P;
    const S1 = (((Y1 * Z2) % P) * Z2Z2) % P,
      S2 = (((Y2 * Z1) % P) * Z1Z1) % P;
    const H = md(U2 - U1),
      r = md(2n * (S2 - S1));
    if (H === 0n) return r === 0n ? jDouble(Q1) : null;
    const I = (4n * H * H) % P,
      J = (H * I) % P,
      V = (U1 * I) % P;
    const X3 = md(r * r - J - 2n * V);
    return [
      X3,
      md(r * (V - X3) - 2n * S1 * J),
      md(((Z1 + Z2) ** 2n - Z1Z1 - Z2Z2) * H),
    ];
  }
  // Scalar multiplication k·G by double-and-add
  function mulG(k) {
    let R = null;
    const Gj = [G[0], G[1], 1n];
    for (let i = BigInt(k.toString(2).length) - 1n; i >= 0n; i--) {
      R = jDouble(R);
      if ((k >> i) & 1n) R = jAdd(R, Gj);
    }
    const zi = powMod(R[2], P - 2n, P),
      zi2 = (zi * zi) % P;
    return [(R[0] * zi2) % P, (((R[1] * zi2) % P) * zi) % P];
  }
  const pubUncompressed = (pt) =>
    concat([4], fromBig(pt[0], 32), fromBig(pt[1], 32));
  const pubCompressed = (pt) =>
    concat([pt[1] & 1n ? 3 : 2], fromBig(pt[0], 32));

  /* BIP-39 */
  const bitsOf = (bytes) =>
    Array.from(bytes, (b) => b.toString(2).padStart(8, "0")).join("");

  async function entropyToMnemonic(entropy) {
    const ent = entropy.length * 8,
      cs = ent / 32;
    const bits = bitsOf(entropy) + bitsOf(await sha256(entropy)).slice(0, cs);
    return bits
      .match(/.{11}/g)
      .map((g) => BIP39_WORDLIST[parseInt(g, 2)])
      .join(" ");
  }

  // Splits a phrase into its parts and checks the checksum (wallets do before import)
  async function parseMnemonic(phrase) {
    const words = phrase
      .normalize("NFKD")
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (![12, 15, 18, 21, 24].includes(words.length))
      return {
        ok: false,
        error: `A BIP-39 phrase has 12, 15, 18, 21 or 24 words (found ${words.length}).`,
      };
    const unknown = words.filter((w) => !BIP39_WORDLIST.includes(w));
    if (unknown.length)
      return {
        ok: false,
        error: `Not in the BIP-39 English wordlist: ${unknown.join(", ")}.`,
      };
    const indices = words.map((w) => BIP39_WORDLIST.indexOf(w));
    const bits = indices.map((i) => i.toString(2).padStart(11, "0")).join("");
    const cs = bits.length / 33,
      ent = bits.length - cs;
    const entropy = Uint8Array.from(bits.slice(0, ent).match(/.{8}/g), (b) =>
      parseInt(b, 2),
    );
    const expected = bitsOf(await sha256(entropy)).slice(0, cs);
    const given = bits.slice(ent);
    return {
      ok: given === expected,
      error:
        given === expected
          ? null
          : "Checksum mismatch: wallets reject this phrase.",
      words,
      indices,
      bits,
      ent,
      cs,
      entropy,
      checksumGiven: given,
      checksumExpected: expected,
    };
  }

  const mnemonicToSeed = (phrase, passphrase = "") =>
    pbkdf2Sha512(
      utf8(phrase.trim().split(/\s+/).join(" ")),
      utf8("mnemonic" + passphrase),
      2048,
      64,
    );

  /* BIP-32 and BIP-44 */
  const HARDENED = 0x80000000;

  async function masterKey(seed) {
    const I = await hmacSha512(new TextEncoder().encode("Bitcoin seed"), seed);
    const k = toBig(I.slice(0, 32));
    if (k === 0n || k >= N)
      throw new Error("Invalid master key (probability below 2^-127).");
    return { k, c: I.slice(32), path: "m" };
  }

  async function childKey(parent, index) {
    const hardened = index >= HARDENED;
    const data = hardened
      ? concat([0], fromBig(parent.k, 32), ser32(index)) // 0x00 || ser256(k_par) || ser32(i)
      : concat(pubCompressed(mulG(parent.k)), ser32(index)); // serP(point(k_par)) || ser32(i)
    const I = await hmacSha512(parent.c, data);
    const IL = toBig(I.slice(0, 32));
    const k = md(IL + parent.k, N);
    if (IL >= N || k === 0n)
      throw new Error("Invalid child key: the next index must be used.");
    const label = hardened ? `${index - HARDENED}'` : `${index}`;
    return { k, c: I.slice(32), path: `${parent.path}/${label}` };
  }

  // Returns every node along the path
  async function derivePath(seed, path) {
    const nodes = [await masterKey(seed)];
    for (const part of path.split("/").slice(1)) {
      const h = part.endsWith("'");
      nodes.push(
        await childKey(nodes.at(-1), parseInt(part) + (h ? HARDENED : 0)),
      );
    }
    return nodes;
  }

  /* Address and EIP-55 */
  const addressFromPublicKey = (pub65) =>
    toHex(keccak256(pub65.slice(1)).slice(12));

  function toChecksumAddress(addrLower) {
    const hash = toHex(keccak256(new TextEncoder().encode(addrLower)));
    let out = "";
    for (let i = 0; i < 40; i++)
      out +=
        parseInt(hash[i], 16) >= 8 ? addrLower[i].toUpperCase() : addrLower[i];
    return { address: "0x" + out, hash };
  }
  const isValidChecksum = (addr) =>
    toChecksumAddress(addr.slice(2).toLowerCase()).address === addr;

  /* full pipeline */
  async function pipeline(phrase, passphrase, index) {
    const m = await parseMnemonic(phrase);
    if (!m.ok) return { mnemonic: m };
    const seed = await mnemonicToSeed(m.words.join(" "), passphrase);
    const path = `m/44'/60'/0'/0/${index}`;
    const nodes = await derivePath(seed, path);
    const priv = nodes.at(-1).k;
    const pt = mulG(priv);
    const pub = pubUncompressed(pt);
    const hash = keccak256(pub.slice(1));
    const addr = toHex(hash.slice(12));
    const cs = toChecksumAddress(addr);
    return {
      mnemonic: m,
      passphrase,
      seed,
      path,
      nodes,
      priv,
      pt,
      pub,
      hash,
      addr,
      checksummed: cs.address,
      addrHash: cs.hash,
    };
  }

  return {
    toHex,
    fromHex,
    concat,
    toBig,
    fromBig,
    sha256,
    hmacSha512,
    pbkdf2Sha512,
    keccak256,
    sha3_256,
    N,
    mulG,
    pubUncompressed,
    pubCompressed,
    entropyToMnemonic,
    parseMnemonic,
    mnemonicToSeed,
    masterKey,
    childKey,
    derivePath,
    addressFromPublicKey,
    toChecksumAddress,
    isValidChecksum,
    pipeline,
    HARDENED,
  };
})();
