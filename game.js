// =========================================================================
// 1. WEBAUDIO SYNTHESIS + CRISP PERCUSSIVE SFX ENGINE (ZERO AIR-HISS)
// =========================================================================
// Uses WebAudio AudioBuffers + rich dual-oscillator synthesis routed through
// WebAudio GainNodes (never uses sfx100v2_air_01/02.ogg or white-noise hiss).
const CC0_SFX_MANIFEST = {
  plant:   { url: 'audio/sfx100v2_footstep_wet_01.ogg', vol: 0.75, rate: 1.15 },
  upgrade: { url: 'audio/sfx100v2_items_01.ogg',        vol: 0.80, rate: 1.05 },
  uproot:  { url: 'audio/sfx100v2_footstep_wet_02.ogg', vol: 0.75, rate: 0.92 },
  select:  { url: 'audio/sfx100v2_switch_01.ogg',       vol: 0.65, rate: 1.15 },
  // Crisp percussive pops & chimes (replaces air_01/air_02 so there is zero hushing sound)
  shoot:   { url: 'audio/sfx100v2_wood_04.ogg',         vol: 0.75, rate: 1.35 },
  shoot_0: { url: 'audio/sfx100v2_wood_04.ogg',         vol: 0.75, rate: 1.35 }, // Pea Sprout crisp pop
  shoot_1: { url: 'audio/sfx100v2_glass_02.ogg',        vol: 0.70, rate: 1.30 }, // Frost Bell ice chime
  shoot_2: { url: 'audio/sfx100v2_wood_hit_02.ogg',     vol: 0.78, rate: 1.10 }, // Puff Shroom punchy thud
  shoot_3: { url: 'audio/sfx100v2_items_02.ogg',        vol: 0.70, rate: 1.40 }, // Sun Flora warm chime
  pop:     { url: 'audio/sfx100v2_wood_hit_01.ogg',     vol: 0.80, rate: 1.25 },
  bite:    { url: 'audio/sfx100v2_hit_03.ogg',          vol: 0.85, rate: 0.95 },
  wave:    { url: 'audio/sfx100v2_items_02.ogg',        vol: 0.80, rate: 0.90 }
};

class EndlessGardenMusic {
  constructor(ctx) {
    this.ctx = ctx;
    this.isPlaying = false;
    this.step = 0;
    this.nextNoteTime = 0;
    this.timerId = null;

    // Master volume gain node balanced underneath plant SFX
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.38, ctx.currentTime);
    this.masterGain.connect(ctx.destination);
  }

  setMuted(muted) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0.0 : 0.38, this.ctx.currentTime, 0.04);
    }
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  scheduler() {
    if (!this.isPlaying) return;
    // Lookahead: schedule all notes up to 0.40s in advance on the hardware audio clock
    while (this.nextNoteTime < this.ctx.currentTime + 0.40) {
      this.scheduleStep(this.step, this.nextNoteTime);
      this.nextNoteTime += 0.23; // ~130 BPM groove
      this.step = (this.step + 1) % 64; // Endless 64-step (4-bar) loop
    }
    this.timerId = setTimeout(() => this.scheduler(), 50);
  }

  scheduleStep(step, time) {
    // 4 Chords: Cmaj (0-15), Gmaj (16-31), Amin (32-47), Fmaj (48-63)
    const chordIdx = step >> 4;
    const chordBases = [261.63, 196.00, 220.00, 174.61]; // C4, G3, A3, F3
    const chordFrequencies = [
      [261.63, 329.63, 392.00, 523.25], // C Major
      [196.00, 246.94, 293.66, 392.00], // G Major
      [220.00, 261.63, 329.63, 440.00], // A Minor
      [174.61, 220.00, 261.63, 349.23]  // F Major
    ];

    // 1. Warm Soft Chord Pad on each bar (steps 0, 16, 32, 48)
    if (step % 16 === 0) {
      const chord = chordFrequencies[chordIdx];
      for (let i = 0; i < chord.length; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(chord[i], time);
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 3.4);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(time);
        osc.stop(time + 3.45);
      }
    }

    // 2. Punchy Bouncy Bass on every 4th step (steps 0, 4, 8, 12, etc.)
    if (step % 4 === 0) {
      const isRoot = step % 8 === 0;
      const rootFreq = chordBases[chordIdx] * 0.5;
      const bassFreq = isRoot ? rootFreq : rootFreq * 1.5;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(bassFreq, time);
      gain.gain.setValueAtTime(0.32, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.46);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.48);
    }

    // 3. Crisp Marimba / Kalimba Garden Melody Note (zero white noise / shaker hiss)
    const melodyPattern = [
      0, null, 4, 7,  null, 9, 7, 4,  2, null, 4, 0,  null, 2, 4, null,
      7, null, 9, 12, null, 9, 7, 4,  7, null, 4, 2,  null, 0, 2, null,
      4, null, 7, 9,  null, 12, 9, 7, 4, null, 2, 0,  null, 4, 2, null,
      0, 2, 4, 7,     9, 7, 4, 2,     0, null, 4, 7,  12, null, null, null
    ];
    const melDegree = melodyPattern[step];
    if (melDegree !== null) {
      const cMajorScale = [
        261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88,
        523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77,
        1046.50, 1174.66, 1318.51
      ];
      const freq = cMajorScale[melDegree % cMajorScale.length];

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, time);
      osc2.frequency.setValueAtTime(freq * 2, time);

      gain.gain.setValueAtTime(0.30, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.36);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 0.38);
      osc2.stop(time + 0.38);
    }
  }
}

class SoundFX {
  constructor() {
    this.enabled = true;
    this.musicEnabled = true;
    this.ctx = null;
    this.sfxGain = null;
    this.musicEngine = null;
    this.lastPlayed = {};
    this.buffers = {};
    this.buffersLoaded = false;
  }

  loadBuffers() {
    if (this.buffersLoaded || !this.ctx) return;
    this.buffersLoaded = true;
    for (const [key, cfg] of Object.entries(CC0_SFX_MANIFEST)) {
      fetch(cfg.url)
        .then(r => (r.ok ? r.arrayBuffer() : Promise.reject()))
        .then(arr => this.ctx.decodeAudioData(arr))
        .then(decoded => {
          this.buffers[key] = decoded;
        })
        .catch(() => {
          // Browsers without OGG Vorbis support (e.g., iOS Safari) automatically
          // use the loud, crisp dual-oscillator WebAudio synthesizer below
        });
    }
  }

  ensureAudio() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.sfxGain.connect(this.ctx.destination);
        this.musicEngine = new EndlessGardenMusic(this.ctx);
        this.loadBuffers();
        if (this.musicEnabled) {
          this.musicEngine.start();
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.musicEngine && this.musicEnabled && !this.musicEngine.isPlaying) {
      this.musicEngine.start();
    }
  }

  init() {
    this.ensureAudio();
  }

  heartbeat() {
    if (!this.musicEnabled) return;
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setBgmMode(mode) {}

  playMusic() {
    this.ensureAudio();
    if (this.musicEngine) {
      this.musicEngine.setMuted(!this.musicEnabled);
      if (this.musicEnabled && !this.musicEngine.isPlaying) {
        this.musicEngine.start();
      }
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    this.ensureAudio();
    if (this.musicEngine) {
      this.musicEngine.setMuted(!this.musicEnabled);
    }
    return this.musicEnabled;
  }

  play(type) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Slight throttle only for simultaneous identical shots (40ms) so every plant shot is heard clearly
    const minGap = type.startsWith('shoot') ? 0.042 : 0.025;
    if (this.lastPlayed[type] && now - this.lastPlayed[type] < minGap) return;
    this.lastPlayed[type] = now;

    // 1. Play decoded WebAudio sample buffer if available (routed through GainNode, zero DOM overhead)
    const cfg = CC0_SFX_MANIFEST[type];
    const buf = this.buffers[type];
    if (cfg && buf) {
      try {
        const src = this.ctx.createBufferSource();
        const smpGain = this.ctx.createGain();
        src.buffer = buf;
        src.playbackRate.setValueAtTime(cfg.rate * (0.96 + Math.random() * 0.08), now);
        smpGain.gain.setValueAtTime(cfg.vol, now);
        src.connect(smpGain);
        smpGain.connect(this.sfxGain);
        src.start(now);
      } catch (e) {}
    }

    // 2. Always play loud, crisp WebAudio synthesized layer so plant SFX cut cleanly through BGM on all devices
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    if (type === 'plant') {
      osc.type = 'triangle';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(310, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.13);
      osc2.frequency.setValueAtTime(465, now);
      osc2.frequency.exponentialRampToValueAtTime(1140, now + 0.13);
      gain.gain.setValueAtTime(0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.14);
      osc2.stop(now + 0.14);
    } else if (type === 'upgrade') {
      osc.type = 'triangle';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(440.0, now);
      osc.frequency.setValueAtTime(554.37, now + 0.065);
      osc.frequency.setValueAtTime(659.25, now + 0.13);
      osc.frequency.setValueAtTime(880.0, now + 0.195);
      osc2.frequency.setValueAtTime(880.0, now);
      osc2.frequency.setValueAtTime(1108.73, now + 0.065);
      osc2.frequency.setValueAtTime(1318.5, now + 0.13);
      osc2.frequency.setValueAtTime(1760.0, now + 0.195);
      gain.gain.setValueAtTime(0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.28);
      osc2.stop(now + 0.28);
    } else if (type === 'uproot') {
      osc.type = 'triangle';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(190, now + 0.14);
      osc2.frequency.setValueAtTime(780, now);
      osc2.frequency.exponentialRampToValueAtTime(285, now + 0.14);
      gain.gain.setValueAtTime(0.80, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.15);
      osc2.stop(now + 0.15);
    } else if (type === 'select') {
      osc.type = 'triangle';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(860, now + 0.055);
      osc2.frequency.setValueAtTime(1160, now);
      osc2.frequency.exponentialRampToValueAtTime(1720, now + 0.055);
      gain.gain.setValueAtTime(0.70, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.06);
      osc2.stop(now + 0.06);
    } else if (type === 'shoot' || type === 'shoot_0') {
      // Pea Sprout: crisp, punchy high-clarity cork-pop (zero air hiss!)
      osc.type = 'triangle';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(720, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.085);
      osc2.frequency.setValueAtTime(1080, now);
      osc2.frequency.exponentialRampToValueAtTime(390, now + 0.085);
      gain.gain.setValueAtTime(0.82, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.09);
      osc2.stop(now + 0.09);
    } else if (type === 'shoot_1') {
      // Frost Bell: bright sparkling crystal bell chime
      osc.type = 'triangle';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(980, now);
      osc.frequency.exponentialRampToValueAtTime(1480, now + 0.10);
      osc2.frequency.setValueAtTime(1960, now);
      osc2.frequency.exponentialRampToValueAtTime(2460, now + 0.10);
      gain.gain.setValueAtTime(0.76, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.11);
      osc2.stop(now + 0.11);
    } else if (type === 'shoot_2') {
      // Puff Shroom: bouncy resonant spore thump-pop (audible on small speakers, zero hiss)
      osc.type = 'triangle';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(155, now + 0.11);
      osc2.frequency.setValueAtTime(840, now);
      osc2.frequency.exponentialRampToValueAtTime(310, now + 0.11);
      gain.gain.setValueAtTime(0.88, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.12);
      osc2.stop(now + 0.12);
    } else if (type === 'shoot_3') {
      // Sun Flora: bright golden harmonic burst
      osc.type = 'triangle';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(960, now + 0.09);
      osc2.frequency.setValueAtTime(930, now);
      osc2.frequency.exponentialRampToValueAtTime(1440, now + 0.09);
      gain.gain.setValueAtTime(0.78, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.10);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.10);
      osc2.stop(now + 0.10);
    } else if (type === 'pop') {
      osc.type = 'triangle';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.085);
      osc2.frequency.setValueAtTime(680, now);
      osc2.frequency.exponentialRampToValueAtTime(1320, now + 0.085);
      gain.gain.setValueAtTime(0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.09);
      osc2.stop(now + 0.09);
    } else if (type === 'bite') {
      osc.type = 'sawtooth';
      osc2.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.linearRampToValueAtTime(95, now + 0.16);
      osc2.frequency.setValueAtTime(360, now);
      osc2.frequency.linearRampToValueAtTime(140, now + 0.16);
      gain.gain.setValueAtTime(0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.18);
      osc2.stop(now + 0.18);
    } else if (type === 'wave') {
      osc.type = 'triangle';
      osc2.type = 'sine';
      osc.frequency.setValueAtTime(329.63, now);
      osc.frequency.setValueAtTime(440.0, now + 0.08);
      osc.frequency.setValueAtTime(554.37, now + 0.16);
      osc2.frequency.setValueAtTime(659.25, now);
      osc2.frequency.setValueAtTime(880.0, now + 0.08);
      osc2.frequency.setValueAtTime(1108.73, now + 0.16);
      gain.gain.setValueAtTime(0.82, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.28);
      osc2.stop(now + 0.28);
    }
  }
}
const sfx = new SoundFX();
// Global gesture listener to start BGM & AudioContext immediately on first interaction
const triggerBgmUnlock = () => {
  sfx.init();
  sfx.playMusic();
};
['pointerdown', 'mousedown', 'keydown', 'touchstart', 'click'].forEach(evt => {
  window.addEventListener(evt, triggerBgmUnlock, { passive: true });
});
sfx.init();

