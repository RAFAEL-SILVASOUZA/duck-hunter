/* Duck Hunt JS - audio 100% sintetizado via Web Audio (sem arquivos).
   Todos os efeitos do jogo original sao recriados com osciladores + ruido.
   Requer um gesture do usuario para desbloquear (botao/touch), entao o
   jogo chama Audio.unlock() no primeiro input. */
window.DH = window.DH || {};

(function (DH) {
  'use strict';

  var ctx = null;
  var master = null;
  var enabled = true;
  var unlocked = false;

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    // compressor para dar punch e nao distorcer quando muitos sons se somam
    var comp = ctx.createDynamicsCompressor();
    try {
      comp.threshold.value = -18;
      comp.knee.value = 24;
      comp.ratio.value = 8;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
    } catch (e) {}
    master.connect(comp);
    comp.connect(ctx.destination);
    return ctx;
  }

  /* Desbloqueio robusto: precisa ser chamado DENTRO do gesto do usuario.
     No iOS/Safari e preciso tocar um buffer mudo para "acordar" o contexto;
     em outros basta resume(). Sempre toca um blip de confirmacao audivel. */
  function unlock(withBlip) {
    var c = ensure();
    if (!c) return;
    if (c.state === 'suspended' && c.resume) {
      try { c.resume(); } catch (e) {}
    }
    // iOS: buffer de 1 amostra mudo dentro do gesture
    try {
      var buf = c.createBuffer(1, 1, c.sampleRate);
      var src = c.createBufferSource();
      src.buffer = buf;
      src.connect(master || c.destination);
      if (src.noteOn) src.noteOn(0); else src.start(0);
    } catch (e) {}
    var fresh = !unlocked;
    unlocked = true;
    if (enabled && (fresh || withBlip)) {
      // bip de confirmacao: o usuario percebe que o som ligou
      tone(880, 0.06, 'square', 0.3);
      tone(1320, 0.07, 'square', 0.24, now() + 0.07);
    }
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  /* beep basico */
  function tone(freq, dur, type, vol, when, glide) {
    if (!enabled) return;
    var c = ensure();
    if (!c) return;
    type = type || 'square';
    var t0 = when || now();
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, glide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  /* ruido (explosao, tiro, penas) */
  function noise(dur, vol, filterFreq, when, sweepTo) {
    if (!enabled) return;
    var c = ensure();
    if (!c) return;
    var t0 = when || now();
    var n = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, n, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var src = c.createBufferSource();
    src.buffer = buf;
    var f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(filterFreq || 2000, t0);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    var g = c.createGain();
    g.gain.setValueAtTime(vol || 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + dur);
  }

  /* sequencia simples de notas */
  function seq(notes, type, step, vol) {
    if (!enabled) return;
    var c = ensure();
    if (!c) return;
    var t = now();
    for (var i = 0; i < notes.length; i++) {
      if (notes[i] > 0) tone(notes[i], step * 0.9, type || 'square', vol || 0.22, t);
      t += step;
    }
  }

  var A = {
    unlock: function () { unlock(true); },
    /* tenta retomar um contexto suspenso sem emitir som (chamado em todo gesto) */
    ensureResume: function () {
      if (!ctx) { return; }
      if (ctx.state === 'suspended' && ctx.resume) { try { ctx.resume(); } catch (e) {} }
    },
    state: function () { return ctx ? ctx.state : 'none'; },
    setEnabled: function (v) { enabled = v; if (v) unlock(true); },
    isEnabled: function () { return enabled; },
    isUnlocked: function () { return unlocked; },

    shoot: function () {
      noise(0.14, 0.5, 3200, null, 400);
      tone(180, 0.08, 'square', 0.18, null, 60);
    },
    quack: function () {
      tone(520, 0.09, 'square', 0.22, null, 300);
      tone(430, 0.07, 'square', 0.18, now() + 0.08, 260);
    },
    hit: function () {
      tone(900, 0.05, 'square', 0.28, null, 1600);
      noise(0.06, 0.25, 5000);
    },
    fall: function () {
      tone(700, 0.6, 'square', 0.2, null, 90);
    },
    dogBark: function () {
      tone(360, 0.08, 'sawtooth', 0.22, null, 220);
      tone(300, 0.10, 'sawtooth', 0.2, now() + 0.10, 180);
    },
    dogLaugh: function () {
      var t = now();
      var f = [400, 300, 400, 300, 420, 320, 440, 330];
      for (var i = 0; i < f.length; i++) {
        tone(f[i], 0.06, 'sawtooth', 0.2, t, f[i] * 0.6);
        t += 0.07;
      }
    },
    splash: function () {
      noise(0.18, 0.3, 1200, null, 300);
    },
    oneUp: function () {
      seq([660, 880, 990, 1320], 'square', 0.09, 0.24);
    },
    start: function () {
      seq([523, 659, 784, 1046], 'square', 0.10, 0.24);
    },
    roundClear: function () {
      seq([784, 988, 1175, 1568], 'square', 0.09, 0.22);
    },
    gameOver: function () {
      seq([523, 494, 440, 392, 330, 262], 'triangle', 0.16, 0.24);
    },
    menuBlip: function () {
      tone(660, 0.05, 'square', 0.18);
    },
    select: function () {
      tone(880, 0.08, 'square', 0.22);
    },
    bonus: function () {
      tone(1200, 0.05, 'square', 0.2, null, 2000);
    }
  };

  DH.Audio = A;
})(window.DH);
