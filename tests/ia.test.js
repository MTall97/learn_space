/* Tests des fonctions d'apprentissage automatique et d'audio (assets/js/sims/ia.js). */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
global.window = global;
global.LS = global.LS || {};
require(path.join(__dirname, "..", "assets", "js", "sims", "ia.js"));
const LS = global.LS;
const proche = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ""} attendu ${b}, obtenu ${a}`);

test("WER : 1 suppression et 2 substitutions sur 10 mots = 30 %", () => {
  const w = LS.wer("un deux trois quatre cinq six sept huit neuf dix", "un deux trois quatre cinq 6 sept huit 9");
  assert.deepStrictEqual([w.S, w.D, w.I], [2, 1, 0]);
  proche(w.taux, 0.3, 1e-12);
});

test("WER au-delà de 100 % avec des insertions, CER bas pour une faute d'orthographe", () => {
  assert.ok(LS.wer("bonjour", "euh bonjour à tous").taux > 1);
  const ref = "le marché ouvre demain matin à sept heures", hyp = "le marcher ouvre demain matin à sept heures";
  proche(LS.wer(ref, hyp).taux, 1 / 8, 1e-12);
  assert.ok(LS.cer(ref, hyp) < 0.06);
});

test("BLEU : 1 sur une phrase identique, plus bas pour une paraphrase que pour une négation", () => {
  const c = LS.CAS_EVALUATION.traduction, h = n => c.hyps.find(x => x[0] === n)[1];
  proche(LS.bleu(c.ref, c.ref).score, 1, 1e-12);
  assert.ok(LS.bleu(c.ref, h("paraphrase")).score < LS.bleu(c.ref, h("negation")).score);
  assert.ok(LS.bleu(c.ref, "puits").bp < 0.1, "pénalité de brièveté");
});

test("descente de gradient : converge sur données séparables, plafonne sur le XOR", () => {
  for (const [type, ok] of [["separable", a => a >= 0.97], ["xor", a => a < 0.8]]) {
    const pts = LS.donneesNeurone(type, 100, 11);
    let w = { w1: 0, w2: 0, b: 0 };
    const p0 = LS.evaluerNeurone(pts, 0, 0, 0).perte;
    proche(p0, Math.log(2), 1e-9, "perte initiale");
    for (let i = 0; i < 500; i++) w = LS.pasGradient(pts, w, 0.5);
    const k = LS.evaluerNeurone(pts, w.w1, w.w2, w.b);
    assert.ok(ok(k.exactitude), type + " : exactitude " + k.exactitude);
  }
});

test("régression polynomiale : retrouve un polynôme exact, surapprend avec peu de points", () => {
  const xs = [-1, -0.6, -0.2, 0.1, 0.5, 0.9, 1], ys = xs.map(x => 2 - x + 3 * x * x);
  const c = LS.ajusterPolynome(xs, ys, 2, 0);
  xs.forEach((x, i) => proche(LS.evaluerPolynome(c, x), ys[i], 1e-6));
  const k = LS.courbesErreur({ n: 15, bruit: 0.3, lambda: 0, graine: 3 });
  assert.ok(k.res[11].val > 5 * k.res[11].train, "degré 12 avec 15 points");
  assert.ok(k.meilleur >= 3 && k.meilleur <= 8);
});

test("FFT : un sinus tombe dans la bonne case ; repliement à fe − f", () => {
  const N = 256, fe = 8000, f = 1000, re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) re[i] = Math.sin(2 * Math.PI * f * i / fe);
  LS.fft(re, im);
  const mod = Array.from(re, (v, k) => Math.hypot(v, im[k])).slice(0, N / 2);
  assert.strictEqual(mod.indexOf(Math.max(...mod)), f * N / fe);
  assert.strictEqual(LS.frequenceRepliee(5000, 8000), 3000);
});

test("fuite : le découpage par segment surestime, le découpage par série est proche du réel", () => {
  const r = LS.experienceFuite({ nbSeries: 10, parSerie: 25, style: 1, k: 5 }, 1);
  assert.ok(r.segment - r.reel >= 0.08, JSON.stringify(r));
  assert.ok(Math.abs(r.serie - r.reel) < 0.05, JSON.stringify(r));
});