// =========================================================================
// 2. MINIMAL 3D MATRIX & RAYCAST MATH UTILITIES
// =========================================================================
const Mat4 = {
  create() {
    return new Float32Array(16);
  },
  perspective(out, fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) / (near - far);
    out[11] = -1;
    out[14] = (2 * far * near) / (near - far);
    return out;
  },
  ortho(out, left, right, bottom, top, near, far) {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);
    out.fill(0);
    out[0] = -2 * lr;
    out[5] = -2 * bt;
    out[10] = 2 * nf;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
  },
  lookAt(out, eye, center, up) {
    let zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
    let len = Math.hypot(zx, zy, zz);
    zx /= len; zy /= len; zz /= len;
    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz);
    xx /= len; xy /= len; xz /= len;
    let yx = zy * xz - zz * xy;
    let yy = zz * xx - zx * xz;
    let yz = zx * xy - zy * xx;
    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
    out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    out[15] = 1;
    return out;
  },
  multiply(out, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    for (let i = 0; i < 4; i++) {
      const b0 = b[i * 4], b1 = b[i * 4 + 1], b2 = b[i * 4 + 2], b3 = b[i * 4 + 3];
      out[i * 4]     = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    }
    return out;
  },
  invert(out, m) {
    const inv = _mat4InvTmp;
    inv[0] = m[5]*m[10]*m[15] - m[5]*m[11]*m[14] - m[9]*m[6]*m[15] + m[9]*m[7]*m[14] + m[13]*m[6]*m[11] - m[13]*m[7]*m[10];
    inv[4] = -m[4]*m[10]*m[15] + m[4]*m[11]*m[14] + m[8]*m[6]*m[15] - m[8]*m[7]*m[14] - m[12]*m[6]*m[11] + m[12]*m[7]*m[10];
    inv[8] = m[4]*m[9]*m[15] - m[4]*m[11]*m[13] - m[8]*m[5]*m[15] + m[8]*m[7]*m[13] + m[12]*m[5]*m[11] - m[12]*m[7]*m[9];
    inv[12] = -m[4]*m[9]*m[14] + m[4]*m[10]*m[13] + m[8]*m[5]*m[14] - m[8]*m[6]*m[13] - m[12]*m[5]*m[10] + m[12]*m[6]*m[9];
    inv[1] = -m[1]*m[10]*m[15] + m[1]*m[11]*m[14] + m[9]*m[2]*m[15] - m[9]*m[3]*m[14] - m[13]*m[2]*m[11] + m[13]*m[3]*m[10];
    inv[5] = m[0]*m[10]*m[15] - m[0]*m[11]*m[14] - m[8]*m[2]*m[15] + m[8]*m[3]*m[14] + m[12]*m[2]*m[11] - m[12]*m[3]*m[10];
    inv[9] = -m[0]*m[9]*m[15] + m[0]*m[11]*m[13] + m[8]*m[1]*m[15] - m[8]*m[3]*m[13] - m[12]*m[1]*m[11] + m[12]*m[3]*m[9];
    inv[13] = m[0]*m[9]*m[14] - m[0]*m[10]*m[13] - m[8]*m[1]*m[14] + m[8]*m[2]*m[13] + m[12]*m[1]*m[10] - m[12]*m[2]*m[9];
    inv[2] = m[1]*m[6]*m[15] - m[1]*m[7]*m[14] - m[5]*m[2]*m[15] + m[5]*m[3]*m[14] + m[13]*m[2]*m[7] - m[13]*m[3]*m[6];
    inv[6] = -m[0]*m[6]*m[15] + m[0]*m[7]*m[14] + m[4]*m[2]*m[15] - m[4]*m[3]*m[14] - m[12]*m[2]*m[7] + m[12]*m[3]*m[6];
    inv[10] = m[0]*m[5]*m[15] - m[0]*m[7]*m[13] - m[4]*m[1]*m[15] + m[4]*m[3]*m[13] + m[12]*m[1]*m[7] - m[12]*m[3]*m[5];
    inv[14] = -m[0]*m[5]*m[14] + m[0]*m[6]*m[13] + m[4]*m[1]*m[14] - m[4]*m[2]*m[13] - m[12]*m[1]*m[6] + m[12]*m[2]*m[5];
    inv[3] = -m[1]*m[6]*m[11] + m[1]*m[7]*m[10] + m[5]*m[2]*m[11] - m[5]*m[3]*m[10] - m[9]*m[2]*m[7] + m[9]*m[3]*m[6];
    inv[7] = m[0]*m[6]*m[11] - m[0]*m[7]*m[10] - m[4]*m[2]*m[11] + m[4]*m[3]*m[10] + m[8]*m[2]*m[7] - m[8]*m[3]*m[6];
    inv[11] = -m[0]*m[5]*m[11] + m[0]*m[7]*m[9] + m[4]*m[1]*m[11] - m[4]*m[3]*m[9] - m[8]*m[1]*m[7] + m[8]*m[3]*m[5];
    inv[15] = m[0]*m[5]*m[10] - m[0]*m[6]*m[9] - m[4]*m[1]*m[10] + m[4]*m[2]*m[9] + m[8]*m[1]*m[6] - m[8]*m[2]*m[5];
    let det = m[0]*inv[0] + m[1]*inv[4] + m[2]*inv[8] + m[3]*inv[12];
    if (!det) return null;
    det = 1.0 / det;
    for (let i = 0; i < 16; i++) out[i] = inv[i] * det;
    return out;
  }
};
const _mat4InvTmp = new Float32Array(16);

// =========================================================================
// 3. CUSTOM WEBGL STYLIZED PBR + SHADOW-MAPPED VOXEL RENDERER
// =========================================================================
const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent || '') || (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
const canvas = document.getElementById('gameCanvas');
const gl = canvas.getContext('webgl', {
  antialias: !isMobileDevice,
  alpha: false,
  powerPreference: 'high-performance'
});

function compileShader(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

// --- PASS 1: 1024x1024 Directional Sun Shadow Map Shader (4x faster on mobile GPUs) ---
const SHADOW_RES = 1024;
const shadowVsSource = `
  attribute vec3 aPos;
  uniform mat4 uLightVP;
  void main() {
    gl_Position = uLightVP * vec4(aPos, 1.0);
  }
`;
const shadowFsSource = `
  precision mediump float;
  vec4 packDepth(float depth) {
    const vec4 bitShift = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);
    const vec4 bitMask  = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);
    vec4 res = fract(depth * bitShift);
    res -= res.xxyz * bitMask;
    return res;
  }
  void main() {
    gl_FragColor = packDepth(gl_FragCoord.z);
  }
`;

const shadowProg = gl.createProgram();
gl.attachShader(shadowProg, compileShader(gl.VERTEX_SHADER, shadowVsSource));
gl.attachShader(shadowProg, compileShader(gl.FRAGMENT_SHADER, shadowFsSource));
gl.linkProgram(shadowProg);
const shadowPosLoc = gl.getAttribLocation(shadowProg, 'aPos');
const shadowLightVPLoc = gl.getUniformLocation(shadowProg, 'uLightVP');

const shadowTex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, shadowTex);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SHADOW_RES, SHADOW_RES, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

const shadowDepthRB = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, shadowDepthRB);
gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SHADOW_RES, SHADOW_RES);

const shadowFbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, shadowTex, 0);
gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, shadowDepthRB);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);

// --- PASS 2: Stylized PBR + Fast 4-Tap PCF Soft Shadow + Dynamic Point-Light Shader ---
const MAX_POINT_LIGHTS = 12;
const vsSource = `
  attribute vec3 aPos;
  attribute vec3 aNormal;
  attribute vec3 aColor;
  attribute vec2 aUV;
  uniform mat4 uVP;
  uniform mat4 uLightVP;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec2 vUV;
  varying vec3 vWorldPos;
  varying vec4 vLightSpacePos;
  void main() {
    vColor = aColor;
    vNormal = aNormal;
    vUV = aUV;
    vWorldPos = aPos;
    vLightSpacePos = uLightVP * vec4(aPos, 1.0);
    gl_Position = uVP * vec4(aPos, 1.0);
  }
`;

const fsSource = `
  precision mediump float;
  varying vec3 vColor;
  varying vec3 vNormal;
  varying vec2 vUV;
  varying vec3 vWorldPos;
  varying vec4 vLightSpacePos;

  uniform vec3 uEyePos;
  uniform sampler2D uShadowMap;
  uniform vec4 uPointLightPos[${MAX_POINT_LIGHTS}];
  uniform vec3 uPointLightCol[${MAX_POINT_LIGHTS}];

  float unpackDepth(vec4 rgba) {
    const vec4 bitShift = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);
    return dot(rgba, bitShift);
  }

  float computeShadow(vec4 lightSpacePos, vec3 N, vec3 L) {
    vec3 proj = lightSpacePos.xyz / lightSpacePos.w;
    proj = proj * 0.5 + 0.5;
    if (proj.x < 0.01 || proj.x > 0.99 || proj.y < 0.01 || proj.y > 0.99 || proj.z > 0.995) {
      return 1.0;
    }
    float cosTheta = clamp(dot(N, L), 0.0, 1.0);
    float bias = max(0.0045 * (1.0 - cosTheta), 0.0018);
    float zTest = proj.z - bias;
    const float off = 0.75 / ${SHADOW_RES}.0;
    float s0 = (zTest > unpackDepth(texture2D(uShadowMap, proj.xy + vec2(-off, -off)))) ? 0.0 : 1.0;
    float s1 = (zTest > unpackDepth(texture2D(uShadowMap, proj.xy + vec2( off, -off)))) ? 0.0 : 1.0;
    float s2 = (zTest > unpackDepth(texture2D(uShadowMap, proj.xy + vec2(-off,  off)))) ? 0.0 : 1.0;
    float s3 = (zTest > unpackDepth(texture2D(uShadowMap, proj.xy + vec2( off,  off)))) ? 0.0 : 1.0;
    return (s0 + s1 + s2 + s3) * 0.25;
  }

  void main() {
    // 1. 3D Voxel Micro-Bevel Normal Perturbation & Cavity Shading
    vec3 N = normalize(vNormal);
    vec2 uvCentered = vUV - 0.5;
    vec2 edgeDist = min(vUV, 1.0 - vUV);
    float minEdge = min(edgeDist.x, edgeDist.y);
    float bevelMask = 1.0 - smoothstep(0.0, 0.085, minEdge);

    vec3 upAxis = abs(N.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 T = normalize(cross(upAxis, N));
    vec3 B = cross(N, T);
    vec3 bevelN = normalize(N + (T * uvCentered.x + B * uvCentered.y) * bevelMask * 0.42);

    // 2. Key Sun Light & Soft PCF Shadow
    const vec3 sunDir = vec3(0.4776, 0.7899, 0.3858);
    const vec3 sunColor = vec3(1.04, 0.98, 0.88);
    float NdotL = max(dot(bevelN, sunDir), 0.0);
    float shadow = computeShadow(vLightSpacePos, N, sunDir);

    // 3. View Vector, Blinn-Phong Specular & Grazing Fresnel Rim
    vec3 toEye = uEyePos - vWorldPos;
    float camDist = length(toEye);
    vec3 V = toEye / max(camDist, 0.001);
    vec3 H = normalize(sunDir + V);
    float spec = pow(max(dot(bevelN, H), 0.0), 32.0) * (0.18 + bevelMask * 0.24) * shadow;
    float oneMinusNV = 1.0 - max(dot(bevelN, V), 0.0);
    float fresnel = oneMinusNV * oneMinusNV * oneMinusNV;
    vec3 rimLight = vec3(0.55, 0.82, 0.68) * fresnel * (0.22 + 0.25 * max(N.y, 0.0));

    // 4. Foliage Subsurface Scattering / Backlight Warmth
    float backDot = clamp(dot(V, -sunDir), 0.0, 1.0);
    float backLight = (backDot * backDot) * max(0.0, vWorldPos.y + 0.05);
    vec3 sss = vColor * vec3(1.0, 0.92, 0.45) * backLight * 0.26;

    // 5. Sky Hemisphere + Warm Turf Ground Bounce + Vertical Contact AO
    float skyFactor = 0.5 + 0.5 * bevelN.y;
    const vec3 skyCol = vec3(0.68, 0.84, 0.96);
    const vec3 groundBounce = vec3(0.32, 0.44, 0.28);
    vec3 hemiAmbient = mix(groundBounce, skyCol, skyFactor);

    const vec3 fillDir = vec3(-0.6999, 0.4083, -0.5832);
    float fillDiff = max(dot(bevelN, fillDir), 0.0) * 0.16;

    float rootAO = mix(0.76, 1.0, smoothstep(-0.08, 0.38, vWorldPos.y));
    float edgeCavity = mix(0.86, 1.0, smoothstep(0.0, 0.065, minEdge));
    float ao = rootAO * edgeCavity;

    // 6. Dynamic Colored Point Lights (Early-out break + squared distance rejection)
    vec3 pointDiffuse = vec3(0.0);
    for (int i = 0; i < ${MAX_POINT_LIGHTS}; i++) {
      vec4 lp = uPointLightPos[i];
      if (lp.w <= 0.01) break;
      vec3 toLight = lp.xyz - vWorldPos;
      float distSq = dot(toLight, toLight);
      float radSq = lp.w * lp.w;
      if (distSq < radSq) {
        float dist = sqrt(distSq);
        vec3 Lpt = toLight / max(dist, 0.001);
        float t = 1.0 - dist / lp.w;
        float atten = t * t;
        float pDiff = max(dot(bevelN, Lpt), 0.0) * 0.7 + 0.3;
        pointDiffuse += uPointLightCol[i] * (pDiff * atten);
      }
    }

    // 7. Combine Direct Sun + Soft Shadow + Ambient + Point Lights + Specular + Rim
    vec3 directSun = sunColor * NdotL * (0.32 + 0.68 * shadow);
    vec3 indirect = (hemiAmbient * 0.50 + vec3(0.75, 0.85, 0.95) * fillDiff) * ao;
    vec3 litColor = vColor * (indirect + directSun * 0.78 + pointDiffuse * 0.85)
                  + sunColor * spec
                  + rimLight * ao
                  + sss;

    // 8. Subtle Atmospheric Garden Horizon Blend & Filmic Tone Polish
    float fogFactor = smoothstep(18.0, 34.0, camDist) * 0.35;
    const vec3 fogColor = vec3(0.11, 0.16, 0.14);
    litColor = mix(litColor, fogColor, fogFactor);

    litColor = clamp(litColor, 0.0, 1.5);
    litColor = litColor / (1.0 + litColor * 0.18) * 1.14;

    gl_FragColor = vec4(litColor, 1.0);
  }
`;

