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
  JD._respawn = null;           // computed checkpoint (or null = restart from start)
  JD._countdown = 0;            // 3..0 drop-in countdown timer

  JD.baseSpeed = 360;   // current stage's base scroll speed (before speed-portal multiplier)

  JD.startStage = function (index) {
    JD.currentStageIndex = index;
    var def = JD.LEVELS[index] || JD.LEVELS[0];
    JD.world = JD.buildLevel(def);
    JD.baseSpeed = def.speed || 360;
    JD.config.speed = JD.baseSpeed;     // reset every start so menus/other stages are unaffected
    JD.attempts = 1;
    JD.paused = false;
    JD._respawn = null;                 // fresh stage → no checkpoint yet
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

  // ===== Mid-level checkpoint respawn (stages id >= 3, death past 50%) =====

  // Replay every portal up to x to recover the mode/gravity/mini/speed state there.
  function modeStateAt(x) {
    var w = JD.world, st = { mode: w.mode, gravDir: 1, mini: false, speedMul: 1 };
    for (var i = 0; i < w.objects.length; i++) {
      var o = w.objects[i];
      if (o.t !== 'portal' || o.x > x) continue;
      var k = o.kind;
      if (k === 'jet') { st.mode = 'jetpack'; st.gravDir = 1; }
      else if (k === 'cube') { st.mode = 'cube'; st.gravDir = 1; }
      else if (k === 'ball') { st.mode = 'ball'; st.gravDir = 1; }
      else if (k === 'gup') { st.gravDir = -1; }
      else if (k === 'gdown') { st.gravDir = 1; }
      else if (k === 'speed') { st.speedMul = o.mult || 1; }
      else if (k === 'mini') { st.mini = true; }
      else if (k === 'big') { st.mini = false; }
    }
    return st;
  }

  // Landing y for a given mode state (left-edge spawn).
  function surfaceY(st, size) {
    var cfg = JD.config;
    if (st.mode === 'jetpack') return (cfg.floorY + cfg.ceilingY) / 2 - size / 2;
    if (st.gravDir === -1) return cfg.ceilingY;
    return cfg.floorY - size;
  }

  // Would dropping the player at left-edge x (in state st) be clear of hazards,
  // with ~1.3 tiles of runway ahead? (blocks treated as blocking too, for flat ground.)
  JD.isSpotSafe = function (x, st) {
    var cfg = JD.config, w = JD.world, t = cfg.tile;
    var size = cfg.playerSize * (st.mini ? 0.6 : 1);
    var y = surfaceY(st, size);
    var qx = x, qy = y, qw = size + t * 1.3, qh = size;
    for (var i = 0; i < w.objects.length; i++) {
      var o = w.objects[i];
      if (o.t === 'spike') {
        var sb = JD.spikeHitbox(o.x, o.baseY, o.size);
        if (aabb(qx, qy, qw, qh, sb.x, sb.y, sb.w, sb.h)) return false;
      } else if (o.t === 'saw') {
        var cy = o.move ? o.cy0 : o.cy;
        if (aabb(qx, qy, qw, qh, o.cx - o.r, cy - o.r, o.r * 2, o.r * 2)) return false;
      } else if (o.t === 'block') {
        if (aabb(qx, qy, qw, qh, o.x, o.y, o.w, o.h)) return false;
      } else if (o.t === 'portal') {
        if (o.x > x && o.x < x + qw) return false;   // don't spawn straight into a portal
      }
    }
    return true;
  };

  // Find the safe spot nearest behind the death point (with reaction runway),
  // never before the 50% mark. Returns a checkpoint object or null (→ full restart).
  JD.findCheckpoint = function (deathX) {
    var cfg = JD.config, w = JD.world, t = cfg.tile;
    var halfX = w.endX * 0.5;
    var x = Math.max(halfX, deathX - cfg.camOffsetX);   // back up for on-screen runway
    for (var guard = 0; guard < 500 && x >= halfX; guard++) {
      var st = modeStateAt(x);
      if (JD.isSpotSafe(x, st)) {
        var size = cfg.playerSize * (st.mini ? 0.6 : 1);
        return { x: x, y: surfaceY(st, size), size: size, mode: st.mode, gravDir: st.gravDir, mini: st.mini, speedMul: st.speedMul };
      }
      x -= t;
    }
    return null;
  };

  // Respawn at a checkpoint with a drop-in + 3·2·1 countdown.
  function beginRunAt(cp) {
    JD.resetPlayer();
    var p = JD.player, cfg = JD.config;
    p.x = cp.x; p.mode = cp.mode; p.gravDir = cp.gravDir; p.mini = cp.mini;
    p.size = cp.size; p.speedMul = cp.speedMul; p.vy = 0; p.onGround = true; p.alive = true;
    // drop in from ~2 tiles "above" (relative to gravity) and ease onto the surface
    var dropDist = cfg.tile * 2 * (cp.gravDir === -1 ? -1 : 1);
    p.dropTo = cp.y; p.dropFrom = cp.y - dropDist; p.dropT = 0; p.y = p.dropFrom;
    JD.particles.length = 0; JD.trail.length = 0;
    JD.camera.x = p.x - cfg.camOffsetX; JD.camera.y = 0;
    JD.config.speed = JD.baseSpeed;       // base; speedMul carries any portal effect
    JD._deathTimer = 0;
    JD.progress = Math.max(0, Math.min(100, (p.x / JD.world.endX) * 100));
    JD.state = 'countdown';
    JD._countdown = 3;
    sfx('count');                          // initial "3" beep
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
    // Checkpoint eligibility: stages with id >= 3, and only past the halfway mark.
    var lvl = JD.LEVELS[JD.currentStageIndex];
    JD._respawn = (lvl && lvl.id >= 3 && JD.progress > 50) ? JD.findCheckpoint(p.x) : null;
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
      if (JD._deathTimer > 0.55) {
        JD.attempts++;
        if (JD._respawn) beginRunAt(JD._respawn);   // soft-respawn near death
        else beginRun();                            // full restart from start
      }
      return;
    }
    if (JD.state === 'countdown') {
      JD.updateParticles(dt);
      var pc = JD.player;
      // drop-in ease toward the spawn surface
      if (pc.dropFrom != null) {
        pc.dropT += dt;
        var k = Math.min(1, pc.dropT / 0.4), ke = 1 - (1 - k) * (1 - k);
        pc.y = pc.dropFrom + (pc.dropTo - pc.dropFrom) * ke;
        if (k >= 1) pc.dropFrom = null;
      }
      var prev = Math.ceil(JD._countdown);
      JD._countdown -= dt;
      var nowc = Math.ceil(JD._countdown);
      if (nowc !== prev && nowc >= 1) sfx('count');
      if (JD._countdown <= 0) {
        JD._countdown = 0;
        if (pc.dropTo != null) pc.y = pc.dropTo;
        pc.dropFrom = null;
        JD.state = 'playing';
        sfx('go');
      }
      return;
    }
    if (JD.state !== 'playing' || JD.paused) { JD.updateParticles(dt); return; }

    var cfg = JD.config, p = JD.player, w = JD.world;

    var dir = p.gravDir || 1;   // 1 = gravity down, -1 = up

    // effective scroll speed = stage base * speed-portal mult * brief dash burst
    if (p.dashTimer > 0) p.dashTimer = Math.max(0, p.dashTimer - dt);
    var spd = cfg.speed * (p.speedMul || 1) * (p.dashTimer > 0 ? 1.5 : 1);

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
    p.x += spd * dt;
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
        if (o.move) o.cy = o.cy0 + Math.sin(JD.time * o.move.spd) * o.move.amp * t;
        if (circleRect(o.cx, o.cy, o.r * 0.82, hx, hy, hw, hh)) { JD.die(); return; }
      } else if (o.t === 'pad') {
        if (aabb(hx, hy, hw, hh, o.x, o.baseY - t * 0.35, o.w, t * 0.35)) {
          p.vy = -cfg.padForce * dir; p.onGround = false; sfx('pad');
        }
      } else if (o.t === 'orb') {
        if (JD.input.pressed && circleRect(o.cx, o.cy, o.r * 1.5, hx, hy, hw, hh)) {
          var kind = o.kind || 'jump';
          if (kind === 'grav') { dir = p.gravDir = -dir; p.onGround = false; sfx('flip'); }
          else if (kind === 'dash') { p.vy = -cfg.orbForce * 1.1 * dir; p.dashTimer = 0.35; p.onGround = false; sfx('orb'); }
          else if (kind === 'down') { p.vy = cfg.orbForce * dir; p.onGround = false; sfx('orb'); }
          else { p.vy = -cfg.orbForce * dir; p.onGround = false; sfx('orb'); }   // 'jump'
          JD.input.pressed = false;
        }
      } else if (o.t === 'portal') {
        if (Math.abs((p.x + p.size / 2) - o.x) < spd * dt + 6) {
          applyPortal(p, o); dir = p.gravDir;
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

  function applyPortal(p, o) {
    var kind = o.kind;
    if (kind === 'jet') { p.mode = 'jetpack'; p.gravDir = 1; }
    else if (kind === 'cube') { p.mode = 'cube'; p.gravDir = 1; }
    else if (kind === 'ball') { p.mode = 'ball'; p.gravDir = 1; }
    else if (kind === 'gup') { p.gravDir = -1; }
    else if (kind === 'gdown') { p.gravDir = 1; }
    else if (kind === 'speed') { p.speedMul = o.mult || 1; }
    else if (kind === 'mini') { p.mini = true; p.size = JD.config.playerSize * 0.6; }
    else if (kind === 'big') { p.mini = false; p.size = JD.config.playerSize; }
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
