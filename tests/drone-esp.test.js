/* Tests du drone (assets/js/sims/drone.js) et des broches de bus de l'ESP32 (assets/js/sims/esp32.js). */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
global.window = global;
global.LS = global.LS || {};
global.LS.sims = global.LS.sims || {};
require(path.join(__dirname, "..", "assets", "js", "sims", "drone.js"));
require(path.join(__dirname, "..", "assets", "js", "sims", "esp32.js"));
const LS = global.LS;

test("panne d'un moteur : le drone tourne dans le sens donné par le mixage", () => {
  for (let i = 0; i < 4; i++) {
    const m = LS.mixageQuad(0.5, 0, 0, 0, i);
    const lacet = (m[1] + m[2] - m[0] - m[3]) / 2;   // même convention que la simulation (+ = horaire)
    assert.strictEqual(Math.sign(lacet), LS.sensRotationPanne(i), `moteur ${i}`);
  }
});

test("puissance des moteurs plafonnée selon la taille", () => {
  const k = LS.bilanDrone({ helice: 10, kv: 2400, cellules: 6, capacite: 5000, crate: 75, charge: 600 });
  assert.ok(k.limite && k.Pmax <= 1500, `10 pouces : ${k.Pmax} W`);
  const k5 = LS.bilanDrone({ helice: 5, kv: 2400, cellules: 4, capacite: 1500, crate: 75, charge: 120 });
  assert.ok(!k5.limite && k5.Pmax > 250 && k5.Pmax < 450, `5 pouces 4S : ${k5.Pmax} W`);
});

test("ESP32 : le dessin des bus utilise les broches du code affiché", () => {
  const { UART, I2C } = LS.BUS_ESP32, D = LS.BROCHES_ESP32.droite;
  assert.ok(D.includes(UART.tx) && D.includes(UART.rx) && D.includes(I2C.sda) && D.includes(I2C.scl));
  assert.ok(!["1", "3"].includes(UART.tx) && !["1", "3"].includes(UART.rx), "pas l'UART0 de l'USB");
  assert.match(UART.code, new RegExp(`${UART.rx}, ${UART.tx}\\)`));
  assert.match(I2C.code, new RegExp(`\\(${I2C.sda}, ${I2C.scl}\\)`));
});