const prog = gl.createProgram();
gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vsSource));
gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fsSource));
gl.linkProgram(prog);
gl.useProgram(prog);

// Enable hardware backface culling (all models have strict CCW winding)
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);

const aPosLoc = gl.getAttribLocation(prog, 'aPos');
const aNormalLoc = gl.getAttribLocation(prog, 'aNormal');
const aColorLoc = gl.getAttribLocation(prog, 'aColor');
const aUVLoc = gl.getAttribLocation(prog, 'aUV');
const uVPLoc = gl.getUniformLocation(prog, 'uVP');
const uLightVPLoc = gl.getUniformLocation(prog, 'uLightVP');
const uEyePosLoc = gl.getUniformLocation(prog, 'uEyePos');
const uShadowMapLoc = gl.getUniformLocation(prog, 'uShadowMap');
const uPointLightPosLoc = gl.getUniformLocation(prog, 'uPointLightPos[0]');
const uPointLightColLoc = gl.getUniformLocation(prog, 'uPointLightCol[0]');

const pointLightPosData = new Float32Array(MAX_POINT_LIGHTS * 4);
const pointLightColData = new Float32Array(MAX_POINT_LIGHTS * 3);

const MAX_VERTS = 260000;
const vertData = new Float32Array(MAX_VERTS * 11);
let vertCount = 0;
const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, 90000 * 11 * 4, gl.DYNAMIC_DRAW);

const staticVbo = gl.createBuffer();
let staticVertCount = 0;

const STRIDE = 11 * 4;
function bindAttribs() {
  gl.enableVertexAttribArray(aPosLoc);
  gl.vertexAttribPointer(aPosLoc, 3, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(aNormalLoc);
  gl.vertexAttribPointer(aNormalLoc, 3, gl.FLOAT, false, STRIDE, 3 * 4);
  gl.enableVertexAttribArray(aColorLoc);
  gl.vertexAttribPointer(aColorLoc, 3, gl.FLOAT, false, STRIDE, 6 * 4);
  gl.enableVertexAttribArray(aUVLoc);
  gl.vertexAttribPointer(aUVLoc, 2, gl.FLOAT, false, STRIDE, 9 * 4);
}
function bindShadowAttribs() {
  gl.disableVertexAttribArray(aNormalLoc);
  gl.disableVertexAttribArray(aColorLoc);
  gl.disableVertexAttribArray(aUVLoc);
  gl.enableVertexAttribArray(shadowPosLoc);
  gl.vertexAttribPointer(shadowPosLoc, 3, gl.FLOAT, false, STRIDE, 0);
}
bindAttribs();

const CUBE_FACES = [
  { n: [0, 1, 0], v: [[-0.5,1,-0.5], [-0.5,1,0.5], [0.5,1,0.5], [0.5,1,-0.5]] },
  { n: [0, -1, 0], v: [[-0.5,0,0.5], [-0.5,0,-0.5], [0.5,0,-0.5], [0.5,0,0.5]] },
  { n: [0, 0, 1], v: [[-0.5,0,0.5], [0.5,0,0.5], [0.5,1,0.5], [-0.5,1,0.5]] },
  { n: [0, 0, -1], v: [[0.5,0,-0.5], [-0.5,0,-0.5], [-0.5,1,-0.5], [0.5,1,-0.5]] },
  { n: [1, 0, 0], v: [[0.5,0,0.5], [0.5,0,-0.5], [0.5,1,-0.5], [0.5,1,0.5]] },
  { n: [-1, 0, 0], v: [[-0.5,0,-0.5], [-0.5,0,0.5], [-0.5,1,0.5], [-0.5,1,-0.5]] }
];
const FACE_UVS = [[0,0], [1,0], [1,1], [0,1]];
const FACE_INDICES = [0, 1, 2, 0, 2, 3];

// Helper to emit a quad (2 triangles = 6 vertices = 66 floats) with zero inner-loop overhead
function emitQuad(
  x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3,
  nx, ny, nz, r, g, b
) {
  let o = vertCount * 11;
  // Tri 1: 0, 1, 2
  vertData[o]    = x0; vertData[o+1]  = y0; vertData[o+2]  = z0;
  vertData[o+3]  = nx; vertData[o+4]  = ny; vertData[o+5]  = nz;
  vertData[o+6]  = r;  vertData[o+7]  = g;  vertData[o+8]  = b;
  vertData[o+9]  = 0;  vertData[o+10] = 0;

  vertData[o+11] = x1; vertData[o+12] = y1; vertData[o+13] = z1;
  vertData[o+14] = nx; vertData[o+15] = ny; vertData[o+16] = nz;
  vertData[o+17] = r;  vertData[o+18] = g;  vertData[o+19] = b;
  vertData[o+20] = 1;  vertData[o+21] = 0;

  vertData[o+22] = x2; vertData[o+23] = y2; vertData[o+24] = z2;
  vertData[o+25] = nx; vertData[o+26] = ny; vertData[o+27] = nz;
  vertData[o+28] = r;  vertData[o+29] = g;  vertData[o+30] = b;
  vertData[o+31] = 1;  vertData[o+32] = 1;

  // Tri 2: 0, 2, 3
  vertData[o+33] = x0; vertData[o+34] = y0; vertData[o+35] = z0;
  vertData[o+36] = nx; vertData[o+37] = ny; vertData[o+38] = nz;
  vertData[o+39] = r;  vertData[o+40] = g;  vertData[o+41] = b;
  vertData[o+42] = 0;  vertData[o+43] = 0;

  vertData[o+44] = x2; vertData[o+45] = y2; vertData[o+46] = z2;
  vertData[o+47] = nx; vertData[o+48] = ny; vertData[o+49] = nz;
  vertData[o+50] = r;  vertData[o+51] = g;  vertData[o+52] = b;
  vertData[o+53] = 1;  vertData[o+54] = 1;

  vertData[o+55] = x3; vertData[o+56] = y3; vertData[o+57] = z3;
  vertData[o+58] = nx; vertData[o+59] = ny; vertData[o+60] = nz;
  vertData[o+61] = r;  vertData[o+62] = g;  vertData[o+63] = b;
  vertData[o+64] = 0;  vertData[o+65] = 1;

  vertCount += 6;
}

function pushBox(x, y, z, sx, sy, sz, rgb, rotY = 0) {
  if (vertCount + 30 >= MAX_VERTS) return;
  const cosR = rotY === 0 ? 1 : Math.cos(rotY);
  const sinR = rotY === 0 ? 0 : Math.sin(rotY);
  const r = rgb[0], g = rgb[1], b = rgb[2];

  // Skip f === 1 (bottom face [0,-1,0]) since camera is always above the garden
  for (let f = 0; f < 6; f++) {
    if (f === 1) continue;
    const face = CUBE_FACES[f];
    const nx = face.n[0] * cosR + face.n[2] * sinR;
    const ny = face.n[1];
    const nz = -face.n[0] * sinR + face.n[2] * cosR;
    const v = face.v;

    const lx0 = v[0][0] * sx, ly0 = v[0][1] * sy, lz0 = v[0][2] * sz;
    const lx1 = v[1][0] * sx, ly1 = v[1][1] * sy, lz1 = v[1][2] * sz;
    const lx2 = v[2][0] * sx, ly2 = v[2][1] * sy, lz2 = v[2][2] * sz;
    const lx3 = v[3][0] * sx, ly3 = v[3][1] * sy, lz3 = v[3][2] * sz;

    emitQuad(
      x + lx0 * cosR + lz0 * sinR, y + ly0, z - lx0 * sinR + lz0 * cosR,
      x + lx1 * cosR + lz1 * sinR, y + ly1, z - lx1 * sinR + lz1 * cosR,
      x + lx2 * cosR + lz2 * sinR, y + ly2, z - lx2 * sinR + lz2 * cosR,
      x + lx3 * cosR + lz3 * sinR, y + ly3, z - lx3 * sinR + lz3 * cosR,
      nx, ny, nz, r, g, b
    );
  }
}

function pushBillboardQuad(cx, cy, cz, w, h, rgb) {
  if (vertCount + 6 >= MAX_VERTS) return;
  const cosY = Math.cos(camYaw);
  const sinY = Math.sin(camYaw);
  const rx = cosY * (w * 0.5);
  const rz = -sinY * (w * 0.5);
  const uy = h * 0.5;

  const nx = sinY * 0.6;
  const ny = 0.8;
  const nz = cosY * 0.6;
  const nLen = Math.hypot(nx, ny, nz) || 1.0;
  const nnx = nx / nLen, nny = ny / nLen, nnz = nz / nLen;

  emitQuad(
    cx - rx, cy - uy, cz - rz,
    cx + rx, cy - uy, cz + rz,
    cx + rx, cy + uy, cz + rz,
    cx - rx, cy + uy, cz - rz,
    nnx, nny, nnz, rgb[0], rgb[1], rgb[2]
  );
}

function hex(h) {
  return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
}

// Initialize Blender 3D Voxel Models, pre-cull hidden underground/bottom quads & prepare Shape Key Buffers
if (typeof VOXEL_MODELS !== 'undefined') {
  for (const name of Object.keys(VOXEL_MODELS)) {
    const mdl = VOXEL_MODELS[name];
    mdl.baseV = new Float32Array(mdl.v);
    mdl.workV = new Float32Array(mdl.v.length);
    mdl.skData = {};
    if (mdl.sk) {
      for (const k of Object.keys(mdl.sk)) {
        mdl.skData[k] = new Float32Array(mdl.sk[k]);
      }
    }
    // Pre-filter invisible downward-facing & buried underground quads once at startup
    const rawQ = mdl.q;
    const filteredQ = [];
    const isGrass = name === 'Grass_Block';
    for (let qi = 0; qi < rawQ.length; qi += 8) {
      const qny = rawQ[qi + 5];
      const y0 = mdl.baseV[rawQ[qi] * 3 + 1];
      const y1 = mdl.baseV[rawQ[qi + 1] * 3 + 1];
      const y2 = mdl.baseV[rawQ[qi + 2] * 3 + 1];
      const y3 = mdl.baseV[rawQ[qi + 3] * 3 + 1];
      const maxY = Math.max(y0, y1, y2, y3);
      // Grass_Block quads with maxY <= 0.55 are buried inside the solid soil foundation slab;
      // Downward-facing quads (qny < -0.95) at ground base (maxY <= 0.02) are never visible from above.
      if (isGrass && (maxY <= 0.55 || qny < -0.95)) continue;
      if (!isGrass && qny < -0.95 && maxY <= 0.02) continue;
      filteredQ.push(
        rawQ[qi], rawQ[qi + 1], rawQ[qi + 2], rawQ[qi + 3],
        rawQ[qi + 4], rawQ[qi + 5], rawQ[qi + 6], rawQ[qi + 7]
      );
    }
    mdl.q = new Float32Array(filteredQ);
  }
}

function deformModelVertices(mdl, weights) {
  const workV = mdl.workV;
  workV.set(mdl.baseV);
  if (weights && mdl.skData) {
    for (const k in weights) {
      const w = weights[k];
      if (!w || Math.abs(w) < 0.001) continue;
      const sk = mdl.skData[k];
      if (!sk) continue;
      for (let i = 0, len = sk.length; i < len; i += 4) {
        const vi = sk[i] * 3;
        workV[vi]     += sk[i + 1] * w;
        workV[vi + 1] += sk[i + 2] * w;
        workV[vi + 2] += sk[i + 3] * w;
      }
    }
  }
  return workV;
}

function pushBlenderModel(name, wx, wy, wz, sx, sy, sz, rotY = 0, weights = null, colorMult = 1.0, tintRgb = null, tintMix = 0.0) {
  if (typeof VOXEL_MODELS === 'undefined' || !VOXEL_MODELS[name]) return;
  const mdl = VOXEL_MODELS[name];
  const quads = mdl.q;
  const numQuads = quads.length >> 3;
  if (vertCount + numQuads * 6 >= MAX_VERTS) return;

  const workV = weights ? deformModelVertices(mdl, weights) : mdl.baseV;
  const mats = mdl.m;
  const cosR = rotY === 0 ? 1 : Math.cos(rotY);
  const sinR = rotY === 0 ? 0 : Math.sin(rotY);

  for (let qi = 0, qlen = quads.length; qi < qlen; qi += 8) {
    const qnx = quads[qi + 4];
    const qny = quads[qi + 5];
    const qnz = quads[qi + 6];
    const matIdx = quads[qi + 7];

    const nx = qnx * cosR + qnz * sinR;
    const ny = qny;
    const nz = -qnx * sinR + qnz * cosR;

    const baseCol = mats[matIdx] || [0.8, 0.8, 0.8];
    let r = baseCol[0] * colorMult;
    let g = baseCol[1] * colorMult;
    let b = baseCol[2] * colorMult;
    if (tintRgb && tintMix > 0) {
      r = r * (1 - tintMix) + tintRgb[0] * tintMix;
      g = g * (1 - tintMix) + tintRgb[1] * tintMix;
      b = b * (1 - tintMix) + tintRgb[2] * tintMix;
    }

    const i0 = quads[qi] * 3;
    const i1 = quads[qi + 1] * 3;
    const i2 = quads[qi + 2] * 3;
    const i3 = quads[qi + 3] * 3;

    const lx0 = workV[i0] * sx, ly0 = workV[i0 + 1] * sy, lz0 = workV[i0 + 2] * sz;
    const lx1 = workV[i1] * sx, ly1 = workV[i1 + 1] * sy, lz1 = workV[i1 + 2] * sz;
    const lx2 = workV[i2] * sx, ly2 = workV[i2 + 1] * sy, lz2 = workV[i2 + 2] * sz;
    const lx3 = workV[i3] * sx, ly3 = workV[i3 + 1] * sy, lz3 = workV[i3 + 2] * sz;

    emitQuad(
      wx + lx0 * cosR + lz0 * sinR, wy + ly0, wz - lx0 * sinR + lz0 * cosR,
      wx + lx1 * cosR + lz1 * sinR, wy + ly1, wz - lx1 * sinR + lz1 * cosR,
      wx + lx2 * cosR + lz2 * sinR, wy + ly2, wz - lx2 * sinR + lz2 * cosR,
      wx + lx3 * cosR + lz3 * sinR, wy + ly3, wz - lx3 * sinR + lz3 * cosR,
      nx, ny, nz, r, g, b
    );
  }
}

// =========================================================================
// 4. GARDEN MAP & O(1) PRECOMPUTED PATH LOOKUP TABLE
// =========================================================================
const GRID_W = 12;
const GRID_H = 8;

const PATH_WAYPOINTS = [
  [0, 2], [1, 2], [2, 2],
  [2, 3], [2, 4], [2, 5],
  [3, 5], [4, 5], [5, 5],
  [5, 4], [5, 3], [5, 2], [5, 1],
  [6, 1], [7, 1], [8, 1],
  [8, 2], [8, 3], [8, 4], [8, 5], [8, 6],
  [9, 6], [10, 6], [10, 4], [11, 4]
];

const grid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(0));
for (let i = 0; i < PATH_WAYPOINTS.length; i++) {
  const [c, r] = PATH_WAYPOINTS[i];
  grid[r][c] = 1;
  if (i < PATH_WAYPOINTS.length - 1) {
    const [nc, nr] = PATH_WAYPOINTS[i + 1];
    let cc = c, cr = r;
    while (cc !== nc || cr !== nr) {
      cc += Math.sign(nc - cc);
      cr += Math.sign(nr - cr);
      grid[cr][cc] = 1;
    }
  }
}

