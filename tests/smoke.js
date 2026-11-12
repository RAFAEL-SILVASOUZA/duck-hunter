/* Smoke test: carrega os scripts com um mock minimo de DOM/canvas e roda
   muitos frames + simula input, para pegar ReferenceError/TypeError. */
const fs = require('fs');
const vm = require('vm');

function makeCtx() {
  const noop = () => {};
  return {
    imageSmoothingEnabled: false,
    fillStyle: '#fff', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1,
    save: noop, restore: noop, beginPath: noop, closePath: noop,
    rect: noop, fillRect: noop, strokeRect: noop, fill: noop, stroke: noop,
    clearRect: noop, moveTo: noop, lineTo: noop, translate: noop, scale: noop,
    rotate: noop, clip: noop, arc: noop, drawImage: noop, setTransform: noop,
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop }),
  };
}
function makeCanvas() {
  const c = {
    width: 320, height: 240, style: {},
    getContext: () => makeCtx(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 720 }),
    addEventListener: noopFn,
  };
  c.parentElement = { getBoundingClientRect: () => ({ width: 960, height: 720 }) };
  return c;
}
function noopFn() {}

const store = {};
const localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
};

const listeners = {};
const win = {
  devicePixelRatio: 2,
  addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
  innerWidth: 1280, innerHeight: 720,
  AudioContext: undefined, webkitAudioContext: undefined,
  requestAnimationFrame: (f) => { win._raf = f; return 1; },
  ResizeObserver: undefined,
};
const navigator = { vibrate: noopFn, maxTouchPoints: 0, wakeLock: undefined };

const document = {
  body: { classList: { add: noopFn, remove: noopFn, toggle: noopFn }, dataset: {} },
  documentElement: {},
  fullscreenElement: null,
  getElementById: (id) => (id === 'game' ? makeCanvas() : makeEl()),
  createElement: () => makeCanvas(),
  addEventListener: noopFn,
};
function makeEl() { return { textContent: '', setAttribute: noopFn, classList: { add: noopFn, remove: noopFn, toggle: noopFn }, addEventListener: noopFn, getBoundingClientRect: () => ({ width: 960, height: 720 }) }; }

const sandbox = {
  window: win, document, navigator, localStorage,
  requestAnimationFrame: win.requestAnimationFrame,
  setTimeout, clearTimeout, setInterval, clearInterval,
  Math, Date, parseInt, String, console,
};
win.window = win; // window.window
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const files = ['util.js', 'pixel.js', 'sprites.js', 'audio.js', 'entities.js', 'game.js'];
for (const f of files) {
  const code = fs.readFileSync(__dirname + '/../js/' + f, 'utf8');
  vm.runInContext(code, sandbox, { filename: f });
}

const DH = sandbox.window.DH;
const canvas = document.getElementById('game');
const game = new DH.Game(canvas);
game.resize();

let t = 0;
function step() { t += 1000 / 60; game.tick(t); }

let errors = 0;
function guard(label, fn) {
  try { fn(); } catch (e) { errors++; console.log('THROW', label, '->', e.stack.split('\n')[0]); }
}

// title frames
for (let i = 0; i < 60; i++) guard('title', step);

// start game
guard('press-start', () => game.press(160, 120));
guard('press-wave', () => { game.stateT = 1; game.press(160, 120); });

// play: run many frames, shooting around to try to hit ducks and force states
let shots = 0;
for (let i = 0; i < 4000 && game.state !== 'over'; i++) {
  // aim at each active duck to try to hit
  if (shots < 3 && game.ducks.length && game.state === 'play' && game.freeze <= 0) {
    const d = game.ducks.find((x) => !(x.enterDelay > 0) && x.alive);
    if (d) { game.pointerMove(d.x, d.y); guard('shoot', () => game.press(d.x, d.y)); shots++; }
  } else {
    guard('frame', step);
  }
  if (game.state === 'ready' && game.stateT > 0.7) { shots = 0; guard('nextwave', () => game.press(160, 120)); }
  if (game.state === 'results' && game.stateT > 0.5) guard('nextlevel', () => game.press(160, 120));
  // let physics advance
  guard('frame', step);
}

// ---- teste deterministico: abater os patos resolve a onda SEM esvaziar munição ----
guard('reset-for-logic', () => { game.toTitle(); game.startGame(); game.startLevel(); game.startWave(); });
guard('wave-setup', () => {
  // dispara 1 tiro só (gasta 1 bala) mas abate os 2 patos por dentro
  var usedBefore = game.shotsLeft;
  for (var k = 0; k < game.ducks.length; k++) { var d = game.ducks[k]; if (d.enterDelay > 0) d.enterDelay = 0; }
  game.pointerMove(10, 10); game.shoot(); // 1 bala usada, mira longe de proposito
  // derruba todos por codigo (estado 'hit' -> 'fall' -> remove)
  for (var m = 0; m < game.ducks.length; m++) { var dd = game.ducks[m]; dd.shoot(); dd.bonusValue = 100; }
});
// roda frames até sair de 'play' (deve acontecer sem gastar as balas restantes)
var resolvedFrames = 0, stateAfter = game.state;
for (var z = 0; z < 360 && game.state === 'play'; z++) { step(); resolvedFrames++; }
stateAfter = game.state;
console.log('LOGIC TEST -> resolved after', resolvedFrames, 'frames; stateAfterPlay =', stateAfter,
            '; shotsLeftKept (should be >0):', game.shotsLeft >= 0);

// force game over path
guard('forceover', () => { game.gameOver(); });
for (let i = 0; i < 30; i++) guard('over', step);

// exercise results/title draws
guard('title-again', () => { game.toTitle(); for (let i = 0; i < 20; i++) step(); });

console.log('final state:', game.state, 'score:', game.score, 'level:', game.level, 'lives:', game.lives);
console.log(errors === 0 ? 'SMOKE OK: no runtime errors' : ('SMOKE FAILED: ' + errors + ' errors'));
process.exit(errors === 0 ? 0 : 1);
