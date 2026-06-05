/* ===== JUASEON DASH — scene rendering (background, world, particles) ===== */
(function () {
  var JD = window.JD || (window.JD = {});

  JD.particles = [];

  JD.spawnExplosion = function (cx, cy, color) {
    for (var i = 0; i < 26; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 120 + Math.random() * 320;
      JD.particles.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
        life: 0.6 + Math.random() * 0.4, max: 1,
        size: 4 + Math.random() * 7,
        color: color || '#18e0ff'
      });
    }
  };

  JD.updateParticles = function (dt) {
    for (var i = JD.particles.length - 1; i >= 0; i--) {
      var p = JD.particles[i];
      p.life -= dt;
      if (p.life <= 0) { JD.particles.splice(i, 1); continue; }
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  };

  function drawFlame(ctx, x, y, size, color, strong) {
    var len = size * (strong ? 1.3 : 0.7) * (0.8 + Math.random() * 0.4);
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 18;
    var g = ctx.createLinearGradient(x, y, x - len, y);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.4, color);
    g.addColorStop(1, 'rgba(255,61,240,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.28);
    ctx.lineTo(x - len, y);
    ctx.lineTo(x, y + size * 0.28);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawCaveDeco(ctx, cam, cfg, theme) {
    var W = cfg.W, spacing = 240;
    var startX = Math.floor(cam.x / spacing) * spacing;
    ctx.save();
    for (var wx = startX; wx < cam.x + W + spacing; wx += spacing) {
      var sx = wx - cam.x * 0.85;        // slight parallax
      if (theme.chains) {
        ctx.strokeStyle = 'rgba(180,200,255,0.18)';
        ctx.lineWidth = 4;
        var len = 120 + ((wx / spacing) % 3) * 40;
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, len); ctx.stroke();
        ctx.fillStyle = 'rgba(200,220,255,0.22)';
        for (var ly = 12; ly < len; ly += 18) { ctx.fillRect(sx - 4, ly, 8, 10); }
      }
      if (theme.mushrooms) {
        var mx = sx + 120, my = cfg.floorY - cam.y;
        ctx.fillStyle = 'rgba(255,90,208,0.5)';
        ctx.shadowColor = '#ff3df0'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.ellipse(mx, my - 8, 12, 8, 0, Math.PI, 0); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(120,140,255,0.4)';
        ctx.fillRect(mx - 3, my - 10, 6, 10);
      }
    }
    ctx.restore();
  }

  JD.drawScene = function () {
    var ctx = JD.ctx, cfg = JD.config, cam = JD.camera, w = JD.world;
    var W = cfg.W, H = cfg.H, t = cfg.tile;
    var theme = (w && w.theme) || {};

    // --- sky ---
    var sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, theme.sky0 || '#2a0a5e');
    sky.addColorStop(1, theme.sky1 || '#120437');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // --- beat flash (subtle, additive) ---
    var pulse = JD.audioPulse || 0;
    if (pulse > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var fg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
      var fc = theme.floorLine || '#18e0ff';
      fg.addColorStop(0, 'rgba(0,0,0,0)');
      fg.addColorStop(1, fc);
      ctx.globalAlpha = pulse * 0.12;
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // --- parallax grid ---
    ctx.strokeStyle = theme.grid || 'rgba(120,80,220,0.18)';
    ctx.lineWidth = 1;
    var off = (cam.x * 0.5) % t;
    ctx.beginPath();
    for (var gx = -off; gx < W; gx += t) { ctx.moveTo(gx, 0); ctx.lineTo(gx, H); }
    var offY = (-cam.y) % t;
    for (var gy = offY; gy < H; gy += t) { ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
    ctx.stroke();

    // --- cave decorations (behind objects) ---
    if (theme.chains || theme.mushrooms) drawCaveDeco(ctx, cam, cfg, theme);

    if (!w) return;

    // --- objects ---
    var clock = JD.time || 0;
    for (var i = 0; i < w.objects.length; i++) {
      var o = w.objects[i];
      var ox = (o.x != null ? o.x : o.cx);
      var sx = ox - cam.x;
      if (sx > W + t * 2 || sx < -t * 3) continue; // cull
      if (o.t === 'block') {
        JD.drawBlock(ctx, o.x - cam.x, o.y - cam.y, o.w, theme);
      } else if (o.t === 'spike') {
        JD.drawSpike(ctx, o.x - cam.x, o.baseY - cam.y, o.size, theme);
      } else if (o.t === 'orb') {
        JD.drawOrb(ctx, o.cx - cam.x, o.cy - cam.y, o.r, clock);
      } else if (o.t === 'pad') {
        JD.drawPad(ctx, o.x - cam.x, o.baseY - cam.y, o.w);
      } else if (o.t === 'saw') {
        JD.drawSaw(ctx, o.cx - cam.x, o.cy - cam.y, o.r, clock);
      } else if (o.t === 'portal') {
        JD.drawPortal(ctx, o.x - cam.x, 24, cfg.floorY - 24, o.kind);
      }
    }

    // --- floor ---
    var fy = cfg.floorY - cam.y;
    var gnd = ctx.createLinearGradient(0, fy, 0, H);
    gnd.addColorStop(0, theme.ground0 || '#1b0a4a');
    gnd.addColorStop(1, theme.ground1 || '#0a0322');
    ctx.fillStyle = gnd;
    ctx.fillRect(0, fy, W, H - fy);
    ctx.save();
    ctx.shadowColor = theme.floorLine || '#18e0ff';
    ctx.shadowBlur = 18;
    ctx.fillStyle = theme.floorLine || '#18e0ff';
    ctx.fillRect(0, fy - 2, W, 4);
    ctx.restore();

    // water shimmer band (cave)
    if (theme.water) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = theme.floorLine || '#2effe0';
      var wob = Math.sin((JD.time || 0) * 2) * 3;
      ctx.fillRect(0, H - 26 + wob, W, 26);
      ctx.restore();
    }

    // --- player ---
    var p = JD.player;
    if (p && p.alive) {
      var pcx = p.x + p.size / 2 - cam.x, pcy = p.y + p.size / 2 - cam.y;
      if (p.mode === 'jetpack') drawFlame(ctx, pcx - p.size * 0.55, pcy, p.size, p.char.glow, JD.input.holding);
      JD.drawCharacter(ctx, p.char, pcx, pcy, p.size, p.rotation);
    }

    // --- particles ---
    for (var k = 0; k < JD.particles.length; k++) {
      var pt = JD.particles[k];
      ctx.save();
      ctx.globalAlpha = Math.max(0, p ? pt.life / pt.max : 0);
      ctx.shadowColor = pt.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - cam.x - pt.size / 2, pt.y - cam.y - pt.size / 2, pt.size, pt.size);
      ctx.restore();
    }
  };
})();