function gridToWorld(col, row) {
  return [col - (GRID_W - 1) / 2, row - (GRID_H - 1) / 2];
}
function worldToGrid(wx, wz) {
  const col = Math.round(wx + (GRID_W - 1) / 2);
  const row = Math.round(wz + (GRID_H - 1) / 2);
  return [col, row];
}

const worldWaypoints = PATH_WAYPOINTS.map(([c, r]) => {
  const [wx, wz] = gridToWorld(c, r);
  return { x: wx, z: wz };
});
let totalPathLength = 0;
const pathSegments = [];
for (let i = 0; i < worldWaypoints.length - 1; i++) {
  const a = worldWaypoints[i];
  const b = worldWaypoints[i + 1];
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  pathSegments.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, len, startDist: totalPathLength });
  totalPathLength += len;
}

function _rawSamplePath(dist) {
  const d = Math.max(0, Math.min(totalPathLength, dist));
  for (let i = 0; i < pathSegments.length; i++) {
    const seg = pathSegments[i];
    if (d <= seg.startDist + seg.len || i === pathSegments.length - 1) {
      const t = seg.len > 0 ? (d - seg.startDist) / seg.len : 0;
      const x = seg.ax + (seg.bx - seg.ax) * t;
      const z = seg.az + (seg.bz - seg.az) * t;
      const angle = Math.atan2(seg.bx - seg.ax, seg.bz - seg.az);
      return { x, z, angle };
    }
  }
  return { x: worldWaypoints[0].x, z: worldWaypoints[0].z, angle: 0 };
}

function _rawSamplePathSmooth(dist) {
  const delta = 0.22;
  const pA = _rawSamplePath(dist - delta);
  const pB = _rawSamplePath(dist + delta);
  const pM = _rawSamplePath(dist);
  const dx = pB.x - pA.x;
  const dz = pB.z - pA.z;
  const angle = (Math.abs(dx) > 1e-4 || Math.abs(dz) > 1e-4)
    ? Math.atan2(dx, dz)
    : pM.angle;
  return {
    x: pM.x * 0.65 + (pA.x + pB.x) * 0.175,
    z: pM.z * 0.65 + (pA.z + pB.z) * 0.175,
    angle
  };
}

// Pre-bake 4096-entry 1D Lookup Table covering [-1.0, totalPathLength + 1.0]
// Eliminates ~50,000 trig calls and ~40,000 object allocations per frame!
const PATH_LUT_SIZE = 4096;
const PATH_LUT_MIN = -1.0;
const PATH_LUT_MAX = totalPathLength + 1.0;
const PATH_LUT_SCALE = (PATH_LUT_SIZE - 1) / (PATH_LUT_MAX - PATH_LUT_MIN);
const pathLutX = new Float32Array(PATH_LUT_SIZE);
const pathLutZ = new Float32Array(PATH_LUT_SIZE);
const pathLutAngle = new Float32Array(PATH_LUT_SIZE);
const pathLutCos = new Float32Array(PATH_LUT_SIZE);
const pathLutSin = new Float32Array(PATH_LUT_SIZE);

for (let i = 0; i < PATH_LUT_SIZE; i++) {
  const d = PATH_LUT_MIN + (i / (PATH_LUT_SIZE - 1)) * (PATH_LUT_MAX - PATH_LUT_MIN);
  const sm = _rawSamplePathSmooth(d);
  pathLutX[i] = sm.x;
  pathLutZ[i] = sm.z;
  pathLutAngle[i] = sm.angle;
  pathLutCos[i] = Math.cos(sm.angle);
  pathLutSin[i] = Math.sin(sm.angle);
}

const _sharedPathResult = { x: 0, z: 0, angle: 0 };
function samplePath(dist) {
  let idx = ((dist - PATH_LUT_MIN) * PATH_LUT_SCALE) | 0;
  if (idx < 0) idx = 0;
  else if (idx >= PATH_LUT_SIZE) idx = PATH_LUT_SIZE - 1;
  _sharedPathResult.x = pathLutX[idx];
  _sharedPathResult.z = pathLutZ[idx];
  _sharedPathResult.angle = pathLutAngle[idx];
  return _sharedPathResult;
}

function samplePathSmooth(dist) {
  return samplePath(dist);
}

const grassDecor = [];
for (let r = 0; r < GRID_H; r++) {
  for (let c = 0; c < GRID_W; c++) {
    if (grid[r][c] === 0 && Math.random() < 0.45) {
      grassDecor.push({
        c, r,
        ox: (Math.random() - 0.5) * 0.45,
        oz: (Math.random() - 0.5) * 0.45,
        flower: Math.random() < 0.25 ? hex(0xfef08a) : null
      });
    }
  }
}

const PLANT_TYPES = [
  {
    name: 'Pea Sprout',
    cost: 50,
    range: 2.85,
    fireRate: 0.58,
    damage: 20,
    projSpeed: 9.5,
    color: hex(0x4ade80),
    headColor: hex(0x22c55e),
    projColor: hex(0x86efac),
    splash: 0,
    slow: 0
  },
  {
    name: 'Frost Bell',
    cost: 75,
    range: 2.65,
    fireRate: 0.85,
    damage: 14,
    projSpeed: 8.5,
    color: hex(0x38bdf8),
    headColor: hex(0x7dd3fc),
    projColor: hex(0xbae6fd),
    splash: 0,
    slow: 0.48
  },
  {
    name: 'Puff Shroom',
    cost: 100,
    range: 2.55,
    fireRate: 1.35,
    damage: 34,
    projSpeed: 6.2,
    color: hex(0xc084fc),
    headColor: hex(0xa855f7),
    projColor: hex(0xe879f9),
    splash: 1.25,
    slow: 0
  },
  {
    name: 'Sun Flora',
    cost: 125,
    range: 4.35,
    fireRate: 1.45,
    damage: 68,
    projSpeed: 15.0,
    color: hex(0xfacc15),
    headColor: hex(0xf59e0b),
    projColor: hex(0xfef08a),
    splash: 0,
    slow: 0
  }
];

// =========================================================================
// 5. GAME STATE & DIFFICULTY CONFIGURATIONS
// =========================================================================
const DIFFICULTY_CONFIGS = {
  easy: {
    id: 'easy',
    name: 'Easy',
    badge: 'Easy',
    startDew: 200,
    startLives: 15,
    enemyCountMult: 0.75, // Fewer caterpillars
    hpMult: 0.80,         // Weaker caterpillars
    speedMult: 0.92,
    delayMult: 1.15,
    rewardMult: 1.15,
    dewPerWave: 35
  },
  medium: {
    id: 'medium',
    name: 'Medium',
    badge: 'Medium',
    startDew: 150,
    startLives: 10,
    enemyCountMult: 1.00, // Balanced standard
    hpMult: 1.00,
    speedMult: 1.00,
    delayMult: 1.00,
    rewardMult: 1.00,
    dewPerWave: 25
  },
  hard: {
    id: 'hard',
    name: 'Hard',
    badge: 'Hard',
    startDew: 120,
    startLives: 6,
    enemyCountMult: 1.50, // Highest amount of enemies (packed swarms!)
    hpMult: 1.45,         // Significantly stronger caterpillars!
    speedMult: 1.12,      // Faster movement
    delayMult: 0.78,      // Tight, rapid swarms
    rewardMult: 0.90,
    dewPerWave: 20
  }
};

let currentDifficulty = 'medium';
let selectedDifficulty = 'medium';

let dew = 150;
let wave = 1;
const maxWaves = 10;
let lives = 10;
let gameSpeed = 1;
let isPaused = false;
let waveActive = false;
let autoWave = false;
let autoWaveTimer = 0;
let selectedPlantIdx = 0;
let inspectedTower = null;
let gameOverState = null;

const towers = [];
const caterpillars = [];
const projectiles = [];
const particles = [];
let spawnQueue = [];
let spawnTimer = 0;
let logRumble = 0;
let toastTimeout = null;

function showToast(msg, duration = 2600) {
  const el = document.getElementById('toastBanner');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('toast-hidden');
  if (toastTimeout) clearTimeout(toastTimeout);
  if (duration > 0) {
    toastTimeout = setTimeout(() => {
      el.classList.add('toast-hidden');
    }, duration);
  }
}

function pulseDewWarning() {
  const pill = document.getElementById('dewPill');
  if (!pill) return;
  pill.classList.add('pulse-warn');
  setTimeout(() => pill.classList.remove('pulse-warn'), 420);
}

const MAX_PARTICLES = 110;
function spawnParticles(x, y, z, color, count = 8, speed = 2.4) {
  const n = isMobileDevice ? Math.ceil(count * 0.65) : count;
  for (let i = 0; i < n; i++) {
    if (particles.length >= MAX_PARTICLES) break;
    const a = Math.random() * Math.PI * 2;
    const v = (0.4 + Math.random() * 0.8) * speed;
    particles.push({
      x, y, z,
      vx: Math.cos(a) * v,
      vy: 1.5 + Math.random() * 2.6,
      vz: Math.sin(a) * v,
      size: 0.09 + Math.random() * 0.08,
      color,
      life: 0,
      maxLife: 0.35 + Math.random() * 0.25
    });
  }
}

function startNextWave() {
  if (waveActive || gameOverState) return;
  if (isPaused) togglePause();
  waveActive = true;
  sfx.setBgmMode('battle');
  sfx.play('wave');
  spawnQueue = [];

  const diff = DIFFICULTY_CONFIGS[currentDifficulty] || DIFFICULTY_CONFIGS.medium;
  const baseCount = 6 + wave * 2;
  const count = Math.max(4, Math.round(baseCount * diff.enemyCountMult));
  const hasBoss = (wave === 5 || wave === 10);
  const diffLabel = currentDifficulty === 'hard' ? ' [HARD SWARM]' : '';
  showToast(hasBoss ? `⚠️ Wave ${wave} — Monarch Boss Incoming!${diffLabel}` : `🌊 Wave ${wave} Incoming! (${count} caterpillars)${diffLabel}`, 2800);

  for (let i = 0; i < count; i++) {
    const isSprinter = wave >= 2 && (i % (currentDifficulty === 'hard' ? 3 : 4) === 2);
    const isBeetle = wave >= 4 && (i % (currentDifficulty === 'hard' ? 4 : 5) === (currentDifficulty === 'hard' ? 3 : 4));
    const isBoss = hasBoss && i === count - 1;

    const hpScale = (1 + (wave - 1) * 0.36) * diff.hpMult;
    const speedScale = diff.speedMult;
    const delayScale = diff.delayMult;

    if (isBoss) {
      spawnQueue.push({
        modelName: 'Monarch_Boss',
        scale: 0.66,
        delay: 1.3 * delayScale,
        hp: Math.round(420 * hpScale),
        speed: 0.92 * speedScale,
        segments: 8,
        segRadius: 0.33,
        color: hex(0xf97316),
        stripeColor: hex(0x1e293b),
        reward: Math.round(45 * diff.rewardMult)
      });
    } else if (isBeetle) {
      spawnQueue.push({
        modelName: 'Armored_Beetle',
        scale: 0.58,
        delay: 1.0 * delayScale,
        hp: Math.round(165 * hpScale),
        speed: 1.05 * speedScale,
        segments: 6,
        segRadius: 0.27,
        color: hex(0xef4444),
        stripeColor: hex(0x7f1d1d),
        reward: Math.round(22 * diff.rewardMult)
      });
    } else if (isSprinter) {
      spawnQueue.push({
        modelName: 'Yellow_Sprinter',
        scale: 0.54,
        delay: 0.65 * delayScale,
        hp: Math.round(55 * hpScale),
        speed: 2.15 * speedScale,
        segments: 4,
        segRadius: 0.20,
        color: hex(0xfacc15),
        stripeColor: hex(0xca8a04),
        reward: Math.round(14 * diff.rewardMult)
      });
    } else {
      spawnQueue.push({
        modelName: 'Green_Inchworm',
        scale: 0.56,
        delay: 0.88 * delayScale,
        hp: Math.round(80 * hpScale),
        speed: 1.42 * speedScale,
        segments: 5,
        segRadius: 0.23,
        color: hex(0x84cc16),
        stripeColor: hex(0x3f6212),
        reward: Math.round(12 * diff.rewardMult)
      });
    }
  }
  spawnTimer = 0.2;
  updateUI();
}

