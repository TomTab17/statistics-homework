const $ = (id) => document.getElementById(id);
const sleep = () => new Promise((r) => setTimeout(r, 0));
const h64 = (x) => x.toString(16).padStart(64, "0");
const short = (h, a = 8, b = 6) =>
  h.length > a + b + 1 ? `${h.slice(0, a)}…${h.slice(-b)}` : h;
const comp = (P) => (P[1] & 1n ? "03" : "02") + h64(P[0]);
const fmt = (x) => x.toLocaleString("en");
const pct = (x, d = 1) => (100 * x).toFixed(d) + "%";
const esc = (s) =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const sup = (n) => `<sup>${n}</sup>`;
const sci = (x, d = 1) => {
  if (x < 1e5) return fmt(Math.round(x));
  let e = Math.floor(Math.log10(x)),
    m = +(x / 10 ** e).toFixed(d);
  if (m >= 10) {
    m /= 10;
    e++;
  }
  return `${m.toFixed(d)} × 10${sup(e)}`;
};
const msNow = () => performance.now();

function setV(key, html) {
  document
    .querySelectorAll(`[data-v="${key}"]`)
    .forEach((el) => (el.innerHTML = html));
}
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
function dur(s) {
  if (s < 1e-6) return "< 1 µs";
  if (s < 1e-3) return (s * 1e6).toFixed(0) + " µs";
  if (s < 1) return (s * 1e3).toFixed(0) + " ms";
  if (s < 60) return s.toFixed(1) + " s";
  if (s < 3600) return (s / 60).toFixed(1) + " min";
  if (s < 86400) return (s / 3600).toFixed(1) + " h";
  const d = s / 86400;
  if (d < 365) return d.toFixed(1) + " days";
  return sci(d / 365.25) + " years";
}
function bytesFmt(b) {
  const u = ["B", "kB", "MB", "GB", "TB", "PB", "EB", "ZB"];
  let i = 0;
  while (b >= 1000 && i < u.length - 1) {
    b /= 1000;
    i++;
  }
  return b < 1000
    ? `${b < 10 ? b.toFixed(1) : Math.round(b)} ${u[i]}`
    : `${sci(b * 1e21)} B`;
}
const cut = (t, n) => {
  const a = Array.from(t);
  return a.length > n ? a.slice(0, n).join("") + "…" : t;
};
const charOf = (b) =>
  b === 32
    ? "␣"
    : b > 32 && b < 127
      ? esc(String.fromCharCode(b))
      : "0x" + b.toString(16).padStart(2, "0");

function bars(id, vals, labels, o = {}) {
  const W = 460,
    H = o.h || 190,
    l = 8,
    b = 24,
    t = 16,
    n = vals.length,
    w = (W - 2 * l) / n;
  const max = (o.max ?? Math.max(1e-9, ...vals, ...(o.exp || []))) * 1.08,
    ph = H - b - t;
  const Y = (v) => H - b - (v / max) * ph;
  let h = "";
  vals.forEach((v, i) => {
    const x = l + i * w + w * 0.14;
    h += `<rect class="c-bar${i === o.hl ? " best" : ""}" x="${x}" y="${Y(v)}" width="${w * 0.72}" height="${Math.max(0, H - b - Y(v))}" rx="2"/>`;
    if (i % (o.every || 1) === 0)
      h += `<text class="c-tick" x="${x + w * 0.36}" y="${H - 7}">${labels[i]}</text>`;
    if (i === o.hl && o.mark)
      h += `<text class="c-val" x="${x + w * 0.36}" y="${Y(v) - 5}">${o.mark}</text>`;
  });
  if (o.exp)
    h += `<polyline class="c-ref" fill="none" points="${o.exp.map((v, i) => `${l + i * w + w / 2},${Y(v)}`).join(" ")}"/>`;
  const el = $(id);
  el.setAttribute("viewBox", `0 0 ${W} ${H}`);
  el.innerHTML = h;
}

