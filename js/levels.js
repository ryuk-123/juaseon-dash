/* ===== JUASEON DASH — stage definitions + theme palettes =====
   Raw defs use tile coordinates. x = tiles from start.
   y = tiles the object's base/center sits ABOVE the floor (0 = on floor).
   buildLevel() converts to world pixels using JD.config at runtime. */
(function () {
  var JD = window.JD || (window.JD = {});

  // ---- authoring helpers ----
  function S(x, y) { return { t: 'spike', x: x, y: y || 0 }; }
  function B(x, y) { return { t: 'block', x: x, y: y || 0 }; }
  function O(x, y) { return { t: 'orb', x: x, y: y || 2 }; }            // jump orb
  function PAD(x) { return { t: 'pad', x: x, y: 0 }; }                  // jump pad on floor
  function SAW(x, y) { return { t: 'saw', x: x, y: y || 1 }; }          // spinning blade
  function P(x, kind) { return { t: 'portal', x: x, kind: kind }; }     // 'jet' | 'cube'

  // Classic neon theme (reference 2)
  var THEME_CLASSIC = {
    name: 'classic',
    sky0: '#2a0a5e', sky1: '#120437',
    grid: 'rgba(120, 80, 220, 0.18)',
    ground0: '#1b0a4a', ground1: '#0a0322',
    floorLine: '#18e0ff',
    blockTop: '#1fd4ff', blockBottom: '#1257d6', blockGlow: '#18e0ff',
    spikeTop: '#9b4dff', spikeBottom: '#5a18c9', spikeGlow: '#c24dff',
    player: 'green-grin'
  };

  // Neon cave theme (reference 1): chains, glowing ice blocks, mushrooms, water floor
  var THEME_CAVE = {
    name: 'cave',
    sky0: '#3a1188', sky1: '#0c0330',
    grid: 'rgba(150, 90, 255, 0.10)',
    ground0: '#10205e', ground1: '#03102e',
    floorLine: '#2effe0',
    blockTop: '#5cf0ff', blockBottom: '#1466c9', blockGlow: '#2effe0',
    spikeTop: '#ff5ad0', spikeBottom: '#7a18c9', spikeGlow: '#ff3df0',
    chains: true, mushrooms: true, water: true,
    player: 'pink-fang'
  };

  // Chaos circuit theme (stage 3): electric green / magenta
  var THEME_CIRCUIT = {
    name: 'circuit',
    sky0: '#0a2e2a', sky1: '#02100c',
    grid: 'rgba(77, 255, 90, 0.12)',
    ground0: '#06281f', ground1: '#010f0a',
    floorLine: '#4dff5a',
    blockTop: '#ff5af0', blockBottom: '#a31ac9', blockGlow: '#ff3df0',
    spikeTop: '#9dff4d', spikeBottom: '#1a9c2d', spikeGlow: '#4dff5a',
    player: 'lime-eye'
  };

  // ---- Stage 1: cube tutorial ----
  var STAGE1 = [
    S(12),
    S(18), S(19),
    S(25),
    S(31), S(32),
    B(37), B(38),
    S(45),
    S(51), S(52), S(53),
    B(59), B(60), B(61),
    S(68),
    S(74), S(75),
    S(81),
    B(86), B(87),
    S(93),
    S(99), S(100),
    S(106),
    S(112), S(113), S(114)
  ];

  // ---- Stage 2: cube -> jetpack -> cube, with orbs / pads / saws ----
  var STAGE2 = [
    // cube intro
    S(11),
    S(17),
    PAD(23),                 // big bounce
    S(30), S(31),
    O(37, 2), S(36), S(38),  // orb-jump over twin spikes
    // jetpack section
    P(43, 'jet'),
    B(49, 7), B(49, 8),      // ceiling stalactite
    SAW(55, 4),
    B(61, 0), B(61, 1),      // floor pillar (fly above)
    B(67, 7), B(67, 8),
    SAW(73, 3),
    B(79, 0), B(79, 1),
    SAW(85, 5),
    // back to cube
    P(91, 'cube'),
    S(98),
    PAD(104),
    O(110, 2), S(109), S(111),
    SAW(117, 1),             // low rolling saw — jump it
    S(123), S(124),
    S(130)
  ];

  // ---- Stage 3: cube -> ball (gravity flip) -> jetpack -> cube ----
  var STAGE3 = [
    S(10),
    O(16, 2), S(15), S(17),
    S(23),
    PAD(28),
    // ball: tap to flip gravity — dodge alternating floor / ceiling saws
    P(33, 'ball'),
    SAW(41, 1),   // floor saw  -> ride the ceiling
    SAW(49, 8),   // ceiling saw -> ride the floor
    SAW(57, 1),
    SAW(65, 8),
    // gravity-flip portals showcase
    P(72, 'gup'),
    P(78, 'gdown'),
    // jetpack: tight tunnel
    P(84, 'jet'),
    B(89, 7), B(89, 8),
    SAW(94, 4),
    B(99, 0), B(99, 1),
    SAW(104, 3),
    B(109, 7), B(109, 8),
    B(115, 0), B(115, 1),
    // cube finish
    P(120, 'cube'),
    S(126),
    O(132, 2), S(131), S(133),
    PAD(138),
    SAW(143, 1),
    S(148), S(149),
    S(154)
  ];

  JD.LEVELS = [
    { id: 1, name: 'NEON RUSH',      theme: THEME_CLASSIC, mode: 'cube', raw: STAGE1, endTile: 122 },
    { id: 2, name: 'JETSTREAM CAVE', theme: THEME_CAVE,    mode: 'cube', raw: STAGE2, endTile: 138 },
    { id: 3, name: 'CHAOS CIRCUIT',  theme: THEME_CIRCUIT, mode: 'cube', raw: STAGE3, endTile: 162 }
  ];

  JD.STAGES = [
    { id: 1, name: 'NEON RUSH',      mode: 'CUBE',           c1: '#18e0ff', c2: '#7a18ff', playable: true },
    { id: 2, name: 'JETSTREAM CAVE', mode: 'CUBE + JETPACK', c1: '#ff3df0', c2: '#7a18ff', playable: true },
    { id: 3, name: 'CHAOS CIRCUIT',  mode: 'CUBE·BALL·JET',  c1: '#4dff5a', c2: '#18e0ff', playable: true }
  ];

  JD.buildLevel = function (def) {
    var t = JD.config.tile, floor = JD.config.floorY;
    var objs = [];
    for (var i = 0; i < def.raw.length; i++) {
      var o = def.raw[i];
      var wx = o.x * t;
      var base = floor - o.y * t;
      if (o.t === 'block') {
        objs.push({ t: 'block', x: wx, y: base - t, w: t, h: t });
      } else if (o.t === 'spike') {
        objs.push({ t: 'spike', x: wx, baseY: base, size: t });
      } else if (o.t === 'orb') {
        objs.push({ t: 'orb', cx: wx + t / 2, cy: base, r: t * 0.42, used: false });
      } else if (o.t === 'pad') {
        objs.push({ t: 'pad', x: wx, baseY: floor, w: t });
      } else if (o.t === 'saw') {
        objs.push({ t: 'saw', cx: wx + t / 2, cy: base, r: t * 0.55 });
      } else if (o.t === 'portal') {
        objs.push({ t: 'portal', x: wx + t / 2, kind: o.kind });
      }
    }
    return {
      objects: objs,
      endX: def.endTile * t,
      theme: def.theme,
      mode: def.mode,
      name: def.name
    };
  };
})();
