const $ = (id) => document.getElementById(id);
const TEST_PHRASE =
  "test test test test test test test test test test test junk";
const hex = Wallet.toHex;
const hex64 = (x) => x.toString(16).padStart(64, "0");
const short = (h, a = 10, b = 8) =>
  h.length > a + b + 1 ? `${h.slice(0, a)}…${h.slice(-b)}` : h;
const sleep = () => new Promise((r) => setTimeout(r, 0));
const rand = (n) => crypto.getRandomValues(new Uint8Array(n));
const popcount8 = (b) => {
  let c = 0;
  while (b) {
    c += b & 1;
    b >>= 1;
  }
  return c;
};
const hamming = (a, b) => a.reduce((s, x, i) => s + popcount8(x ^ b[i]), 0);
const fmtPct = (x, d = 2) => (100 * x).toFixed(d) + "%";

function setV(key, html) {
  document
    .querySelectorAll(`[data-v="${key}"]`)
    .forEach((el) => (el.innerHTML = html));
}
function setS(key, text) {
  document
    .querySelectorAll(`[data-s="${key}"]`)
    .forEach((el) => (el.textContent = text));
}

/* Part 1 */
let token = 0,
  current = null;

async function compute() {
  const my = ++token;
  const phrase = $("phrase").value,
    pass = $("pass").value;
  let idx = Math.round(+$("idx").value);
  if (!Number.isFinite(idx) || idx < 0) idx = 0;
  if (idx > 999) idx = 999;
  const res = await Wallet.pipeline(phrase, pass, idx);
  if (my !== token) return;
  current = res;
  render(res);
}

