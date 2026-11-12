/* Duck Hunt JS - nucleo do jogo: loop com timestep fixo, maquina de estados,
   entrada (mouse/toque), fases estilo NES, pontuacao e bônus. */
window.DH = window.DH || {};

(function (DH) {
  'use strict';

  var M = DH.math;
  var GROUND_Y = DH.GROUND_Y;
  var W = 320, H = 240;

  // dificuldade por nivel
  function levelCfg(level) {
    var base = 60 + level * 7;
    return {
      speed: M.clamp(base, 60, 168),
      waves: 2,
      perWave: 2,                        // 2 patos voando juntos, como no original
      escape: true,
      goldChance: level < 1 ? 0 : 0.12
    };
  }

  var DUCK_POOL = ['black', 'black', 'red', 'blue', 'green'];

  /* ================================================================== */
  function Game(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    this.state = 'title';
    this.t = 0;

    // entrada
    this.pointer = { x: W / 2, y: H / 2, down: false, active: false };
    this.crank = 0;
    this.shotsLeft = 0;
    this.maxShots = 3;

    // mundo
    this.rng = new DH.Rng((Math.random() * 1e9) | 0);
    this.ducks = [];
    this.bullets = [];
    this.feathers = [];
    this.dog = new DH.Dog();
    this.sceneryOff = 0;

    // placar
    this.score = 0;
    this.hiscore = loadHi();
    this.lives = 3;
    this.nextLife = 10000;
    this.level = 0;
    this.wave = 0;
    this.killsThisLevel = 0;
    this.waveNeed = 0;

    this.paused = false;
    this.freeze = 0;            // pausa breve entre shots
    this.result = null;
    this.resultT = 0;
    this.flash = 0;

    // transicoes de estado
    this.stateT = 0;
    this.ducksDown = 0;
    this.ducksWave = 0;
    this.waveDucks = [];
    this.pendingWave = false;

    this._initState();
    this.lastTime = 0;
    this.acc = 0;
    this.raf = null;
  }

  function loadHi() {
    try { return parseInt(localStorage.getItem('dh_hiscore') || '0', 10) || 0; }
    catch (e) { return 0; }
  }
  Game.prototype.saveHi = function () {
    if (this.score > this.hiscore) {
      this.hiscore = this.score;
      try { localStorage.setItem('dh_hiscore', String(this.hiscore)); } catch (e) {}
    }
  };

  /* ------------------------------- estados -------------------------- */
  Game.prototype._initState = function () {
    this.stateT = 0;
  };

  Game.prototype.toTitle = function () {
    this.state = 'title'; this._initState();
  };

  Game.prototype.startGame = function () {
    this.score = 0;
    this.lives = 3;
    this.nextLife = 10000;
    this.level = 0;
    DH.Audio.start();
    this.startLevel();
  };

  Game.prototype.startLevel = function () {
    this.cfg = levelCfg(this.level);
    this.wave = 0;
    this.killsThisLevel = 0;
    this.state = 'ready';
    this._initState();
  };

  Game.prototype.startWave = function () {
    var cfg = this.cfg;
    this.wave++;
    this.shotsLeft = this.maxShots;
    this.ducks = [];
    this.waveDucks = [];
    var n = cfg.perWave;
    // evita 2 patos fugirem juntos em nivel baixo as vezes
    for (var i = 0; i < n; i++) {
      var type = this.rng.pick(DUCK_POOL);
      if (cfg.goldChance && this.rng.chance(cfg.goldChance)) type = 'gold';
      var dir = this.rng.sign();
      var startX = dir < 0 ? this.rng.range(250, 300) : this.rng.range(20, 70);
      var d = new DH.Duck(this.rng, startX, dir, cfg.speed * this.rng.range(0.92, 1.08), type, this.level);
      this.ducks.push(d);
      this.waveDucks.push(d);
      if (i === 1) { d.enterDelay = 0.35; d.y = GROUND_Y + 90; }
    }
    this.ducksDown = 0;
    this.ducksWave = n;
    this.crank = 0;
    this.resolving = false;
    this.state = 'play';
    this._initState();
  };

  Game.prototype.levelComplete = function () {
    this.state = 'results';
    this._initState();
    this.resultT = 0;
    this.resultType = 'clear';
    this.saveHi();
    DH.Audio.roundClear();
  };

  Game.prototype.gameOver = function () {
    this.state = 'over';
    this._initState();
    this.saveHi();
    DH.Audio.gameOver();
  };

  /* ------------------------------ entrada -------------------------- */
  Game.prototype.pointerMove = function (x, y) {
    this.pointer.x = M.clamp(x, 0, W);
    this.pointer.y = M.clamp(y, 0, H);
    this.pointer.active = true;
  };

  Game.prototype.press = function (x, y) {
    DH.Audio.unlock();
    this.pointer.x = M.clamp(x, 0, W);
    this.pointer.y = M.clamp(y, 0, H);
    this.pointer.down = true;

    if (this.paused) return;

    switch (this.state) {
      case 'title':
        this.startGame();
        break;
      case 'ready':
        if (this.stateT > 0.6) this.startWave();
        break;
      case 'play':
        this.shoot();
        break;
      case 'results':
        if (this.stateT > 1.0) this.nextFromResults();
        break;
      case 'over':
        if (this.stateT > 1.0) this.toTitle();
        break;
    }
  };

  Game.prototype.release = function () {
    this.pointer.down = false;
  };

  Game.prototype.shoot = function () {
    if (this.shotsLeft <= 0 || this.freeze > 0) { return; }
    this.shotsLeft--;
    this.crank++;
    DH.Audio.shoot();
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }

    var px = this.pointer.x, py = this.pointer.y;
    var b = new DH.Bullet(px, py);
    // angulo do cano (da base inferior-central da tela ate o ponteiro)
    b.ang = M.angle(160, 235, px, py);
    this.bullets.push(b);
    this.flash = 0.05;

    var anyHit = false;
    for (var i = 0; i < this.ducks.length; i++) {
      var d = this.ducks[i];
      if (!d.alive || d.enterDelay > 0) continue;
      var hb = d.hurtBox();
      if (M.circleRect(px, py, 9, hb.x, hb.y, hb.w, hb.h)) {
        if (d.shoot()) {
          anyHit = true;
          d.bonusArmed = d.bonusUp();
          if (d.type === 'gold' && d.bonusUp()) d.bonusValue = 5000;
          else d.bonusValue = 100 * (this.level + 1);
        }
      }
    }
    if (anyHit) DH.Audio.hit();

    // solta penas ao acertar
    if (anyHit) {
      for (var f = 0; f < 6; f++) {
        this.feathers.push(new DH.Feather(this.rng, px, py, this.rng.chance(0.4) ? DH.PAL.white : undefined));
      }
    }

    if (this.shotsLeft <= 0) {
      this.freeze = 0.5; // resolve a rodada depois do ultimo tiro
    } else {
      this.freeze = 0.08;
    }
  };

  Game.prototype.nextFromResults = function () {
    this.level++;
    this.startLevel();
  };

  /* ------------------------------ update --------------------------- */
  Game.prototype.update = function (dt) {
    this.t += dt;
    this.stateT += dt;
    if (this.flash > 0) this.flash -= dt;

    if (!this.paused) {
      switch (this.state) {
        case 'title': this.updateTitle(dt); break;
        case 'ready': break;
        case 'play': this.updatePlay(dt); break;
        case 'results': this.updateResults(dt); break;
        case 'over': break;
      }
    }
    this.sceneryOff += (this.state === 'play' ? 6 : 18) * dt;
    if (this.sceneryOff > 100000) this.sceneryOff = 0;
  };

  Game.prototype.updateTitle = function (dt) {
    // patos decorativos voando no fundo do menu
    if (this._titleDucks == null) this._titleDucks = [];
    if (this._titleDucks.length < 3 && this.rng.chance(dt * 0.8)) {
      var dir = this.rng.sign();
      var startX = dir < 0 ? 320 : 0;
      var d = new DH.Duck(this.rng, startX, dir, 55, this.rng.pick(DUCK_POOL), 0);
      d.targetY = this.rng.range(30, 90);
      d.maxFly = 999;
      this._titleDucks.push(d);
    }
    for (var i = this._titleDucks.length - 1; i >= 0; i--) {
      var t = this._titleDucks[i];
      t.update(dt);
      if (t.x < -40 || t.x > 360) this._titleDucks.splice(i, 1);
    }
  };

  Game.prototype.updatePlay = function (dt) {
    if (this.freeze > 0) this.freeze -= dt;

    // spawn escalonado
    for (var i = 0; i < this.ducks.length; i++) {
      var d = this.ducks[i];
      if (d.enterDelay > 0) {
        d.enterDelay -= dt;
        if (d.enterDelay <= 0) d.y = GROUND_Y + 20;
        continue;
      }
    }

    // patos
    for (var j = this.ducks.length - 1; j >= 0; j--) {
      var duck = this.ducks[j];
      if (duck.enterDelay > 0) continue;
      duck.update(dt);

      if (duck.quackPending) { duck.quackPending = false; DH.Audio.quack(); }

      if (duck.splash) {
        duck.splash = false;
        DH.Audio.splash();
        for (var p = 0; p < 4; p++) this.feathers.push(new DH.Feather(this.rng, duck.x, GROUND_Y, DH.PAL.brown));
      }

      if (!duck.alive) {
        if (duck.gotaway) {
          // pato escapou: nao conta como abate
          this.ducksDown++;
        } else if (duck.scored) {
          // abate confirmado
          this.ducksDown++;
          this.killsThisLevel++;
          this.awardKill(duck);
        } else {
          this.ducksDown++;
        }
        this.ducks.splice(j, 1);
      }
    }

    // balas e penas
    for (var b = this.bullets.length - 1; b >= 0; b--) {
      this.bullets[b].update(dt);
      if (this.bullets[b].life <= 0) this.bullets.splice(b, 1);
    }
    for (var f = this.feathers.length - 1; f >= 0; f--) {
      this.feathers[f].update(dt);
      if (this.feathers[f].life <= 0) this.feathers.splice(f, 1);
    }

    this.dog.update(dt);

    // quando a munição acaba e o tiro "assenta", qualquer pato ainda vivo
    // foge (resolve a rodada, evita travar no nivel 1)
    if (this.shotsLeft <= 0 && this.freeze <= 0) {
      for (var q = 0; q < this.ducks.length; q++) {
        var du = this.ducks[q];
        if (du.enterDelay > 0) continue;
        if (du.alive && du.state !== 'hit' && du.state !== 'fall' && du.state !== 'leave') {
          du.leave();
        }
      }
    }

    // resolucao da onda: assim que todos os patos da onda sairam
    // (mortos ou fugidos), sem depender de acabar a municao
    if (!this.resolving && this.ducksWave > 0 && this.ducks.length === 0 &&
        this.ducksDown >= this.ducksWave) {
      this.resolving = true;
      this.resolveWave();
    }
  };

  Game.prototype.awardKill = function (duck) {
    var pts = duck.bonusValue || 100 * (this.level + 1);
    if (duck.type === 'gold') pts = 5000;
    else pts = 100 * (this.level + 1);
    this.score += pts;
    this.lastGain = { v: pts, t: 0.7 };
  };

  Game.prototype.resolveWave = function () {
    var escaped = 0, kills = 0;
    for (var i = 0; i < this.waveDucks.length; i++) {
      var wd = this.waveDucks[i];
      if (wd.gotaway) escaped++;
      if (wd.scored) kills++;
    }
    var hitAll = escaped === 0;      // derrubou todos
    var hitAny = kills > 0;          // derrubou ao menos um

    if (hitAll) {
      this.score += 500 * (this.level + 1);
      this.checkLife();
    }

    if (hitAny) {
      // passou da onda (com ou sem bonus). Mostra premio se zerou os patos,
      // ri so se algum escapou.
      var col = this.waveDucks[0] ? this.waveDucks[0].type : 'black';
      this.dog.trigger('prize', col === 'gold' ? 'black' : col, this.afterDog.bind(this, true));
      DH.Audio.dogBark();
      if (!hitAll) { setTimeout(DH.Audio.dogLaugh, 500); }
    } else {
      // nao acertou nenhum: perde vida
      this.dog.trigger('laugh', null, this.afterDog.bind(this, false));
      DH.Audio.dogBark(); setTimeout(DH.Audio.dogLaugh, 800);
    }
  };

  // 1 UP a cada 10000 pontos (regra do original)
  Game.prototype.checkLife = function () {
    if (this.nextLife == null) this.nextLife = 10000;
    while (this.score >= this.nextLife) {
      this.nextLife += 10000;
      if (this.lives < 9) this.lives++;
      DH.Audio.oneUp();
    }
  };

  Game.prototype.afterDog = function (hitAny) {
    // fim do ciclo do cachorro: decide proximo passo
    if (this.state !== 'play') return;

    if (!hitAny) {
      // nao derrubou nenhum pato: perde uma vida
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver();
        return;
      }
      // reinicia a fase atual (comeca tudo de novo, como no original)
      this.startLevel();
      return;
    }
    // onda concluida com sucesso
    if (this.wave < this.cfg.waves) {
      this.state = 'ready'; this._initState();
    } else {
      this.levelComplete();
    }
  };

  Game.prototype.updateResults = function (dt) {
    // pontuacao ja somada; mostra resumo e avanca em toque/aguarda
    if (this.stateT > 4.5) this.nextFromResults();
  };

  /* ------------------------------ draw ----------------------------- */
  Game.prototype.draw = function () {
    var ctx = this.ctx;
    // fundo + cenario
    DH.drawScenery(ctx, this.sceneryOff, (this.level % 2));

    if (this.state === 'title') { this.drawTitle(ctx); this.drawVignette(ctx); return; }

    // patos atras do cachorro? nao, patos na frente da grama de fundo mas
    // o cachorro aparece em cima do chao: desenhamos patos, depois dog, depois penas
    for (var i = 0; i < this.ducks.length; i++) if (!(this.ducks[i].enterDelay > 0)) this.ducks[i].draw(ctx);

    this.dog.draw(ctx);

    for (var f = 0; f < this.feathers.length; f++) this.feathers[f].draw(ctx);
    for (var b = 0; b < this.bullets.length; b++) this.bullets[b].draw(ctx);

    // flash de disparo
    if (this.flash > 0) {
      ctx.save();
      ctx.globalAlpha = this.flash * 3;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    this.drawHUD(ctx);

    if (this.state === 'ready') this.drawReady(ctx);
    if (this.state === 'results') this.drawResults(ctx);
    if (this.state === 'over') this.drawOver(ctx);

    // mira sempre durante o jogo
    if (this.state === 'play' && this.pointer.active && !this.paused) {
      var ch = DH.drawCrosshair(this.shotsLeft > 0);
      var cx = this.pointer.x - ch.width / 2;
      var cy = this.pointer.y - ch.height / 2;
      // sombra sutil
      DH.drawSprite(ctx, ch, cx, cy, false);
    }

    this.drawVignette(ctx);

    if (this.paused) this.drawPaused(ctx);
  };

  Game.prototype.drawTitle = function (ctx) {
    // patos decorativos
    if (this._titleDucks) for (var i = 0; i < this._titleDucks.length; i++) this._titleDucks[i].draw(ctx);

    var blink = Math.floor(this.t * 2) % 2 === 0;

    // logo com contorno
    this.bigText(ctx, 'DUCK HUNT', 160, 44, DH.PAL.white, 4, 'center', DH.PAL.red);

    // pato estelar no titulo
    var spr = DH.drawDuck('black', Math.floor(this.t * 8) % 3, 'fly');
    DH.drawSprite(ctx, spr, 60, 70, false);
    var spr2 = DH.drawDuck('blue', Math.floor(this.t * 8 + 1) % 3, 'fly');
    DH.drawSprite(ctx, spr2, 232, 96, true);

    this.text(ctx, 'PRESS OR TAP TO PLAY', 160, 150, blink ? DH.PAL.yellow : DH.PAL.white, 2, 'center');
    this.text(ctx, 'MOUSE / TOUCH: AIM + FIRE', 160, 176, DH.PAL.white, 1, 'center');
    this.text(ctx, '3 SHOTS - HIT EVERY DUCK', 160, 188, DH.PAL.white, 1, 'center');

    var hs = 'HI-SCORE ' + pad(this.hiscore, 6);
    this.text(ctx, hs, 160, 214, DH.PAL.yellow, 1, 'center');
  };

  Game.prototype.drawReady = function (ctx) {
    this.panel(ctx, 60, 90, 200, 60);
    this.text(ctx, 'ROUND ' + (this.level + 1), 160, 106, DH.PAL.yellow, 2, 'center');
    var blink = Math.floor(this.t * 3) % 2 === 0;
    if (this.stateT > 0.6 && blink)
      this.text(ctx, 'READY?', 160, 128, DH.PAL.white, 2, 'center');
    this.text(ctx, 'DUCKS INCOMING', 160, 138, DH.PAL.white, 1, 'center');
  };

  Game.prototype.drawResults = function (ctx) {
    this.panel(ctx, 50, 60, 220, 120);
    this.text(ctx, 'ROUND ' + (this.level + 1) + ' CLEAR', 160, 76, DH.PAL.yellow, 2, 'center');
    this.text(ctx, 'ALL DUCKS DOWN!', 160, 96, DH.PAL.white, 1, 'center');
    this.text(ctx, 'TOTAL', 80, 120, DH.PAL.white, 1, 'left');
    this.text(ctx, pad(this.score, 6), 240, 120, DH.PAL.green ? '#8ef05a' : '#8ef05a', 1, 'right');
    this.text(ctx, 'HI-SCORE', 80, 136, DH.PAL.white, 1, 'left');
    this.text(ctx, pad(Math.max(this.hiscore, this.score), 6), 240, 136, DH.PAL.yellow, 1, 'right');
    if (Math.floor(this.t * 2) % 2 === 0)
      this.text(ctx, 'TAP FOR ROUND ' + (this.level + 2), 160, 162, DH.PAL.yellow, 1, 'center');
  };

  Game.prototype.drawOver = function (ctx) {
    this.panel(ctx, 70, 74, 180, 92);
    this.bigText(ctx, 'GAME OVER', 160, 96, DH.PAL.red, 3, 'center', '#000000');
    this.text(ctx, 'SCORE ' + pad(this.score, 6), 160, 122, DH.PAL.white, 1, 'center');
    this.text(ctx, 'HI-SCORE ' + pad(this.hiscore, 6), 160, 134, DH.PAL.yellow, 1, 'center');
    if (Math.floor(this.t * 2) % 2 === 0)
      this.text(ctx, 'TAP TO CONTINUE', 160, 152, DH.PAL.white, 1, 'center');
  };

  Game.prototype.drawHUD = function (ctx) {
    // barra superior escura
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, 20);
    ctx.restore();

    // vida (coracoes); acima de 5 mostra contador
    var shown = Math.min(this.lives, 5);
    var heart = DH.drawHeart(true);
    for (var i = 0; i < shown; i++)
      DH.drawSprite(ctx, heart, 6 + i * 11, 6);
    if (this.lives > 5) this.text(ctx, 'X' + this.lives, 6 + 5 * 11 + 2, 8, '#fff', 1, 'left');

    // patos da onda atual (silhuetas: voando -> abatido)
    var total = this.ducksWave || (this.cfg ? this.cfg.perWave : 2);
    for (var d = 0; d < total; d++) {
      var down = d < this.ducksDown;
      ctx.save();
      ctx.globalAlpha = down ? 0.22 : 1;
      var spr = down ? DH.drawDuck('red', 1, 'dead') : DH.drawDuck('red', 1, 'fly');
      DH.drawSprite(ctx, spr, 76 + d * 20, 2, false);
      ctx.restore();
    }

    // munição (3 marcadores)
    for (var s2 = 0; s2 < this.maxShots; s2++) {
      var used = s2 < this.crank;
      ctx.fillStyle = used ? '#5a5a5a' : '#ffd93b';
      ctx.fillRect(298 - s2 * 8, 7, 5, 6);
      ctx.fillStyle = '#000000';
      ctx.fillRect(298 - s2 * 8, 7, 5, 1);
    }

    // score / hiscore
    this.text(ctx, pad(this.score, 6), 130, 7, DH.PAL.white, 1, 'center');
    this.text(ctx, 'HI ' + pad(this.hiscore, 6), 220, 7, DH.PAL.yellow, 1, 'center');

    // ganho de pontos flutuante
    if (this.lastGain && this.lastGain.t > 0) {
      this.lastGain.t -= 1 / 60;
      ctx.save();
      ctx.globalAlpha = M.clamp(this.lastGain.t * 2, 0, 1);
      this.text(ctx, '+' + this.lastGain.v, this._gainX || 160, 40 - (0.7 - this.lastGain.t) * 10, '#8ef05a', 1, 'center');
      ctx.restore();
    }
  };

  Game.prototype.drawPaused = function (ctx) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    this.bigText(ctx, 'PAUSED', 160, 110, DH.PAL.white, 3, 'center', '#000');
    this.text(ctx, 'TAP TO RESUME', 160, 140, DH.PAL.yellow, 1, 'center');
  };

  /* helpers de texto/shape */
  Game.prototype.text = function (ctx, str, x, y, color, size, align) {
    DH.Font.draw(ctx, str, x, y, color, size || 1, 1, align || 'left');
  };
  Game.prototype.bigText = function (ctx, str, x, y, color, size, align, outline) {
    var w = (str.length * 4 - 1) * size;
    var ox = align === 'center' ? -w / 2 : 0;
    var px = x + ox;
    if (outline) {
      for (var o = 1; o <= Math.max(1, size / 2); o++) {
        DH.Font.draw(ctx, str, px - 1, y, outline, size, 1, 'left');
        DH.Font.draw(ctx, str, px + 1, y, outline, size, 1, 'left');
        DH.Font.draw(ctx, str, px, y - 1, outline, size, 1, 'left');
        DH.Font.draw(ctx, str, px, y + 1, outline, size, 1, 'left');
      }
    }
    DH.Font.draw(ctx, str, px, y, color, size, 1, 'left');
  };
  Game.prototype.panel = function (ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = DH.PAL.white;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.strokeStyle = '#5a5a5a';
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
  };
  Game.prototype.drawVignette = function (ctx) {
    ctx.save();
    var g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };

  function pad(n, len) {
    var s = String(n);
    while (s.length < len) s = '0' + s;
    return s;
  }

  /* --------------------------- controle ---------------------------- */
  Game.prototype.togglePause = function () {
    this.paused = !this.paused;
    if (!this.paused) { this.lastTime = 0; } // evita salto de dt
  };

  Game.prototype.resize = function () {
    var box = this.canvas.parentElement.getBoundingClientRect();
    var cssW = box.width, cssH = box.height;
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    // escala do mundo 320x240 para caber (mantendo proporcao 4:3)
    var scale = Math.min(cssW / W, cssH / H) * dpr;
    var ox = (cssW * dpr - W * scale) / 2;
    var oy = (cssH * dpr - H * scale) / 2;
    this.view = { scale: scale, ox: ox, oy: oy, dpr: dpr };
  };

  Game.prototype.frame = function (time) {
    var ctx = this.ctx;
    // aplica view
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.view) this.resize();
    ctx.setTransform(this.view.scale, 0, 0, this.view.scale, this.view.ox, this.view.oy);
    ctx.imageSmoothingEnabled = false;

    this.draw();

    // HUD extra fora do mundo (resolucao alta): controles hint
    // (nada aqui, mantem pixel-perfect)
  };

  Game.prototype.tick = function (time) {
    var dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    if (!isFinite(dt) || dt < 0) dt = 0;
    dt = Math.min(dt, 0.1); // clamp p/ evitar teleporte em tabs ocultas

    if (!this.paused) {
      // timestep fixo interno p/ fisica estavel
      var step = 1 / 120;
      this.acc += dt;
      var guard = 0;
      while (this.acc >= step && guard < 40) {
        this.update(step);
        this.acc -= step;
        guard++;
      }
    } else {
      this.t += dt;
    }

    this.frame(time);
  };

  DH.Game = Game;
})(window.DH);
