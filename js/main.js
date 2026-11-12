/* Duck Hunt JS - bootstrap: cria o canvas, liga entrada unificada
   (mouse + toque), redimensionamento responsivo, fullscreen e wake lock. */
(function () {
  'use strict';

  var W = 320, H = 240;
  var wrap = document.getElementById('wrap');
  var canvas = document.getElementById('game');
  var game = new window.DH.Game(canvas);
  window.DHGame = game;

  /* ----------------------- entrada: ponteiro ----------------------- */
  function toWorld(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var v = game.view;
    // rect esta em css px; o mundo esta em scale*dpr, mas o canvas inteiro
    // tem rect igual a cssW x cssH. Inverte a transform da view.
    var px = clientX - rect.left;
    var py = clientY - rect.top;
    var sx = rect.width / W, sy = rect.height / H;
    // area do mundo dentro do canvas (letterbox)
    var scale = Math.min(rect.width / W, rect.height / H);
    var ox = (rect.width - W * scale) / 2;
    var oy = (rect.height - H * scale) / 2;
    var x = (px - ox) / scale;
    var y = (py - oy) / scale;
    return { x: x, y: y };
  }

  var dragging = false;

  function onDown(e) {
    e.preventDefault();
    // retomar audio em todo gesto (garante som no iOS mesmo depois de suspender)
    window.DH.Audio.ensureResume();
    unlockAudio();
    var p = toWorld(e.clientX, e.clientY);
    game.pointerMove(p.x, p.y);
    game.press(p.x, p.y);
    dragging = true;
  }
  function onMove(e) {
    var p = toWorld(e.clientX, e.clientY);
    game.pointerMove(p.x, p.y);
  }
  function onUp(e) {
    game.release();
    dragging = false;
  }

  canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);

  canvas.addEventListener('touchstart', function (e) {
    if (!e.touches.length) return;
    var t = e.touches[0];
    onDown(t);
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) {
    if (!e.touches.length) return;
    e.preventDefault();
    var t = e.touches[0];
    onMove(t);
  }, { passive: false });
  canvas.addEventListener('touchend', function (e) {
    e.preventDefault();
    onUp(e);
  }, { passive: false });

  /* teclado: espaco/dispara, P pausa, F fullscreen, M mudo */
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      unlockAudio();
      game.press(game.pointer.x, game.pointer.y);
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      game.togglePause();
    } else if (e.code === 'KeyF') {
      toggleFullscreen();
    } else if (e.code === 'KeyM') {
      var on = !window.DH.Audio.isEnabled();
      window.DH.Audio.setEnabled(on);
      updateSoundUI();
    }
  });

  /* ------------------------- touch / orientacao -------------------- */
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (isTouch) document.body.classList.add('touch');

  var rotate = document.getElementById('rotate');
  var rotateOk = document.getElementById('rotate-ok');
  if (rotateOk) rotateOk.addEventListener('click', function (e) {
    e.preventDefault();
    document.body.classList.remove('need-rotate');
    document.body.dataset.rotateDismissed = '1';
  });

  function checkOrientation() {
    if (!isTouch) return;
    if (document.body.dataset.rotateDismissed === '1') return;
    var w = window.innerWidth, h = window.innerHeight;
    var portrait = h > w * 1.1;
    // mostrar aviso so no jogo, nao no titulo
    var inGame = game.state !== 'title';
    document.body.classList.toggle('need-rotate', portrait && inGame);
  }
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', function () {
    setTimeout(checkOrientation, 240);
  });
  var _origStart = game.startGame.bind(game);
  game.startGame = function () { _origStart(); setTimeout(checkOrientation, 60); };

  /* ----------------------- redimensionamento ----------------------- */
  var ro = null;
  function resize() {
    game.resize();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () {
    setTimeout(resize, 200);
  });
  if (window.ResizeObserver) {
    ro = new ResizeObserver(function () { resize(); });
    ro.observe(wrap);
  }

  /* --------------------------- fullscreen -------------------------- */
  var fsBtn = document.getElementById('btn-full');
  function isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function toggleFullscreen() {
    try {
      if (!isFullscreen()) {
        var el = document.documentElement;
        var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
        if (req) req.call(el).then(onFsChange).catch(function () {});
        else if (canvas.webkitRequestFullscreen) canvas.webkitRequestFullscreen();
      } else {
        var ex = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
        if (ex) ex.call(document);
      }
    } catch (e) {}
    requestWakeLock();
  }
  fsBtn.addEventListener('click', function (e) {
    e.preventDefault();
    unlockAudio();
    toggleFullscreen();
  });
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  function onFsChange() {
    fsBtn.textContent = isFullscreen() ? '\u2716' : '\u26F6';
    fsBtn.setAttribute('aria-label', isFullscreen() ? 'Sair da tela cheia' : 'Tela cheia');
    setTimeout(resize, 120);
    requestWakeLock();
  }

  /* ------------------------- mute / som ---------------------------- */
  var muteBtn = document.getElementById('btn-sound');
  function updateSoundUI() {
    var on = window.DH.Audio.isEnabled();
    muteBtn.textContent = on ? '\u266A' : '\u00D7';
    muteBtn.setAttribute('aria-label', on ? 'Desligar som' : 'Ligar som');
    muteBtn.classList.toggle('off', !on);
  }
  muteBtn.addEventListener('click', function (e) {
    e.preventDefault();
    var on = !window.DH.Audio.isEnabled();
    window.DH.Audio.setEnabled(on);
    updateSoundUI();
  });

  /* pausa em UI */
  var pauseBtn = document.getElementById('btn-pause');
  pauseBtn.addEventListener('click', function (e) {
    e.preventDefault();
    unlockAudio();
    game.togglePause();
    pauseBtn.textContent = game.paused ? '\u25B6' : '\u23F8';
  });

  /* --------------------- audio unlock + wake lock ------------------ */
  var audioUnlocked = false;
  function unlockAudio() {
    // sempre tenta retomar (barato e silencia caso volte a suspender)
    window.DH.Audio.ensureResume();
    if (audioUnlocked) return;
    window.DH.Audio.unlock();
    audioUnlocked = true;
    showToast('SOM LIGADO');
  }

  // desbloqueia no PRIMEIRO gesto da pagina toda (fase de captura), para
  // funcionar mesmo se o primeiro toque cair fora do canvas
  function firstGesture() {
    unlockAudio();
  }
  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(function (t) {
    window.addEventListener(t, firstGesture, { capture: true, passive: true });
  });

  var wakeLock = null;
  function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    navigator.wakeLock.request('screen').then(function (s) {
      wakeLock = s;
      s.addEventListener('release', function () { wakeLock = null; });
    }).catch(function () {});
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      requestWakeLock();
      game.lastTime = 0; // reseta dt para nao dar salto
    }
  });

  /* ------------------------- botao touch fire -------------------- */
  var fire = document.getElementById('fire-btn');
  function fireDown(e) {
    e.preventDefault();
    unlockAudio();
    // dispara na mira atual (no centro do canvas se nao houver mira)
    var x = game.pointer.active ? game.pointer.x : W / 2;
    var y = game.pointer.active ? game.pointer.y : H / 2;
    game.press(x, y);
  }
  fire.addEventListener('touchstart', fireDown, { passive: false });
  fire.addEventListener('mousedown', fireDown);

  /* ---------------------------- loop ------------------------------- */
  function loop(time) {
    game.tick(time);
    requestAnimationFrame(loop);
  }

  /* --------------------------- PWA: service worker ---------------- */
  if ('serviceWorker' in navigator &&
      (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 1200);
  }

  updateSoundUI();
  requestWakeLock();
  resize();
  requestAnimationFrame(loop);
})();
