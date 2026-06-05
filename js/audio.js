/* ===== JUASEON DASH — electro-house audio engine (Web Audio API) =====
   Original "Back on Track"-style production: four-on-the-floor kick,
   sidechain-pumped supersaw bass + stabs, anthemic lead, reverb/delay
   sends and a master compressor. One transposed variation per stage.   */
(function () {
  var JD = window.JD || (window.JD = {});

  function f(root, n) { return root * Math.pow(2, n / 12); }

  // --- shared composition (anthemic i–VI–III–VII minor, 4 bars) ---
  // chord = root offset (semitones from key) + quality. tones added later.
  var PROG = [
    { r: 0,  q: 'min' },  // i
    { r: 8,  q: 'maj' },  // VI
    { r: 3,  q: 'maj' },  // III
    { r: 10, q: 'maj' }   // VII
  ];
  var TONES = { min: [0, 3, 7], maj: [0, 4, 7] };

  // 16-step rhythms (one bar)
  var KICK  = [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0];
  var CLAP  = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
  var HATC  = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];
  var HATO  = [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,1];
  var STAB  = [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0]; // offbeat house stabs
  var BASS  = [1,0,1,1, 0,1,1,0, 1,0,1,1, 0,1,1,0]; // driving 16th groove

  // anthem lead — semitone offsets from key, per bar (null = rest)
  var LEAD = [
    [19,null,null,19, 22,null,19,null, 15,null,19,null, 22,null,24,null],
    [24,null,null,24, 20,null,24,null, 19,null,15,null, 12,null,null,null],
    [19,null,null,22, 19,null,15,null, 14,null,19,null, 22,null,26,null],
    [26,null,24,null, 22,null,19,null, 14,null,17,null, 21,null,22,23]
  ];
  var LEAD_BUSY = [ // stage 3: 16th-note arpeggio energy
    [19,22,24,19, 22,24,27,24, 15,19,22,19, 24,22,19,15],
    [24,20,24,27, 20,24,27,31, 19,15,19,24, 12,15,19,12],
    [19,22,26,22, 19,15,19,22, 14,17,21,17, 19,22,26,22],
    [26,24,22,19, 22,19,17,14, 14,17,21,24, 21,22,23,24]
  ];

  var TRACKS = {
    menu: { root: 130.81, bpm: 122, lead: LEAD, leadVol: 0.0,  stabVol: 0.10, bassVol: 0.20, drums: 0.6, hatVol: 0.5 },
    s0:   { root: 164.81, bpm: 145, lead: LEAD, leadVol: 0.16, stabVol: 0.16, bassVol: 0.30, drums: 1.0, hatVol: 1.0 }, // E
    s1:   { root: 146.83, bpm: 150, lead: LEAD, leadVol: 0.15, stabVol: 0.18, bassVol: 0.34, drums: 1.0, hatVol: 0.9 }, // D
    s2:   { root: 196.00, bpm: 155, lead: LEAD_BUSY, leadVol: 0.14, stabVol: 0.17, bassVol: 0.32, drums: 1.0, hatVol: 1.0 } // G
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

      // glue compressor on the music bus
      this.comp = c.createDynamicsCompressor();
      this.comp.threshold.value = -14; this.comp.ratio.value = 4;
      this.comp.attack.value = 0.003; this.comp.release.value = 0.25;
      this.comp.connect(this.master);

      this.bus = c.createGain(); this.bus.gain.value = 0.9; this.bus.connect(this.comp);

      // sidechain pump (bass + synths route through this; kick ducks it)
      this.pump = c.createGain(); this.pump.gain.value = 1.0; this.pump.connect(this.bus);

      // reverb send
      this.reverb = c.createConvolver(); this.reverb.buffer = this._ir(1.8, 2.6);
      this.revWet = c.createGain(); this.revWet.gain.value = 0.9;
      this.reverb.connect(this.revWet).connect(this.bus);

      // delay send (dotted-eighth feel) with feedback
      this.delay = c.createDelay(1.0);
      this.dlyWet = c.createGain(); this.dlyWet.gain.value = 0.32;
      var fb = c.createGain(); fb.gain.value = 0.34;
      this.delay.connect(fb).connect(this.delay);
      this.delay.connect(this.dlyWet).connect(this.bus);

      // SFX bus (crisp, not ducked)
      this.sfxg = c.createGain(); this.sfxg.gain.value = 0.7; this.sfxg.connect(this.master);

      // noise buffer for drums
      var n = c.createBuffer(1, c.sampleRate * 0.4, c.sampleRate);
      var d = n.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = n;
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
      var tr = this.track, root = tr.root, ch = PROG[bar], tones = TONES[ch.q];

      if (KICK[s]) { this._kick(t, tr.drums); this._duck(t); this._pulse(t); }
      if (CLAP[s]) this._clap(t, tr.drums);
      if (HATC[s]) this._hat(t, 7000, 0.05, 0.16 * tr.hatVol);
      if (HATO[s]) this._hat(t, 8500, 0.12, 0.13 * tr.hatVol);

      if (BASS[s] && tr.bassVol > 0) {
        var bf = f(root, ch.r) / 2;                       // sub-octave root
        this._bass(bf, t, this.sec16 * 1.5, tr.bassVol);
      }
      if (STAB[s] && tr.stabVol > 0) {
        for (var i = 0; i < tones.length; i++)
          this._super(f(root, ch.r + tones[i] + 12), t, this.sec16 * 1.4, tr.stabVol, 'chord', 7, 18);
      }
      if (tr.leadVol > 0) {
        var ln = tr.lead[bar][s];
        if (ln != null) this._super(f(root, ln), t, this.sec16 * 1.3, tr.leadVol, 'lead', 5, 14);
      }
    },

    _duck: function (t) {
      var p = this.pump.gain;
      p.cancelScheduledValues(t);
      p.setValueAtTime(0.28, t);
      p.linearRampToValueAtTime(1.0, t + this.sec16 * 1.9);
    },
    _pulse: function (t) {
      var d = Math.max(0, t - this.ctx.currentTime) * 1000;
      setTimeout(function () { JD.audioPulse = 1; }, d);
    },

    // supersaw voice (chord stab or lead) -> pump (+ reverb/delay sends)
    _super: function (freq, t, dur, vol, kind, voices, spread) {
      var c = this.ctx;
      var mix = c.createGain(); mix.gain.value = 1 / voices;
      var filt = c.createBiquadFilter(); filt.type = 'lowpass';
      filt.frequency.setValueAtTime(kind === 'lead' ? 1200 : 800, t);
      filt.frequency.exponentialRampToValueAtTime(kind === 'lead' ? 6000 : 3800, t + dur * 0.5);
      filt.Q.value = 6;
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
      g.connect(this.pump);
      g.connect(this.reverb);
      if (kind === 'lead') g.connect(this.delay);
    },

    _bass: function (freq, t, dur, vol) {
      var c = this.ctx;
      var o1 = c.createOscillator(), o2 = c.createOscillator();
      o1.type = 'sawtooth'; o2.type = 'square';
      o1.frequency.value = freq; o2.frequency.value = freq; o2.detune.value = 8;
      var filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 360; filt.Q.value = 4;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o1.connect(filt); o2.connect(filt); filt.connect(g).connect(this.pump);
      o1.start(t); o2.start(t); o1.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
    },

    _kick: function (t, vol) {
      var c = this.ctx;
      var o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.10);
      g.gain.setValueAtTime(1.1 * vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g).connect(this.bus); o.start(t); o.stop(t + 0.18);
      // click transient
      var s = c.createBufferSource(); s.buffer = this.noise;
      var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1000;
      var cg = c.createGain(); cg.gain.setValueAtTime(0.4 * vol, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
      s.connect(hp).connect(cg).connect(this.bus); s.start(t); s.stop(t + 0.03);
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

    sfx: function (name) {
      this.init(); if (!this.ctx) return;
      var t = this.ctx.currentTime;
      if (name === 'jump')      this._sweep('square', 320, 620, t, 0.10, 0.28);
      else if (name === 'flip') this._sweep('square', 520, 240, t, 0.12, 0.28);
      else if (name === 'orb')  this._sweep('triangle', 680, 1180, t, 0.14, 0.3);
      else if (name === 'pad')  this._sweep('sawtooth', 300, 940, t, 0.22, 0.3);
      else if (name === 'win')  { this._sweep('triangle',523,523,t,0.12,0.3); this._sweep('triangle',659,659,t+0.12,0.12,0.3); this._sweep('triangle',784,784,t+0.24,0.32,0.3); }
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
