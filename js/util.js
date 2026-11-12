/* Duck Hunt JS - utilidades matematicas e RNG deterministico */
window.DH = window.DH || {};

(function (DH) {
  'use strict';

  var TAU = Math.PI * 2;

  var M = {
    TAU: TAU,
    PI: Math.PI,

    clamp: function (v, a, b) {
      return v < a ? a : (v > b ? b : v);
    },

    lerp: function (a, b, t) {
      return a + (b - a) * t;
    },

    /* interpolacao independente de framerate */
    damp: function (a, b, lambda, dt) {
      return M.lerp(a, b, 1 - Math.exp(-lambda * dt));
    },

    sign: function (v) {
      return v < 0 ? -1 : (v > 0 ? 1 : 0);
    },

    dist: function (x1, y1, x2, y2) {
      var dx = x2 - x1, dy = y2 - y1;
      return Math.sqrt(dx * dx + dy * dy);
    },

    dist2: function (x1, y1, x2, y2) {
      var dx = x2 - x1, dy = y2 - y1;
      return dx * dx + dy * dy;
    },

    angle: function (x1, y1, x2, y2) {
      return Math.atan2(y2 - y1, x2 - x1);
    },

    /* teste circulo vs retangulo (axis aligned) */
    circleRect: function (cx, cy, r, rx, ry, rw, rh) {
      var nx = M.clamp(cx, rx, rx + rw);
      var ny = M.clamp(cy, ry, ry + rh);
      return M.dist2(cx, cy, nx, ny) <= r * r;
    },

    /* distancia de um ponto ao segmento ab (para colisao de bala) */
    pointSegment: function (px, py, ax, ay, bx, by) {
      var abx = bx - ax, aby = by - ay;
      var len2 = abx * abx + aby * aby;
      var t = len2 === 0 ? 0 : M.clamp(((px - ax) * abx + (py - ay) * aby) / len2, 0, 1);
      return M.dist(px, py, ax + abx * t, ay + aby * t);
    },

    approach: function (v, target, maxStep) {
      var d = target - v;
      if (Math.abs(d) <= maxStep) return target;
      return v + M.sign(d) * maxStep;
    }
  };

  /* Gerador deterministico (mulberry32): same seed = same scenario */
  function Rng(seed) {
    this.s = (seed >>> 0) || 1;
  }
  Rng.prototype.next = function () {
    this.s = (this.s + 0x6D2B79F5) >>> 0;
    var t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Rng.prototype.range = function (a, b) {
    return a + (b - a) * this.next();
  };
  Rng.prototype.int = function (a, b) {
    return Math.floor(this.range(a, b + 1 - 1e-9));
  };
  Rng.prototype.pick = function (arr) {
    return arr[Math.floor(this.next() * arr.length)];
  };
  Rng.prototype.chance = function (p) {
    return this.next() < p;
  };
  Rng.prototype.sign = function () {
    return this.next() < 0.5 ? -1 : 1;
  };

  DH.math = M;
  DH.Rng = Rng;
})(window.DH);