// =========================================================================
// 6. CAMERA, MOUSE & MOBILE MULTI-TOUCH RAYCASTING ONTO THE 3D GARDEN GRID
// =========================================================================
let camYaw = 0.0;
let camPitch = 0.78;
let camDist = 13.2;
let camTargetX = 0.0;
let camTargetY = 0.0;
let camTargetZ = 0.35;

const vpMatrix = Mat4.create();
const invVPMatrix = Mat4.create();
const projMatrix = Mat4.create();
const viewMatrix = Mat4.create();
const lightProjMatrix = Mat4.create();
const lightViewMatrix = Mat4.create();
const lightVPMatrix = Mat4.create();
const camEye = new Float32Array([0, 10, 10]);

// Precompute Orthographic Directional Sun Shadow Matrix covering the entire 12x8 garden
Mat4.ortho(lightProjMatrix, -7.8, 7.8, -6.2, 6.2, 1.0, 32.0);
Mat4.lookAt(lightViewMatrix, [0.52 * 16.0, 0.86 * 16.0, 0.2 + 0.42 * 16.0], [0.0, 0.0, 0.2], [0, 1, 0]);
Mat4.multiply(lightVPMatrix, lightProjMatrix, lightViewMatrix);

let hoverTile = null;
let isDragging = false;
let isRightDragging = false;
let isMiddleDragging = false;
let dragMoved = false;
let lastMouseX = 0, lastMouseY = 0;

function updateCameraMatrices() {
  const w = Math.max(1, canvas.width);
  const h = Math.max(1, canvas.height);
  const aspect = w / h;
  // Automatically pull camera back on portrait phones/tablets so the entire 12x8 garden fits on screen
  const portraitCompensation = aspect < 1.18 ? Math.min(1.85, 1.18 / Math.max(0.45, aspect)) : 1.0;
  const effDist = camDist * portraitCompensation;

  Mat4.perspective(projMatrix, 42 * Math.PI / 180, aspect, 0.5, 75.0);
  const ex = camTargetX + Math.sin(camYaw) * Math.cos(camPitch) * effDist;
  const ey = camTargetY + Math.sin(camPitch) * effDist;
  const ez = camTargetZ + Math.cos(camYaw) * Math.cos(camPitch) * effDist;
  camEye[0] = ex;
  camEye[1] = ey;
  camEye[2] = ez;
  Mat4.lookAt(viewMatrix, camEye, [camTargetX, camTargetY, camTargetZ], [0, 1, 0]);
  Mat4.multiply(vpMatrix, projMatrix, viewMatrix);
  Mat4.invert(invVPMatrix, vpMatrix);
}

function screenToGroundPlane(clientX, clientY, planeY = 0.0) {
  const rect = canvas.getBoundingClientRect();
  const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ny = 1 - ((clientY - rect.top) / rect.height) * 2;

  function unproject(zNDC) {
    const x = invVPMatrix[0]*nx + invVPMatrix[4]*ny + invVPMatrix[8]*zNDC + invVPMatrix[12];
    const y = invVPMatrix[1]*nx + invVPMatrix[5]*ny + invVPMatrix[9]*zNDC + invVPMatrix[13];
    const z = invVPMatrix[2]*nx + invVPMatrix[6]*ny + invVPMatrix[10]*zNDC + invVPMatrix[14];
    const w = invVPMatrix[3]*nx + invVPMatrix[7]*ny + invVPMatrix[11]*zNDC + invVPMatrix[15];
    return [x / w, y / w, z / w];
  }

  const pNear = unproject(-1);
  const pFar = unproject(1);
  const dy = pFar[1] - pNear[1];
  if (Math.abs(dy) < 1e-5) return null;
  const t = (planeY - pNear[1]) / dy;
  if (t < 0) return null;
  return [
    pNear[0] + (pFar[0] - pNear[0]) * t,
    planeY,
    pNear[2] + (pFar[2] - pNear[2]) * t
  ];
}

function updateHoverFromScreen(clientX, clientY) {
  updateCameraMatrices();
  const hit = screenToGroundPlane(clientX, clientY, 0.0);
  if (hit) {
    const [c, r] = worldToGrid(hit[0], hit[2]);
    if (c >= 0 && c < GRID_W && r >= 0 && r < GRID_H) {
      hoverTile = [c, r];
      return hoverTile;
    }
  }
  hoverTile = null;
  return null;
}

function handleTileAction(tile) {
  if (gameOverState) return;
  if (!tile) {
    inspectedTower = null;
    updateUI();
    return;
  }
  const [c, r] = tile;
  const existing = towers.find(t => t.col === c && t.row === r);
  if (existing) {
    inspectedTower = existing;
    updateUI();
    return;
  }

  if (grid[r][c] === 0) {
    if (selectedPlantIdx < 0) {
      inspectedTower = null;
      showToast('🌱 Select a plant below [1–4] first to plant on this grass tile!', 1800);
      updateUI();
      return;
    }
    const pType = PLANT_TYPES[selectedPlantIdx];
    if (dew >= pType.cost) {
      dew -= pType.cost;
      const [wx, wz] = gridToWorld(c, r);
      const newTower = {
        col: c, row: r, wx, wz,
        typeIdx: selectedPlantIdx,
        level: 1,
        totalSpent: pType.cost,
        cooldown: 0,
        aimAngle: 0,
        recoil: 0
      };
      towers.push(newTower);
      inspectedTower = null;
      sfx.play('plant');
      spawnParticles(wx, 0.25, wz, pType.color, 10, 2.0);
      showToast(`🌱 Planted ${pType.name}!`, 1800);
      updateUI();
    } else {
      pulseDewWarning();
      showToast(`💧 Need ${pType.cost} Sun Dew for ${pType.name}!`, 2000);
    }
  } else {
    inspectedTower = null;
    showToast(`🚫 Cannot plant on the caterpillar dirt path!`, 1800);
    updateUI();
  }
}

// --- Desktop Mouse Controls (Right-Click / Left-Drag: Orbit, Middle-Click: Pan, Left-Click: Plant/Select) ---
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

canvas.addEventListener('mousedown', (e) => {
  sfx.init();
  if (e.button === 2) {
    e.preventDefault();
    isRightDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    canvas.style.cursor = 'grabbing';
    return;
  }
  if (e.button === 1) {
    e.preventDefault();
    isMiddleDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    canvas.style.cursor = 'move';
    return;
  }
  if (e.button === 0) {
    isDragging = true;
    dragMoved = false;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
});

canvas.addEventListener('auxclick', (e) => {
  if (e.button === 1 || e.button === 2) e.preventDefault();
});

window.addEventListener('mousemove', (e) => {
  if (isMiddleDragging) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    const panSpeed = (camDist / Math.max(300, canvas.clientHeight)) * 1.35;

    const rightX = Math.cos(camYaw);
    const rightZ = -Math.sin(camYaw);
    const fwdX = -Math.sin(camYaw);
    const fwdZ = -Math.cos(camYaw);

    camTargetX = Math.max(-5, Math.min(5, camTargetX - (rightX * dx - fwdX * dy) * panSpeed));
    camTargetZ = Math.max(-4, Math.min(4, camTargetZ - (rightZ * dx - fwdZ * dy) * panSpeed));

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  } else if (isRightDragging) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    camYaw -= dx * 0.0068;
    camPitch = Math.max(0.42, Math.min(1.32, camPitch + dy * 0.0058));
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  } else if (isDragging) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    if (Math.hypot(dx, dy) > 12) dragMoved = true;
    // Left-click NEVER rotates the camera; camera orbit is strictly reserved for right-click drag!
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  }
  updateHoverFromScreen(e.clientX, e.clientY);
});

window.addEventListener('mouseup', (e) => {
  if (isRightDragging && (e.button === 2 || e.buttons === 0)) {
    isRightDragging = false;
    canvas.style.cursor = 'pointer';
  }
  if (isMiddleDragging && (e.button === 1 || e.buttons === 0)) {
    isMiddleDragging = false;
    canvas.style.cursor = 'pointer';
  }
  if (e.button === 0 && isDragging) {
    isDragging = false;
    if (dragMoved || e.target !== canvas || gameOverState) return;
    const tile = updateHoverFromScreen(e.clientX, e.clientY);
    handleTileAction(tile);
  }
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  camDist = Math.max(7.2, Math.min(20.0, camDist + e.deltaY * 0.008));
}, { passive: false });

// --- Mobile & Tablet Multi-Touch Controls (1-Finger Tap/Orbit, 2-Finger Pinch Zoom & Pan) ---
let touchMode = 0; // 0: none, 1: single-finger, 2: two-finger pinch/pan
let touchStartX = 0, touchStartY = 0;
let touchLastX = 0, touchLastY = 0;
let touchMoved = false;
let lastPinchDist = 0;
let lastPinchMidX = 0, lastPinchMidY = 0;

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  sfx.init();
  if (e.touches.length === 1) {
    touchMode = 1;
    touchMoved = false;
    touchStartX = touchLastX = e.touches[0].clientX;
    touchStartY = touchLastY = e.touches[0].clientY;
    updateHoverFromScreen(touchStartX, touchStartY);
  } else if (e.touches.length >= 2) {
    touchMode = 2;
    touchMoved = true;
    const t0 = e.touches[0], t1 = e.touches[1];
    lastPinchDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    lastPinchMidX = (t0.clientX + t1.clientX) * 0.5;
    lastPinchMidY = (t0.clientY + t1.clientY) * 0.5;
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (touchMode === 1 && e.touches.length === 1) {
    const cx = e.touches[0].clientX;
    const cy = e.touches[0].clientY;
    const dx = cx - touchLastX;
    const dy = cy - touchLastY;
    if (Math.hypot(cx - touchStartX, cy - touchStartY) > 10) {
      touchMoved = true;
    }
    if (touchMoved) {
      camYaw -= dx * 0.007;
      camPitch = Math.max(0.42, Math.min(1.32, camPitch + dy * 0.006));
      hoverTile = null;
    }
    touchLastX = cx;
    touchLastY = cy;
  } else if (e.touches.length >= 2) {
    touchMode = 2;
    touchMoved = true;
    const t0 = e.touches[0], t1 = e.touches[1];
    const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    const midX = (t0.clientX + t1.clientX) * 0.5;
    const midY = (t0.clientY + t1.clientY) * 0.5;

    if (lastPinchDist > 10) {
      const deltaDist = lastPinchDist - dist;
      camDist = Math.max(7.2, Math.min(20.0, camDist + deltaDist * 0.032));
    }

    const dx = midX - lastPinchMidX;
    const dy = midY - lastPinchMidY;
    const panSpeed = (camDist / Math.max(300, canvas.clientHeight)) * 1.45;
    const rightX = Math.cos(camYaw);
    const rightZ = -Math.sin(camYaw);
    const fwdX = -Math.sin(camYaw);
    const fwdZ = -Math.cos(camYaw);

    camTargetX = Math.max(-5, Math.min(5, camTargetX - (rightX * dx - fwdX * dy) * panSpeed));
    camTargetZ = Math.max(-4, Math.min(4, camTargetZ - (rightZ * dx - fwdZ * dy) * panSpeed));

    lastPinchDist = dist;
    lastPinchMidX = midX;
    lastPinchMidY = midY;
    hoverTile = null;
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (touchMode === 1 && !touchMoved && e.changedTouches.length > 0) {
    const t = e.changedTouches[0];
    const tile = updateHoverFromScreen(t.clientX, t.clientY);
    handleTileAction(tile);
    setTimeout(() => { hoverTile = null; }, 350);
  }
  if (e.touches.length === 0) {
    touchMode = 0;
  } else if (e.touches.length === 1) {
    touchMode = 1;
    touchLastX = e.touches[0].clientX;
    touchLastY = e.touches[0].clientY;
  }
}, { passive: false });

canvas.addEventListener('touchcancel', () => {
  touchMode = 0;
  hoverTile = null;
});

window.addEventListener('keydown', (e) => {
  if (e.key === '1') selectPlant(0);
  if (e.key === '2') selectPlant(1);
  if (e.key === '3') selectPlant(2);
  if (e.key === '4') selectPlant(3);
  if (e.key === 'a' || e.key === 'A') toggleAutoWave();
  if (e.key === 'p' || e.key === 'P') togglePause();
  if (e.key === 'm' || e.key === 'M') toggleMusicBtn();
  if (e.key === 'q' || e.key === 'Q' || e.key === 'ArrowLeft') camYaw -= 0.14;
  if (e.key === 'e' || e.key === 'E' || e.key === 'ArrowRight') camYaw += 0.14;
  if (e.key === ' ') startNextWave();
  if (e.key === 'Escape') {
    inspectedTower = null;
    selectedPlantIdx = -1;
    updateUI();
  }
});

