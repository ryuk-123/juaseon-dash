/* ===== JUASEON DASH — character roster + canvas art =====
   Each character is drawn programmatically (neon body + glow + face).
   Roster mirrors reference image 3 (cubes + balls).               */
(function () {
  var JD = window.JD || (window.JD = {});

  // shape: 'cube' | 'ball'    face: drawing style key    c1/c2: body gradient    glow: outline neon
  JD.characters = [
    { id: 'cyan-bot',   name: 'BYTE',    shape: 'cube', face: 'angry',   c1: '#19d3e6', c2: '#1466c9', glow: '#18e0ff', trail: 'spark' },
    { id: 'red-fang',   name: 'BLAZE',   shape: 'cube', face: 'fang',    c1: '#ff8a1e', c2: '#ff2d2d', glow: '#ff5a2d', trail: 'fire' },
    { id: 'green-grin', name: 'CHOMP',   shape: 'cube', face: 'grin',    c1: '#4dff8a', c2: '#19c2e6', glow: '#4dff5a', trail: 'toxic' },
    { id: 'purple-mon', name: 'VOID',    shape: 'cube', face: 'monster', c1: '#7a18ff', c2: '#3a0a8a', glow: '#9b4dff', trail: 'plasma' },
    { id: 'yellow-mon', name: 'GNARL',   shape: 'ball', face: 'monster', c1: '#ffe34d', c2: '#ff8a1e', glow: '#ffe34d', trail: 'star' },
    { id: 'pink-fang',  name: 'FIZZ',    shape: 'ball', face: 'fang',    c1: '#ff3df0', c2: '#7a18ff', glow: '#ff3df0', trail: 'bubble' },
    { id: 'lime-eye',   name: 'PEEK',    shape: 'ball', face: 'eye',     c1: '#aaff4d', c2: '#19c2e6', glow: '#aaff4d', trail: 'rainbow' },
    { id: 'blue-gear',  name: 'COG',     shape: 'ball', face: 'eye',     c1: '#2d6dff', c2: '#1a2d8a', glow: '#3d8aff', trail: 'streak' },
    { id: 'blue-teeth', name: 'FROST',   shape: 'ball', face: 'angry',   c1: '#19e6ff', c2: '#1466c9', glow: '#18e0ff', trail: 'frost' },
    { id: 'bandit',     name: 'SLY',     shape: 'ball', face: 'grin',    c1: '#9bbf2d', c2: '#7a18ff', glow: '#c2ff4d', trail: 'ember' },
    { id: 'pixel-dino', name: 'REX',     shape: 'cube', face: 'angry',   c1: '#7a4dff', c2: '#2d6dff', glow: '#9b4dff', trail: 'pixel' }
  ];

  JD.getCharacter = function (id) {
    for (var i = 0; i < JD.characters.length; i++) if (JD.characters[i].id === id) return JD.characters[i];
    return JD.characters[0];
  };

  // Draw a character centered in a box (cx, cy = center), size = box side, rot = radians (cube spin).
  JD.drawCharacter = function (ctx, ch, cx, cy, size, rot) {
    var r = size / 2;
    ctx.save();
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);

    // glow
    ctx.shadowColor = ch.glow;
    ctx.shadowBlur = size * 0.5;

    var grad = ctx.createLinearGradient(-r, -r, r, r);
    grad.addColorStop(0, ch.c1);
    grad.addColorStop(1, ch.c2);
    ctx.fillStyle = grad;
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.strokeStyle = ch.glow;

    if (ch.shape === 'ball') {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
    } else {
      var rad = size * 0.18;
      roundRect(ctx, -r, -r, size, size, rad);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
    }

    drawFace(ctx, ch.face, size);
    ctx.restore();
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawFace(ctx, style, size) {
    var s = size;
    ctx.save();
    ctx.fillStyle = '#0a0420';
    var eyeY = -s * 0.05;
    var eyeDx = s * 0.18;
    var eyeR = s * 0.12;

    function eyes(angry) {
      // white backing
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-eyeDx, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeDx, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
      // pupils
      ctx.fillStyle = '#0a0420';
      ctx.beginPath(); ctx.arc(-eyeDx + eyeR * 0.2, eyeY + eyeR * 0.1, eyeR * 0.55, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(eyeDx + eyeR * 0.2, eyeY + eyeR * 0.1, eyeR * 0.55, 0, Math.PI * 2); ctx.fill();
      if (angry) {
        // brows
        ctx.fillStyle = '#0a0420';
        brow(-eyeDx - eyeR, eyeY - eyeR, -eyeDx + eyeR, eyeY - eyeR * 1.7);
        brow(eyeDx + eyeR, eyeY - eyeR, eyeDx - eyeR, eyeY - eyeR * 1.7);
      }
    }
    function brow(x1, y1, x2, y2) {
      ctx.save();
      ctx.strokeStyle = '#0a0420';
      ctx.lineWidth = s * 0.07;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.restore();
    }

    if (style === 'angry') {
      eyes(true);
      ctx.fillStyle = '#0a0420';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-s * 0.12, s * 0.18, s * 0.24, s * 0.07, 3) : ctx.rect(-s * 0.12, s * 0.18, s * 0.24, s * 0.07); ctx.fill();
    } else if (style === 'grin') {
      eyes(false);
      // teeth grin
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.rect(-s * 0.2, s * 0.16, s * 0.4, s * 0.16); ctx.fill();
      ctx.strokeStyle = '#0a0420'; ctx.lineWidth = s * 0.03;
      ctx.beginPath();
      ctx.moveTo(-s * 0.07, s * 0.16); ctx.lineTo(-s * 0.07, s * 0.32);
      ctx.moveTo(s * 0.07, s * 0.16); ctx.lineTo(s * 0.07, s * 0.32);
      ctx.moveTo(-s * 0.2, s * 0.24); ctx.lineTo(s * 0.2, s * 0.24);
      ctx.stroke();
    } else if (style === 'fang') {
      eyes(true);
      ctx.fillStyle = '#0a0420';
      ctx.beginPath(); ctx.moveTo(-s * 0.16, s * 0.18); ctx.lineTo(s * 0.16, s * 0.18); ctx.lineTo(0, s * 0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(-s * 0.1, s * 0.18); ctx.lineTo(-s * 0.04, s * 0.18); ctx.lineTo(-s * 0.07, s * 0.27); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(s * 0.1, s * 0.18); ctx.lineTo(s * 0.04, s * 0.18); ctx.lineTo(s * 0.07, s * 0.27); ctx.closePath(); ctx.fill();
    } else if (style === 'monster') {
      eyes(true);
      // jagged mouth
      ctx.fillStyle = '#0a0420';
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, s * 0.16);
      for (var i = 0; i <= 6; i++) {
        var x = -s * 0.22 + (s * 0.44) * (i / 6);
        ctx.lineTo(x, s * 0.16 + (i % 2 ? s * 0.12 : 0));
      }
      ctx.lineTo(s * 0.22, s * 0.16);
      ctx.closePath(); ctx.fill();
    } else if (style === 'eye') {
      // single big sleepy eye
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(0, eyeY, s * 0.2, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a0420';
      ctx.beginPath(); ctx.arc(s * 0.05, eyeY + s * 0.02, s * 0.08, 0, Math.PI * 2); ctx.fill();
      brow(-s * 0.22, eyeY - s * 0.12, s * 0.05, eyeY - s * 0.2);
      // small fang
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(-s * 0.05, s * 0.22); ctx.lineTo(s * 0.02, s * 0.22); ctx.lineTo(-s * 0.015, s * 0.3); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
})();
