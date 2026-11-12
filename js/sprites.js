/* Duck Hunt JS - sprites pixel art desenhados em codigo (sem arquivos externos).
   Todos os desenhos sao feitos na resolucao interna de 320x240, pixel a pixel. */
window.DH = window.DH || {};

(function (DH) {
  'use strict';

  var R = DH.PAL;

  /* ==================================================================
     PATO
     Grade 24x16. wing: 0 asa subida, 1 meia, 2 descida.
     state: 'fly' | 'hit' | 'fall' | 'dead'
     types de cor: ver DUCK_COLORS
  ================================================================== */
  var DUCK_COLORS = {
    black: { body: '#1c1c22', dark: '#000000', head: '#1f7c8c', headDark: '#135060', belly: '#ffffff', beak: R.beak, spec: '#4a5058' },
    red:   { body: R.red,     dark: R.redDark, head: R.red, headDark: R.redDark, belly: '#ffe9d6', beak: R.beak, spec: '#ff7a6a' },
    blue:  { body: R.navy,    dark: R.navyDark, head: R.purple, headDark: R.purpleDark, belly: '#dfe6ff', beak: R.beak, spec: '#5a7ad8' },
    green: { body: R.green,   dark: R.greenDark, head: R.green, headDark: R.greenDark, belly: '#e6ffe6', beak: R.beak, spec: '#7ee08a' }
  };
  DH.DUCK_COLORS = DUCK_COLORS;

  function drawDuck(c, wing, state) {
    var key = 'duck_' + c + '_' + wing + '_' + state;
    return DH.sprite(key, 24, 16, 1, function (r) {
      var col = DUCK_COLORS[c] || DUCK_COLORS.black;
      // corpo visto da esquerda; cabeca a esquerda, cauda a direita
      if (state === 'fall' || state === 'dead') {
        // pato de pernas pro ar (pendurado)
        r.rect(8, 4, 8, 7, col.body);       // corpo
        r.rect(8, 9, 8, 2, col.belly);      // ventre
        r.rect(7, 11, 3, 3, col.belly);     // patas pra cima em V
        r.rect(14, 11, 3, 3, col.belly);
        r.rect(4, 4, 5, 4, col.head);       // cabeca p/ baixo
        r.rect(2, 5, 2, 2, col.beak);
        if (state === 'dead') {
          r.px(6, 5, R.white); r.px(5, 6, R.white); // olho fechado
        } else {
          r.px(6, 5, R.white); r.px(7, 6, R.white);
        }
        r.rect(2, 6, 2, 1, col.beak);
        r.rect(16, 6, 4, 2, col.dark);      // cauda
        r.rect(8, 6, 3, 2, col.spec);       // reflexo asa
        return;
      }

      if (state === 'hit') {
        // asas estateladas, olhos em X
        r.rect(7, 5, 9, 6, col.body);
        r.rect(7, 9, 9, 2, col.belly);
        r.rect(2, 4, 5, 5, col.head);
        r.rect(1, 6, 2, 2, col.beak);
        // X no olho
        r.px(3, 5, R.white); r.px(5, 5, R.white); r.px(4, 6, R.white);
        // asas abertas pra cima e baixo
        r.rect(4, 0, 5, 4, col.body); r.rect(5, 1, 3, 2, col.spec);
        r.rect(4, 11, 5, 4, col.body); r.rect(5, 12, 3, 2, col.spec);
        // pernas esticadas
        r.rect(15, 11, 4, 1, col.belly);
        r.rect(15, 9, 4, 1, col.belly);
        r.rect(15, 5, 5, 2, col.dark);   // cauda
        return;
      }

      // ---- voando normal ----
      // corpo
      r.rect(7, 6, 9, 5, col.body);
      r.rect(7, 9, 9, 2, col.belly);
      // cauda
      r.rect(15, 5, 5, 3, col.body);
      r.rect(17, 4, 4, 2, col.dark);
      // cabeca
      r.rect(3, 3, 5, 5, col.head);
      r.rect(3, 3, 5, 1, col.headDark);
      // bico
      r.rect(1, 5, 2, 2, col.beak);
      r.rect(0, 5, 1, 1, col.beak);
      // olho
      r.px(5, 4, R.white); r.px(5, 5, R.black);
      // patas
      if (wing === 1) { r.rect(10, 11, 3, 1, col.belly); r.rect(12, 12, 2, 1, col.belly); }
      else { r.rect(11, 11, 3, 1, col.belly); }

      // asa conforme frame
      if (wing === 0) {
        r.rect(8, 0, 6, 6, col.body);
        r.rect(9, 1, 4, 3, col.spec);
        r.rect(8, 0, 6, 1, col.dark);
      } else if (wing === 1) {
        r.rect(8, 4, 8, 3, col.body);
        r.rect(9, 4, 6, 1, col.spec);
        r.rect(8, 6, 8, 1, col.dark);
      } else {
        r.rect(8, 8, 7, 6, col.body);
        r.rect(9, 9, 5, 3, col.spec);
        r.rect(8, 13, 7, 1, col.dark);
      }
    });
  }
  DH.drawDuck = drawDuck;

  /* ==================================================================
     PENAS / FEEDERS (quando acerta, solta penas voando)
  ================================================================== */
  function drawFeather(color) {
    var key = 'feather_' + color;
    return DH.sprite(key, 5, 5, 1, function (r) {
      r.rect(1, 0, 2, 1, R.white);
      r.rect(0, 1, 3, 1, color || R.white);
      r.rect(1, 2, 3, 1, R.white);
      r.rect(2, 3, 2, 1, color || R.white);
      r.px(3, 4, R.white);
    });
  }
  DH.drawFeather = drawFeather;

  /* ==================================================================
     CACHORRO
     Grade 28x30. poses:
       'peek'    -> so a cabeca no buraco
       'sniff'   -> farejando o chao
       'hold'    -> de pe com o pato na boca
       'point'   -> apontando pra tela
       'laugh0/1'-> gargalhada (2 frames)
       'up'      -> subindo animado
     holding: cor do pato que ele carrega (ou null)
  ================================================================== */
  function drawDog(pose, frame, holding) {
    var key = 'dog_' + pose + '_' + frame + '_' + (holding || 'none');
    return DH.sprite(key, 28, 30, 1, function (r) {
      var fur = R.brown, furD = R.brownDark, muzzle = R.cream, nose = R.black;
      var ear = R.black;

      function head(hx, hy, mouth, eyesClosed) {
        // cabeca
        r.rect(hx + 4, hy + 1, 12, 9, fur);
        r.rect(hx + 4, hy + 1, 12, 1, furD);
        // orelhas caidas
        r.rect(hx + 1, hy + 1, 4, 8, ear);
        r.rect(hx + 15, hy + 1, 4, 8, ear);
        // focinho
        r.rect(hx + 5, hy + 7, 10, 5, muzzle);
        r.rect(hx + 4, hy + 8, 2, 3, muzzle);
        r.rect(hx + 14, hy + 8, 2, 3, muzzle);
        // nariz
        r.rect(hx + 8, hy + 7, 3, 2, nose);
        // boca
        if (mouth === 'laugh') {
          r.rect(hx + 6, hy + 10, 7, 3, R.black);
          r.rect(hx + 7, hy + 11, 5, 2, R.red);
          r.rect(hx + 7, hy + 10, 1, 1, R.white);
          r.rect(hx + 11, hy + 10, 1, 1, R.white);
        } else if (mouth === 'open') {
          r.rect(hx + 8, hy + 10, 4, 2, R.black);
        } else {
          r.line(hx + 8, hy + 11, hx + 12, hy + 11, R.black, 1);
        }
        // olhos
        if (eyesClosed) {
          r.line(hx + 6, hy + 4, hx + 8, hy + 4, R.black, 1);
          r.line(hx + 12, hy + 4, hx + 14, hy + 4, R.black, 1);
        } else if (mouth === 'laugh') {
          r.line(hx + 6, hy + 5, hx + 7, hy + 4, R.black, 1);
          r.line(hx + 7, hy + 5, hx + 6, hy + 4, R.black, 1);
          r.line(hx + 12, hy + 5, hx + 13, hy + 4, R.black, 1);
          r.line(hx + 13, hy + 5, hx + 12, hy + 4, R.black, 1);
        } else {
          r.rect(hx + 6, hy + 3, 2, 3, R.white);
          r.rect(hx + 12, hy + 3, 2, 3, R.white);
          r.px(hx + 7, hy + 5, R.black);
          r.px(hx + 13, hy + 5, R.black);
        }
      }

      // corpo simples (tronco com bracos)
      function body(bx, by, arms) {
        r.rect(bx + 6, by, 12, 13, fur);
        r.rect(bx + 6, by, 12, 1, furD);
        r.rect(bx + 8, by + 6, 8, 7, muzzle); // peito claro
        if (arms === 'up') {
          r.rect(bx + 1, by - 6, 4, 9, fur);
          r.rect(bx + 19, by - 6, 4, 9, fur);
          r.rect(bx + 1, by - 8, 4, 3, muzzle);
          r.rect(bx + 19, by - 8, 4, 3, muzzle);
        } else if (arms === 'point') {
          r.rect(bx + 16, by - 8, 4, 12, fur);
          r.rect(bx + 16, by - 11, 4, 4, muzzle);
          r.rect(bx + 1, by + 2, 4, 8, fur);
        } else {
          r.rect(bx + 1, by + 1, 4, 9, fur);
          r.rect(bx + 19, by + 1, 4, 9, fur);
          r.rect(bx + 1, by + 8, 4, 3, muzzle);
          r.rect(bx + 19, by + 8, 4, 3, muzzle);
        }
      }

      var duck = holding ? DUCK_COLORS[holding] : null;
      function duckInMouth(dx, dy, flip) {
        if (!duck) return;
        // pato pequeno invertido na boca
        r.rect(dx, dy + 2, 6, 4, duck.body);
        r.rect(dx, dy + 5, 6, 1, duck.belly);
        r.rect(dx + (flip ? -2 : 6), dy + 1, 3, 3, duck.head);
        r.rect(dx + (flip ? -3 : 9), dy + 2, 2, 1, R.beak);
        r.rect(dx + (flip ? 5 : 0), dy + 6, 3, 2, R.white); // patas
        r.rect(dx + 1, dy, 4, 1, duck.dark);
      }

      if (pose === 'peek') {
        // so cabeca emergindo do chao, base do sprite = linha do chao
        head(6, 12, frame % 2 ? 'open' : 'flat', false);
        r.rect(4, 21, 16, 9, fur);          // pescoco/ombros
        r.rect(6, 23, 12, 7, muzzle);
        return;
      }

      if (pose === 'sniff') {
        // cachorro agachado, cabeca baixa, olfato no chao
        r.rect(6, 16, 16, 9, fur);          // corpo baixo
        r.rect(6, 16, 16, 1, furD);
        r.rect(2, 22, 6, 4, fur);           // pernas
        r.rect(20, 22, 6, 4, fur);
        head(8, 10, 'flat', false);
        // linhas de "cheiro"
        if (frame % 2 === 0) {
          r.px(2, 14, R.white); r.px(1, 12, R.white);
          r.px(25, 14, R.white); r.px(26, 12, R.white);
        } else {
          r.px(1, 14, R.white); r.px(2, 12, R.white);
          r.px(26, 14, R.white); r.px(25, 12, R.white);
        }
        return;
      }

      if (pose === 'hold' || pose === 'point' || pose === 'up') {
        body(4, 16, pose === 'point' ? 'point' : (pose === 'up' ? 'up' : 'down'));
        head(6, 6, 'open', false);
        if (pose === 'up') {
          head(6, 4, 'open', false);
        }
        // pato na boca / na pata
        if (pose === 'hold') duckInMouth(9, 18, false);
        if (pose === 'point') {
          // aponta com a pata e segura o pato pela asa
          duckInMouth(20, 12, true);
        }
        return;
      }

      // risada: corpo treme, cabeca pra tras
      if (pose === 'laugh') {
        var j = frame % 2;
        body(4, 17 - j, 'up');
        head(6, 6 + j, 'laugh', true);
        return;
      }
    });
  }
  DH.drawDog = drawDog;

  /* Buraco na grama de onde o cachorro sai */
  function drawHole() {
    return DH.sprite('hole', 22, 8, 1, function (r) {
      r.rect(3, 3, 16, 4, R.soilDark);
      r.rect(5, 2, 12, 5, R.soilDark);
      r.rect(7, 1, 8, 6, R.soilDark);
      r.rect(6, 0, 10, 1, R.groundDark);
    });
  }
  DH.drawHole = drawHole;

  /* ==================================================================
     CENARIO: fundo com parallax leve + graca + terra + arvore + arbusto
     Desenha direto num contexto 320x240 ja escalado.
  ================================================================== */
  function skyW() { return 320; }
  var GROUND_Y = 190;   // topo da grama
  var SOIL_Y = 214;     // topo da terra
  DH.GROUND_Y = GROUND_Y;
  DH.SOIL_Y = SOIL_Y;

  function drawScenery(ctx, off, variant) {
    // ceu
    ctx.fillStyle = R.sky;
    ctx.fillRect(0, 0, 320, 240);

    // faixa de nuvens com parallax lento
    ctx.fillStyle = '#8ec9ff';
    var cx = ((off * 0.25) % 320 + 320) % 320;
    for (var i = -1; i < 2; i++) {
      cloud(ctx, cx + i * 320 - 60, 40);
      cloud(ctx, (cx + 180 + i * 320 - 60) % 480, 90);
    }

    // colinas distantes
    ctx.fillStyle = '#57c83f';
    hill(ctx, ((off * 0.35) % 480 + 480) % 480 - 160, 190, 130, 26);
    hill(ctx, ((off * 0.35 + 240) % 480 + 480) % 480 - 160, 190, 150, 20);

    // arvore + arbusto (parallax medio)
    DH.drawSprite(ctx, tree(), 28 + off * 0.55, 100);
    DH.drawSprite(ctx, bush(), 240 + off * 0.55, 156);

    // grama com tufos
    ctx.fillStyle = R.ground;
    ctx.fillRect(0, GROUND_Y, 320, SOIL_Y - GROUND_Y);
    ctx.fillStyle = R.grassDark;
    var ox = ((off * 0.9) % 16 + 16) % 16;
    for (var x = -16; x < 336; x += 8) {
      ctx.fillRect(x + ox, GROUND_Y, 4, 2);
    }
    // tufos de graca animados pelo parallax
    ctx.fillStyle = R.grass;
    for (var gx = -16; gx < 336; gx += 16) {
      tuft(ctx, gx + ox, GROUND_Y, variant);
    }
    // buraco do cachorro (fixo no mundo)
    var hole = drawHole();
    ctx.drawImage(hole, 176 - hole.width / 2, GROUND_Y - 3);

    // terra
    ctx.fillStyle = R.soil;
    ctx.fillRect(0, SOIL_Y, 320, 240 - SOIL_Y);
    ctx.fillStyle = R.soilDark;
    ctx.fillRect(0, SOIL_Y, 320, 2);
    for (var sx = -32; sx < 336; sx += 24) {
      ctx.fillRect(sx + ox * 1.1, SOIL_Y + 8, 6, 2);
      ctx.fillRect(sx + 12 + ox * 1.1, SOIL_Y + 15, 4, 2);
    }
  }
  DH.drawScenery = drawScenery;

  function cloud(ctx, x, y) {
    ctx.fillRect(Math.round(x), Math.round(y), 34, 6);
    ctx.fillRect(Math.round(x + 8), Math.round(y - 5), 20, 6);
    ctx.fillRect(Math.round(x + 16), Math.round(y - 9), 10, 5);
  }

  function hill(ctx, x, base, w, h) {
    x = Math.round(x);
    for (var i = 0; i < w; i++) {
      var t = i / w;
      var y = base - Math.sin(t * Math.PI) * h;
      ctx.fillRect(x + i, Math.round(y), 1, base - y + 1);
    }
  }

  function tuft(ctx, x, y, v) {
    x = Math.round(x);
    ctx.fillRect(x, y - 3, 1, 3);
    ctx.fillRect(x + 2, y - 5, 1, 5);
    ctx.fillRect(x + 4, y - 2, 1, 2);
    if (v) ctx.fillRect(x + 6, y - 4, 1, 4);
  }

  function tree() {
    return DH.sprite('tree', 46, 96, 1, function (r) {
      // tronco
      r.rect(18, 40, 7, 56, R.trunk);
      r.rect(18, 40, 2, 56, R.trunkDark);
      r.rect(12, 56, 8, 4, R.trunk);
      r.line(21, 52, 30, 44, R.trunk, 3);
      r.line(18, 62, 8, 56, R.trunk, 3);
      // copa em manchas
      blob(r, 20, 16, 16);
      blob(r, 8, 34, 12);
      blob(r, 34, 34, 12);
      blob(r, 24, 44, 10);
    });
  }
  DH.tree = tree;

  function bush() {
    return DH.sprite('bush', 34, 30, 1, function (r) {
      blob(r, 16, 18, 12);
      blob(r, 6, 22, 8);
      blob(r, 28, 22, 7);
    });
  }
  DH.bush = bush;

  function blob(r, cx, cy, rad) {
    r.circle(cx, cy, rad, R.leafDark);
    r.circle(cx - 1, cy - 1, rad - 2, R.leaf);
    r.circle(cx - 3, cy - 4, Math.max(2, rad - 6), R.leafLite);
  }

  /* ==================================================================
     MIRA / CROSSHAIR estilo NES (40x40)
     estilo = 'cross' (mira de sniper) e 'dot' simples
  ================================================================== */
  function drawCrosshair(active) {
    var key = 'cross_' + (active ? 1 : 0);
    return DH.sprite(key, 24, 24, 1, function (r) {
      var c1 = active ? R.yellow : R.white;
      // circulo externo
      ring(r, 12, 12, 11, c1);
      // cruz central
      r.rect(11, 2, 2, 20, c1);
      r.rect(2, 11, 20, 2, c1);
      // quebras pretas para dar o visual de mira
      r.rect(11, 4, 2, 2, '#3a3a3a');
      r.rect(11, 18, 2, 2, '#3a3a3a');
      r.rect(4, 11, 2, 2, '#3a3a3a');
      r.rect(18, 11, 2, 2, '#3a3a3a');
      r.px(12, 12, active ? R.red : R.black);
    });
  }
  DH.drawCrosshair = drawCrosshair;

  function ring(r, cx, cy, rad, color) {
    for (var a = 0; a < 360; a += 2) {
      var x = Math.round(cx + Math.cos(a * Math.PI / 180) * rad);
      var y = Math.round(cy + Math.sin(a * Math.PI / 180) * rad);
      r.px(x, y, color);
    }
  }

  /* Marca de tiro no chao/bala */
  function drawBullet() {
    return DH.sprite('bullet', 3, 3, 1, function (r) {
      r.rect(1, 0, 1, 1, R.yellow);
      r.rect(0, 1, 3, 1, R.white);
      r.rect(1, 2, 1, 1, R.orange);
    });
  }
  DH.drawBullet = drawBullet;

  /* Silhueta de "1 UP" / pato dourado do bonus */
  function drawGoldDuck() {
    var save = DH.PAL;
    var key = 'goldduck';
    if (!DH.DUCK_COLORS.gold) {
      DH.DUCK_COLORS.gold = { body: R.yellow, dark: '#c99a12', head: '#ffe06a', headDark: '#c99a12', belly: '#fff8d0', beak: R.orange, spec: '#fff2a8' };
    }
    return drawDuck('gold', 1, 'fly');
  }
  DH.drawGoldDuck = drawGoldDuck;

  /* Coracao / vida extra do HUD */
  function drawHeart(full) {
    return DH.sprite('heart_' + (full ? 1 : 0), 9, 8, 1, function (r) {
      var c = full ? R.red : '#4a2a2e';
      r.rect(1, 1, 3, 2, c); r.rect(5, 1, 3, 2, c);
      r.rect(0, 2, 9, 3, c);
      r.rect(1, 5, 7, 1, c);
      r.rect(2, 6, 5, 1, c);
      r.rect(3, 7, 3, 1, c);
      if (full) { r.px(2, 2, '#ff8a8a'); r.px(3, 2, '#ff8a8a'); }
    });
  }
  DH.drawHeart = drawHeart;

})(window.DH);