function lines(id, labels, series) {
  const W = 460,
    H = 230,
    l = 38,
    r = 10,
    t = 12,
    b = 30,
    n = labels.length;
  const X = (i) => l + ((i + 0.5) * (W - l - r)) / n,
    Y = (v) => H - b - (v / 100) * (H - b - t);
  let h = "";
  for (const v of [0, 25, 50, 75, 100])
    h += `<line class="g-line" x1="${l}" y1="${Y(v)}" x2="${W - r}" y2="${Y(v)}"/><text class="c-axt" x="${l - 6}" y="${Y(v) + 3.5}" text-anchor="end">${v}%</text>`;
  labels.forEach(
    (lab, i) =>
      (h += `<text class="c-tick" x="${X(i)}" y="${H - 12}">${lab}</text>`),
  );
  for (const s of series) {
    h += `<polyline class="ln ${s.cls}" points="${s.vals.map((v, i) => `${X(i)},${Y(v)}`).join(" ")}"/>`;
    s.vals.forEach(
      (v, i) =>
        (h += `<circle class="dt ${s.cls}" cx="${X(i)}" cy="${Y(v)}" r="3.2"/>`),
    );
  }
  const el = $(id);
  el.setAttribute("viewBox", `0 0 ${W} ${H}`);
  el.innerHTML = h;
}

const DEFAULT_MSG = "THE ENEMY PLANS ARE HIDDEN IN THE SAFE";
const St = {
  bits: 20,
  key: null,
  ct: [],
  bytes: new Uint8Array(),
  token: 0,
};
const K = () => 2n ** BigInt(St.bits);

function renderKey() {
  const { k, Q } = St.key;
  setV("b", St.bits);
  setV("kShort", `k = ${fmt(k)}`);
  setV("kFull", `${fmt(k)} <span class="dim">= 0x${k.toString(16)}</span>`);
  setV("qShort", short(comp(Q), 14, 10));
  setV("qFull", `x&nbsp;=&nbsp;${h64(Q[0])}<br>y&nbsp;=&nbsp;${h64(Q[1])}`);
  setV("kSpace", `K = 2${sup(St.bits)} = ${fmt(K())} keys`);
}

async function encryptAll() {
  const my = ++St.token,
    st = $("status");
  const bytes = new TextEncoder().encode($("msg").value);
  resetAttack();
  if (!bytes.length) {
    st.className = "status bad";
    st.textContent = "Type a message to encrypt.";
    St.ct = [];
    St.bytes = new Uint8Array();
    clearPart1();
    return;
  }
  st.className = "status";
  st.textContent = "Encrypting…";
  const ct = [];
  for (let i = 0; i < bytes.length; i++) {
    ct.push(ECC.encryptByte(bytes[i], St.key.Q));
    if (i % 6 === 5) {
      await sleep();
      if (my !== St.token) return;
    }
  }
  if (my !== St.token) return;
  St.ct = ct;
  St.bytes = bytes;
  const dec = ct.map((c) => ECC.decryptPair(c.C1, c.C2, St.key.k));
  renderPart1(dec);
}

function clearPart1() {
  [
    "nbytes",
    "msgShort",
    "ptsShort",
    "ctShort",
    "ctBytes",
    "decShort",
    "decOk",
  ].forEach((k) => setV(k, "—"));
  setV("ctBytesLong", "no message");
  ["tEnc", "tCt", "tDec"].forEach((id) => ($(id).innerHTML = ""));
  $("encNote").textContent = "";
  $("decOut").textContent = "—";
}