// =========================================================================
// 7. HUD & CONTROLS LOGIC
// =========================================================================
const dewCountEl = document.getElementById('dewCount');
const waveCountEl = document.getElementById('waveCount');
const enemyCounterEl = document.getElementById('enemyCounter');
const livesCountEl = document.getElementById('livesCount');
const waveBtn = document.getElementById('waveBtn');
const autoWaveBtn = document.getElementById('autoWaveBtn');
const speedBtn = document.getElementById('speedBtn');
const pauseBtn = document.getElementById('pauseBtn');
const musicBtn = document.getElementById('musicBtn');
const soundBtn = document.getElementById('soundBtn');
const resetCamBtn = document.getElementById('resetCamBtn');
const resetCamMobileBtn = document.getElementById('resetCamMobileBtn');
const towerMenu = document.getElementById('towerMenu');
const menuPlantIcon = document.getElementById('menuPlantIcon');
const menuPlantName = document.getElementById('menuPlantName');
const menuPlantStats = document.getElementById('menuPlantStats');
const upgradeBtn = document.getElementById('upgradeBtn');
const sellBtn = document.getElementById('sellBtn');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const overlayModal = document.getElementById('overlayModal');
const modalEmoji = document.getElementById('modalEmoji');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const restartBtn = document.getElementById('restartBtn');
const changeDiffBtn = document.getElementById('changeDiffBtn');
const diffBadgeBtn = document.getElementById('diffBadgeBtn');
const diffBadgeText = document.getElementById('diffBadgeText');
const difficultyModal = document.getElementById('difficultyModal');
const startGameBtn = document.getElementById('startGameBtn');
const diffCards = document.querySelectorAll('.diff-card');
const plantBtns = document.querySelectorAll('.plant-btn');

function getTowerStats(tower) {
  const base = PLANT_TYPES[tower.typeIdx];
  const mult = 1 + (tower.level - 1) * 0.45;
  const nextMult = 1 + tower.level * 0.45;
  return {
    name: base.name,
    damage: Math.round(base.damage * mult),
    nextDamage: Math.round(base.damage * nextMult),
    range: base.range + (tower.level - 1) * 0.25,
    nextRange: base.range + tower.level * 0.25,
    fireRate: base.fireRate * Math.pow(0.88, tower.level - 1),
    upgradeCost: Math.round(base.cost * 0.85 * tower.level),
    sellRefund: Math.round(tower.totalSpent * 0.75)
  };
}

function selectPlant(idx) {
  sfx.play('select');
  if (selectedPlantIdx === idx && !inspectedTower) {
    const prev = PLANT_TYPES[idx];
    selectedPlantIdx = -1;
    showToast(`Deselected ${prev.name}`, 1500);
  } else {
    selectedPlantIdx = idx;
    inspectedTower = null;
    const p = PLANT_TYPES[idx];
    showToast(`Selected ${p.name} (💧 ${p.cost}) — Tap/Click grass to plant (press again to unselect)`, 2200);
  }
  updateUI();
}

plantBtns.forEach((btn, idx) => {
  btn.addEventListener('click', () => selectPlant(idx));
});

waveBtn.addEventListener('click', startNextWave);

function toggleAutoWave() {
  autoWave = !autoWave;
  if (autoWave && !waveActive && !gameOverState) {
    startNextWave();
  } else {
    showToast(autoWave ? '🔄 Auto Wave: ON' : '⏹ Auto Wave: OFF', 1600);
  }
  updateUI();
}

autoWaveBtn.addEventListener('click', toggleAutoWave);

function togglePause() {
  if (gameOverState) return;
  isPaused = !isPaused;
  if (pauseBtn) {
    pauseBtn.textContent = isPaused ? '▶' : '⏸';
    pauseBtn.classList.toggle('active-pill', isPaused);
  }
  showToast(isPaused ? '⏸ Game Paused' : '▶ Game Resumed', 1600);
}

if (pauseBtn) pauseBtn.addEventListener('click', togglePause);

speedBtn.addEventListener('click', () => {
  gameSpeed = gameSpeed === 1 ? 2 : 1;
  speedBtn.textContent = gameSpeed + 'x';
  speedBtn.classList.toggle('active-pill', gameSpeed === 2);
  showToast(`⚡ Game Speed: ${gameSpeed}x`, 1400);
});

function toggleMusicBtn() {
  const on = sfx.toggleMusic();
  if (musicBtn) {
    musicBtn.textContent = on ? '🎵' : '🔕';
    musicBtn.style.opacity = on ? '1' : '0.55';
  }
  showToast(on ? '🎵 Background Music: ON' : '🔕 Background Music: OFF', 1400);
}

if (musicBtn) musicBtn.addEventListener('click', toggleMusicBtn);

soundBtn.addEventListener('click', () => {
  sfx.enabled = !sfx.enabled;
  soundBtn.textContent = sfx.enabled ? '🔊' : '🔇';
  showToast(sfx.enabled ? '🔊 Sound Effects: ON' : '🔇 Sound Effects: OFF', 1400);
});

function resetCameraView() {
  camYaw = 0.0;
  camPitch = 0.78;
  camDist = 13.2;
  camTargetX = 0.0;
  camTargetY = 0.0;
  camTargetZ = 0.35;
  showToast('🎥 Camera View Reset', 1400);
}

if (resetCamBtn) resetCamBtn.addEventListener('click', resetCameraView);
if (resetCamMobileBtn) resetCamMobileBtn.addEventListener('click', resetCameraView);

upgradeBtn.addEventListener('click', () => {
  if (!inspectedTower || inspectedTower.level >= 3) return;
  const st = getTowerStats(inspectedTower);
  if (dew >= st.upgradeCost) {
    dew -= st.upgradeCost;
    inspectedTower.totalSpent += st.upgradeCost;
    inspectedTower.level++;
    sfx.play('upgrade');
    spawnParticles(inspectedTower.wx, 0.5, inspectedTower.wz, hex(0xfef08a), 12, 2.5);
    showToast(`⬆️ Upgraded ${st.name} to Lv.${inspectedTower.level}!`, 1800);
    updateUI();
  } else {
    pulseDewWarning();
    showToast(`💧 Need ${st.upgradeCost} Sun Dew to upgrade!`, 1800);
  }
});

sellBtn.addEventListener('click', () => {
  if (!inspectedTower) return;
  const st = getTowerStats(inspectedTower);
  dew += st.sellRefund;
  const idx = towers.indexOf(inspectedTower);
  if (idx !== -1) towers.splice(idx, 1);
  sfx.play('uproot');
  spawnParticles(inspectedTower.wx, 0.3, inspectedTower.wz, hex(0x86efac), 8, 1.8);
  showToast(`♻️ Uprooted ${st.name} (+💧 ${st.sellRefund})`, 1800);
  inspectedTower = null;
  updateUI();
});

closeMenuBtn.addEventListener('click', () => {
  inspectedTower = null;
  updateUI();
});

function selectDifficulty(diffKey) {
  selectedDifficulty = diffKey;
  diffCards.forEach(c => {
    c.classList.toggle('selected', c.getAttribute('data-diff') === diffKey);
  });
  if (startGameBtn) {
    const cfg = DIFFICULTY_CONFIGS[diffKey];
    startGameBtn.textContent = `START GAME (${cfg.name.toUpperCase()})`;
    if (diffKey === 'hard') {
      startGameBtn.classList.add('hard');
      startGameBtn.style.backgroundColor = '#f43f5e';
      startGameBtn.style.color = '#ffffff';
    } else {
      startGameBtn.classList.remove('hard');
      startGameBtn.style.backgroundColor = '#10b981';
      startGameBtn.style.color = '#020617';
    }
  }
  sfx.play('select');
}

diffCards.forEach(card => {
  card.addEventListener('click', () => {
    const d = card.getAttribute('data-diff');
    selectDifficulty(d);
  });
  card.addEventListener('dblclick', () => {
    const d = card.getAttribute('data-diff');
    selectDifficulty(d);
    launchGameWithDifficulty(d);
  });
});

function launchGameWithDifficulty(diffKey) {
  currentDifficulty = diffKey;
  const cfg = DIFFICULTY_CONFIGS[diffKey];
  dew = cfg.startDew;
  lives = cfg.startLives;
  wave = 1;
  isPaused = false;
  if (pauseBtn) {
    pauseBtn.textContent = '⏸';
    pauseBtn.classList.remove('active-pill');
  }
  waveActive = false;
  gameOverState = null;
  towers.length = 0;
  caterpillars.length = 0;
  projectiles.length = 0;
  particles.length = 0;
  spawnQueue.length = 0;
  inspectedTower = null;

  if (diffBadgeText) {
    diffBadgeText.textContent = cfg.badge;
    diffBadgeText.className = `hud-val text-xs font-bold ${diffKey === 'hard' ? 'text-rose-300' : diffKey === 'easy' ? 'text-emerald-300' : 'text-amber-300'}`;
  }

  if (difficultyModal) {
    difficultyModal.classList.add('hidden');
    difficultyModal.classList.remove('flex');
  }
  if (overlayModal) {
    overlayModal.classList.add('hidden');
    overlayModal.classList.remove('flex');
  }

  sfx.init();
  sfx.playMusic();
  showToast(`⚔️ ${cfg.name} Difficulty! Tap any grass tile to plant your first defense`, 2800);
  updateUI();
}

if (startGameBtn) {
  startGameBtn.addEventListener('click', () => {
    launchGameWithDifficulty(selectedDifficulty);
  });
}

function openDifficultyMenu() {
  if (difficultyModal) {
    selectDifficulty(currentDifficulty);
    difficultyModal.classList.remove('hidden');
    difficultyModal.classList.add('flex');
  }
  if (overlayModal) {
    overlayModal.classList.add('hidden');
    overlayModal.classList.remove('flex');
  }
}

if (diffBadgeBtn) diffBadgeBtn.addEventListener('click', openDifficultyMenu);
if (changeDiffBtn) changeDiffBtn.addEventListener('click', openDifficultyMenu);

restartBtn.addEventListener('click', () => {
  launchGameWithDifficulty(currentDifficulty);
});

function showGameOver(state) {
  gameOverState = state;
  overlayModal.classList.remove('hidden');
  overlayModal.classList.add('flex');
  const diffName = DIFFICULTY_CONFIGS[currentDifficulty].name;
  if (state === 'victory') {
    modalEmoji.textContent = '🌸';
    modalTitle.textContent = `Garden Saved! (${diffName})`;
    modalDesc.textContent = `All 10 caterpillar waves were repelled on ${diffName} difficulty! The prize strawberry is safe and thriving.`;
  } else {
    modalEmoji.textContent = '🐛';
    modalTitle.textContent = 'Strawberry Eaten!';
    modalDesc.textContent = `The hungry caterpillars munched through on Wave ${wave} (${diffName} difficulty). Try mixing Frost Bells with Puff Shrooms!`;
  }
}

function updateUI() {
  dewCountEl.textContent = dew;
  waveCountEl.textContent = wave;
  livesCountEl.textContent = lives;

  if (enemyCounterEl) {
    const remaining = spawnQueue.length + caterpillars.length;
    if (waveActive && remaining > 0) {
      enemyCounterEl.textContent = `🐛 ${remaining}`;
      enemyCounterEl.classList.remove('hidden');
    } else {
      enemyCounterEl.classList.add('hidden');
    }
  }

  waveBtn.disabled = waveActive;
  waveBtn.textContent = waveActive ? 'WAVE ACTIVE' : `START WAVE ${wave}`;

  autoWaveBtn.textContent = autoWave ? 'AUTO: ON' : 'AUTO: OFF';
  autoWaveBtn.classList.toggle('active-pill', autoWave);

  plantBtns.forEach((btn, idx) => {
    btn.classList.toggle('selected', idx === selectedPlantIdx && !inspectedTower);
    const canAfford = dew >= PLANT_TYPES[idx].cost;
    btn.style.opacity = canAfford ? '1' : '0.48';
  });

  if (inspectedTower) {
    const st = getTowerStats(inspectedTower);
    towerMenu.classList.remove('hidden');
    const iconNames = ['pea_sprout', 'frost_bell', 'puff_shroom', 'sun_flora'];
    if (menuPlantIcon) menuPlantIcon.src = `icons/${iconNames[inspectedTower.typeIdx]}.png`;
    menuPlantName.textContent = `${st.name} (Lv.${inspectedTower.level})`;
    if (inspectedTower.level >= 3) {
      menuPlantStats.textContent = `DMG ${st.damage} • Range ${st.range.toFixed(1)} (MAX)`;
      upgradeBtn.textContent = 'MAX LEVEL';
      upgradeBtn.disabled = true;
    } else {
      menuPlantStats.textContent = `DMG ${st.damage}→${st.nextDamage} • RNG ${st.range.toFixed(1)}→${st.nextRange.toFixed(1)}`;
      upgradeBtn.textContent = `Upgrade (💧 ${st.upgradeCost})`;
      upgradeBtn.disabled = dew < st.upgradeCost;
    }
    sellBtn.textContent = `Uproot (+💧 ${st.sellRefund})`;
  } else {
    towerMenu.classList.add('hidden');
  }
}

