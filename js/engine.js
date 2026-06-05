/* ===== JUASEON DASH — engine: loop, physics, collision, state ===== */
(function () {
  var JD = window.JD || (window.JD = {});

  JD.config = {
    W: 960, H: 540,
    tile: 40,
    playerSize: 36,
    floorY: 420,        // world y of floor surface
    speed: 360,         // px/s auto-scroll
    gravity: 2400,      // px/s^2
    jumpV: 650,         // jump launch speed
    camOffsetX: 280,    // player's fixed screen x
    rotSpeed: 5.8,      // cube spin rad/s
    ceilingY: 70,       // jetpack ceiling
    thrust: 4600,       // jetpack upward accel while holding
    maxVY: 560,         // jetpack vertical speed cap
    orbForce: 640,      // jump-orb bounce
    padForce: 980       // jump-pad launch
  };

  JD.time = 0;                  // animation clock (advanced in main loop)
  JD.state = 'idle';            // idle | playing | dead | win
  JD.camera = { x: 0, y: 0 };
  JD.attempts = 1;
  JD.progress = 0;
  JD._deathTimer = 0;
  JD.input = { holding: false, pressed: false };

  JD.currentStageIndex = 0;
  JD.paused = false;

  JD.startStage = function (index) {
    JD.currentStageIndex = index;
    var def = JD.LEVELS[index] || JD.LEVELS[0];
    JD.world = JD.buildLevel(def);
    JD.attempts = 1;
    JD.paused = false;
    beginRun();
    JD.onStageStart && JD.onStageStart();
  };

  JD.pause = function () { if (JD.state === 'playing') JD.paused = true; };
  JD.resume = function () { JD.paused = false; };

  function beginRun() {
    JD.resetPlayer();
    JD.particles.length = 0;
    JD.trail.length = 0;
    JD.camera.x = JD.player.x - JD.config.camOffsetX;
    JD.camera.y = 0;
    JD.progress = 0;
    JD._deathTimer = 0;
    JD.state = 'playing';
    JD.updateHUD();
  }

  JD.die = function () {
    if (JD.state !== 'playing') return;
    var p = JD.player;
    p.alive = false;
    JD.state = 'dead';
    JD._deathTimer = 0;
    JD.spawnExplosion(p.x + p.size / 2, p.y + p.size / 2, p.char.glow);
    sfx('death');
    JD.onDeath && JD.onDeath();
  };

  function sfx(name) { if (JD.audio) JD.audio.sfx(name); }

  JD.win = function () {
    if (JD.state !== 'playing') return;
    JD.state = 'win';
    JD.progress = 100;
    JD.updateHUD();
    sfx('win');
    JD.onWin && JD.onWin();
  };

  JD.update = function (dt) {
    if (JD.state === 'dead') {
      JD.updateParticles(dt);
      JD._deathTimer += dt;
      if (JD._deathTimer > 0.55) { JD.attempts++; beginRun(); }
      return;
    }
    if (JD.state !== 'playing' || JD.paused) { JD.updateParticles(dt); return; }

    var cfg = JD.config, p = JD.player, w = JD.world;

    var dir = p.gravDir || 1;   // 1 = gravity down, -1 = up

    // --- vertical control by mode ---
    if (p.mode === 'cube') {
      if (JD.input.holding && p.onGround) { p.vy = -cfg.jumpV * dir; p.onGround = false; sfx('jump'); }
      p.vy += cfg.gravity * dir * dt;
    } else if (p.mode === 'ball') {
      if (JD.input.pressed && p.onGround) { dir = p.gravDir = -dir; p.onGround = false; JD.input.pressed = false; sfx('flip'); }
      p.vy += cfg.gravity * dir * dt;
    } else if (p.mode === 'jetpack') {
      p.vy += cfg.gravity * dir * dt;
      if (JD.input.holding) p.vy -= cfg.thrust * dir * dt;
      if (p.vy > cfg.maxVY) p.vy = cfg.maxVY;
      if (p.vy < -cfg.maxVY) p.vy = -cfg.maxVY;
    }

    var py = p.y;
    p.y += p.vy * dt;
    p.x += cfg.speed * dt;
    p.onGround = false;

    // --- floor / ceiling surfaces ---
    var ceilingSolid = (p.mode === 'jetpack' || p.mode === 'ball' || dir === -1);
    if (p.y + p.size > cfg.floorY) {
      p.y = cfg.floorY - p.size; if (p.vy > 0) p.vy = 0; if (dir === 1) p.onGround = true;
    }
    if (ceilingSolid && p.y < cfg.ceilingY) {
      p.y = cfg.ceilingY; if (p.vy < 0) p.vy = 0; if (dir === -1) p.onGround = true;
    }

    // --- objects ---
    var ins = 4;
    var hx = p.x + ins, hy = p.y + ins, hw = p.size - 2 * ins, hh = p.size - 2 * ins;
    var t = cfg.tile;
    for (var i = 0; i < w.objects.length; i++) {
      var o = w.objects[i];
      if (o.t === 'block') {
        if (aabb(p.x, p.y, p.size, p.size, o.x, o.y, o.w, o.h)) {
          if (p.mode === 'jetpack') { JD.die(); return; }
          var bTop = o.y, bBot = o.y + o.h;
          if (dir === 1 && p.vy >= 0 && (py + p.size) <= bTop + 8) {
            p.y = bTop - p.size; p.vy = 0; p.onGround = true;
          } else if (dir === -1 && p.vy <= 0 && py >= bBot - 8) {
            p.y = bBot; p.vy = 0; p.onGround = true;
          } else { JD.die(); return; }
        }
      } else if (o.t === 'spike') {
        var sb = JD.spikeHitbox(o.x, o.baseY, o.size);
        if (aabb(hx, hy, hw, hh, sb.x, sb.y, sb.w, sb.h)) { JD.die(); return; }
      } else if (o.t === 'saw') {
        if (circleRect(o.cx, o.cy, o.r * 0.82, hx, hy, hw, hh)) { JD.die(); return; }
      } else if (o.t === 'pad') {
        if (aabb(hx, hy, hw, hh, o.x, o.baseY - t * 0.35, o.w, t * 0.35)) {
          p.vy = -cfg.padForce * dir; p.onGround = false; sfx('pad');
        }
      } else if (o.t === 'orb') {
        if (JD.input.pressed && circleRect(o.cx, o.cy, o.r * 1.5, hx, hy, hw, hh)) {
          p.vy = -cfg.orbForce * dir; p.onGround = false; JD.input.pressed = false; sfx('orb');
        }
      } else if (o.t === 'portal') {
        if (Math.abs((p.x + p.size / 2) - o.x) < cfg.speed * dt + 6) {
          applyPortal(p, o.kind); dir = p.gravDir;
        }
      }
    }
    JD.input.pressed = false;

    // --- orientation ---
    if (p.mode === 'cube') {
      if (!p.onGround) p.rotation += cfg.rotSpeed * dt;
      else { var q = Math.PI / 2; p.rotation = Math.round(p.rotation / q) * q; }
    } else if (p.mode === 'ball') {
      p.rotation += 7 * dt; // rolling
    } else {
      p.rotation = Math.max(-0.5, Math.min(0.5, p.vy / 700)) * dir; // ship tilt
    }

    JD.camera.x = p.x - cfg.camOffsetX;
    JD.camera.y = 0;

    JD.emitTrail(dt);

    JD.progress = Math.max(0, Math.min(100, (p.x / w.endX) * 100));
    if (p.x >= w.endX) { JD.win(); return; }
    JD.updateHUD();
  };

  function applyPortal(p, kind) {
    if (kind === 'jet') { p.mode = 'jetpack'; p.gravDir = 1; }
    else if (kind === 'cube') { p.mode = 'cube'; p.gravDir = 1; }
    else if (kind === 'ball') { p.mode = 'ball'; p.gravDir = 1; }
    else if (kind === 'gup') { p.gravDir = -1; }
    else if (kind === 'gdown') { p.gravDir = 1; }
  }

  function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }
  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    var nx = Math.max(rx, Math.min(cx, rx + rw));
    var ny = Math.max(ry, Math.min(cy, ry + rh));
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy <= r * r;
  }

  // HUD hooks (wired in main.js)
  JD.updateHUD = function () {
    if (!JD.hud) return;
    JD.hud.fill.style.width = JD.progress.toFixed(1) + '%';
    JD.hud.pct.textContent = Math.floor(JD.progress) + '%';
    JD.hud.attempt.textContent = 'Attempt ' + JD.attempts;
  };
})();
