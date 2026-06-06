/* ===== JUASEON DASH — stage definitions + theme palettes =====
   Raw defs use tile coordinates. x = tiles from start.
   y = tiles the object's base/center sits ABOVE the floor (0 = on floor).
   buildLevel() converts to world pixels using JD.config at runtime. */
(function () {
  var JD = window.JD || (window.JD = {});

  // ---- authoring helpers ----
  function S(x, y) { return { t: 'spike', x: x, y: y || 0 }; }
  function B(x, y) { return { t: 'block', x: x, y: y || 0 }; }
  function O(x, y, kind) { return { t: 'orb', x: x, y: y || 2, kind: kind || 'jump' }; }  // 'jump'|'grav'|'dash'|'down'
  function PAD(x) { return { t: 'pad', x: x, y: 0 }; }                  // jump pad on floor
  function SAW(x, y, move) { return { t: 'saw', x: x, y: y || 1, move: move || null }; }  // move:{ax:'v',amp,spd}
  function P(x, kind) { return { t: 'portal', x: x, kind: kind }; }     // 'jet'|'cube'|'ball'|'gup'|'gdown'|'mini'|'big'
  function SP(x, mult) { return { t: 'portal', x: x, kind: 'speed', mult: mult }; }       // speed change (e.g. 0.7 / 1.4)

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

  // Sunset / vaporwave theme (World 2, stages 4-6): magenta sky, orange blocks, teal spikes
  var THEME_SUNSET = {
    name: 'sunset',
    sky0: '#7a1e5e', sky1: '#1c0830',
    grid: 'rgba(255, 140, 90, 0.12)',
    ground0: '#3a1040', ground1: '#140520',
    floorLine: '#ffb84d',
    blockTop: '#ffd24d', blockBottom: '#ff5a3d', blockGlow: '#ff8a1e',
    spikeTop: '#5cfdff', spikeBottom: '#1a8ad6', spikeGlow: '#2ffbd8',
    player: 'red-fang'
  };

  // Glitch / cyber theme (World 3, stages 7-10): dark green-black, acid-green blocks, red spikes
  var THEME_GLITCH = {
    name: 'glitch',
    sky0: '#0a2410', sky1: '#03100a',
    grid: 'rgba(77, 255, 140, 0.13)',
    ground0: '#06220f', ground1: '#020c06',
    floorLine: '#4dff8a',
    blockTop: '#9dff4d', blockBottom: '#1a9c4d', blockGlow: '#4dff8a',
    spikeTop: '#ff4d6a', spikeBottom: '#9c1a2d', spikeGlow: '#ff3d5a',
    player: 'bandit'
  };

  // Aurora / glacial theme (World 4, stages 11-14): deep-ice blue sky, aurora-violet spikes, frost blocks
  var THEME_AURORA = {
    name: 'aurora',
    sky0: '#0a3a5e', sky1: '#06122e',
    grid: 'rgba(120, 220, 255, 0.12)',
    ground0: '#0a2a4a', ground1: '#031026',
    floorLine: '#7dffe6',
    blockTop: '#a6f0ff', blockBottom: '#3d7dff', blockGlow: '#7de6ff',
    spikeTop: '#ff7de6', spikeBottom: '#9b2dff', spikeGlow: '#ff5af0',
    player: 'blue-teeth'
  };

  // Inferno / magma theme (World 5, stage 15+): deep-red sky, ember blocks, white-hot spikes
  var THEME_INFERNO = {
    name: 'inferno',
    sky0: '#5e1206', sky1: '#2a0604',
    grid: 'rgba(255, 140, 60, 0.13)',
    ground0: '#3a0e06', ground1: '#1a0402',
    floorLine: '#ff7a2d',
    blockTop: '#ffd24d', blockBottom: '#ff3d1a', blockGlow: '#ff8a1e',
    spikeTop: '#fff0a6', spikeBottom: '#ff5a1a', spikeGlow: '#ffce4d',
    player: 'red-fang'
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

  // ---- Stage 4: SUNSET SPRINT — cube + SPEED portals ----
  var STAGE4 = [
    S(12),
    S(18), S(19),
    PAD(25),
    O(32, 2), S(31), S(33),
    S(39),
    SP(45, 1.4),              // FAST lane
    S(53),
    S(61),
    B(69), B(70),
    S(78),
    S(86),
    SP(93, 0.65),             // SLOW precision lane
    S(99), S(100),
    SAW(106, 1),
    S(112), S(113),
    O(119, 2), S(118), S(120),
    SP(126, 1.0),             // normal
    S(133),
    PAD(139),
    S(146), S(147),
    S(153)
  ];

  // ---- Stage 5: VAPOR DRIFT — cube -> jetpack(moving saws) -> cube ----
  var STAGE5 = [
    S(11),
    S(17),
    PAD(23),
    O(30, 2), S(29), S(31),
    S(37), S(38),
    P(44, 'jet'),
    SAW(51, 4, { ax: 'v', amp: 2,   spd: 2.2 }),
    B(58, 0), B(58, 1),
    SAW(64, 5, { ax: 'v', amp: 2.5, spd: 1.8 }),
    B(70, 7), B(70, 8),
    SAW(77, 4, { ax: 'v', amp: 3,   spd: 2.5 }),
    SAW(84, 3, { ax: 'v', amp: 2,   spd: 2 }),
    P(91, 'cube'),
    S(98),
    SAW(104, 1, { ax: 'v', amp: 1.2, spd: 3 }),   // low bobbing floor saw
    S(111), S(112),
    O(118, 2), S(117), S(119),
    PAD(124),
    S(131),
    S(137), S(138),
    S(144)
  ];

  // ---- Stage 6: MINI MIRAGE — cube -> mini -> big ----
  var STAGE6 = [
    S(12),
    O(18, 2), S(17), S(19),
    S(25),
    PAD(31),
    S(38), S(39),
    P(45, 'mini'),            // MINI mode
    S(51),
    S(57), S(58),
    S(63),
    SAW(69, 1),
    S(75), S(76),
    O(82, 2), S(81), S(83),
    S(88),
    P(94, 'big'),             // back to full size
    S(101),
    PAD(107),
    S(114), S(115),
    SAW(121, 1),
    S(127),
    S(133), S(134),
    S(140)
  ];

  // ---- Stage 7: GLITCH GATE — cube(grav orbs) -> ball -> cube ----
  var STAGE7 = [
    S(11),
    S(17), S(18),
    PAD(24),
    O(31, 2, 'grav'),         // flip to ceiling
    SAW(37, 1),
    SAW(43, 1),
    O(49, 2, 'grav'),         // flip back to floor
    S(55),
    P(61, 'ball'),            // ball: tap = gravity flip
    SAW(68, 1),
    SAW(75, 8),
    O(81, 2, 'grav'),
    SAW(87, 1),
    SAW(93, 8),
    P(99, 'cube'),
    S(106),
    O(112, 2), S(111), S(113),
    PAD(118),
    S(125), S(126),
    SAW(131, 1),
    S(137),
    S(143), S(144),
    S(150)
  ];

  // ---- Stage 8: SYSTEM SHOCK — everything (boss) ----
  var STAGE8 = [
    S(11),
    O(17, 2, 'dash'),         // DASH orb — forward launch
    S(24), S(25),
    SP(31, 1.35),             // fast
    S(39),
    S(47),
    O(54, 2), S(53), S(55),
    SP(61, 0.7),              // slow
    SAW(67, 1, { ax: 'v', amp: 1.3, spd: 3 }),
    S(73), S(74),
    P(80, 'jet'),
    SAW(87, 4, { ax: 'v', amp: 2.5, spd: 2 }),
    B(94, 0), B(94, 1),
    SAW(100, 5, { ax: 'v', amp: 2.5, spd: 2.4 }),
    B(106, 7), B(106, 8),
    P(113, 'ball'),
    SAW(120, 1),
    O(126, 2, 'grav'),
    SAW(132, 8),
    O(138, 2, 'down'),        // BLACK orb — slam
    SAW(144, 1),
    P(150, 'cube'),
    P(154, 'mini'),
    S(160),
    S(165), S(166),
    O(171, 2), S(170), S(172),
    S(177),
    P(183, 'big'),
    PAD(189),
    S(196), S(197),
    S(203)
  ];

  // ---- Stage 9: DATA STORM — cube speed-lanes -> jetpack -> cube (dual-speed remix) ----
  var STAGE9 = [
    S(12),
    S(18), S(19),
    PAD(25),
    SP(31, 1.3),               // FAST lane
    S(40),
    S(48),
    O(55, 2), S(54), S(56),
    SP(63, 0.65),              // SLOW precision
    S(69), S(70),
    SAW(76, 1),
    S(82), S(83),
    SP(89, 1.0),               // normal
    P(95, 'jet'),              // jetpack tunnel
    B(101, 7), B(101, 8),
    SAW(107, 4),
    B(113, 0), B(113, 1),
    SAW(119, 5),
    B(125, 7), B(125, 8),
    P(131, 'cube'),
    SP(137, 1.3),              // FAST finish
    S(146),
    O(153, 2), S(152), S(154),
    S(161),
    PAD(167),
    S(174), S(175),
    S(181)
  ];

  // ---- Stage 10: FIREWALL — dash-orb chains across every mode ----
  var STAGE10 = [
    S(11),
    O(17, 2, 'dash'),          // teach the dash launch
    S(24), S(25),
    O(31, 2, 'dash'),
    SAW(37, 1),
    O(43, 2, 'dash'),          // dash over the saw
    S(50), S(51),
    P(57, 'ball'),             // ball flips
    SAW(64, 1),
    SAW(71, 8),
    SAW(78, 1),
    P(85, 'jet'),              // jetpack
    B(91, 7), B(91, 8),
    SAW(97, 4),
    B(103, 0), B(103, 1),
    SAW(109, 5),
    P(115, 'cube'),
    O(121, 2, 'dash'),         // dash chain finale
    S(128), S(129),
    O(135, 2, 'dash'),
    PAD(142),
    S(149), S(150),
    SAW(156, 1),
    S(162),
    S(168), S(169),
    S(175)
  ];

  // ---- Stage 11: AURORA ASCENT — gravity-orb chains + ball (World 4) ----
  var STAGE11 = [
    S(12),
    S(18), S(19),
    PAD(25),
    O(32, 2, 'grav'),          // jump + flip UP to ceiling
    SAW(38, 1),                // floor saws — ride the ceiling
    SAW(44, 1),
    O(50, 6, 'grav'),          // ceiling-height orb: flip back DOWN
    S(56),
    O(62, 2, 'grav'),          // up again
    SAW(68, 1),
    SAW(74, 1),
    O(80, 6, 'grav'),          // down again
    S(86), S(87),
    P(93, 'ball'),             // ball: alternating floor/ceiling saws
    SAW(100, 1),
    SAW(107, 8),
    SAW(114, 1),
    SAW(121, 8),
    P(127, 'cube'),
    O(133, 2), S(132), S(134), // jump-orb over twins
    PAD(140),
    S(147), S(148),
    S(154)
  ];

  // ---- Stage 12: FROST BYTE — mini-mode + jetpack tunnels (World 4) ----
  var STAGE12 = [
    S(11),
    S(17),
    PAD(23),
    O(30, 2), S(29), S(31),
    P(37, 'mini'),             // MINI: tight corridors
    S(43),
    S(49), S(50),
    SAW(56, 1),
    S(62),
    P(68, 'jet'),              // mini + jetpack = narrow tunnel
    B(74, 6), B(74, 7), B(74, 8),
    SAW(80, 4),
    B(86, 0), B(86, 1), B(86, 2),
    SAW(92, 5),
    B(98, 6), B(98, 7), B(98, 8),
    P(104, 'cube'),
    S(110),
    SAW(116, 1),
    S(122), S(123),
    P(129, 'big'),             // back to full size
    PAD(135),
    S(142), S(143),
    S(149)
  ];

  // ---- Stage 13: POLAR PULSE — timed moving saws, all modes (World 4) ----
  var STAGE13 = [
    S(11),
    SAW(18, 3, { ax: 'v', amp: 2,   spd: 2.2 }),
    S(25),
    SAW(32, 4, { ax: 'v', amp: 2.5, spd: 1.8 }),
    O(39, 2), S(38), S(40),
    P(46, 'jet'),
    SAW(53, 4, { ax: 'v', amp: 3,   spd: 2.4 }),
    B(60, 0), B(60, 1),
    SAW(66, 5, { ax: 'v', amp: 2.5, spd: 2 }),
    B(72, 7), B(72, 8),
    SAW(79, 4, { ax: 'v', amp: 3,   spd: 2.6 }),
    P(86, 'cube'),
    SAW(93, 1, { ax: 'v', amp: 1.3, spd: 3 }),
    S(99), S(100),
    SAW(106, 2, { ax: 'v', amp: 2,  spd: 2.5 }),
    PAD(112),
    O(119, 2, 'dash'),
    SAW(125, 1, { ax: 'v', amp: 1.4, spd: 3.2 }),
    S(131), S(132),
    SAW(138, 3, { ax: 'v', amp: 2,  spd: 2.2 }),
    S(145),
    S(151), S(152),
    S(158)
  ];

  // ---- Stage 14: WHITEOUT — speed swings + every toy (World 4 finale) ----
  var STAGE14 = [
    S(11),
    SP(17, 1.4),               // sudden fast swing
    S(26),
    O(34, 2), S(33), S(35),
    SP(42, 0.6),               // hard brake — precision
    S(48), S(49),
    SAW(55, 1, { ax: 'v', amp: 1.3, spd: 3 }),
    O(61, 2, 'grav'),
    SAW(67, 1),
    O(73, 6, 'grav'),
    SP(79, 1.35),              // fast again
    P(85, 'jet'),
    SAW(92, 4, { ax: 'v', amp: 2.5, spd: 2.2 }),
    B(99, 0), B(99, 1),
    SAW(105, 5, { ax: 'v', amp: 2.5, spd: 2 }),
    P(112, 'cube'),
    SP(118, 1.0),
    O(124, 2, 'dash'),
    S(131), S(132),
    O(138, 2, 'down'),         // slam back to floor
    SAW(144, 1),
    PAD(151),
    S(158), S(159),
    S(165)
  ];

  // ---- Stage 15: EMBER GATE — black-orb slams + ball (World 5) ----
  var STAGE15 = [
    S(12),
    S(18), S(19),
    PAD(25),
    O(31, 2), S(30), S(32),
    O(38, 4, 'down'),          // launch off pad, slam down past a high gap
    S(45),
    B(51), B(52),
    O(58, 4, 'down'),
    S(65), S(66),
    P(72, 'ball'),             // ball: flips + ceiling/floor saws
    SAW(79, 1),
    SAW(86, 8),
    SAW(93, 1),
    O(99, 5, 'grav'),
    SAW(105, 1),
    P(111, 'cube'),
    O(117, 2, 'dash'),
    S(124), S(125),
    O(131, 4, 'down'),
    S(138),
    PAD(144),
    O(151, 2), S(150), S(152),
    S(159), S(160),
    S(166)
  ];

  JD.LEVELS = [
    { id: 1, name: 'NEON RUSH',      theme: THEME_CLASSIC, mode: 'cube', raw: STAGE1, endTile: 122, speed: 360 },
    { id: 2, name: 'JETSTREAM CAVE', theme: THEME_CAVE,    mode: 'cube', raw: STAGE2, endTile: 138, speed: 360 },
    { id: 3, name: 'CHAOS CIRCUIT',  theme: THEME_CIRCUIT, mode: 'cube', raw: STAGE3, endTile: 162, speed: 360 },
    { id: 4, name: 'SUNSET SPRINT',  theme: THEME_SUNSET,  mode: 'cube', raw: STAGE4, endTile: 161, speed: 385 },
    { id: 5, name: 'VAPOR DRIFT',    theme: THEME_SUNSET,  mode: 'cube', raw: STAGE5, endTile: 152, speed: 400 },
    { id: 6, name: 'MINI MIRAGE',    theme: THEME_SUNSET,  mode: 'cube', raw: STAGE6, endTile: 148, speed: 410 },
    { id: 7, name: 'GLITCH GATE',    theme: THEME_GLITCH,  mode: 'cube', raw: STAGE7, endTile: 158, speed: 430 },
    { id: 8, name: 'SYSTEM SHOCK',   theme: THEME_GLITCH,  mode: 'cube', raw: STAGE8,  endTile: 211, speed: 450 },
    { id: 9, name: 'DATA STORM',     theme: THEME_GLITCH,  mode: 'cube', raw: STAGE9,  endTile: 190, speed: 460 },
    { id: 10, name: 'FIREWALL',      theme: THEME_GLITCH,  mode: 'cube', raw: STAGE10, endTile: 184, speed: 470 },
    { id: 11, name: 'AURORA ASCENT', theme: THEME_AURORA,  mode: 'cube', raw: STAGE11, endTile: 162, speed: 480 },
    { id: 12, name: 'FROST BYTE',    theme: THEME_AURORA,  mode: 'cube', raw: STAGE12, endTile: 157, speed: 485 },
    { id: 13, name: 'POLAR PULSE',   theme: THEME_AURORA,  mode: 'cube', raw: STAGE13, endTile: 166, speed: 490 },
    { id: 14, name: 'WHITEOUT',      theme: THEME_AURORA,  mode: 'cube', raw: STAGE14, endTile: 173, speed: 500 },
    { id: 15, name: 'EMBER GATE',    theme: THEME_INFERNO, mode: 'cube', raw: STAGE15, endTile: 174, speed: 505 }
  ];

  JD.STAGES = [
    { id: 1, name: 'NEON RUSH',      mode: 'CUBE',           c1: '#18e0ff', c2: '#7a18ff', playable: true },
    { id: 2, name: 'JETSTREAM CAVE', mode: 'CUBE + JETPACK', c1: '#ff3df0', c2: '#7a18ff', playable: true },
    { id: 3, name: 'CHAOS CIRCUIT',  mode: 'CUBE·BALL·JET',  c1: '#4dff5a', c2: '#18e0ff', playable: true },
    { id: 4, name: 'SUNSET SPRINT',  mode: 'CUBE · SPEED',   c1: '#ff8a1e', c2: '#ff3df0', playable: true },
    { id: 5, name: 'VAPOR DRIFT',    mode: 'CUBE + JETPACK', c1: '#ffd24d', c2: '#ff5a3d', playable: true },
    { id: 6, name: 'MINI MIRAGE',    mode: 'CUBE · MINI',    c1: '#ff5e8a', c2: '#ffb84d', playable: true },
    { id: 7, name: 'GLITCH GATE',    mode: 'BALL · GRAVITY', c1: '#4dff8a', c2: '#1a9c4d', playable: true },
    { id: 8, name: 'SYSTEM SHOCK',   mode: 'ALL · BOSS',     c1: '#9dff4d', c2: '#ff4d6a', playable: true },
    { id: 9, name: 'DATA STORM',     mode: 'CUBE·JET·SPEED', c1: '#4dff8a', c2: '#18e0ff', playable: true },
    { id: 10, name: 'FIREWALL',      mode: 'ALL · DASH',     c1: '#ff4d6a', c2: '#9dff4d', playable: true },
    { id: 11, name: 'AURORA ASCENT', mode: 'GRAVITY · BALL', c1: '#7de6ff', c2: '#ff5af0', playable: true },
    { id: 12, name: 'FROST BYTE',    mode: 'MINI + JETPACK', c1: '#a6f0ff', c2: '#3d7dff', playable: true },
    { id: 13, name: 'POLAR PULSE',   mode: 'ALL · SAWS',     c1: '#7dffe6', c2: '#9b2dff', playable: true },
    { id: 14, name: 'WHITEOUT',      mode: 'ALL · SPEED',    c1: '#ffffff', c2: '#7de6ff', playable: true },
    { id: 15, name: 'EMBER GATE',    mode: 'SLAM · BALL',    c1: '#ff8a1e', c2: '#ff3d1a', playable: true }
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
        objs.push({ t: 'orb', cx: wx + t / 2, cy: base, r: t * 0.42, used: false, kind: o.kind || 'jump' });
      } else if (o.t === 'pad') {
        objs.push({ t: 'pad', x: wx, baseY: floor, w: t });
      } else if (o.t === 'saw') {
        objs.push({ t: 'saw', cx: wx + t / 2, cy: base, r: t * 0.55, cy0: base, move: o.move || null });
      } else if (o.t === 'portal') {
        objs.push({ t: 'portal', x: wx + t / 2, kind: o.kind, mult: o.mult });
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