// =========================================================================
// 8. SIMULATION UPDATE LOOP
// =========================================================================
function updateSimulation(dt) {
  if (sfx) sfx.heartbeat();
  if (gameOverState) return;

  if (logRumble > 0) logRumble = Math.max(0, logRumble - dt * 2.5);

  if (waveActive && spawnQueue.length > 0) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      const next = spawnQueue.shift();
      logRumble = 1.0;
      const startP = samplePath(0);
      caterpillars.push({
        modelName: next.modelName || 'Green_Inchworm',
        scale: next.scale || 0.56,
        dist: 0,
        hx: startP.x,
        hz: startP.z,
        dead: false,
        speed: next.speed,
        hp: next.hp,
        maxHp: next.hp,
        segments: next.segments,
        segRadius: next.segRadius,
        color: next.color,
        stripeColor: next.stripeColor,
        slowTimer: 0,
        hitFlash: 0,
        reward: next.reward,
        animTime: Math.random() * 2.15,
        wrigglePhase: Math.random() * Math.PI * 2
      });
      if (spawnQueue.length > 0) {
        spawnTimer = spawnQueue[0].delay;
      }
    }
  }

  for (let i = caterpillars.length - 1; i >= 0; i--) {
    const cat = caterpillars[i];
    if (cat.slowTimer > 0) cat.slowTimer -= dt;
    if (cat.hitFlash > 0) cat.hitFlash = Math.max(0, cat.hitFlash - dt * 6);
    const speedMult = cat.slowTimer > 0 ? 0.52 : 1.0;
    cat.dist += cat.speed * speedMult * dt;
    cat.animTime += dt * speedMult;
    cat.wrigglePhase += dt * 9.5 * speedMult;

    if (cat.dist >= totalPathLength) {
      const endPt = worldWaypoints[worldWaypoints.length - 1];
      spawnParticles(endPt.x, 0.4, endPt.z, hex(0xf43f5e), 10, 2.6);
      sfx.play('bite');
      cat.dead = true;
      caterpillars.splice(i, 1);
      lives = Math.max(0, lives - 1);
      updateUI();
      if (lives <= 0) {
        showGameOver('defeat');
        return;
      }
    } else {
      const hp = samplePath(cat.dist);
      cat.hx = hp.x;
      cat.hz = hp.z;
    }
  }

  if (waveActive && spawnQueue.length === 0 && caterpillars.length === 0) {
    waveActive = false;
    sfx.setBgmMode('calm');
    if (wave >= maxWaves) {
      showGameOver('victory');
      return;
    } else {
      wave++;
      const diff = DIFFICULTY_CONFIGS[currentDifficulty] || DIFFICULTY_CONFIGS.medium;
      dew += diff.dewPerWave + wave * 5;
      autoWaveTimer = 1.25;
      updateUI();
    }
  }

  if (!waveActive && autoWave && !gameOverState) {
    autoWaveTimer -= dt;
    if (autoWaveTimer <= 0) {
      startNextWave();
    }
  }

  for (let i = 0; i < towers.length; i++) {
    const t = towers[i];
    const base = PLANT_TYPES[t.typeIdx];
    const st = getTowerStats(t);
    const rangeSq = st.range * st.range;
    if (t.cooldown > 0) t.cooldown -= dt;
    if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 3.8);

    let bestCat = null;
    let bestDist = -1;
    for (let j = 0; j < caterpillars.length; j++) {
      const cat = caterpillars[j];
      const dx = cat.hx - t.wx;
      const dz = cat.hz - t.wz;
      if (dx * dx + dz * dz <= rangeSq && cat.dist > bestDist) {
        bestDist = cat.dist;
        bestCat = cat;
      }
    }

    if (bestCat) {
      t.aimAngle = Math.atan2(bestCat.hx - t.wx, bestCat.hz - t.wz);
      if (t.cooldown <= 0) {
        t.cooldown = st.fireRate;
        t.recoil = 1.0;
        sfx.play('shoot_' + t.typeIdx);
        projectiles.push({
          x: t.wx + Math.sin(t.aimAngle) * 0.25,
          y: 0.55 + (t.level - 1) * 0.1,
          z: t.wz + Math.cos(t.aimAngle) * 0.25,
          target: bestCat,
          tx: bestCat.hx,
          tz: bestCat.hz,
          speed: base.projSpeed,
          dmg: st.damage,
          splash: base.splash,
          slow: base.slow,
          color: base.projColor
        });
      }
    }
  }

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (p.target && !p.target.dead) {
      p.tx = p.target.hx;
      p.tz = p.target.hz;
    }
    const dx = p.tx - p.x;
    const dz = p.tz - p.z;
    const dist = Math.hypot(dx, dz);
    const step = p.speed * dt;
    if (dist <= step + 0.12) {
      spawnParticles(p.tx, 0.3, p.tz, p.color, p.splash > 0 ? 8 : 4, p.splash > 0 ? 2.4 : 1.5);
      if (p.splash > 0) {
        const splashSq = p.splash * p.splash;
        for (let j = caterpillars.length - 1; j >= 0; j--) {
          const cat = caterpillars[j];
          const cdx = cat.hx - p.tx;
          const cdz = cat.hz - p.tz;
          if (cdx * cdx + cdz * cdz <= splashSq) {
            damageCaterpillar(cat, p.dmg, p.slow);
          }
        }
      } else if (p.target && !p.target.dead) {
        damageCaterpillar(p.target, p.dmg, p.slow);
      }
      projectiles.splice(i, 1);
    } else {
      p.x += (dx / dist) * step;
      p.z += (dz / dist) * step;
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.life += dt;
    if (pt.life >= pt.maxLife) {
      particles.splice(i, 1);
      continue;
    }
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.z += pt.vz * dt;
    pt.vy -= 7.5 * dt;
    if (pt.y < 0.02) {
      pt.y = 0.02;
      pt.vy *= -0.35;
    }
  }
}

function damageCaterpillar(cat, dmg, slowAmount) {
  if (cat.dead) return;
  const prevSegs = Math.max(1, Math.ceil((cat.hp / cat.maxHp) * cat.segments));
  cat.hp -= dmg;
  cat.hitFlash = 1.0;
  if (slowAmount > 0) cat.slowTimer = 2.4;

  const newSegs = Math.max(1, Math.ceil((Math.max(0, cat.hp) / cat.maxHp) * cat.segments));
  if (newSegs < prevSegs && cat.hp > 0) {
    const tailPos = samplePath(Math.max(0, cat.dist - 0.25));
    spawnParticles(tailPos.x, 0.25, tailPos.z, cat.color, 4, 2.0);
  }

  if (cat.hp <= 0) {
    cat.dead = true;
    const idx = caterpillars.indexOf(cat);
    if (idx !== -1) {
      spawnParticles(cat.hx, 0.3, cat.hz, cat.color, 8, 2.5);
      caterpillars.splice(idx, 1);
      dew += cat.reward;
      sfx.play('pop');
      updateUI();
    }
  }
}

// =========================================================================
// 9. 3D VOXEL SCENE BUILDER (WITH BLENDER 3D MODELS & 52-FRAME ANIMATIONS)
// =========================================================================
const COL_GRASS_A = hex(0x4ade80);
const COL_GRASS_B = hex(0x38c96e);
const COL_SOIL_SIDE = hex(0x5c4033);
const COL_PATH_A = hex(0xd6a87c);
const COL_PATH_B = hex(0xc8996c);
const COL_STONE = hex(0x94a3b8);
const COL_SHADOW = hex(0x1e2923);
const COL_WOOD = hex(0x78350f);
const COL_DARK_LEAF = hex(0x15803d);

// 52 frames at 24 fps (~2.1667s per loop) matching voxel_models.blend
const BLENDER_LOOP_SEC = 52 / 24;
const BLENDER_OMEGA = (2 * Math.PI) / BLENDER_LOOP_SEC;
const PLANT_MODEL_NAMES = ['Pea_Sprout', 'Frost_Bell', 'Puff_Shroom', 'Sun_Flora'];

// Build static terrain VBO once at startup using the Blender Grass_Block 3D model
function buildStaticTerrain() {
  vertCount = 0;
  // Deep soil foundation slab
  pushBox(0, -0.52, 0, GRID_W + 0.45, 0.34, GRID_H + 0.45, COL_SOIL_SIDE, 0);

  for (let r = 0; r < GRID_H; r++) {
    for (let c = 0; c < GRID_W; c++) {
      const [wx, wz] = gridToWorld(c, r);
      const isEven = (c + r) % 2 === 0;
      if (grid[r][c] === 0) {
        if (typeof VOXEL_MODELS !== 'undefined' && VOXEL_MODELS['Grass_Block']) {
          const rotSteps = ((c * 3 + r * 7) & 3) * (Math.PI * 0.5);
          const shade = isEven ? 1.0 : 0.91;
          pushBlenderModel('Grass_Block', wx, -0.445, wz, 0.77, 0.45, 0.77, rotSteps, null, shade);
        } else {
          pushBox(wx, -0.18, wz, 0.96, 0.18, 0.96, isEven ? COL_GRASS_A : COL_GRASS_B, 0);
        }
      } else {
        pushBox(wx, -0.26, wz, 0.98, 0.18, 0.98, isEven ? COL_PATH_A : COL_PATH_B, 0);
        if (isEven) {
          pushBox(wx, -0.08, wz, 0.28, 0.03, 0.28, COL_STONE, 0.2);
        }
      }
    }
  }

  staticVertCount = vertCount;
  const staticData = vertData.slice(0, staticVertCount * 11);
  gl.bindBuffer(gl.ARRAY_BUFFER, staticVbo);
  gl.bufferData(gl.ARRAY_BUFFER, staticData, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, MAX_VERTS * 11 * 4, gl.DYNAMIC_DRAW);
  vertCount = 0;
}
buildStaticTerrain();

function drawRangeRing(cx, cz, radius, color) {
  const segs = 28;
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const rx = cx + Math.cos(a) * radius;
    const rz = cz + Math.sin(a) * radius;
    pushBox(rx, 0.05, rz, 0.14, 0.04, 0.14, color, -a);
  }
}

function drawPlantVoxelModel(wx, wz, typeIdx, level, aimAngle, recoil, time) {
  const modelName = PLANT_MODEL_NAMES[typeIdx];
  const scale = 0.52 * (1 + (level - 1) * 0.14);
  const phase = wx * 0.75 + wz * 1.15;
  const w = BLENDER_OMEGA;

  let weights = null;
  if (typeIdx === 0) {
    // Pea_Sprout: Aim_Sway + Snout_Swell + Fire_Recoil
    const idlePulse = Math.max(0, Math.sin(w * time + phase) - 0.72) * 1.1;
    weights = {
      Aim_Sway: Math.sin(w * time + phase) * (1 - recoil * 0.5),
      Fire_Recoil: recoil > 0 ? recoil * 0.55 : idlePulse * 0.35,
      Snout_Swell: recoil > 0 ? Math.sin(recoil * Math.PI) * 0.95 : idlePulse * 0.6
    };
  } else if (typeIdx === 1) {
    // Frost_Bell: 2 cycles per 52-frame loop + chime boost on shot
    weights = {
      Bell_Chime: Math.sin(2 * w * time + phase) * (0.65 + recoil * 0.45),
      Shard_Bob_A: Math.cos(2 * w * time + phase),
      Shard_Bob_B: Math.sin(2 * w * time + phase)
    };
  } else if (typeIdx === 2) {
    // Puff_Shroom: bouncy spore puff + cap wobble
    weights = {
      Spore_Puff: Math.sin(2 * w * time + phase) * 0.65 + recoil * 0.6,
      Cap_Wobble: Math.cos(2 * w * time + phase) * 0.5
    };
  } else if (typeIdx === 3) {
    // Sun_Flora: sunny sway + petal pulse
    weights = {
      Sun_Sway: Math.sin(w * time + phase),
      Petal_Pulse: 0.5 + 0.5 * Math.sin(2 * w * time + phase) + recoil * 0.45
    };
  }

  // Slight backward slide on recoil
  const rx = wx - Math.sin(aimAngle) * (recoil * 0.045);
  const rz = wz - Math.cos(aimAngle) * (recoil * 0.045);

  pushBlenderModel(modelName, rx, 0.0, rz, scale, scale, scale, aimAngle, weights);

  // Orbiting level stars for upgraded towers (Lv.2 and Lv.3)
  for (let l = 1; l < level; l++) {
    const orbitA = time * 2.8 + l * Math.PI;
    const ox = wx + Math.cos(orbitA) * 0.32;
    const oz = wz + Math.sin(orbitA) * 0.32;
    const oy = 0.85 * scale * 1.6 + Math.sin(time * 4 + l) * 0.04;
    pushBox(ox, oy, oz, 0.08, 0.08, 0.08, hex(0xfef08a), orbitA);
  }
}

