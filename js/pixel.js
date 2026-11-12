/* Duck Hunt JS - camada de pixel art: paint por comandos, cache de sprites,
   fonte bitmap, zoom nitido e fundo com parallax. */
window.DH = window.DH || {};

(function (DH) {
  'use strict';

  /* ------------------------------------------------------------------
     Paleta global (indices curtos para os desenhos ficarem compactos)
  ------------------------------------------------------------------ */
  var PAL = {
    sky: '#54a8fc',
    skyDark: '#3f8fe0',
    ground: '#4ac03b',
    groundDark: '#339326',
    grass: '#8ef05a',
    grassDark: '#5fc237',
    soil: '#7a4a12',
    soilDark: '#5b3509',
    trunk: '#a53a15',
    trunkDark: '#7c280e',
    leaf: '#5fcf2a',
    leafDark: '#3f9c19',
    leafLite: '#93ee5a',
    white: '#ffffff',
    black: '#151217',
    red: '#cf2424',
    redDark: '#981212',
    orange: '#ef6c25',
    orangeDark: '#b9480f',
    brown: '#a3501e',
    brownDark: '#7d3a12',
    cream: '#fff2d8',
    beak: '#f0b429',
    beakDark: '#c98a12',
    green: '#2f9c3a',
    greenDark: '#1d7024',
    navy: '#2038ac',
    navyDark: '#13237a',
    purple: '#9b2fbd',
    purpleDark: '#6f1c8c',
    gray: '#9aa0a6',
    grayDark: '#6c7176',
    pink: '#e88a8a',
    yellow: '#ffd93b',
    feather: '#bfe6ff'
  };
  DH.PAL = PAL;

  /* ------------------------------------------------------------------
     Paint: empilha desenhos pixelados numa superficie offscreen.
     Os desenhos recebem um contexto "raster" 1x1; tudo vira pixel.
  ------------------------------------------------------------------ */
  function Paint(w, h, scale) {
    this.w = w;
    this.h = h;
    this.scale = scale || 3;
    this.canvas = document.createElement('canvas');
    this.canvas.width = w * this.scale;
    this.canvas.height = h * this.scale;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.fillStyle = PAL.white;
  }

  Paint.prototype.clear = function () {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  /* aplica um desenho (function(r)) com offset opcional */
  Paint.prototype.stamp = function (draw, ox, oy) {
    var ctx = this.ctx, sc = this.scale;
    ctx.save();
    ctx.translate((ox || 0) * sc, (oy || 0) * sc);
    draw(Raster(ctx, sc));
    ctx.restore();
  };

  /* linha de espessura inteira */
  Paint.prototype.line = function (x1, y1, x2, y2, color, w) {
    var ctx = this.ctx, sc = this.scale;
    ctx.fillStyle = color || ctx.fillStyle;
    var steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
    w = Math.max(1, w || 1);
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var x = Math.round(x1 + (x2 - x1) * t);
      var y = Math.round(y1 + (y2 - y1) * t);
      ctx.fillRect(x * sc, y * sc, w * sc, w * sc);
    }
  };

  Paint.prototype.text = function (str, x, y, color, scale, align) {
    DH.Font.draw(this.ctx, str, x, y, color || PAL.white, scale || 1, this.scale, align || 'left');
  };

  Paint.prototype.rect = function (x, y, w, h, color) {
    var ctx = this.ctx, sc = this.scale;
    ctx.fillStyle = color || ctx.fillStyle;
    ctx.fillRect(x * sc, y * sc, w * sc, h * sc);
  };

  /* retorna o canvas ja escalado, nitido */
  Paint.prototype.get = function () {
    return this.canvas;
  };

  /* Contexto auxiliar: desenha em "pixels", nao em px do canvas.
     Nao ha cache: o api fecha sobre um ctx especifico. */
  function Raster(ctx, sc) {
    var api = {
      px: function (x, y, c) {
        if (c) ctx.fillStyle = c;
        ctx.fillRect(x * sc, y * sc, sc, sc);
      },
      rect: function (x, y, w, h, c) {
        if (c) ctx.fillStyle = c;
        ctx.fillRect(x * sc, y * sc, w * sc, h * sc);
      },
      line: function (x1, y1, x2, y2, c, t) {
        if (c) ctx.fillStyle = c;
        t = Math.max(1, t || 1);
        var steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
        for (var i = 0; i <= steps; i++) {
          var p = i / steps;
          var x = Math.round(x1 + (x2 - x1) * p);
          var y = Math.round(y1 + (y2 - y1) * p);
          ctx.fillRect(x * sc, y * sc, t * sc, t * sc);
        }
      },
      circle: function (cx, cy, r, c) {
        if (c) ctx.fillStyle = c;
        for (var y = -r; y <= r; y++) {
          for (var x = -r; x <= r; x++) {
            if (x * x + y * y <= r * r + r * 0.4) ctx.fillRect((cx + x) * sc, (cy + y) * sc, sc, sc);
          }
        }
      },
      fill: function (c) { ctx.fillStyle = c; },
      raw: ctx,
      sc: sc
    };
    return api;
  }

  /* ------------------------------------------------------------------
     Fonte bitmap 3x5 (maiusculas, digitos e simbolos basicos)
  ------------------------------------------------------------------ */
  var FONT = {
    '0': '011101101101110', '1': '010110010010111', '2': '110001110100111',
    '3': '110001110001110', '4': '101101111001001', '5': '111100110001110',
    '6': '111100110101110', '7': '110001001001001', '8': '110101110101110',
    '9': '110101111001110',
    ' ': '000000000000000', '!': '010010010000010', '.': '000000000000010',
    '-': '000000111000000', '?': '110001010000010', '/': '001001010100100',
    'A': '111101111101101', 'B': '110101110101110', 'C': '111100100100111',
    'D': '110101101101110', 'E': '111100110100111', 'F': '111100110100100',
    'G': '111100101101111', 'H': '101101111101101', 'I': '111010010010111',
    'J': '001001001101110', 'K': '101101110101101', 'L': '100100100100111',
    'M': '101111111101101', 'N': '101111111111101', 'O': '111101101101111',
    'P': '110101110100100', 'Q': '111101101111001', 'R': '110101110101101',
    'S': '111100110001111', 'T': '111010010010010', 'U': '101101101101111',
    'V': '101101101101010', 'W': '101101111111010', 'X': '101101010101101',
    'Y': '101101111010010', 'Z': '111001010100111',
    ':': '000010000010000', ',': '000000000010100', "'": '010010000000000',
    '+': '000010111010000', '%': '101001010100101', '(': '001010010010010',
    ')': '100010010010100'
  };
  var GW = 3, GH = 5;

  function measure(str) {
    return str.length * (GW + 1) - 1;
  }

  function rasterText(ctx, sc, str, x, y, color, size) {
    ctx.fillStyle = color;
    var cx = 0;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i).toUpperCase();
      var map = FONT[ch] || FONT['?'];
      for (var py = 0; py < GH; py++) {
        for (var px = 0; px < GW; px++) {
          if (map.charAt(py * GW + px) === '1') {
            ctx.fillRect((x + cx + px) * sc, (y + py) * sc, size * sc, size * sc);
          }
        }
      }
      cx += GW * size + size;
    }
    return cx;
  }

  var Font = {
    /* desenha texto; scaleBase = escala pixel->tela ja aplicada no ctx */
    draw: function (ctx, str, x, y, color, size, scaleBase, align) {
      size = size || 1;
      var base = scaleBase || 1;
      var w = (str.length * (GW + 1) - 1) * size;
      var ox = align === 'center' ? -w / 2 : (align === 'right' ? -w : 0);
      rasterText(ctx, base, str, x + ox, y, color, size);
    },
    /* desenha direto em px de tela (para HUD em canvas escalado) */
    drawScreen: function (ctx, str, x, y, color, px, align) {
      var size = Math.max(1, Math.round(px / (GW * 0.5)));
      var w = (str.length * (GW + 1) - 1);
      var ox = align === 'center' ? -w * 0.5 : (align === 'right' ? -w : 0);
      ctx.fillStyle = color;
      var cx = 0;
      for (var i = 0; i < str.length; i++) {
        var ch = str.charAt(i).toUpperCase();
        var map = FONT[ch] || FONT['?'];
        for (var py = 0; py < GH; py++) {
          for (var pxx = 0; pxx < GW; pxx++) {
            if (map.charAt(py * GW + pxx) === '1') {
              ctx.fillRect(Math.floor((x + ox + cx + pxx) * (px / 2.5)), Math.floor((y + py * (px / 2.5))), Math.ceil(px / 2.5), Math.ceil(px / 2.5));
            }
          }
        }
        cx += GW + 1;
      }
    },
    width: measure
  };
  DH.Font = Font;

  /* ------------------------------------------------------------------
     Cache de sprites desenhados por funcao (memoiza por chave)
  ------------------------------------------------------------------ */
  var Cache = {};

  function sprite(key, w, h, scale, drawFn) {
    if (Cache[key]) return Cache[key];
    var p = new Paint(w, h, scale);
    drawFn(Raster(p.ctx, scale), p.ctx, scale);
    Cache[key] = p.get();
    return Cache[key];
  }

  /* desenha sprite do cache com flip e opacidade */
  function drawSprite(ctx, canvas, x, y, flip, alpha) {
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    if (flip) {
      ctx.translate(x + canvas.width / 2, y);
      ctx.scale(-1, 1);
      ctx.drawImage(canvas, -canvas.width / 2, 0);
    } else {
      ctx.drawImage(canvas, x, y);
    }
    ctx.restore();
  }

  DH.Paint = Paint;
  DH.Raster = Raster;
  DH.sprite = sprite;
  DH.drawSprite = drawSprite;
})(window.DH);