function renderPart1(dec) {
  const ct = St.ct,
    bytes = St.bytes,
    msg = new TextDecoder().decode(bytes);
  const out = new TextDecoder().decode(Uint8Array.from(dec.map((d) => d.m)));
  const ok = out === msg;
  const st = $("status");
  st.className = "status " + (ok ? "ok" : "bad");
  st.textContent = `${bytes.length} bytes encrypted and decrypted · ${ok ? "decryption matches the message" : "decryption error"}`;

  setV("nbytes", `${bytes.length} bytes`);
  setV("msgShort", esc(cut(msg, 44)));
  setV("ptsShort", `M<sub>1</sub> = (${short(h64(ct[0].M[0]), 6, 6)}, …)`);
  setV(
    "ctShort",
    `C<sub>1</sub> = ${short(comp(ct[0].C1), 8, 6)}<br>C<sub>2</sub> = ${short(comp(ct[0].C2), 8, 6)}`,
  );
  setV("ctBytes", `${fmt(bytes.length * 66)} bytes`);
  setV(
    "ctBytesLong",
    `${fmt(bytes.length)} bytes of message → ${fmt(bytes.length * 66)} bytes of ciphertext`,
  );
  setV("decShort", esc(cut(out, 44)));
  setV("decOk", ok ? "✓ equal" : "✗");

  let h =
    "<thead><tr><th>#</th><th>Char</th><th><i class='nt'>m</i></th><th><i class='nt'>j</i></th><th><i class='nt'>x</i> of <i class='nt'>M = 256·m + j</i></th></tr></thead><tbody>";
  ct.forEach((c, i) => {
    h += `<tr><td>${i + 1}</td><td>${charOf(c.m)}</td><td class="c">${c.m}</td><td class="c">${c.j}</td><td class="c">${short(h64(c.M[0]), 10, 8)}</td></tr>`;
  });
  $("tEnc").innerHTML = h + "</tbody>";
  const js = ct.map((c) => c.j);
  $("encNote").textContent =
    `In this message j goes from ${Math.min(...js)} to ${Math.max(...js)}, with mean ${(js.reduce((s, v) => s + v, 0) / js.length).toFixed(2)} (the expected value is about 1). The x coordinates are small numbers, but this does not matter: M is hidden by the mask in the next step.`;

  h =
    "<thead><tr><th>#</th><th>Char</th><th><i class='nt'>r</i></th><th><i class='nt'>C<sub>1</sub> = r·G</i></th><th><i class='nt'>C<sub>2</sub> = M + r·Q</i></th></tr></thead><tbody>";
  ct.forEach((c, i) => {
    h += `<tr><td>${i + 1}</td><td>${charOf(c.m)}</td><td class="c">${short(h64(c.r), 6, 4)}</td><td class="c">${short(comp(c.C1), 8, 6)}</td><td class="c">${short(comp(c.C2), 8, 6)}</td></tr>`;
  });
  $("tCt").innerHTML = h + "</tbody>";

  h =
    "<thead><tr><th>#</th><th><i class='nt'>S = k·C<sub>1</sub></i></th><th><i class='nt'>x</i> of <i class='nt'>M = C<sub>2</sub> − S</i></th><th><i class='nt'>m</i></th><th>Char</th></tr></thead><tbody>";
  dec.forEach((d, i) => {
    h += `<tr><td>${i + 1}</td><td class="c">${short(comp(d.S), 8, 6)}</td><td class="c">${short(h64(d.M[0]), 10, 8)}</td><td class="c">${d.m}</td><td>${charOf(d.m)}</td></tr>`;
  });
  $("tDec").innerHTML = h + "</tbody>";
  $("decOut").textContent = out;
}

async function newKey() {
  St.bits = +$("bits").value;
  St.key = ECC.keyGen(St.bits);
  renderKey();
  await encryptAll();
}

let debMsg;
$("msg").addEventListener("input", () => {
  clearTimeout(debMsg);
  debMsg = setTimeout(() => {
    encryptAll();
    renderCaesar();
    if (Att.source === "msg") useMsgCipher();
  }, 300);
});
$("newkey").onclick = newKey;
$("bits").onchange = newKey;
$("again").onclick = encryptAll;

