/* ===== JUASEON DASH — procedural audio (Web Audio API) =====
   Original funky synth: drums + bass + lead, one loop per stage,
   plus a mellow menu loop. Beat pulses drive the visual flash.   */
(function () {
  var JD = window.JD || (window.JD = {});

  function semi(root, n) { return root * Math.pow(2, n / 12); }

  // 16-step patterns. bass/lead = semitone offsets from root (null = rest).
  // Funky minor grooves; distinct key/tempo/energy per track.
  var TRACKS = {
    menu: {
      bpm: 110, root: 220.0, // A3
      kick: [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
      snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hat:  [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
      bass: [0,null,null,null, 3,null,null,null, 5,null,null,null, 7,null,null,null],
      lead: [12,null,15,null, 14,null,12,null, 10,null,12,null, null,null,null,null],
      leadVol: 0.16
    },
    s0: { // NEON RUSH — upbeat synthwave, A minor
      bpm: 128, root: 220.0,
      kick: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
      snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
      hat:  [0,1,1,1, 0,1,1,1, 0,1,1,1, 0,1,1,1],
      bass: [0,0,null,0, 0,null,3,null, 5,5,null,5, 3,null,0,null],
      lead: [12,null,12,15, 14,null,12,10, 12,null,15,17, 19,null,17,15],
      leadVol: 0.2
    },
    s1: { // JETSTREAM CAVE — darker, D minor, driving
      bpm: 134, root: 146.83, // D3
      kick: [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0],
      snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hat:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1],
      bass: [0,null,0,null, 0,null,0,5, 3,null,3,null, 7,null,5,null],
      lead: [12,null,null,12, 10,null,12,null, 15,null,14,null, 12,null,10,null],
      leadVol: 0.18
    },
    s2: { // CHAOS CIRCUIT — fast, E minor, arpeggio frenzy
      bpm: 142, root: 164.81, // E3
      kick: [1,0,0,0, 1,0,1,0, 1,0,0,0, 1,0,1,0],
      snare:[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      hat:  [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
      bass: [0,0,7,0, 0,0,7,0, 3,3,10,3, 5,5,12,5],
      lead: [12,15,19,15, 12,15,19,24, 14,17,21,17, 19,22,17,15],
      leadVol: 0.17
    }
  };

  var A = {
    ctx: null, master: null, music: null, sfxg: null,
    timer: null, track: null, step: 0, nextTime: 0, sec16: 0,
    muted: false, current: null, noise: null,

    init: function () {
      if (this.ctx) return;
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
      this.music = this.ctx.createGain(); this.music.gain.value = 0.6; this.music.connect(this.master);
      this.sfxg = this.ctx.createGain(); this.sfxg.gain.value = 0.7; this.sfxg.connect(this.master);
      // cached noise buffer
      var n = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate);
      var d = n.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noise = n;
      this.muted = localStorage.getItem('jd_muted') === '1';
      this.master.gain.value = this.muted ? 0 : 0.5;
    },

    resume: function () { this.init(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

    play: function (key) {
      this.init(); if (!this.ctx) return;
      if (this.current === key && this.timer) return;
      this.current = key;
      this.track = TRACKS[key] || TRACKS.menu;
      this.sec16 = 60 / this.track.bpm / 4;
      this.step = 0; this.nextTime = this.ctx.currentTime + 0.05;
      if (!this.timer) {
        var self = this;
        this.timer = setInterval(function () { self._schedule(); }, 25);
      }
    },

    stop: function () { if (this.timer) { clearInterval(this.timer); this.timer = null; } this.current = null; },

    toggleMute: function () {
      this.init(); this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
      localStorage.setItem('jd_muted', this.muted ? '1' : '0');
      return this.muted;
    },

    _schedule: function () {
      if (!this.ctx) return;
      while (this.nextTime < this.ctx.currentTime + 0.12) {
        this._stepAt(this.step, this.nextTime);
        this.nextTime += this.sec16;
        this.step = (this.step + 1) % 16;
      }
    },

    _stepAt: function (s, t) {
      var tr = this.track;
      if (tr.kick[s]) { this._kick(t); this._pulse(t); }
      if (tr.snare[s]) this._snare(t);
      if (tr.hat[s]) this._hat(t);
      if (tr.bass[s] != null) this._tone('square', semi(tr.root, tr.bass[s]) / 2, t, this.sec16 * 1.6, 0.28, 600);
      if (tr.lead[s] != null) this._tone('triangle', semi(tr.root, tr.lead[s]), t, this.sec16 * 1.1, tr.leadVol, 4000);
    },

    _pulse: function (t) {
      var d = Math.max(0, (t - this.ctx.currentTime)) * 1000;
      setTimeout(function () { JD.audioPulse = 1; }, d);
    },

    _env: function (g, t, peak, dur) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    },

    _tone: function (type, freq, t, dur, vol, cutoff) {
      var o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
      o.type = type; o.frequency.value = freq;
      f.type = 'lowpass'; f.frequency.value = cutoff || 2000;
      this._env(g, t, vol, dur);
      o.connect(f).connect(g).connect(this.music);
      o.start(t); o.stop(t + dur + 0.02);
    },

    _kick: function (t) {
      var o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(50, t + 0.11);
      g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      o.connect(g).connect(this.music); o.start(t); o.stop(t + 0.14);
    },

    _snare: function (t) {
      var s = this.ctx.createBufferSource(); s.buffer = this.noise;
      var f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500;
      var g = this.ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      s.connect(f).connect(g).connect(this.music); s.start(t); s.stop(t + 0.14);
    },

    _hat: function (t) {
      var s = this.ctx.createBufferSource(); s.buffer = this.noise;
      var f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      var g = this.ctx.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      s.connect(f).connect(g).connect(this.music); s.start(t); s.stop(t + 0.05);
    },

    sfx: function (name) {
      this.init(); if (!this.ctx) return;
      var t = this.ctx.currentTime;
      if (name === 'jump')      this._sweep('square',   320, 620, t, 0.10, 0.3);
      else if (name === 'flip') this._sweep('square',   500, 250, t, 0.12, 0.3);
      else if (name === 'orb')  this._sweep('triangle', 660, 1100, t, 0.14, 0.3);
      else if (name === 'pad')  this._sweep('sawtooth', 300, 900, t, 0.22, 0.3);
      else if (name === 'win')  { this._sweep('triangle',523,523,t,0.12,0.3); this._sweep('triangle',659,659,t+0.12,0.12,0.3); this._sweep('triangle',784,784,t+0.24,0.3,0.3); }
      else if (name === 'death') {
        var s = this.ctx.createBufferSource(); s.buffer = this.noise;
        var g = this.ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        s.connect(g).connect(this.sfxg); s.start(t); s.stop(t + 0.32);
        this._sweep('sawtooth', 420, 50, t, 0.3, 0.35);
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
