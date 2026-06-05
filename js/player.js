/* ===== JUASEON DASH — player state =====
   Physics integration + collision live in engine.js; this holds the
   player object, reset, and the jump action (mode-aware).          */
(function () {
  var JD = window.JD || (window.JD = {});

  JD.resetPlayer = function () {
    var cfg = JD.config;
    JD.player = {
      char: JD.getCharacter(JD.selectedCharId || (JD.world && JD.world.theme.player) || 'green-grin'),
      mode: (JD.world && JD.world.mode) || 'cube',
      x: 0,
      y: cfg.floorY - cfg.playerSize,
      vy: 0,
      size: cfg.playerSize,
      onGround: true,
      gravDir: 1,
      rotation: 0,
      alive: true
    };
  };

  // Cube jump: only from ground. (Jetpack/ball added in later milestones.)
  JD.playerJump = function () {
    var p = JD.player;
    if (!p || !p.alive) return;
    if (p.mode === 'cube' && p.onGround) {
      p.vy = -JD.config.jumpV;
      p.onGround = false;
    }
  };
})();
