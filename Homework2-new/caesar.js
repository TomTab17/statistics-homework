const Caesar = (() => {
  const mod26 = (x) => ((x % 26) + 26) % 26;

  function shift(text, s) {
    s = mod26(s);
    let out = "";
    for (const ch of text) {
      const c = ch.charCodeAt(0);
      if (c >= 65 && c <= 90)
        out += String.fromCharCode(65 + ((c - 65 + s) % 26));
      else if (c >= 97 && c <= 122)
        out += String.fromCharCode(97 + ((c - 97 + s) % 26));
      else out += ch;
    }
    return out;
  }
  const encrypt = (text, s) => shift(text, s);
  const decrypt = (text, s) => shift(text, -s);

  function letters(text) {
    const out = [];
    for (const ch of text) {
      const c = ch.charCodeAt(0);
      if (c >= 65 && c <= 90) out.push(c - 65);
      else if (c >= 97 && c <= 122) out.push(c - 97);
    }
    return out;
  }
  function counts(ls) {
    const c = new Array(26).fill(0);
    for (const x of ls) c[x]++;
    return c;
  }

  function train(text) {
    const ls = letters(text),
      uni = counts(ls),
      pairs = new Array(676).fill(0);
    for (let i = 0; i + 1 < ls.length; i++) pairs[ls[i] * 26 + ls[i + 1]]++;
    const N = ls.length,
      N2 = N - 1;
    return {
      N,
      N2,
      p: uni.map((c) => c / N),
      logP2: pairs.map((c) => Math.log((c + 1) / (N2 + 676))),
    };
  }

  function chi2(O, N, p, s) {
    let x = 0;
    for (let c = 0; c < 26; c++) {
      const E = N * p[c],
        o = O[(c + s) % 26];
      x += ((o - E) * (o - E)) / E;
    }
    return x;
  }

  function analyse(ls, model) {
    const N = ls.length,
      O = counts(ls);
    const chi = [],
      bi = [];
    for (let s = 0; s < 26; s++) {
      chi.push(N ? chi2(O, N, model.p, s) : 0);
      let b = 0;
      for (let i = 0; i + 1 < N; i++)
        b += model.logP2[mod26(ls[i] - s) * 26 + mod26(ls[i + 1] - s)];
      bi.push(b);
    }
    const top = O.indexOf(Math.max(...O));
    return {
      N,
      O,
      chi,
      bi,
      naive: mod26(top - 4),
      byChi: chi.indexOf(Math.min(...chi)),
      byBigram: bi.indexOf(Math.max(...bi)),
    };
  }

  function ic(ls) {
    const O = counts(ls),
      N = ls.length;
    return N > 1 ? O.reduce((s, f) => s + f * (f - 1), 0) / (N * (N - 1)) : 0;
  }

  return { encrypt, decrypt, letters, counts, train, analyse, ic };
})();
