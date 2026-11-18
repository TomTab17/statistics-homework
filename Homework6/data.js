const UCB = {
  A: [512, 313, 89, 19],
  B: [353, 207, 17, 8],
  C: [120, 205, 202, 391],
  D: [138, 279, 131, 244],
  E: [53, 138, 94, 299],
  F: [22, 351, 24, 317],
};
const CELLS = [
  ["Male", "Admitted"],
  ["Male", "Rejected"],
  ["Female", "Admitted"],
  ["Female", "Rejected"],
];
const RECORDS = [];
for (const [dept, counts] of Object.entries(UCB))
  counts.forEach((c, k) => {
    for (let i = 0; i < c; i++)
      RECORDS.push({ dept, gender: CELLS[k][0], admit: CELLS[k][1] });
  });
