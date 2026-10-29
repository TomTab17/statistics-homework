const Walk = (() => {
  const model = (kind, p) =>
    kind === "bernoulli"
      ? { kind, mu: p, s2: p * (1 - p), lattice: 1 }
      : { kind, mu: 0, s2: 1, lattice: 2 };

  function* simulate(kind, p, n, m, checkpoints, keep) {
    const bern = kind === "bernoulli";
    const x = new Int8Array(n + 1),
      at = checkpoints.map(() => new Int32Array(m)),
      paths = [];
    for (let j = 0; j < m; j++) {
      for (let i = 1; i <= n; i++) {
        if (bern) x[i] = Math.random() < p ? 1 : 0;
        else x[i] = Math.random() < 0.5 ? 1 : -1;
      }
      const path = j < keep ? new Int32Array(n + 1) : null;
      let s = 0,
        c = 0;
      for (let i = 1; i <= n; i++) {
        s += x[i];
        if (path) path[i] = s;
        if (i === checkpoints[c]) at[c++][j] = s;
      }
      if (path) paths.push(path);
      if (j % 250 === 249) yield (j + 1) / m;
    }
    return { ...model(kind, p), n, m, checkpoints, at, paths };
  }

  return { simulate };
})();
