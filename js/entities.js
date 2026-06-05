/* ===== JUASEON DASH — obstacle / object drawing =====
   Screen-space draw helpers. World->screen handled by engine.   */
(function () {
  var JD = window.JD || (window.JD = {});

  // Solid block: land on top, die on side. Neon brick look (ref 2 / ref 1).
  JD.drawBlock = function (ctx, x, y, size, theme) {
    ctx.save();
    ctx.shadowColor = theme.blockGlow;
    ctx.shadowBlur = size * 0.4;
    var g = ctx.createLinearGradient(x, y, x, y + size);
    g.addColorStop(0, theme.blockTop);
    g.addColorStop(1, theme.blockBottom);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, size, size);
    ctx.shadowBlur = 0;
    // neon edge
    ctx.lineWidth = Math.max(2, size * 0.06);
    ctx.strokeStyle = theme.blockGlow;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    // top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + 2, y + 2, size - 4, size * 0.12);
    ctx.restore();
  };

  // Spike: triangle, instant death. baseY = world floor/surface the spike stands on.
  JD.drawSpike = function (ctx, x, baseY, size, theme) {
    ctx.save();
    ctx.shadowColor = theme.spikeGlow;
    ctx.shadowBlur = size * 0.4;
    var g = ctx.createLinearGradient(x, baseY - size, x, baseY);
    g.addColorStop(0, theme.spikeTop);
    g.addColorStop(1, theme.spikeBottom);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + size / 2, baseY - size);
    ctx.lineTo(x + size, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(1.5, size * 0.05);
    ctx.strokeStyle = theme.spikeGlow;
    ctx.stroke();
    ctx.restore();
  };

  // Forgiving spike hitbox (centered, smaller than visual) — GD style.
  JD.spikeHitbox = function (x, baseY, size) {
    var w = size * 0.4, h = size * 0.6;
    return { x: x + (size - w) / 2, y: baseY - h, w: w, h: h };
  };

  // Jump orb — pulsing ring; press jump while overlapping to bounce.
  JD.drawOrb = function (ctx, cx, cy, r, t) {
    var pulse = 1 + Math.sin(t * 5) * 0.12;
    ctx.save();
    ctx.shadowColor = '#ffe34d'; ctx.shadowBlur = 18;
    ctx.lineWidth = r * 0.4;
    ctx.strokeStyle = '#ffe34d';
    ctx.beginPath(); ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,227,77,0.35)';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  // Jump pad — auto-launch on contact (sits on floor).
  JD.drawPad = function (ctx, x, baseY, w) {
    ctx.save();
    ctx.shadowColor = '#ff3df0'; ctx.shadowBlur = 16;
    ctx.fillStyle = '#ff3df0';
    var h = w * 0.22;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + w * 0.15, baseY - h);
    ctx.lineTo(x + w * 0.85, baseY - h);
    ctx.lineTo(x + w, baseY);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  // Saw blade — spinning gear, instant death.
  JD.drawSaw = function (ctx, cx, cy, r, t) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 6);
    ctx.shadowColor = '#18e0ff'; ctx.shadowBlur = 16;
    ctx.fillStyle = '#cfe8ff';
    var teeth = 8;
    ctx.beginPath();
    for (var i = 0; i < teeth * 2; i++) {
      var ang = (Math.PI / teeth) * i;
      var rad = i % 2 ? r : r * 0.7;
      var fn = i ? 'lineTo' : 'moveTo';
      ctx[fn](Math.cos(ang) * rad, Math.sin(ang) * rad);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1466c9';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };

  // Mode portal — vertical neon gate. jet=pink, cube=cyan.
  JD.drawPortal = function (ctx, x, topY, h, kind) {
    var cols = { jet: '#ff3df0', cube: '#18e0ff', ball: '#4dff5a', gup: '#ff8a1e', gdown: '#2d9bff' };
    var col = cols[kind] || '#18e0ff';
    var w = 16;
    ctx.save();
    ctx.shadowColor = col; ctx.shadowBlur = 22;
    var g = ctx.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - w, topY, w * 2, h);
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, topY + h / 2, w, h / 2 - 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };
})();
