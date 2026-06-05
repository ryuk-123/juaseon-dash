/* ===== JUASEON DASH — multi-genre EDM audio engine (Web Audio API) =====
   One real, distinct track per stage, grouped by world:
     • Stages 1-3 (Origins)  → EURODANCE / HANDS-UP  (four-on-floor, offbeat saw bass, anthem supersaw hook)
     • Stages 4-6 (Sunset)   → FUTURE BASS + POP      (sidechained detuned supersaw chords, vocal-chop plucks, trap hats)
     • Stages 7-8 (Glitch)   → DUBSTEP / BROSTEP       (half-time, LFO wobble bass, big snare on 3)
   Shared bus: sidechain pump (kick ducks), reverb + delay sends, glue compressor.
   Each track = { genre, bpm, root, prog, lead?, wob? }. Synthesis is genre-dispatched in _stepAt. */
(function () {
  var JD = window.JD || (window.JD = {});
  var n = null;

  function f(root, semi) { return root * Math.pow(2, semi / 12); }

  // chord qualities (semitone offsets from chord root)
  var TONES = {
    min: [0, 3, 7], maj: [0, 4, 7],
    min7: [0, 3, 7, 10], maj7: [0, 4, 7, 11],
    sus4: [0, 5, 7], add9: [0, 4, 7, 14]
  };

  // ---- chord progressions (root offset from key + quality), 4 bars ----
  var P = {
    euro1: [{ r: 0, q: 'min' }, { r: 8, q: 'maj' }, { r: 3, q: 'maj' }, { r: 10, q: 'maj' }],   // i-VI-III-VII
    euro2: [{ r: 0, q: 'min' }, { r: 10, q: 'maj' }, { r: 8, q: 'maj' }, { r: 5, q: 'min' }],   // i-VII-VI-iv
    euro3: [{ r: 0, q: 'min' }, { r: 7, q: 'maj' }, { r: 8, q: 'maj' }, { r: 10, q: 'maj' }],   // i-V-VI-VII
    fut1: [{ r: 0, q: 'min7' }, { r: 3, q: 'maj7' }, { r: 10, q: 'add9' }, { r: 8, q: 'maj7' }],
    fut2: [{ r: 8, q: 'maj7' }, { r: 10, q: 'add9' }, { r: 0, q: 'min7' }, { r: 3, q: 'maj7' }], // VI-VII-i-III (future-bass staple)
    fut3: [{ r: 5, q: 'min7' }, { r: 10, q: 'add9' }, { r: 3, q: 'maj7' }, { r: 8, q: 'maj7' }],
    dub1: [{ r: 0, q: 'min' }, { r: 0, q: 'min' }, { r: 10, q: 'maj' }, { r: 8, q: 'maj' }],
    dub2: [{ r: 0, q: 'min' }, { r: 8, q: 'maj' }, { r: 0, q: 'min' }, { r: 10, q: 'maj' }]
  };

  // ---- MELODIC HOOKS (semitone offsets from key, per bar, 16 steps; n = rest) ----
  // Written melody-first: flowing 8th-note lines, repeated motifs + call/response,
  // resolving to chord tones. These are the "song"; drums/bass support underneath.
  var L = {
    // EURODANCE — euphoric, bouncy hands-up anthems (lead is the star)
    euro1: [
      [24, n, 22, n, 19, n, 22, n, 24, n, 26, n, 24, n, 22, n],
      [19, n, 17, n, 19, n, 22, n, 24, n, 22, n, 19, n, n, n],
      [24, n, 22, n, 19, n, 22, n, 24, n, 26, n, 27, n, 26, n],
      [24, n, 22, n, 19, n, 17, n, 19, n, 22, n, 24, n, n, n]
    ],
    euro2: [
      [22, n, 22, 24, 19, n, n, 19, 17, n, 19, 17, 15, n, n, n],
      [22, n, 22, 24, 26, n, n, 24, 22, n, 19, 17, 19, n, n, n],
      [24, n, 24, 26, 27, n, n, 26, 24, n, 22, 19, 22, n, n, n],
      [26, n, 24, 22, 19, n, 17, n, 22, n, 19, n, 17, n, 15, n]
    ],
    euro3: [
      [19, 22, 24, 19, 22, 24, 27, 22, 24, n, 22, n, 19, n, n, n],
      [17, 19, 22, 17, 19, 22, 24, 19, 22, n, 19, n, 17, n, n, n],
      [19, 22, 24, 19, 24, 26, 27, 24, 26, n, 24, n, 22, n, n, n],
      [27, 26, 24, 22, 24, 22, 19, 17, 19, n, 22, n, 24, n, n, n]
    ],
    // FUTURE BASS — emotional, singable, big leaps then resolve
    fut1: [
      [19, n, 19, n, 22, n, 24, n, 22, n, n, 19, 17, n, n, n],
      [15, n, 15, n, 17, n, 19, n, 22, n, n, 19, 17, n, n, n],
      [24, n, 24, n, 22, n, 19, n, 22, n, 24, n, 26, n, n, n],
      [22, n, 19, n, 17, n, 19, n, 22, n, 24, 22, 19, n, n, n]
    ],
    fut2: [
      [26, n, n, 24, 22, n, 24, n, 19, n, n, n, 22, n, n, n],
      [24, n, n, 22, 19, n, 22, n, 17, n, n, n, 19, n, n, n],
      [27, n, n, 26, 24, n, 22, n, 19, n, 22, 24, 26, n, n, n],
      [24, n, 22, n, 19, n, 17, n, 19, n, 22, n, 24, n, n, n]
    ],
    fut3: [
      [19, n, 22, 19, 24, n, 22, n, 19, n, 17, 19, 22, n, n, n],
      [17, n, 19, 17, 22, n, 19, n, 17, n, 15, 17, 19, n, n, n],
      [22, n, 24, 22, 26, n, 24, n, 22, n, 19, 22, 24, n, n, n],
      [26, n, 24, 22, 19, n, 22, n, 24, n, 26, 24, 22, n, 19, n]
    ],
    // DUBSTEP — dark, menacing minor riff that sings over the wobble
    dub1: [
      [12, n, n, n, 15, n, 12, n, 10, n, n, n, 12, n, n, n],
      [12, n, n, n, 15, n, 17, n, 15, n, 12, n, 10, n, n, n],
      [19, n, n, n, 17, n, 15, n, 12, n, n, n, 15, n, n, n],
      [15, n, 12, n, 10, n, 12, n, 15, n, n, n, n, n, n, n]
    ],
    dub2: [
      [12, n, 15, n, 19, n, 15, n, 12, n, 10, n, 12, n, n, n],
      [12, n, 15, n, 19, n, 22, n, 19, n, 15, n, 12, n, n, n],
      [24, n, 22, n, 19, n, 15, n, 12, n, 15, n, 19, n, n, n],
      [19, n, 15, n, 12, n, 10, n, 12, n, 15, 12, 10, n, n, n]
    ]
  };

  // ---- step patterns (16 per bar) ----
  // Eurodance
  var EK = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
  var ECL = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
  var EHC = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
  var EHO = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];
  var EOFF = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];  // offbeat bass + stab
  // Future bass
  var FK = [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0];
  var FCL = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0];
  var FHC = [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1];
  var FPLK = [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0]; // pluck/chop accents
  // Dubstep (half-time @ 140)
  var DK = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0];
  var DSN = [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0];
  var DHC = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1];
  var DWOB = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];  // wobble retrigger (quarters)

  var TRACKS = {
    menu: { genre: 'future', bpm: 120, root: 130.81, prog: P.fut1, lead: n, calm: true },
    // ---- Origins: EURODANCE / HANDS-UP ----
    s0: { genre: 'euro', bpm: 150, root: 146.83, prog: P.euro1, lead: L.euro1 },
    s1: { genre: 'euro', bpm: 152, root: 164.81, prog: P.euro2, lead: L.euro2 },
    s2: { genre: 'euro', bpm: 156, root: 130.81, prog: P.euro3, lead: L.euro3 },
    // ---- Sunset: FUTURE BASS + DANCE POP ----
    s3: { genre: 'future', bpm: 150, root: 174.61, prog: P.fut1, lead: L.fut1 },
    s4: { genre: 'future', bpm: 150, root: 196.00, prog: P.fut2, lead: L.fut2 },
    s5: { genre: 'future', bpm: 152, root: 155.56, prog: P.fut3, lead: L.fut3 },
    // ---- Glitch: DUBSTEP / BROSTEP ----
    s6: { genre: 'dub', bpm: 140, root: 130.81, prog: P.dub1, lead: L.dub1, wob: [2, 2, 4, 4] },
    s7: { genre: 'dub', bpm: 140, root: 110.00, prog: P.dub2, lead: L.dub2, wob: [4, 2, 8, 4] }
  };

  var A = {
    ctx: null, master: null, comp: null, bus: null, pump: null,
    reverb: null, revWet: null, delay: null, dlyWet: null, sfxg: null, noise: null,
    timer: null, track: null, step: 0, bar: 0, nextTime: 0, sec16: 0,
    muted: false, current: null,

    init: function () {
      if (this.ctx) return;
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var c = this.ctx = new Ctx();

      this.master = c.createGain();
      this.muted = localStorage.getItem('jd_muted') === '1';
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(c.destination);

      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -12; this.comp.ratio.value = 4;
      this.comp.attack.value = 0.003; this.comp.release.value = 0.25;
      this.comp.connect(this.master);

      this.bus = c.createGain(); this.bus.gain.value = 0.9; this.bus.connect(this.comp);

      // sidechain pump (chords/bass/leads route here; kick + big snare duck it)
      this.pump = c.createGain(); this.pump.gain.value = 1.0; this.pump.connect(this.bus);

      this.reverb = c.createConvolver(); this.reverb.buffer = this._ir(2.0, 2.4);
      this.revWet = c.createGain(); this.revWet.gain.value = 0.9;
      this.reverb.connect(this.revWet).connect(this.bus);

      this.delay = c.createDelay(1.0);
      this.dlyWet = c.createGain(); this.dlyWet.gain.value = 0.30;
      var fb = c.createGain(); fb.gain.value = 0.34;
      this.delay.connect(fb).connect(this.delay);
      this.delay.connect(this.dlyWet).connect(this.bus);

      this.sfxg = c.createGain(); this.sfxg.gain.value = 0.7; this.sfxg.connect(this.master);

      var nb = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
      var d = nb.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = nb;
    },

    _ir: function (dur, decay) {
      var c = this.ctx, len = Math.floor(c.sampleRate * dur);
      var buf = c.createBuffer(2, len, c.sampleRate);
      for (var ch = 0; ch < 2; ch++) {
        var d = buf.getChannelData(ch);
        for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
      return buf;
    },

    resume: function () { this.init(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

    play: function (key) {
      this.init(); if (!this.ctx) return;
      if (this.current === key && this.timer) return;
      this.current = key;
      this.track = TRACKS[key] || TRACKS.menu;
      this.delay.delayTime.value = (60 / this.track.bpm) * 0.75; // dotted-eighth
      this.sec16 = 60 / this.track.bpm / 4;
      this.step = 0; this.bar = 0; this.nextTime = this.ctx.currentTime + 0.06;
      if (!this.timer) { var s = this; this.timer = setInterval(function () { s._sched(); }, 25); }
    },

    stop: function () { if (this.timer) { clearInterval(this.timer); this.timer = null; } this.current = null; },

    toggleMute: function () {
      this.init(); this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.9;
      localStorage.setItem('jd_muted', this.muted ? '1' : '0');
      return this.muted;
    },

    _sched: function () {
      if (!this.ctx) return;
      while (this.nextTime < this.ctx.currentTime + 0.12) {
        this._stepAt(this.step, this.bar, this.nextTime);
        this.nextTime += this.sec16;
        this.step++;
        if (this.step >= 16) { this.step = 0; this.bar = (this.bar + 1) % 4; }
      }
    },

    _stepAt: function (s, bar, t) {
      var tr = this.track;
      if (tr.genre === 'dub') this._stepDub(s, bar, t, tr);
      else if (tr.genre === 'future') this._stepFuture(s, bar, t, tr);
      else this._stepEuro(s, bar, t, tr);
    },

    // ============================ EURODANCE / HANDS-UP ============================
    _stepEuro: function (s, bar, t, tr) {
      var root = tr.root, ch = tr.prog[bar], tones = TONES[ch.q];
      if (EK[s]) { this._kick(t, 1.0, false); this._duck(t, 1.9); this._pulse(t); }
      if (ECL[s]) this._clap(t, 0.8);
      if (EHC[s]) this._hat(t, 7200, 0.04, 0.09);
      if (EHO[s]) this._hat(t, 8200, 0.12, 0.12);    // offbeat open hats (softened)
      if (EK[s]) this._sub(f(root, ch.r) / 2, t, this.sec16 * 1.4, 0.30, 0);
      if (EOFF[s]) this._bassOff(f(root, ch.r), t, this.sec16 * 1.2, 0.24);
      // supersaw chord pad only on chord changes (bed, not busy stabs)
      if (s === 0 || s === 8) {
        for (var i = 0; i < tones.length; i++)
          this._super(f(root, ch.r + tones[i] + 12), t, this.sec16 * 7, 0.05, 'chord', 7, 16);
      }
      // ANTHEM LEAD — front and center, doubled an octave for size
      if (tr.lead) {
        var ln = tr.lead[bar][s];
        if (ln != n) {
          var noteDur = this._noteLen(tr.lead[bar], s);
          this._lead(f(root, ln), t, noteDur, 0.27);
          this._super(f(root, ln + 12), t, noteDur * 0.9, 0.05, 'lead', 3, 10); // shimmer octave
        }
      }
    },

    // ============================ FUTURE BASS + DANCE POP ============================
    _stepFuture: function (s, bar, t, tr) {
      var root = tr.root, ch = tr.prog[bar], tones = TONES[ch.q];
      var calm = tr.calm;
      if (!calm) {
        if (FK[s]) { this._kick(t, 1.0, false); this._duck(t, 2.4); this._pulse(t); }
        if (FCL[s]) this._snare(t, 0.7);
        if (FHC[s] && (s % 2 === 0)) this._hat(t, 9000, 0.04, 0.08);   // lighter hats
      } else if (s === 0) {
        this._kick(t, 0.5, false); this._duck(t, 3.0); this._pulse(t);
      }
      // detuned supersaw chord bed (quieter, just a cushion under the melody)
      if (s === 0 || s === 8) {
        for (var i = 0; i < tones.length; i++)
          this._chord(f(root, ch.r + tones[i] + 12), t, this.sec16 * 8, calm ? 0.055 : 0.06);
        this._sub(f(root, ch.r) / 2, t, this.sec16 * 8, calm ? 0.16 : 0.28, 1);
      }
      // LEAD MELODY — the song. Warm legato lead + a pluck attack for the future-bass bounce.
      if (!calm && tr.lead) {
        var ln = tr.lead[bar][s];
        if (ln != n) {
          var noteDur = this._noteLen(tr.lead[bar], s);
          this._lead(f(root, ln + 12), t, noteDur, 0.26);
          this._pluck(f(root, ln + 12), t, 0.12);
        }
      }
    },

    // ============================ DUBSTEP / BROSTEP ============================
    _stepDub: function (s, bar, t, tr) {
      var root = tr.root, ch = tr.prog[bar], tones = TONES[ch.q];
      if (DK[s]) { this._kick(t, 1.1, true); this._duck(t, 2.6); this._pulse(t); }
      if (DSN[s]) { this._snare(t, 1.0); this._duck(t, 2.2); this._pulse(t); }
      if (DHC[s]) this._hat(t, 9500, 0.05, 0.12);
      // atmospheric pad (sidechained → breathes)
      if (s === 0) {
        for (var i = 0; i < tones.length; i++)
          this._super(f(root, ch.r + tones[i] + 12), t, this.sec16 * 8, 0.05, 'chord', 5, 14);
      }
      // LFO WOBBLE BASS — retrigger on quarters, rate varies per bar
      if (DWOB[s]) {
        var rate = (tr.bpm / 60) * (tr.wob[bar] || 2);   // cycles per second
        this._wobble(f(root, ch.r) / 2, t, this.sec16 * 4, 0.38, rate);
      }
      // DARK LEAD RIFF — the melodic "song" over the drop (bright, cuts through the wobble)
      if (tr.lead) {
        var ln = tr.lead[bar][s];
        if (ln != n) {
          var noteDur = this._noteLen(tr.lead[bar], s);
          this._lead(f(root, ln + 12), t, noteDur, 0.24);
        }
      }
    },

    // ---- sidechain + visual ----
    _duck: function (t, steps) {
      var p = this.pump.gain;
      p.cancelScheduledValues(t);
      p.setValueAtTime(0.22, t);
      p.linearRampToValueAtTime(1.0, t + this.sec16 * (steps || 1.9));
    },
    _pulse: function (t) {
      var d = Math.max(0, t - this.ctx.currentTime) * 1000;
      setTimeout(function () { JD.audioPulse = 1; }, d);
    },

    // ---- supersaw voice (chord stab / lead / growl) → pump (+ sends) ----
    _super: function (freq, t, dur, vol, kind, voices, spread) {
      var c = this.ctx;
      var mix = c.createGain(); mix.gain.value = 1 / voices;
      var filt = c.createBiquadFilter(); filt.type = 'lowpass';
      var lo = kind === 'lead' ? 1300 : kind === 'growl' ? 700 : 800;
      var hi = kind === 'lead' ? 6500 : kind === 'growl' ? 5200 : 3800;
      filt.frequency.setValueAtTime(lo, t);
      filt.frequency.exponentialRampToValueAtTime(hi, t + dur * 0.5);
      filt.Q.value = kind === 'growl' ? 11 : 6;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      for (var i = 0; i < voices; i++) {
        var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq;
        o.detune.value = (i - (voices - 1) / 2) * spread;
        o.connect(mix); o.start(t); o.stop(t + dur + 0.03);
      }
      mix.connect(filt).connect(g);
      g.connect(this.pump); g.connect(this.reverb);
      if (kind === 'lead' || kind === 'growl') g.connect(this.delay);
    },

    // how long a melody note should ring: until the next note in the bar (legato), capped
    _noteLen: function (arr, s) {
      var steps = 1;
      for (var i = s + 1; i < arr.length; i++) { if (arr[i] != n) break; steps++; }
      return this.sec16 * Math.min(steps, 6) * 0.96;
    },

    // ---- warm, singing LEAD voice (the melody): detuned saws + triangle + sub octave, vibrato, echo ----
    _lead: function (freq, t, dur, vol) {
      var c = this.ctx;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.014);
      g.gain.setValueAtTime(vol, t + Math.max(0.03, dur * 0.55));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      var filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 4200; filt.Q.value = 0.9;
      var mix = c.createGain(); mix.gain.value = 0.4;
      // subtle vibrato for a vocal, expressive feel
      var vib = c.createOscillator(); vib.type = 'sine'; vib.frequency.value = 5.6;
      var vibAmt = c.createGain(); vibAmt.gain.value = freq * 0.010; vib.connect(vibAmt);
      var defs = [['sawtooth', -6], ['sawtooth', 6], ['triangle', 0]];
      var oscs = [];
      for (var i = 0; i < defs.length; i++) {
        var o = c.createOscillator(); o.type = defs[i][0]; o.frequency.value = freq; o.detune.value = defs[i][1];
        vibAmt.connect(o.frequency); o.connect(mix); oscs.push(o);
      }
      var sub = c.createOscillator(); sub.type = 'sine'; sub.frequency.value = freq / 2;
      var subg = c.createGain(); subg.gain.value = 0.5; sub.connect(subg).connect(mix);
      mix.connect(filt).connect(g);
      g.connect(this.pump); g.connect(this.reverb); g.connect(this.delay);
      var off = t + dur + 0.05;
      vib.start(t); sub.start(t); vib.stop(off); sub.stop(off);
      for (var k = 0; k < oscs.length; k++) { oscs[k].start(t); oscs[k].stop(off); }
    },

    // ---- lush future-bass chord voice (wide detune, slow filter swell, pump-breathing) ----
    _chord: function (freq, t, dur, vol) {
      var c = this.ctx, voices = 7;
      var mix = c.createGain(); mix.gain.value = 1 / voices;
      var filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.Q.value = 2;
      filt.frequency.setValueAtTime(700, t);
      filt.frequency.linearRampToValueAtTime(5200, t + dur * 0.35);
      filt.frequency.linearRampToValueAtTime(2600, t + dur);
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.setValueAtTime(vol, t + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      for (var i = 0; i < voices; i++) {
        var o = c.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(freq * (1 - 0.004), t);
        o.frequency.exponentialRampToValueAtTime(freq, t + 0.08);  // slight pitch-in glide
        o.detune.value = (i - 3) * 14;
        o.connect(mix); o.start(t); o.stop(t + dur + 0.05);
      }
      mix.connect(filt).connect(g);
      g.connect(this.pump); g.connect(this.reverb); g.connect(this.delay);
    },

    // ---- short bright pluck / vocal-chop ----
    _pluck: function (freq, t, vol) {
      var c = this.ctx, voices = 3;
      var mix = c.createGain(); mix.gain.value = 1 / voices;
      var filt = c.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = freq * 3; filt.Q.value = 1.2;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      for (var i = 0; i < voices; i++) {
        var o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq;
        o.detune.value = (i - 1) * 10;
        o.connect(mix); o.start(t); o.stop(t + 0.26);
      }
      mix.connect(filt).connect(g);
      g.connect(this.pump); g.connect(this.reverb); g.connect(this.delay);
    },

    // ---- punchy offbeat saw bass (eurodance) ----
    _bassOff: function (freq, t, dur, vol) {
      var c = this.ctx;
      var o1 = c.createOscillator(), o2 = c.createOscillator();
      o1.type = 'sawtooth'; o2.type = 'square';
      o1.frequency.value = freq; o2.frequency.value = freq; o2.detune.value = 10;
      var filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.Q.value = 5;
      filt.frequency.setValueAtTime(1400, t);
      filt.frequency.exponentialRampToValueAtTime(420, t + dur * 0.6);
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o1.connect(filt); o2.connect(filt); filt.connect(g).connect(this.pump);
      o1.start(t); o2.start(t); o1.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
    },

    // ---- clean sub (sine + soft saw), optional pitch glide ----
    _sub: function (freq, t, dur, vol, glide) {
      var c = this.ctx;
      var o = c.createOscillator(); o.type = 'sine';
      if (glide) { o.frequency.setValueAtTime(freq * 0.5, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.06); }
      else o.frequency.value = freq;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.setValueAtTime(vol, t + dur * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.bus);   // sub stays out of sidechain for steady low end
      o.start(t); o.stop(t + dur + 0.03);
    },

    // ---- LFO wobble bass (dubstep) ----
    _wobble: function (freq, t, dur, vol, rate) {
      var c = this.ctx;
      var o1 = c.createOscillator(), o2 = c.createOscillator();
      o1.type = 'sawtooth'; o2.type = 'square';
      o1.frequency.value = freq; o2.frequency.value = freq; o2.detune.value = -12;
      var filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.Q.value = 14;
      filt.frequency.value = 240;
      // LFO modulates the cutoff → the "wob wob"
      var lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = rate;
      var lfoAmt = c.createGain(); lfoAmt.gain.value = 900;
      lfo.connect(lfoAmt).connect(filt.frequency);
      var drive = c.createWaveShaper(); drive.curve = this._satCurve();
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.setValueAtTime(vol, t + dur * 0.85);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o1.connect(filt); o2.connect(filt);
      filt.connect(drive).connect(g).connect(this.bus);   // heavy → straight to bus
      // clean sub underneath
      this._sub(freq, t, dur, vol * 0.6, 0);
      lfo.start(t); o1.start(t); o2.start(t);
      lfo.stop(t + dur + 0.03); o1.stop(t + dur + 0.03); o2.stop(t + dur + 0.03);
    },

    _satCurve: function () {
      if (this._sat) return this._sat;
      var nn = 1024, curve = new Float32Array(nn);
      for (var i = 0; i < nn; i++) { var x = (i / nn) * 2 - 1; curve[i] = Math.tanh(x * 2.2); }
      return (this._sat = curve);
    },

    // ---- drums ----
    _kick: function (t, vol, deep) {
      var c = this.ctx;
      var o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(deep ? 200 : 170, t);
      o.frequency.exponentialRampToValueAtTime(deep ? 40 : 50, t + (deep ? 0.13 : 0.10));
      g.gain.setValueAtTime(1.1 * vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (deep ? 0.22 : 0.16));
      o.connect(g).connect(this.bus); o.start(t); o.stop(t + (deep ? 0.24 : 0.18));
      var s = c.createBufferSource(); s.buffer = this.noise;
      var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1000;
      var cg = c.createGain(); cg.gain.setValueAtTime(0.4 * vol, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
      s.connect(hp).connect(cg).connect(this.bus); s.start(t); s.stop(t + 0.03);
    },

    _snare: function (t, vol) {
      var c = this.ctx;
      // noise body
      var s = c.createBufferSource(); s.buffer = this.noise;
      var bp = c.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = 1500;
      var g = c.createGain(); g.gain.setValueAtTime(0.6 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      s.connect(bp).connect(g); g.connect(this.bus); g.connect(this.reverb);
      s.start(t); s.stop(t + 0.2);
      // tonal crack
      var o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.08);
      var og = c.createGain(); og.gain.setValueAtTime(0.4 * vol, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(og).connect(this.bus); o.start(t); o.stop(t + 0.12);
    },

    _clap: function (t, vol) {
      var c = this.ctx;
      for (var k = 0; k < 3; k++) {
        var tt = t + k * 0.011;
        var s = c.createBufferSource(); s.buffer = this.noise;
        var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 1.4;
        var g = c.createGain(); g.gain.setValueAtTime(0.5 * vol, tt); g.gain.exponentialRampToValueAtTime(0.001, tt + 0.12);
        s.connect(bp).connect(g).connect(this.bus); s.start(tt); s.stop(tt + 0.14);
      }
    },

    _hat: function (t, hz, dur, vol) {
      var c = this.ctx;
      var s = c.createBufferSource(); s.buffer = this.noise;
      var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = hz;
      var g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(hp).connect(g).connect(this.bus); s.start(t); s.stop(t + dur + 0.02);
    },

    // ---- one-shot SFX (crisp, not ducked) ----
    sfx: function (name) {
      this.init(); if (!this.ctx) return;
      var t = this.ctx.currentTime;
      if (name === 'jump') this._sweep('square', 320, 620, t, 0.10, 0.28);
      else if (name === 'flip') this._sweep('square', 520, 240, t, 0.12, 0.28);
      else if (name === 'orb') this._sweep('triangle', 680, 1180, t, 0.14, 0.3);
      else if (name === 'pad') this._sweep('sawtooth', 300, 940, t, 0.22, 0.3);
      else if (name === 'count') this._sweep('square', 440, 440, t, 0.12, 0.22);
      else if (name === 'go') { this._sweep('triangle', 660, 880, t, 0.10, 0.3); this._sweep('triangle', 880, 1320, t + 0.08, 0.22, 0.3); }
      else if (name === 'win') { this._sweep('triangle', 523, 523, t, 0.12, 0.3); this._sweep('triangle', 659, 659, t + 0.12, 0.12, 0.3); this._sweep('triangle', 784, 784, t + 0.24, 0.32, 0.3); }
      else if (name === 'death') {
        var s = this.ctx.createBufferSource(); s.buffer = this.noise;
        var g = this.ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        s.connect(g).connect(this.sfxg); s.start(t); s.stop(t + 0.32);
        this._sweep('sawtooth', 420, 50, t, 0.3, 0.32);
      }
    },

    _sweep: function (type, f0, f1, t, dur, vol) {
      var o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.sfxg); o.start(t); o.stop(t + dur + 0.02);
    }
  };

  JD.audio = A;
  JD.audioPulse = 0;
})();