function drawCaterpillarBlenderModel(cat) {
  const name = cat.modelName || 'Green_Inchworm';
  if (typeof VOXEL_MODELS === 'undefined' || !VOXEL_MODELS[name]) return;
  const mdl = VOXEL_MODELS[name];
  const quads = mdl.q;
  const numQuads = quads.length >> 3;
  if (vertCount + numQuads * 6 >= MAX_VERTS) return;

  const w = BLENDER_OMEGA;
  const t = cat.animTime;
  let weights = null;

  if (name === 'Green_Inchworm') {
    weights = {
      Inchworm_Arch: 0.5 + 0.5 * Math.sin(2 * w * t),
      Head_Bob: 0.5 + 0.5 * Math.cos(2 * w * t)
    };
  } else if (name === 'Yellow_Sprinter') {
    weights = {
      Wave_Sin: Math.cos(2 * w * t),
      Wave_Cos: -Math.sin(2 * w * t)
    };
  } else if (name === 'Armored_Beetle') {
    weights = {
      Tank_Chug: 0.6 * Math.sin(3 * w * t),
      Ram_Thrust: Math.max(0, Math.sin(2 * w * t))
    };
  } else if (name === 'Monarch_Boss') {
    weights = {
      Boss_Strike: Math.max(0, Math.sin(2 * w * t)),
      Cobra_Sway: Math.sin(w * t),
      Tail_Wave_Sin: Math.cos(2 * w * t),
      Tail_Wave_Cos: -Math.sin(2 * w * t)
    };
  }

  const workV = deformModelVertices(mdl, weights);
  const mats = mdl.m;
  const sc = cat.scale || 0.56;

  // Fast O(1) LUT spine vertex transform (zero trig calls & zero object allocations)
  const numVerts = workV.length / 3;
  if (!mdl.worldV || mdl.worldV.length < workV.length) {
    mdl.worldV = new Float32Array(workV.length);
  }
  const worldV = mdl.worldV;
  const baseDistOffset = cat.dist - PATH_LUT_MIN;
  for (let v = 0; v < numVerts; v++) {
    const vi = v * 3;
    const lx = workV[vi] * sc;
    const ly = workV[vi + 1] * sc;
    const lz = workV[vi + 2] * sc;

    let lutIdx = ((baseDistOffset + lz) * PATH_LUT_SCALE) | 0;
    if (lutIdx < 0) lutIdx = 0;
    else if (lutIdx >= PATH_LUT_SIZE) lutIdx = PATH_LUT_SIZE - 1;

    const cosA = pathLutCos[lutIdx];
    const sinA = pathLutSin[lutIdx];

    worldV[vi]     = pathLutX[lutIdx] + lx * cosA;
    worldV[vi + 1] = -0.05 + ly;
    worldV[vi + 2] = pathLutZ[lutIdx] - lx * sinA;
  }

  let cIdx = (baseDistOffset * PATH_LUT_SCALE) | 0;
  if (cIdx < 0) cIdx = 0;
  else if (cIdx >= PATH_LUT_SIZE) cIdx = PATH_LUT_SIZE - 1;
  const centerPosX = pathLutX[cIdx];
  const centerPosZ = pathLutZ[cIdx];
  const cosC = pathLutCos[cIdx];
  const sinC = pathLutSin[cIdx];

  let tintRgb = null;
  let tintMix = 0.0;
  if (cat.hitFlash > 0.05) {
    tintRgb = [1.0, 0.96, 0.88];
    tintMix = cat.hitFlash * 0.55;
  } else if (cat.slowTimer > 0) {
    tintRgb = [0.45, 0.84, 0.99];
    tintMix = 0.48;
  }

  for (let qi = 0, qlen = quads.length; qi < qlen; qi += 8) {
    const qnx = quads[qi + 4];
    const qny = quads[qi + 5];
    const qnz = quads[qi + 6];
    const matIdx = quads[qi + 7];

    const nx = qnx * cosC + qnz * sinC;
    const ny = qny;
    const nz = -qnx * sinC + qnz * cosC;

    const baseCol = mats[matIdx] || [0.8, 0.8, 0.8];
    let r = baseCol[0], g = baseCol[1], b = baseCol[2];
    if (tintRgb && tintMix > 0) {
      r = r * (1 - tintMix) + tintRgb[0] * tintMix;
      g = g * (1 - tintMix) + tintRgb[1] * tintMix;
      b = b * (1 - tintMix) + tintRgb[2] * tintMix;
    }

    const i0 = quads[qi] * 3;
    const i1 = quads[qi + 1] * 3;
    const i2 = quads[qi + 2] * 3;
    const i3 = quads[qi + 3] * 3;

    emitQuad(
      worldV[i0], worldV[i0 + 1], worldV[i0 + 2],
      worldV[i1], worldV[i1 + 1], worldV[i1 + 2],
      worldV[i2], worldV[i2 + 1], worldV[i2 + 2],
      worldV[i3], worldV[i3 + 1], worldV[i3 + 2],
      nx, ny, nz, r, g, b
    );
  }

  // Clean camera-facing billboard health bar when damaged
  if (cat.hp < cat.maxHp && cat.hp > 0) {
    const ratio = Math.max(0, Math.min(1.0, cat.hp / cat.maxHp));
    const barW = 0.62 * (sc / 0.56);
    const barH = 0.075;
    const barY = (name === 'Monarch_Boss' ? 1.35 : 0.86);

    const fwdX = Math.sin(camYaw);
    const fwdZ = Math.cos(camYaw);
    const rx = Math.cos(camYaw);
    const rz = -Math.sin(camYaw);

    pushBillboardQuad(centerPosX, barY, centerPosZ, barW + 0.04, barH + 0.03, [0.06, 0.09, 0.16]);
    pushBillboardQuad(centerPosX + fwdX * 0.004, barY, centerPosZ + fwdZ * 0.004, barW, barH, [0.15, 0.20, 0.26]);

    const fillW = Math.max(0.015, barW * ratio);
    const shift = (fillW - barW) * 0.5;
    const fillX = centerPosX + rx * shift + fwdX * 0.01;
    const fillZ = centerPosZ + rz * shift + fwdZ * 0.01;
    const hpCol = ratio > 0.5 ? [0.22, 0.85, 0.45] : (ratio > 0.25 ? [0.98, 0.78, 0.15] : [0.95, 0.25, 0.35]);
    pushBillboardQuad(fillX, barY, fillZ, fillW, barH * 0.82, hpCol);
  }
}

function updateDynamicPointLights(time) {
  pointLightPosData.fill(0);
  pointLightColData.fill(0);
  let idx = 0;

  function addLight(x, y, z, radius, r, g, b) {
    if (idx >= MAX_POINT_LIGHTS) return;
    const p4 = idx * 4;
    const c3 = idx * 3;
    pointLightPosData[p4]     = x;
    pointLightPosData[p4 + 1] = y;
    pointLightPosData[p4 + 2] = z;
    pointLightPosData[p4 + 3] = radius;
    pointLightColData[c3]     = r;
    pointLightColData[c3 + 1] = g;
    pointLightColData[c3 + 2] = b;
    idx++;
  }

  // 1. Prize Strawberry warm ruby-gold aura at path exit
  if (lives > 0) {
    const endPt = worldWaypoints[worldWaypoints.length - 1];
    const pulse = 0.45 + 0.12 * Math.sin(time * 3.5);
    addLight(endPt.x, 0.55, endPt.z, 2.3, 1.0 * pulse, 0.35 * pulse, 0.48 * pulse);
  }

  // 2. Active projectiles in flight emit bright colored point light
  for (let i = 0; i < projectiles.length && idx < MAX_POINT_LIGHTS; i++) {
    const p = projectiles[i];
    addLight(p.x, p.y + 0.1, p.z, 2.1, p.color[0] * 0.75, p.color[1] * 0.75, p.color[2] * 0.75);
  }

  // 3. Special glowing towers (Sun Flora golden glow, Frost Bell icy crystal glow, Puff Shroom spore glow)
  for (let i = 0; i < towers.length && idx < MAX_POINT_LIGHTS; i++) {
    const t = towers[i];
    const boost = 1.0 + t.recoil * 0.85;
    if (t.typeIdx === 3) {
      addLight(t.wx, 0.75, t.wz, 2.4, 0.65 * boost, 0.52 * boost, 0.12 * boost);
    } else if (t.typeIdx === 1) {
      addLight(t.wx, 0.72, t.wz, 2.1, 0.18 * boost, 0.52 * boost, 0.72 * boost);
    } else if (t.typeIdx === 2) {
      addLight(t.wx, 0.62, t.wz, 1.9, 0.48 * boost, 0.20 * boost, 0.68 * boost);
    } else if (t.recoil > 0.1) {
      addLight(t.wx, 0.65, t.wz, 1.8, 0.25 * t.recoil, 0.65 * t.recoil, 0.32 * t.recoil);
    }
  }
}

function renderScene(time) {
  updateCameraMatrices();

  // 1. Build dynamic animated models into vertData & upload once to vbo
  vertCount = 0;

  // Hollow_Log at path start (with Spawn_Rumble animation)
  const startPt = worldWaypoints[0];
  const loopPhase = (time % BLENDER_LOOP_SEC) / BLENDER_LOOP_SEC;
  const idleRumble = Math.sin(5 * BLENDER_OMEGA * time) * Math.exp(-3.5 * loopPhase) * 0.35;
  const activeRumble = logRumble > 0 ? Math.sin(time * 28) * logRumble * 0.9 : idleRumble;
  pushBlenderModel(
    'Hollow_Log',
    startPt.x - 0.32, -0.05, startPt.z,
    0.66, 0.66, 0.66,
    Math.PI * 0.5,
    { Spawn_Rumble: activeRumble }
  );

  // Prize_Strawberry at path end (with 52-frame Blender bob, tilt & scale pulse)
  const endPt = worldWaypoints[worldWaypoints.length - 1];
  const bob = Math.sin(2 * BLENDER_OMEGA * time) * 0.045;
  const berryScale = (0.5 + (lives / 10) * 0.5) * 0.55 * (1.0 + 0.018 * Math.cos(2 * BLENDER_OMEGA * time));
  const berryYaw = Math.sin(BLENDER_OMEGA * time) * 0.22 + time * 0.35;
  if (lives > 0) {
    pushBlenderModel('Prize_Strawberry', endPt.x, 0.03 + bob, endPt.z, berryScale, berryScale, berryScale, berryYaw);
  }

  // Tile hover & 3D ghost plant preview + range indicator
  if (hoverTile && !gameOverState) {
    const [hc, hr] = hoverTile;
    const [hx, hz] = gridToWorld(hc, hr);
    const existing = towers.find(t => t.col === hc && t.row === hr);
    if (existing) {
      pushBox(hx, 0.03, hz, 0.92, 0.04, 0.92, hex(0xfef08a), 0);
    } else if (grid[hr][hc] === 0 && selectedPlantIdx >= 0) {
      const pType = PLANT_TYPES[selectedPlantIdx];
      const canAfford = dew >= pType.cost;
      const hlCol = canAfford ? hex(0x86efac) : hex(0xfda4af);
      pushBox(hx, 0.03, hz, 0.92, 0.04, 0.92, hlCol, 0);
      drawRangeRing(hx, hz, pType.range, hlCol);
      const ghostModel = PLANT_MODEL_NAMES[selectedPlantIdx];
      pushBlenderModel(
        ghostModel,
        hx, 0.04, hz,
        0.50, 0.50, 0.50,
        Math.sin(time * 2.0) * 0.25,
        null,
        canAfford ? 1.12 : 0.65,
        hlCol,
        0.42
      );
    } else if (grid[hr][hc] === 0) {
      pushBox(hx, 0.025, hz, 0.90, 0.02, 0.90, hex(0x94a3b8), 0);
    }
  }

  if (inspectedTower) {
    const st = getTowerStats(inspectedTower);
    drawRangeRing(inspectedTower.wx, inspectedTower.wz, st.range, hex(0xfef08a));
    pushBox(inspectedTower.wx, 0.03, inspectedTower.wz, 0.94, 0.05, 0.94, hex(0xfef08a), 0);
  }

  // Planted 3D Blender Towers
  for (let i = 0; i < towers.length; i++) {
    const t = towers[i];
    drawPlantVoxelModel(t.wx, t.wz, t.typeIdx, t.level, t.aimAngle, t.recoil, time);
  }

  // Crawling 3D Blender Caterpillars
  for (let i = 0; i < caterpillars.length; i++) {
    drawCaterpillarBlenderModel(caterpillars[i]);
  }

  // Projectiles
  for (let i = 0; i < projectiles.length; i++) {
    const p = projectiles[i];
    pushBox(p.x, p.y, p.z, 0.16, 0.16, 0.16, p.color, time * 6);
  }

  // Particles
  for (let i = 0; i < particles.length; i++) {
    const pt = particles[i];
    const s = pt.size * (1 - pt.life / pt.maxLife);
    pushBox(pt.x, pt.y, pt.z, s, s, s, pt.color, pt.life * 8);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertData.subarray(0, vertCount * 11));

  // 2. PASS 1: Render 1024x1024 Directional Sun Shadow Map (Dynamic shadow-casters only!)
  gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFbo);
  gl.viewport(0, 0, SHADOW_RES, SHADOW_RES);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(shadowProg);
  gl.uniformMatrix4fv(shadowLightVPLoc, false, lightVPMatrix);

  if (vertCount > 0) {
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    bindShadowAttribs();
    gl.drawArrays(gl.TRIANGLES, 0, vertCount);
  }

  // 3. PASS 2: Render Main Lit Scene with Stylized PBR, 4-Tap Soft Shadows & Dynamic Point Lights
  updateDynamicPointLights(time);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.10, 0.14, 0.12, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(prog);
  gl.uniformMatrix4fv(uVPLoc, false, vpMatrix);
  gl.uniformMatrix4fv(uLightVPLoc, false, lightVPMatrix);
  gl.uniform3fv(uEyePosLoc, camEye);
  gl.uniform4fv(uPointLightPosLoc, pointLightPosData);
  gl.uniform3fv(uPointLightColLoc, pointLightColData);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, shadowTex);
  gl.uniform1i(uShadowMapLoc, 0);

  if (staticVertCount > 0) {
    gl.bindBuffer(gl.ARRAY_BUFFER, staticVbo);
    bindAttribs();
    gl.drawArrays(gl.TRIANGLES, 0, staticVertCount);
  }
  if (vertCount > 0) {
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    bindAttribs();
    gl.drawArrays(gl.TRIANGLES, 0, vertCount);
  }
}

// =========================================================================
// 10. RESIZE & MAIN ANIMATION LOOP
// =========================================================================
function resize() {
  const maxDpr = isMobileDevice ? 1.35 : 1.75;
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  canvas.width = Math.max(1, Math.floor((canvas.clientWidth || window.innerWidth || 800) * dpr));
  canvas.height = Math.max(1, Math.floor((canvas.clientHeight || window.innerHeight || 600) * dpr));
}
window.addEventListener('resize', resize);
resize();
updateUI();

let lastTime = performance.now();
let animElapsed = 0;
function loop(now) {
  const rawDt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (!isPaused) {
    const prevCats = caterpillars.length + spawnQueue.length;
    updateSimulation(rawDt * gameSpeed);
    const curCats = caterpillars.length + spawnQueue.length;
    if (prevCats !== curCats) updateUI();
    animElapsed += rawDt * gameSpeed;
  }
  renderScene(animElapsed);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