const VIEW = {
  key: [["key"], []],
  pub: [["key", "pub"], ["key"]],
  pts: [["msg", "pts"], ["msg"]],
  ct: [["pub", "pts", "ct"], ["pts"]],
  dec: [["key", "ct", "dec"], ["ct"]],
};
const stepEls = [...document.querySelectorAll(".step")];
let active = null;
function setActive(el) {
  if (el === active) return;
  if (active) active.classList.remove("active");
  active = el;
  el.classList.add("active");
  const [nodes, edges] = VIEW[el.dataset.n];
  document
    .querySelectorAll(".node")
    .forEach((x) => x.classList.toggle("on", nodes.includes(x.dataset.n)));
  document
    .querySelectorAll(".edge")
    .forEach((x) => x.classList.toggle("on", edges.includes(x.dataset.e)));
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

const caesarKey = () => {
  const s = Math.min(25, Math.max(0, Math.round(+$("cs").value) || 0));
  return s;
};
function renderCaesar() {
  const s = caesarKey(),
    msg = $("msg").value,
    used = new Set(Caesar.letters(msg));
  let h = "";
  for (let i = 0; i < 26; i++)
    h += `<span class="${used.has(i) ? "u" : ""}">${ABC[i]}</span>`;
  for (let i = 0; i < 26; i++)
    h += `<span class="c">${ABC[(i + s) % 26]}</span>`;
  $("strip").innerHTML = h;
  const c = Caesar.encrypt(msg, s);
  $("cPlain").textContent = msg;
  $("cCipher").textContent = c;
  $("cDec").textContent = Caesar.decrypt(c, s);
  renderCaesarStats();
}
$("cs").addEventListener("input", () => {
  renderCaesar();
  if (Att.source === "msg") useMsgCipher();
});
$("cs").addEventListener("change", () => ($("cs").value = caesarKey()));

const SAMPLE = CORPUS.test.slice(0, 300);
function renderCaesarStats() {
  const s = caesarKey(),
    pl = Caesar.letters(SAMPLE),
    cl = Caesar.letters(Caesar.encrypt(SAMPLE, s));
  const cp = Caesar.counts(pl),
    cc = Caesar.counts(cl);
  setS("smpChars", SAMPLE.length);
  setS("smpLetters", pl.length);
  setS("cs", s);
  setS("peak", ABC[cc.indexOf(Math.max(...cc))]);
  setS("icP", Caesar.ic(pl).toFixed(4));
  setS("icC", Caesar.ic(cl).toFixed(4));
  const mx = Math.max(...cp, ...cc);
  bars("hP", cp, [...ABC], { max: mx, h: 150 });
  bars("hC", cc, [...ABC], { max: mx, h: 150 });
}

async function eccSampleStats() {
  const Q = ECC.keyGen(20).Q,
    bytes = new TextEncoder().encode(SAMPLE),
    ct = [];
  setS("chiE", "computing…");
  for (let i = 0; i < bytes.length; i++) {
    ct.push(ECC.encryptByte(bytes[i], Q));
    if (i % 8 === 7) await sleep();
  }
  const eIdx = ct.filter((c) => c.m === 69 || c.m === 101);
  setS("nE", eIdx.length);
  setS("dE", new Set(eIdx.map((c) => comp(c.C2))).size);
  const counts = new Array(16).fill(0);
  for (const c of ct) for (const d of h64(c.C2[0])) counts[parseInt(d, 16)]++;
  const E = (ct.length * 64) / 16,
    chi = counts.reduce((s, o) => s + (o - E) ** 2 / E, 0);
  setS("chiE", chi.toFixed(1));
  setS(
    "chiEv",
    chi < 25
      ? "The hypothesis of uniform digits is therefore not rejected."
      : "This run is above the critical value, which happens about once every twenty runs even with perfectly uniform digits.",
  );
  bars("hE", counts, [..."0123456789abcdef"], {
    exp: new Array(16).fill(E),
    h: 150,
  });
}

const MODEL = Caesar.train(CORPUS.train);
const TESTL = Caesar.letters(CORPUS.test);

function renderCorpus() {
  setS("cN", fmt(MODEL.N));
  setS("cN2", fmt(MODEL.N2));
  setS("cIC", Caesar.ic(Caesar.letters(CORPUS.train)).toFixed(4));
  bars(
    "hRef",
    MODEL.p.map((v) => v * 100),
    [...ABC],
    { h: 180 },
  );
}

const Att = { source: "msg", key: null };
function attack() {
  const text = $("actext").value,
    ls = Caesar.letters(text);
  if (ls.length < 2) {
    setS("aKey", "—");
    setS("aKeyNote", "at least 2 letters needed");
    setS("aMin", "—");
    setS("aSecond", "—");
    $("aplain").textContent = "";
    $("hChi").innerHTML = $("hFit").innerHTML = $("tEx").innerHTML = "";
    return;
  }
  const r = Caesar.analyse(ls, MODEL),
    sh = r.byChi;
  const sorted = [...r.chi].sort((a, b) => a - b);
  setS("aKey", `ŝ = ${sh}`);
  setS(
    "aKeyNote",
    Att.key === null
      ? `recovered key (${ls.length} letters)`
      : sh === Att.key
        ? `correct key (${ls.length} letters)`
        : `wrong: the key was ${Att.key}`,
  );
  setS("aMin", sorted[0].toFixed(1));
  setS("aSecond", sorted[1].toFixed(1));
  const plain = Caesar.decrypt(text, sh);
  $("aplain").innerHTML =
    `<b>Decrypted with ŝ = ${sh}:</b> ${esc(plain.length > 400 ? plain.slice(0, 400) + "…" : plain)}`;
  bars(
    "hChi",
    r.chi.map((v) => Math.log10(1 + v)),
    r.chi.map((_, i) => i),
    { hl: sh, mark: "ŝ", h: 170 },
  );
  const O = r.O.map((_, c) => (100 * r.O[(c + sh) % 26]) / r.N);
  bars("hFit", O, [...ABC], { exp: MODEL.p.map((v) => v * 100), h: 170 });

  let h =
    "<thead><tr><th><i class='nt'>s</i></th><th><i class='nt'>χ²(s)</i></th><th><i class='nt'>B(s)</i></th><th>Candidate plaintext</th></tr></thead><tbody>";
  for (let s = 0; s < 26; s++) {
    const cand = Caesar.decrypt(text, s).replace(/\s+/g, " ").trim();
    const tags =
      (s === r.byChi ? '<span class="tg">χ²</span>' : "") +
      (s === r.byBigram ? '<span class="tg b">bigram</span>' : "");
    h += `<tr class="${s === r.byChi ? "best" : ""}"><td class="c">${s}${tags}</td><td class="c">${r.chi[s].toFixed(1)}</td><td class="c">${r.bi[s].toFixed(1)}</td><td class="c">${esc(cand.length > 34 ? cand.slice(0, 34) + "…" : cand)}</td></tr>`;
  }
  $("tEx").innerHTML = h + "</tbody>";
}

function randomExcerpt(L) {
  const txt = CORPUS.test;
  let start = Math.floor(Math.random() * (txt.length - 20 * L - 10));
  start = txt.indexOf(" ", start) + 1;
  let i = start,
    c = 0;
  while (c < L && i < txt.length) {
    if (/[A-Za-z]/.test(txt[i])) c++;
    i++;
  }
  return txt.slice(start, i);
}
function useMsgCipher() {
  Att.source = "msg";
  Att.key = caesarKey();
  $("actext").value = Caesar.encrypt($("msg").value, Att.key);
  attack();
}
$("amsg").onclick = useMsgCipher;
$("arand").onclick = () => {
  Att.source = "rand";
  Att.key = 1 + Math.floor(Math.random() * 25);
  $("actext").value = Caesar.encrypt(randomExcerpt(+$("alen").value), Att.key);
  attack();
};
$("alen").onchange = $("arand").onclick;
$("actext").addEventListener("input", () => {
  Att.source = "edit";
  Att.key = null;
  attack();
});

const LENS = [3, 5, 8, 10, 15, 20, 30, 50, 75, 100],
  TRIALS = 1000;
function experiment() {
  const res = LENS.map((L) => {
    let a = 0,
      b = 0,
      c = 0;
    for (let t = 0; t < TRIALS; t++) {
      const st = Math.floor(Math.random() * (TESTL.length - L)),
        s = Math.floor(Math.random() * 26);
      const ls = TESTL.slice(st, st + L).map((x) => (x + s) % 26);
      const r = Caesar.analyse(ls, MODEL);
      a += r.naive === s;
      b += r.byChi === s;
      c += r.byBigram === s;
    }
    return [a / TRIALS, b / TRIALS, c / TRIALS];
  });
  lines("lExp", LENS, [
    { cls: "l3", vals: res.map((r) => 100 * r[0]) },
    { cls: "l1", vals: res.map((r) => 100 * r[1]) },
    { cls: "l2", vals: res.map((r) => 100 * r[2]) },
  ]);
  let h =
    "<thead><tr><th>Letters</th><th>Most frequent = E</th><th><i class='nt'>χ²</i></th><th>Bigram</th></tr></thead><tbody>";
  LENS.forEach(
    (L, i) =>
      (h += `<tr><td class="c">${L}</td><td class="c">${pct(res[i][0])}</td><td class="c">${pct(res[i][1])}</td><td class="c">${pct(res[i][2])}</td></tr>`),
  );
  $("tExp").innerHTML = h + "</tbody>";
  const at = (L) => res[LENS.indexOf(L)];
  setS("eT", fmt(TRIALS));
  setS("eSE", (100 * Math.sqrt(0.25 / TRIALS)).toFixed(1));
  setS("e10", pct(at(10)[1], 0));
  setS("e20", pct(at(20)[1], 0));
  setS("e50", pct(at(50)[1], 1));
  setS("b10", pct(at(10)[2], 0));
  setS("n100", pct(at(100)[0], 0));
}
$("erun").onclick = experiment;

const STRESS = [
  [
    "Ordinary English",
    "Sir Walter Elliot, of Kellynch Hall, in Somersetshire, was a man who never took up any book but the Baronetage.",
  ],
  ["Very short", "BUY MILK"],
  ["Short", "CALL ME AT SIX"],
  [
    "No letter E",
    "A small dog ran away from a young girl in a big park. It ran past a pond, around a tall oak and into a dark wood full of birds, and a kind man found it at night, cold and hungry but still happy, and took it back to its family.",
  ],
  [
    "Rare letters",
    "Jazz quiz: lazy vexed jocks fizz, quirky zebras buzz, and wavy fjords jinx my plucky boxing wizard.",
  ],
  ["Italian", "Ci vediamo domani sera alle nove davanti al teatro."],
];
function stress() {
  const s = 7;
  const cell = (k) =>
    k === s ? '<td class="ok">✓</td>' : `<td class="no">✗ ${k}</td>`;
  let h =
    "<thead><tr><th>Plaintext</th><th>Letters</th><th>E</th><th><i class='nt'>χ²</i></th><th>Bigram</th><th>Min <i class='nt'>χ²</i></th></tr></thead><tbody>";
  for (const [name, text] of STRESS) {
    const ls = Caesar.letters(Caesar.encrypt(text, s)),
      r = Caesar.analyse(ls, MODEL);
    h += `<tr><td><b>${name}</b><br><small class="note">${esc(text.length > 38 ? text.slice(0, 38) + "…" : text)}</small></td><td>${ls.length}</td>${cell(r.naive)}${cell(r.byChi)}${cell(r.byBigram)}<td class="c">${Math.min(...r.chi).toFixed(1)}</td></tr>`;
  }
  $("tStress").innerHTML = h + "</tbody>";
}

const BF = { run: false, stop: false, t: null, k: null };
const BS = { t: null, m: null };
let RATE = null;

function resetAttack() {
  BF.stop = true;
  BF.t = BS.t = null;
  $("bfbar").style.width = "0";
  ["bfK", "bfT", "bfR", "bsM", "bsS", "bsT"].forEach((k) => setS(k, "—"));
  $("bfout").textContent = "The result will appear here.";
  $("bsout").textContent = "The result will appear here.";
  setH(
    "bsCmp",
    "Running both attacks on the same key shows the difference in practice.",
  );
}

function decryptWith(k) {
  const bytes = St.ct.map((c) => ECC.decryptPair(c.C1, c.C2, k).m);
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

function compare() {
  if (BF.t === null || BS.t === null) return;
  setH(
    "bsCmp",
    `On this key, brute force needed ${fmt(BF.k)} additions and ${dur(BF.t)}, while baby-step giant-step needed at most ${fmt(2n * BS.m)} additions and ${dur(BS.t)}. The gap grows with the key space: with <span class="m">K = 2<sup>24</sup></span> brute force needs up to about 16.8 million additions, baby-step giant-step at most 8,192.`,
  );
}

$("bfrun").onclick = async () => {
  if (BF.run) return;
  if (!St.key || !St.ct.length) {
    $("bfout").textContent = "Type a message in Part I first.";
    return;
  }
  const my = St.token,
    Q = St.key.Q,
    lim = K();
  BF.run = true;
  BF.stop = false;
  $("bfrun").disabled = true;
  $("bfstop").disabled = false;
  $("bfout").textContent = "Searching…";
  const gen = ECC.bruteForce(Q, lim),
    t0 = msNow();
  let res,
    last = t0;
  for (;;) {
    res = gen.next();
    if (res.done) break;
    if (msNow() - last > 40) {
      const el = (msNow() - t0) / 1000,
        k = Number(res.value);
      $("bfbar").style.width = (100 * k) / Number(lim) + "%";
      setS("bfK", fmt(k));
      setS("bfT", dur(el));
      setS("bfR", fmt(Math.round(k / el)));
      await sleep();
      last = msNow();
      if (BF.stop || my !== St.token) break;
    }
  }
  BF.run = false;
  $("bfrun").disabled = false;
  $("bfstop").disabled = true;
  if (my !== St.token) return;
  if (!res.done) {
    $("bfout").textContent = "Stopped before the key was found.";
    return;
  }
  const el = (msNow() - t0) / 1000,
    k = res.value;
  if (k === null) {
    $("bfout").textContent = "Key not found in the range.";
    return;
  }
  $("bfbar").style.width = (100 * Number(k)) / Number(lim) + "%";
  setS("bfK", fmt(k));
  setS("bfT", dur(el));
  setS("bfR", el > 0.2 ? fmt(Math.round(Number(k) / el)) : "—");
  if (el > 0.5) {
    RATE = Number(k) / el;
    extrapolate();
  }
  BF.t = el;
  BF.k = k;
  $("bfout").innerHTML =
    `<b>Recovered k = ${fmt(k)}</b> (${k === St.key.k ? "equal to the real private key" : "different from the real key"}), after ${pct(Number(k) / Number(lim))} of the key space.<br><b>Decrypted ciphertext:</b> ${esc(decryptWith(k))}`;
  compare();
};
$("bfstop").onclick = () => (BF.stop = true);

$("bsrun").onclick = async () => {
  if (!St.key || !St.ct.length) {
    $("bsout").textContent = "Type a message in Part I first.";
    return;
  }
  const my = St.token,
    t0 = msNow();
  $("bsrun").disabled = true;
  $("bsout").textContent = "Computing the baby steps…";
  const gen = ECC.bsgs(St.key.Q, K());
  let res;
  for (;;) {
    res = gen.next();
    if (res.done) break;
    $("bsout").textContent =
      res.value.phase === "baby"
        ? `Baby steps: ${fmt(Number(res.value.done))} of ${fmt(Number(res.value.m))}`
        : `Giant steps: ${fmt(Number(res.value.done))} of ${fmt(Number(res.value.m))}`;
    await sleep();
    if (my !== St.token) break;
  }
  $("bsrun").disabled = false;
  if (my !== St.token || !res.done) return;
  const el = (msNow() - t0) / 1000,
    { k, m } = res.value;
  setS("bsM", fmt(m));
  setS("bsS", fmt(2n * m));
  setS("bsT", dur(el));
  BS.t = el;
  BS.m = m;
  $("bsout").innerHTML =
    k === null
      ? "Key not found in the range."
      : `<b>Recovered k = ${fmt(k)}</b> = ${fmt((k - 1n) / m)} · ${fmt(m)} + ${fmt(k - ((k - 1n) / m) * m)} (${k === St.key.k ? "equal to the real private key" : "different from the real key"}).<br><b>Decrypted ciphertext:</b> ${esc(decryptWith(k))}`;
  compare();
};

function benchmark() {
  const target = ECC.mul(2n ** 200n + 12345n),
    gen = ECC.bruteForce(target, 2n ** 40n),
    t0 = msNow();
  let k = 0;
  while (msNow() - t0 < 300) k = Number(gen.next().value);
  RATE = k / ((msNow() - t0) / 1000);
}

function extrapolate() {
  const rows = [
    [20, "2<sup>20</sup>"],
    [32, "2<sup>32</sup>"],
    [64, "2<sup>64</sup>"],
    [128, "2<sup>128</sup>"],
    [256, "2<sup>256</sup> (full key)"],
  ];
  setS("rate", fmt(Math.round(RATE)));
  let h =
    "<thead><tr><th>Key space <i class='nt'>K</i></th><th>Brute force (<i class='nt'>K/2</i>)</th><th>BSGS or rho (<i class='nt'>√K</i>)</th><th>BSGS memory</th><th><i class='nt'>√K</i>, 10<sup>15</sup> × faster</th></tr></thead><tbody>";
  for (const [b, lab] of rows) {
    const K2 = 2 ** (b - 1),
      sq = 2 ** (b / 2);
    h += `<tr><td>${lab}</td><td class="c">${dur(K2 / RATE)}</td><td class="c">${dur((2 * sq) / RATE)}</td><td class="c">${bytesFmt(sq * 64)}</td><td class="c">${dur((2 * sq) / (RATE * 1e15))}</td></tr>`;
  }
  $("tExtra").innerHTML = h + "</tbody>";
  const years = (2 * 2 ** 128) / (RATE * 1e15) / 3.15576e7,
    ratio = years / 1.4e10;
  setS(
    "ageCmp",
    ratio >= 1.5
      ? `about ${Math.round(ratio)} times the age of the universe`
      : ratio >= 0.5
        ? "about as long as the age of the universe"
        : `about ${pct(ratio, 0)} of the age of the universe`,
  );
}

let moved = false;
["wheel", "touchstart", "keydown", "pointerdown"].forEach((e) =>
  addEventListener(e, () => (moved = true), { passive: true }),
);

(async () => {
  $("msg").value = DEFAULT_MSG;
  renderCorpus();
  renderCaesar();
  useMsgCipher();
  experiment();
  stress();
  onScroll();
  St.bits = +$("bits").value;
  St.key = ECC.keyGen(St.bits);
  renderKey();
  benchmark();
  extrapolate();
  await encryptAll();
  if (location.hash && !moved) $(location.hash.slice(1))?.scrollIntoView();
  await eccSampleStats();
})();
