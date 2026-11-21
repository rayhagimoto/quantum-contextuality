// Complex matrices use interleaved real/imaginary entries in row-major order.
// Lüders measurement: P_s = (I + sA)/2, rho_s = P_s rho P_s / tr(P_s rho).
// See docs/foundations/projective-measurement.md and docs/examples/mermin-peres-square.md.
const PAULI = {
  I: [1,0, 0,0, 0,0, 1,0],
  X: [0,0, 1,0, 1,0, 0,0],
  Y: [0,0, 0,-1, 0,1, 0,0],
  Z: [1,0, 0,0, 0,0, -1,0]
};
function tensor(a, b) {
  const result = new Float64Array(32);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const x = 2 * (Math.floor(i / 2) * 2 + Math.floor(j / 2));
    const y = 2 * ((i % 2) * 2 + j % 2), k = 2 * (i * 4 + j);
    result[k] = a[x] * b[y] - a[x + 1] * b[y + 1];
    result[k + 1] = a[x] * b[y + 1] + a[x + 1] * b[y];
  }
  return result;
}
function multiply(a, b) {
  const result = new Float64Array(32);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) {
    const x = 2 * (i * 4 + k), y = 2 * (k * 4 + j), z = 2 * (i * 4 + j);
    result[z] += a[x] * b[y] - a[x + 1] * b[y + 1];
    result[z + 1] += a[x] * b[y + 1] + a[x + 1] * b[y];
  }
  return result;
}
const identity = tensor(PAULI.I, PAULI.I);
const observable = name => tensor(PAULI[name[0]], PAULI[name[1]]);
export const OPERATORS = ['XI','IX','XX','XZ','ZX','YY','IZ','ZI','ZZ'].map(observable);
export const OPERATOR_NAMES = ['X₁', 'X₂', 'X₁X₂', 'X₁Z₂', 'Z₁X₂', 'Y₁Y₂', 'Z₂', 'Z₁', 'Z₁Z₂'];
export const CONTEXTS = [
  { name: 'Row 1', cells: [0,1,2], product: 1 },
  { name: 'Row 2', cells: [3,4,5], product: 1 },
  { name: 'Row 3', cells: [6,7,8], product: 1 },
  { name: 'Column 1', cells: [0,3,6], product: 1 },
  { name: 'Column 2', cells: [1,4,7], product: 1 },
  { name: 'Column 3', cells: [2,5,8], product: -1 }
];
export const OUTCOMES = Array.from({ length: 8 }, (_, i) => [4,2,1].map(bit => i & bit ? -1 : 1));
export function freshState() { return identity.map(value => value / 4); }
function expectation(state, operator) {
  const result = multiply(state, operator);
  return result[0] + result[10] + result[20] + result[30];
}
export function probability(state, index, sign) {
  return Math.max(0, Math.min(1, (1 + sign * expectation(state, OPERATORS[index])) / 2));
}
export function project(state, index, sign) {
  const p = probability(state, index, sign);
  if (p < 1e-12) return null;
  const projector = identity.map((value, k) => (value + sign * OPERATORS[index][k]) / 2);
  return { outcome: sign, probability: p, state: multiply(multiply(projector, state), projector).map(value => value / p) };
}
export function measure(state, index, random = Math.random) {
  const p = probability(state, index, 1);
  return project(state, index, random() < p ? 1 : -1);
}
export function localBloch(state) {
  return ['XI','YI','ZI','IX','IY','IZ'].map(name => expectation(state, observable(name)));
}
export function sampleContext(context, first, random = Math.random) {
  const cells = CONTEXTS[context].cells;
  const order = [first, ...cells.filter(index => index !== first)];
  let state = freshState();
  const values = new Map();
  for (const index of order) {
    const result = measure(state, index, random);
    state = result.state;
    values.set(index, result.outcome);
  }
  return { outcomes: cells.map(index => values.get(index)), state };
}
export function outcomeIndex(outcomes) {
  return outcomes.reduce((index, sign) => index * 2 + Number(sign === -1), 0);
}
