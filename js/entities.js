/* Duck Hunt JS - entidades: pato (com IA de voo estilo NES), bala, penas,
   cachorro (entrar / farejar / apontar / rir / levar os patos). */
window.DH = window.DH || {};

(function (DH) {
  'use strict';

  var M = DH.math;
  var GROUND_Y = DH.GROUND_Y;

  /* ------------------------------ DUCK ------------------------------ */
  function Duck(rng, x, dir, speed, type, level) {
    this.rng = rng;
    this.x = x;
    this.y = GROUND_Y + 20;          // comeca abaixo da tela
    this.dir = dir;                   // -1 esquerda, 1 direita
    this.speed = speed;               // px/s horizontal
    this.vy = -speed * 0.9;           // sobe na entrada
    this.type = type;                 // 'black'|'red'|'blue'|'green'|'gold'
    this.level = level;
    this.wing = 0;
    this.wingT = 0;
    this.wingRate = 9;                // frames de asa por segundo
    this.state = 'enter';
    this.alive = true;
    this.scored = false;
    this.gotaway = false;
    this.landT = 0;
    this.zigT = rng.range(0.4, 1.0);  // proxima mudanca de altura
    this.targetY = rng.range(34, 120);
    this.flyTime = 0;
    this.maxFly = rng.range(2.6, 4.4); // tempo voando antes de escapar
    this.hitT = 0;
    this.flip = dir < 0;              // sprite aponta p/ esquerda por padrao
    this.wobble = rng.range(0, 6.28);
  }

  Duck.prototype.update = function (dt) {
    this.wingT += dt * this.wingRate;
    if (this.wingT >= 1) { this.wingT -= 1; this.wing = (this.wing + 1) % 3; }
    this.wobble += dt * 6;

    if (this.state === 'enter' || this.state === 'fly') {
      this.x += this.dir * this.speed * dt;
      this.y += this.vy * dt;
      // leve oscilacao vertical
      this.y += Math.sin(this.wobble) * 6 * dt;

      if (this.state === 'enter') {
        // sobe ate o alvo de altura
        if (this.y <= this.targetY) { this.state = 'fly'; this.pickAlt(); }
      } else {
        this.flyTime += dt;
        this.zigT -= dt;
        if (this.zigT <= 0) { this.pickAlt(); }
        // segue suavemente o alvo de altura
        var desired = M.clamp(this.targetY, 24, GROUND_Y - 30);
        var maxVy = this.speed * 1.1;
        this.vy = M.approach(this.vy, M.clamp((desired - this.y) * 2.2, -maxVy, maxVy), maxVy * dt * 4);
        if (this.flyTime > this.maxFly) this.leave();
      }
      // limites de altura
      if (this.y < 20) { this.y = 20; this.vy = Math.abs(this.vy); this.targetY = this.y + 30; }
      if (this.y > GROUND_Y - 22) { this.y = GROUND_Y - 22; this.vy = -Math.abs(this.vy); this.targetY = this.y - 40; }
      // quina horizontal no voo normal (mas escapa pelo lado ao 'leave')
      if (this.state === 'fly') {
        if (this.x < 10 && this.dir < 0) { this.dir = 1; this.flip = false; }
        if (this.x > 300 && this.dir > 0) { this.dir = -1; this.flip = true; }
      }
      // bate quack de vez em quando
      if (this.state === 'fly' && this.rng.chance(dt * 0.3)) this.quackPending = true;
    }
    else if (this.state === 'leave') {
      this.x += this.dir * this.speed * 1.25 * dt;
      this.y += this.speed * 1.1 * dt;   // mergulha pra fora
      this.wingRate = 14;
      if (this.x < -30 || this.x > 350 || this.y > GROUND_Y + 40) {
        this.alive = false; this.gotaway = true;
      }
    }
    else if (this.state === 'hit') {
      this.hitT -= dt;
      this.x += this.dir * this.speed * 0.2 * dt;
      this.vy += 1400 * dt;
      this.y += this.vy * dt;
      if (this.hitT <= 0) { this.state = 'fall'; }
    }
    else if (this.state === 'fall') {
      this.vy += 1500 * dt;
      this.y += this.vy * dt;
      this.x += Math.sin(this.y * 0.05) * 18 * dt;
      this.wing = 1;
      if (this.y >= GROUND_Y + 22) {
        this.y = GROUND_Y + 22;
        this.splash = true;
        this.landT += dt;
        if (this.landT > 0.5) this.alive = false;
      }
    }
  };

  Duck.prototype.pickAlt = function () {
    this.zigT = this.rng.range(0.35, 0.9);
    this.targetY = M.clamp(this.y + this.rng.range(-60, 60), 24, GROUND_Y - 30);
  };

  Duck.prototype.leave = function () {
    this.state = 'leave';
    // decide sair pelo lado mais proximo da borda
    this.dir = this.x > 160 ? 1 : -1;
    this.flip = this.dir < 0;
  };

  Duck.prototype.shoot = function () {
    if (!this.alive) return false;
    if (this.state === 'hit' || this.state === 'fall') return false;
    this.state = 'hit';
    this.hitT = 0.28;
    this.vy = this.vy * 0.3 - 40;
    this.dir = this.dir; // mantem
    this.flip = this.dir < 0;
    this.scored = true;
    return true;
  };

  Duck.prototype.bonusUp = function () {
    // bônus original: atirar no pato enquanto ele sobe
    return this.vy < -40;
  };

  Duck.prototype.hurtBox = function () {
    return { x: this.x - 10, y: this.y - 7, w: 22, h: 15 };
  };

  Duck.prototype.draw = function (ctx) {
    var spr;
    var type = this.type === 'gold' ? 'gold' : this.type;
    if (this.state === 'hit') spr = DH.drawDuck(type, 1, 'hit');
    else if (this.state === 'fall') spr = DH.drawDuck(type, 1, this.landT > 0 ? 'dead' : 'fall');
    else spr = DH.drawDuck(type, this.wing, 'fly');
    var bob = Math.sin(this.wobble) * 1.0;
    DH.drawSprite(ctx, spr, this.x - spr.width / 2, this.y - spr.height / 2 + bob, this.flip);
  };

  DH.Duck = Duck;

  /* ------------------------------ BULLET ---------------------------- */
  function Bullet(x, y) {
    this.x = x; this.y = y;
    this.trail = [];
    this.life = 0.12;   // tempo do "traco" de tiro
  }
  Bullet.prototype.update = function (dt) {
    this.life -= dt;
  };
  Bullet.prototype.draw = function (ctx) {
    var a = M.clamp(this.life / 0.12, 0, 1);
    var len = 22 * (1 - a) + 6;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff';
    var ang = this.ang || 0;
    var dx = Math.cos(ang), dy = Math.sin(ang);
    for (var i = 0; i < len; i += 2) {
      ctx.fillRect(Math.round(this.x - dx * i), Math.round(this.y - dy * i), 2, 2);
    }
    ctx.fillStyle = DH.PAL.yellow;
    ctx.fillRect(Math.round(this.x - dx * len), Math.round(this.y - dy * len), 2, 2);
    ctx.restore();
  };
  DH.Bullet = Bullet;

  /* ------------------------------ FEATHER --------------------------- */
  function Feather(rng, x, y, color) {
    this.x = x; this.y = y;
    this.vx = rng.range(-50, 50);
    this.vy = rng.range(-90, -20);
    this.rot = rng.range(0, 6.28);
    this.vr = rng.range(-4, 4);
    this.life = rng.range(0.7, 1.3);
    this.max = this.life;
    this.spr = DH.drawFeather(color);
    this.wob = rng.range(0, 6.28);
  }
  Feather.prototype.update = function (dt) {
    this.life -= dt;
    this.vy += 240 * dt;
    this.vy = Math.min(this.vy, 120);
    this.wob += dt * 5;
    this.x += (this.vx + Math.sin(this.wob) * 30) * dt;
    this.y += this.vy * dt;
    this.rot += this.vr * dt;
  };
  Feather.prototype.draw = function (ctx) {
    ctx.save();
    ctx.globalAlpha = M.clamp(this.life / this.max, 0, 1);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.drawImage(this.spr, -this.spr.width / 2, -this.spr.height / 2);
    ctx.restore();
  };
  DH.Feather = Feather;

  /* ------------------------------- DOG ------------------------------ */
  // Estados: hidden -> rise -> sniff -> (point+laugh | hold+exit) -> sink -> hidden
  function Dog() {
    this.state = 'hidden';
    this.x = 176;            // centro do buraco (offset na tela)
    this.holeY = GROUND_Y + 4;
    this.y = this.holeY;     // y do "pescoço"
    this.reveal = 0;         // 0..1 quanto do corpo apareceu
    this.t = 0;
    this.frame = 0;
    this.holding = null;     // cor do(s) pato(s) carregando
    this.mood = 'laugh';     // 'laugh' (patos fugiram) ou 'prize' (acertou tudo)
    this.onDone = null;
  }

  Dog.STARTLE_DELAY = 0.15;

  Dog.prototype.trigger = function (mood, holdingColors, onDone) {
    if (this.state !== 'hidden') return;
    this.mood = mood;
    this.holding = holdingColors || null;
    this.onDone = onDone || null;
    this.state = 'rise';
    this.t = 0;
    this.reveal = 0;
  };

  Dog.prototype.update = function (dt) {
    this.t += dt;
    this.frame = Math.floor(this.t * 6);
    switch (this.state) {
      case 'rise':
        this.reveal = M.approach(this.reveal, 1, 9, dt);
        if (this.reveal > 0.92) {
          this.reveal = 1;
          this.state = this.mood === 'prize' ? 'hold' : 'sniff';
          this.t = 0;
        }
        break;
      case 'sniff':
        if (this.t > 0.9) { this.state = 'point'; this.t = 0; }
        break;
      case 'point':
        if (this.t > 0.45) { this.state = 'laugh'; this.t = 0; }
        break;
      case 'laugh':
        if (this.t > 1.5) { this.state = 'sink'; this.t = 0; }
        break;
      case 'hold':
        // mostra o premio por um instante e desce
        if (this.t > 1.4) { this.state = 'sink'; this.t = 0; }
        break;
      case 'sink':
        this.reveal = M.approach(this.reveal, 0, 7, dt);
        if (this.reveal < 0.03) {
          this.reveal = 0;
          this.state = 'hidden';
          if (this.onDone) { var cb = this.onDone; this.onDone = null; cb(); }
        }
        break;
    }
  };

  Dog.prototype.belowGround = function () {
    return this.reveal; // usado para clipar
  };

  Dog.prototype.draw = function (ctx) {
    if (this.state === 'hidden') return;
    var poseMap = {
      rise: 'peek', sniff: 'sniff', point: 'point',
      laugh: 'laugh', hold: 'hold', sink: 'peek'
    };
    var pose = poseMap[this.state] || 'peek';
    var spr = DH.drawDog(pose, this.frame, (pose === 'hold' || pose === 'point') ? this.holding : null);

    var baseY = this.holeY;             // linha do chao
    var full = spr.height;
    // quanto do sprite esta acima do chao conforme reveal
    var visible = full * this.reveal;
    var top = baseY - visible;

    ctx.save();
    // clipa na linha do chao para o cachorro "sair do buraco"
    ctx.beginPath();
    ctx.rect(this.x - 40, 0, 80, baseY);
    ctx.clip();
    var drawY = baseY - visible;
    // tremor na risada
    if (pose === 'laugh') drawY += (this.frame % 2);
    DH.drawSprite(ctx, spr, this.x - spr.width / 2, drawY, false);
    ctx.restore();

    // buraco desenhado por baixo na descida
    if (this.reveal < 1) {
      var hole = DH.drawHole();
      DH.drawSprite(ctx, hole, this.x - hole.width / 2, baseY - 2);
    }
  };

  DH.Dog = Dog;

})(window.DH);