function render(r) {
  const st = $("status"),
    m = r.mnemonic;
  if (!m.ok) {
    st.className = "status bad";
    st.textContent = m.error;
    [
      "nwords",
      "mnShort",
      "seedShort",
      "masterShort",
      "privShort",
      "pubShort",
      "addrLower",
      "checksummed",
      "path",
      "entropy",
      "entHash",
      "checksum",
      "seed",
      "masterK",
      "masterC",
      "priv",
      "pub",
      "keccak",
    ].forEach((k) => setV(k, "—"));
    $("bits").innerHTML = "";
    $("path").innerHTML = "";
    $("eip").innerHTML = "";
    $("bitsNote").textContent = "";
    $("eipNote").textContent = "";
    return;
  }
  st.className = "status ok";
  st.textContent = `Valid ${m.words.length}-word phrase · ${m.ent} bits of entropy + ${m.cs}-bit checksum`;

  // flow panel
  setV("nwords", `${m.words.length} words`);
  setV("mnShort", `${m.words.slice(0, 3).join(" ")} … ${m.words.at(-1)}`);
  setV("seedShort", short(hex(r.seed), 16, 12));
  setV("masterShort", short(hex64(r.nodes[0].k), 16, 12));
  setV("privShort", short(hex64(r.priv), 16, 12));
  setV("pubShort", short(hex(r.pub), 16, 12));
  setV("addrLower", "0x" + r.addr);
  setV("checksummed", r.checksummed);
  setV("path", r.path.replace(/'/g, "′"));

  // 1.1 entropy, checksum and the 11-bit groups
  const entHash = m.checksumExpected;
  setV("entropy", `${hex(m.entropy)} <span class="dim">(${m.ent} bits)</span>`);
  Wallet.sha256(m.entropy).then((h) => {
    const b0 = h[0].toString(2).padStart(8, "0");
    setV(
      "entHash",
      `<span class="hl">${b0.slice(0, m.cs)}</span>${b0.slice(m.cs)} <span class="dim">(first byte in binary)</span> ${hex(h).slice(2)}`,
    );
  });
  setV(
    "checksum",
    `${entHash} <span class="dim">(first ${m.cs} bits of SHA-256)</span>`,
  );
  let t =
    "<thead><tr><th>#</th><th>11 bits</th><th>Index</th><th>Word</th></tr></thead><tbody>";
  m.words.forEach((w, i) => {
    let b = m.bits.slice(11 * i, 11 * i + 11);
    if (i === m.words.length - 1)
      b = `${b.slice(0, 11 - m.cs)}<span class="cs">${b.slice(11 - m.cs)}</span>`;
    t += `<tr><td>${i + 1}</td><td class="c">${b}</td><td class="c">${m.indices[i]}</td><td>${w}</td></tr>`;
  });
  $("bits").innerHTML = t + "</tbody>";
  $("bitsNote").textContent =
    `The last word is made of ${11 - m.cs} entropy bits plus the ${m.cs} checksum bits (highlighted).`;

  // 1.2, 1.3
  setV("seed", hex(r.seed));
  setV("masterK", hex64(r.nodes[0].k));
  setV("masterC", hex(r.nodes[0].c));

  // 1.4 path table
  const levels = [
    "master",
    "purpose",
    "coin type (ETH)",
    "account",
    "change (external)",
    "address index",
  ];
  let p =
    "<thead><tr><th>Level</th><th>Index</th><th>Type</th><th>Private key</th><th>Chain code</th></tr></thead><tbody>";
  r.nodes.forEach((n, i) => {
    const part = n.path.split("/").at(-1),
      hard = part.endsWith("'"),
      v = parseInt(part);
    const idxCell =
      i === 0
        ? "m"
        : `${part.replace("'", "′")} = 0x${(v + (hard ? Wallet.HARDENED : 0)).toString(16).padStart(8, "0")}`;
    p += `<tr><td>${levels[i]}</td><td class="c">${idxCell}</td><td>${i === 0 ? "root" : hard ? "hardened" : "normal"}</td>
      <td class="c">${short(hex64(n.k), 8, 6)}</td><td class="c">${short(hex(n.c), 8, 6)}</td></tr>`;
  });
  $("path").innerHTML = p + "</tbody>";

  // 1.5, 1.6
  setV("priv", hex64(r.priv));
  setV(
    "pub",
    `<span class="hl">04</span>${hex(r.pub).slice(2, 66)}<span class="dim">${hex(r.pub).slice(66)}</span>`,
  );
  const kh = hex(r.hash);
  setV(
    "keccak",
    `<span class="dim">${kh.slice(0, 24)}</span><span class="hl">${kh.slice(24)}</span>`,
  );

  // 1.7 EIP-55 grid
  let g = "",
    letters = 0,
    upper = 0;
  for (let i = 0; i < 40; i++) {
    const c = r.checksummed[2 + i],
      nib = r.addrHash[i];
    const cls = /[0-9]/.test(c) ? "dg" : c === c.toUpperCase() ? "up" : "lo";
    if (cls !== "dg") letters++;
    if (cls === "up") upper++;
    g += `<span class="${cls}" title="position ${i}, hash digit ${nib}">${c}<small>${nib}</small></span>`;
  }
  $("eip").innerHTML = g;
  $("eipNote").textContent =
    `This address contains ${letters} letters (${upper} uppercase), so it carries ${letters} check bits.`;
}

let deb;
["phrase", "pass", "idx"].forEach((id) =>
  $(id).addEventListener("input", () => {
    clearTimeout(deb);
    deb = setTimeout(compute, 250);
  }),
);
$("gen").onclick = async () => {
  $("phrase").value = await Wallet.entropyToMnemonic(rand(16));
  compute();
};
$("reset").onclick = () => {
  $("phrase").value = TEST_PHRASE;
  $("pass").value = "";
  $("idx").value = 0;
  compute();
};

/*  scroll */
const ORDER = ["mn", "seed", "master", "priv", "pub", "addr", "cs"];
const stepEls = [...document.querySelectorAll(".step")];
let active = null;
function setActive(el) {
  if (el === active) return;
  if (active) active.classList.remove("active");
  active = el;
  el.classList.add("active");
  const n = el.dataset.n,
    k = ORDER.indexOf(n);
  document
    .querySelectorAll(".node")
    .forEach((x) => x.classList.toggle("on", n === "all" || x.dataset.n === n));
  document
    .querySelectorAll(".edge")
    .forEach((x) =>
      x.classList.toggle(
        "on",
        n === "all" || (k > 0 && x.dataset.e === ORDER[k - 1]),
      ),
    );
}
function onScroll() {
  const y = innerHeight * 0.5;
  let pick = stepEls[0];
  for (const el of stepEls) if (el.getBoundingClientRect().top < y) pick = el;
  setActive(pick);
  $("totoc").classList.toggle(
    "show",
    $("toc").getBoundingClientRect().bottom < 0,
  );
}
let raf = 0;
addEventListener(
  "scroll",
  () => {
    if (!raf)
      raf = requestAnimationFrame(() => {
        raf = 0;
        onScroll();
      });
  },
  { passive: true },
);
addEventListener("resize", onScroll);

/* 1.8 */
async function runTests() {
  const abandon =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
  const tests = [
    [
      "Keccak-256 of the empty string",
      async () => hex(Wallet.keccak256(new Uint8Array())),
      "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
    ],
    [
      "SHA3-256 of the empty string (FIPS 202)",
      async () => hex(Wallet.sha3_256(new Uint8Array())),
      "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a",
    ],
    [
      "BIP-39 vector: entropy 00…00 → phrase",
      async () => Wallet.entropyToMnemonic(new Uint8Array(16)),
      abandon,
    ],
    [
      "BIP-39 vector: seed of that phrase with passphrase “TREZOR”",
      async () => hex(await Wallet.mnemonicToSeed(abandon, "TREZOR")),
      "c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04",
    ],
    [
      "BIP-32 test vector 1: master private key of seed 000102…0f",
      async () =>
        hex64(
          (
            await Wallet.masterKey(
              Wallet.fromHex("000102030405060708090a0b0c0d0e0f"),
            )
          ).k,
        ),
      "e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35",
    ],
    [
      "Full pipeline: Hardhat/Foundry test phrase, path m/44′/60′/0′/0/0",
      async () => (await Wallet.pipeline(TEST_PHRASE, "", 0)).checksummed,
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    ],
    [
      "EIP-55 example address from the specification",
      async () =>
        Wallet.toChecksumAddress("5aaeb6053f3e94c9b9a09f33669435e7ef1beaed")
          .address,
      "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
    ],
  ];
  let html = "";
  for (const [name, fn, exp] of tests) {
    let got;
    try {
      got = await fn();
    } catch (e) {
      got = "error: " + e.message;
    }
    const ok = got === exp;
    html += `<li><b class="${ok ? "p" : "f"}">${ok ? "PASS" : "FAIL"}</b><div>${name}<small>${ok ? exp : `expected ${exp}<br>got ${got}`}</small></div></li>`;
  }
  $("tests").innerHTML = html;
}

/* charts */
function bars(id, vals, labels, exp, every = 1) {
  const W = 460,
    H = 200,
    l = 8,
    b = 24,
    t = 12,
    w = (W - 2 * l) / vals.length;
  const max = Math.max(1, ...vals, ...(exp || [])) * 1.08,
    ph = H - b - t;
  const Y = (v) => H - b - (v / max) * ph;
  let h = "";
  vals.forEach((v, i) => {
    const x = l + i * w + w * 0.12;
    h += `<rect class="c-bar" x="${x}" y="${Y(v)}" width="${w * 0.76}" height="${Math.max(0, H - b - Y(v))}" rx="2"/>`;
    if (i % every === 0)
      h += `<text class="c-tick" x="${x + w * 0.38}" y="${H - 7}">${labels[i]}</text>`;
  });
  if (exp)
    h += `<polyline class="c-ref" fill="none" points="${exp.map((v, i) => `${l + i * w + w / 2},${Y(v)}`).join(" ")}"/>`;
  const el = $(id);
  el.setAttribute("viewBox", `0 0 ${W} ${H}`);
  el.innerHTML = h;
}

const lfact = [0];
for (let i = 1; i <= 300; i++) lfact[i] = lfact[i - 1] + Math.log(i);
const binom = (n, k, p) =>
  Math.exp(
    lfact[n] -
      lfact[k] -
      lfact[n - k] +
      k * Math.log(p) +
      (n - k) * Math.log(1 - p),
  );

/* 3.1 */
async function run31() {
  const N = 4096;
  let valid = 0;
  for (let t = 0; t < N; t += 256) {
    const batch = [];
    for (let j = 0; j < 256; j++) {
      const idx = Array.from(
        crypto.getRandomValues(new Uint16Array(12)),
        (v) => v % 2048,
      );
      const bits = idx.map((i) => i.toString(2).padStart(11, "0")).join("");
      const ent = Uint8Array.from(bits.slice(0, 128).match(/.{8}/g), (x) =>
        parseInt(x, 2),
      );
      batch.push(
        Wallet.sha256(ent).then(
          (h) => h[0] >> 4 === parseInt(bits.slice(128), 2),
        ),
      );
    }
    valid += (await Promise.all(batch)).filter(Boolean).length;
  }
  const p = 1 / 16,
    half = 1.96 * Math.sqrt((p * (1 - p)) / N);
  setS("n31", N.toLocaleString("en"));
  setS("valid31", `${valid} / ${N}`);
  setS("rate31", fmtPct(valid / N));
  setS("ci31", `${fmtPct(p - half, 1)}–${fmtPct(p + half, 1)}`);
}

/* 3.2 */
async function run32() {
  const N = 256;
  setS("chi32", "computing…");
  const m = await Wallet.parseMnemonic($("phrase").value);
  if (!m.ok) {
    setS("chi32", "—");
    setS("verdict32", "Enter a valid phrase to run this experiment.");
    return;
  }
  const seed = await Wallet.mnemonicToSeed(m.words.join(" "), $("pass").value);
  const parent = (await Wallet.derivePath(seed, "m/44'/60'/0'/0")).at(-1);
  const addrs = [];
  for (let i = 0; i < N; i++) {
    const child = await Wallet.childKey(parent, i);
    addrs.push(
      Wallet.keccak256(
        Wallet.pubUncompressed(Wallet.mulG(child.k)).slice(1),
      ).slice(12),
    );
    if (i % 32 === 31) await sleep();
  }
  const counts = new Array(16).fill(0);
  for (const a of addrs) for (const ch of hex(a)) counts[parseInt(ch, 16)]++;
  const E = (N * 40) / 16,
    chi = counts.reduce((s, c) => s + (c - E) ** 2 / E, 0);
  let ham = 0;
  for (let i = 0; i + 1 < N; i++) ham += hamming(addrs[i], addrs[i + 1]) / 160;
  setS("n32m", N - 1);
  setS("d32", (N * 40).toLocaleString("en"));
  setS("e32", E);
  setS("chi32", chi.toFixed(1));
  setS("ham32", fmtPct(ham / (N - 1), 1));
  setS(
    "verdict32",
    chi < 25.0
      ? "At the 5% level, the hypothesis of uniform digits is therefore not rejected."
      : "This run exceeds the critical value. Under perfect uniformity this happens about once every twenty runs, so the experiment should be repeated before drawing conclusions.",
  );
  bars("h32", counts, [..."0123456789abcdef"], new Array(16).fill(E));
}

/* 3.3 */
async function run33() {
  const N = 2000,
    d = [];
  for (let t = 0; t < N; t++) {
    const x = rand(64),
      y = x.slice(),
      bit = crypto.getRandomValues(new Uint16Array(1))[0] % 512;
    y[bit >> 3] ^= 1 << (bit & 7);
    d.push(hamming(Wallet.keccak256(x), Wallet.keccak256(y)));
  }
  const mean = d.reduce((s, v) => s + v, 0) / N,
    sd = Math.sqrt(d.reduce((s, v) => s + (v - mean) ** 2, 0) / (N - 1));
  const lo = 100,
    w = 4,
    nb = 14;
  const counts = new Array(nb).fill(0),
    exp = new Array(nb).fill(0);
  for (const v of d)
    counts[Math.min(nb - 1, Math.max(0, Math.floor((v - lo) / w)))]++;
  for (let k = 0; k <= 256; k++)
    exp[Math.min(nb - 1, Math.max(0, Math.floor((k - lo) / w)))] +=
      N * binom(256, k, 0.5);
  setS("n33", N.toLocaleString("en"));
  setS("mean33", mean.toFixed(1));
  setS("sd33", sd.toFixed(1));
  bars(
    "h33",
    counts,
    counts.map((_, i) => lo + i * w),
    exp,
    2,
  );
}

/* 3.4 */
async function run34() {
  const N = 4000,
    NT = 200000;
  const lo = 5,
    hi = 25,
    counts = new Array(hi - lo + 1).fill(0);
  let sum = 0;
  for (let t = 0; t < N; t++) {
    const L = [...hex(rand(20))].filter((c) => c >= "a").length;
    sum += L;
    counts[Math.min(hi, Math.max(lo, L)) - lo]++;
  }
  const exp = counts.map((_, i) => {
    const k = i + lo;
    if (k === lo) {
      let s = 0;
      for (let j = 0; j <= lo; j++) s += binom(40, j, 6 / 16);
      return N * s;
    }
    if (k === hi) {
      let s = 0;
      for (let j = hi; j <= 40; j++) s += binom(40, j, 6 / 16);
      return N * s;
    }
    return N * binom(40, k, 6 / 16);
  });
  bars(
    "h34",
    counts,
    counts.map((_, i) => i + lo),
    exp,
    2,
  );
  setS("n34", N.toLocaleString("en"));
  setS("mean34", (sum / N).toFixed(2));

  setS("pass34", "…");
  const HEX = "0123456789abcdef";
  let pass = 0;
  for (let t = 0; t < NT; t++) {
    const a = Wallet.toChecksumAddress(hex(rand(20))).address;
    const r = crypto.getRandomValues(new Uint8Array(3)),
      j = r[0] % 40;
    const old = a[2 + j].toLowerCase();
    let c = HEX[(HEX.indexOf(old) + 1 + (r[1] % 15)) % 16];
    if (c >= "a" && r[2] & 1) c = c.toUpperCase();
    if (Wallet.isValidChecksum(a.slice(0, 2 + j) + c + a.slice(3 + j))) pass++;
    if (t % 2000 === 1999) {
      setS("pass34", `computing… ${Math.round((100 * (t + 1)) / NT)}%`);
      await sleep();
    }
  }
  const lam = NT * (13 / 16) ** 40;
  let pk = Math.exp(-lam),
    cdf = pk,
    k = 0,
    a = null;
  while (cdf < 0.975) {
    if (a === null && cdf >= 0.025) a = k;
    k++;
    pk *= lam / k;
    cdf += pk;
  }
  if (a === null) a = k;
  setS("nt34", NT.toLocaleString("en"));
  setS("pass34", `${pass} (${((100 * pass) / NT).toFixed(4)}%)`);
  setS("exp34", `${lam.toFixed(1)} (0.0247%)`);
  setS("ci34", `${a}–${k}`);
}

const RUNS = { 31: run31, 32: run32, 33: run33, 34: run34 };
document.querySelectorAll("[data-run]").forEach(
  (b) =>
    (b.onclick = async () => {
      b.disabled = true;
      await RUNS[b.dataset.run]();
      b.disabled = false;
    }),
);

function hashDemo() {
  const d = new TextEncoder().encode($("hin").value);
  $("hk").textContent = hex(Wallet.keccak256(d));
  $("hs").textContent = hex(Wallet.sha3_256(d));
}
$("hin").addEventListener("input", hashDemo);

let moved = false;
["wheel", "touchstart", "keydown", "pointerdown"].forEach((e) =>
  addEventListener(e, () => (moved = true), { passive: true }),
);

(async () => {
  $("phrase").value = TEST_PHRASE;
  hashDemo();
  onScroll();
  await compute();
  await runTests();
  if (location.hash && !moved) $(location.hash.slice(1))?.scrollIntoView();
  await run31();
  await run33();
  await run32();
  await run34();
})();
