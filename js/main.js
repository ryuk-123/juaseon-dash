/* ===== JUASEON DASH — boot, screen flow, input ===== */
(function () {
  var JD = window.JD || (window.JD = {});

  window.addEventListener('load', function () {
    var canvas = document.getElementById('game');
    JD.canvas = canvas;
    JD.ctx = canvas.getContext('2d');

    // ---- persistence ----
    JD.selectedCharId = localStorage.getItem('jd_char') || JD.characters[0].id;
    JD.unlockedStages = parseInt(localStorage.getItem('jd_unlocked') || '1', 10);
    function bestOf(id) { return parseInt(localStorage.getItem('jd_best_' + id) || '0', 10); }
    function saveBest(id, pct) {
      if (pct > bestOf(id)) localStorage.setItem('jd_best_' + id, String(Math.floor(pct)));
    }

    // ---- element refs ----
    var screens = {
      title: document.getElementById('screen-title'),
      select: document.getElementById('screen-select'),
      stages: document.getElementById('screen-stages')
    };
    JD.hud = {
      root: document.getElementById('hud'),
      fill: document.getElementById('progress-fill'),
      pct: document.getElementById('progress-pct'),
      attempt: document.getElementById('attempt')
    };
    var overlay = document.getElementById('overlay');
    var overlayTitle = document.getElementById('overlay-title');
    var overlaySub = document.getElementById('overlay-sub');
    var overlayBtn = document.getElementById('overlay-btn');
    var overlayBtn2 = document.getElementById('overlay-btn2');
    var tapHint = document.getElementById('tap-hint');
    var charGrid = document.getElementById('char-grid');
    var charNameEl = document.getElementById('char-name');
    var stageGrid = document.getElementById('stage-grid');

    JD.screen = 'title';
    var charCursor = 0, stageCursor = 0;

    // ---- overlay helper (death/win/pause share it) ----
    function showOverlay(title, sub, btnText, btn2Text, onBtn, onBtn2) {
      overlayTitle.textContent = title;
      overlaySub.textContent = sub;
      overlayBtn.textContent = btnText;
      overlayBtn.onclick = onBtn;
      if (btn2Text) {
        overlayBtn2.textContent = btn2Text;
        overlayBtn2.onclick = onBtn2;
        overlayBtn2.classList.remove('hidden');
      } else { overlayBtn2.classList.add('hidden'); }
      overlay.classList.remove('hidden');
    }
    function hideOverlay() { overlay.classList.add('hidden'); }

    // ---- screen manager ----
    JD.showScreen = function (name) {
      JD.screen = name;
      for (var k in screens) screens[k].classList.add('hidden');
      JD.hud.root.classList.add('hidden');
      hideOverlay();
      tapHint.classList.add('hidden');
      if (name === 'game') {
        JD.hud.root.classList.remove('hidden');
      } else {
        JD.world = null;            // menu shows clean animated bg
        JD.state = 'idle';
        if (screens[name]) screens[name].classList.remove('hidden');
        JD.audio.play('menu');
      }
      if (name === 'select') buildCharSelected();
      if (name === 'stages') buildStages();
    };

    // ---- build character grid ----
    (function buildCharGrid() {
      JD.characters.forEach(function (ch, i) {
        var cell = document.createElement('div');
        cell.className = 'char-cell';
        cell.dataset.idx = i;
        var c = document.createElement('canvas');
        c.width = 80; c.height = 80;
        JD.drawCharacter(c.getContext('2d'), ch, 40, 40, 60, 0);
        cell.appendChild(c);
        cell.addEventListener('click', function () { selectChar(i); });
        charGrid.appendChild(cell);
      });
      // initialize cursor to saved char
      JD.characters.forEach(function (ch, i) { if (ch.id === JD.selectedCharId) charCursor = i; });
    })();

    function selectChar(i) {
      charCursor = (i + JD.characters.length) % JD.characters.length;
      var ch = JD.characters[charCursor];
      JD.selectedCharId = ch.id;
      buildCharSelected();
    }
    function buildCharSelected() {
      var cells = charGrid.children;
      for (var i = 0; i < cells.length; i++) cells[i].classList.toggle('selected', i === charCursor);
      charNameEl.textContent = JD.characters[charCursor].name;
    }

    // ---- build stage cards ----
    function buildStages() {
      stageGrid.innerHTML = '';
      JD.STAGES.forEach(function (st, i) {
        var unlocked = st.playable && st.id <= JD.unlockedStages;
        var card = document.createElement('div');
        card.className = 'stage-card' + (unlocked ? '' : ' locked');
        card.style.background = 'linear-gradient(160deg, ' + st.c1 + ', ' + st.c2 + ')';
        card.style.boxShadow = unlocked ? '0 0 30px ' + st.c1 : 'none';
        card.innerHTML =
          '<div class="stage-num">' + st.id + '</div>' +
          '<div class="stage-title">' + st.name + '</div>' +
          '<div class="stage-best">' + st.mode + '</div>' +
          '<div class="stage-best">BEST ' + bestOf(st.id) + '%</div>';
        if (unlocked) card.addEventListener('click', function () { startGame(i); });
        stageGrid.appendChild(card);
      });
    }

    // ---- start a stage ----
    function startGame(levelIndex) {
      localStorage.setItem('jd_char', JD.selectedCharId);
      JD.showScreen('game');
      JD.startStage(levelIndex);
    }

    // ---- engine callbacks ----
    var firstInput = false;
    JD.onStageStart = function () {
      firstInput = false;
      tapHint.classList.remove('hidden');
      JD.audio.play('s' + JD.currentStageIndex);
    };
    JD.onWin = function () {
      var st = JD.STAGES[JD.currentStageIndex];
      saveBest(st.id, 100);
      // unlock next stage
      if (JD.unlockedStages < st.id + 1) {
        JD.unlockedStages = st.id + 1;
        localStorage.setItem('jd_unlocked', String(JD.unlockedStages));
      }
      showOverlay('LEVEL COMPLETE', '100%  ·  ' + JD.world.name, 'RETRY', 'MENU',
        function () { hideOverlay(); JD.startStage(JD.currentStageIndex); },
        function () { JD.showScreen('stages'); });
    };

    // ---- input ----
    JD.audio.resume();   // safe no-op until a real gesture occurs

    // mute control
    var muteBtn = document.getElementById('mute-btn');
    function refreshMute() { muteBtn.textContent = JD.audio.muted ? '🔇' : '🔊'; }
    JD.audio.init(); refreshMute();
    muteBtn.addEventListener('click', function () { JD.audio.toggleMute(); refreshMute(); });

    function press() {
      JD.audio.resume();
      if (JD.screen !== 'game' || JD.paused || JD.state !== 'playing') return;
      if (!JD.input.holding) JD.input.pressed = true;   // edge (for orbs)
      JD.input.holding = true;
      if (!firstInput) { firstInput = true; tapHint.classList.add('hidden'); }
    }
    function release() { JD.input.holding = false; }

    function togglePause() {
      if (JD.screen !== 'game') return;
      if (JD.paused) {
        JD.resume(); hideOverlay();
      } else if (JD.state === 'playing') {
        JD.pause();
        showOverlay('PAUSED', 'Space / ↑ / Click to Jump', 'RESUME', 'MENU',
          function () { JD.resume(); hideOverlay(); },
          function () { JD.showScreen('stages'); });
      }
    }

    var JUMP_KEYS = { Space: 1, ArrowUp: 1, KeyW: 1 };
    window.addEventListener('keydown', function (e) {
      JD.audio.resume();
      if (e.code === 'KeyM') { JD.audio.toggleMute(); refreshMute(); return; }
      if (e.code === 'Escape') { togglePause();
        if (JD.screen === 'select') JD.showScreen('title');
        else if (JD.screen === 'stages') JD.showScreen('select');
        return;
      }
      if (e.code === 'Enter') {
        e.preventDefault();
        if (JD.screen === 'title') JD.showScreen('select');
        else if (JD.screen === 'select') JD.showScreen('stages');
        else if (JD.screen === 'stages') {
          var st = JD.STAGES[stageCursor];
          if (st.playable && st.id <= JD.unlockedStages) startGame(stageCursor);
        }
        return;
      }
      if (JUMP_KEYS[e.code]) {
        e.preventDefault();
        if (JD.screen === 'title') { JD.showScreen('select'); return; }
        press();
        return;
      }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        var d = e.code === 'ArrowRight' ? 1 : -1;
        if (JD.screen === 'select') selectChar(charCursor + d);
        else if (JD.screen === 'stages') {
          stageCursor = (stageCursor + d + JD.STAGES.length) % JD.STAGES.length;
        }
      }
    });
    window.addEventListener('keyup', function (e) { if (JUMP_KEYS[e.code]) release(); });
    canvas.addEventListener('mousedown', function () { press(); });
    window.addEventListener('mouseup', release);
    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); press(); }, { passive: false });
    window.addEventListener('touchend', function () { release(); });

    // ---- title / nav buttons ----
    document.getElementById('start-btn').addEventListener('click', function () { JD.audio.resume(); JD.showScreen('select'); });
    document.getElementById('confirm-char').addEventListener('click', function () { JD.showScreen('stages'); });
    document.getElementById('back-title').addEventListener('click', function () { JD.showScreen('title'); });
    document.getElementById('back-select').addEventListener('click', function () { JD.showScreen('select'); });

    // ---- main loop ----
    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      JD.time += dt;
      if (JD.audioPulse > 0) JD.audioPulse = Math.max(0, JD.audioPulse - dt * 3.5);
      if (JD.screen === 'game') {
        JD.update(dt);
      } else {
        JD.camera.x += 60 * dt;          // gentle parallax drift on menus
        JD.updateParticles(dt);
      }
      JD.drawScene();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // boot at title
    JD.showScreen('title');
  });
})();
