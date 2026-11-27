import { computeFootstepGain, FOOTSTEP_MAX_RANGE_M } from './rules';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled = true;
  public footstepVolume = 0.55;
  private noiseBuf: AudioBuffer | null = null;

  public unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.noiseBuf) {
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
  }

  public playAK(): void {
    if (!this.enabled || !this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.095);
    og.gain.setValueAtTime(0.36, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    osc.connect(og).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);

    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(1250, t);
    f.frequency.exponentialRampToValueAtTime(260, t + 0.14);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.46, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    n.connect(f).connect(ng).connect(this.ctx.destination);
    n.start(t);
    n.stop(t + 0.16);
  }

  public playPistol(): void {
    if (!this.enabled || !this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, t);
    osc.frequency.exponentialRampToValueAtTime(52, t + 0.075);
    og.gain.setValueAtTime(0.34, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.085);
    osc.connect(og).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);

    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.setValueAtTime(800, t);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.4, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    n.connect(f).connect(ng).connect(this.ctx.destination);
    n.start(t);
    n.stop(t + 0.1);
  }

  public playM4Suppressed(): void {
    if (!this.enabled || !this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.065);
    og.gain.setValueAtTime(0.28, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
    osc.connect(og).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);

    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.8;
    f.frequency.setValueAtTime(1600, t);
    f.frequency.exponentialRampToValueAtTime(520, t + 0.07);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.32, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    n.connect(f).connect(ng).connect(this.ctx.destination);
    n.start(t);
    n.stop(t + 0.085);
  }

  public playShotgun(): void {
    if (!this.enabled || !this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(26, t + 0.18);
    og.gain.setValueAtTime(0.48, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(og).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.21);

    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1900, t);
    f.frequency.exponentialRampToValueAtTime(220, t + 0.22);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.55, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    n.connect(f).connect(ng).connect(this.ctx.destination);
    n.start(t);
    n.stop(t + 0.25);
  }

  public playSniper(): void {
    if (!this.enabled || !this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    // Heavy sub-bass supersonic crack
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(165, t);
    osc.frequency.exponentialRampToValueAtTime(22, t + 0.28);
    og.gain.setValueAtTime(0.58, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.31);
    osc.connect(og).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.32);

    // High-energy rifle blast + echo tail
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2800, t);
    f.frequency.exponentialRampToValueAtTime(180, t + 0.34);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.62, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    n.connect(f).connect(ng).connect(this.ctx.destination);
    n.start(t);
    n.stop(t + 0.37);

    // Metallic bolt-action cycle click-clack after shot
    [0.38, 0.54].forEach((delay, idx) => {
      if (!this.ctx) return;
      const bOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bOsc.type = 'triangle';
      bOsc.frequency.setValueAtTime(idx === 0 ? 620 : 480, t + delay);
      bOsc.frequency.exponentialRampToValueAtTime(190, t + delay + 0.045);
      bGain.gain.setValueAtTime(0.16, t + delay);
      bGain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.05);
      bOsc.connect(bGain).connect(this.ctx.destination);
      bOsc.start(t + delay);
      bOsc.stop(t + delay + 0.055);
    });
  }

  public playMP5(): void {
    if (!this.enabled || !this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(62, t + 0.055);
    og.gain.setValueAtTime(0.26, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
    osc.connect(og).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);

    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2.1;
    f.frequency.setValueAtTime(1850, t);
    f.frequency.exponentialRampToValueAtTime(680, t + 0.06);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.28, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.068);
    n.connect(f).connect(ng).connect(this.ctx.destination);
    n.start(t);
    n.stop(t + 0.075);
  }

  public playLMG(): void {
    if (!this.enabled || !this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    // Heavy belt-fed M249 SAW thump
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(135, t);
    osc.frequency.exponentialRampToValueAtTime(34, t + 0.11);
    og.gain.setValueAtTime(0.42, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(og).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);

    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(1050, t);
    f.frequency.exponentialRampToValueAtTime(240, t + 0.13);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.48, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    n.connect(f).connect(ng).connect(this.ctx.destination);
    n.start(t);
    n.stop(t + 0.15);
  }

  public playDeagle(): void {
    if (!this.enabled || !this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    // .50 AE Heavy Hand Cannon punch + metallic slide ring
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(185, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.19);
    og.gain.setValueAtTime(0.52, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.21);
    osc.connect(og).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);

    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2400, t);
    f.frequency.exponentialRampToValueAtTime(320, t + 0.2);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.54, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.21);
    n.connect(f).connect(ng).connect(this.ctx.destination);
    n.start(t);
    n.stop(t + 0.22);
  }

  public playRPGLaunch(): void {
    if (!this.enabled || !this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    // Rocket tube ignition + propellant whoosh
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(210, t + 0.14);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.42);
    og.gain.setValueAtTime(0.45, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(og).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.46);

    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(650, t);
    f.frequency.exponentialRampToValueAtTime(1450, t + 0.18);
    f.frequency.exponentialRampToValueAtTime(280, t + 0.44);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.58, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.46);
    n.connect(f).connect(ng).connect(this.ctx.destination);
    n.start(t);
    n.stop(t + 0.48);
  }

  public playRPGExplosion(): void {
    if (!this.enabled || !this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    // Massive sub-bass warhead detonation
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(18, t + 0.48);
    og.gain.setValueAtTime(0.68, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.52);
    osc.connect(og).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.54);

    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1600, t);
    f.frequency.exponentialRampToValueAtTime(110, t + 0.55);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.65, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.58);
    n.connect(f).connect(ng).connect(this.ctx.destination);
    n.start(t);
    n.stop(t + 0.6);
  }

  public playWeaponShotById(weaponId: string): void {
    if (weaponId === 'ak47') this.playAK();
    else if (weaponId === 'm4a1') this.playM4Suppressed();
    else if (weaponId === 'sniper') this.playSniper();
    else if (weaponId === 'mp5') this.playMP5();
    else if (weaponId === 'shotgun') this.playShotgun();
    else if (weaponId === 'pistol') this.playPistol();
    else if (weaponId === 'katana') this.playSwordSwing();
    else if (weaponId === 'lmg') this.playLMG();
    else if (weaponId === 'deagle') this.playDeagle();
    else if (weaponId === 'rpg') {
      this.playRPGLaunch();
      window.setTimeout(() => this.playRPGExplosion(), 95);
    } else {
      this.playAK();
    }
  }

  public playWeaponSwitch(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(260, t + 0.04);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  public playSwordSwing(): void {
    if (!this.enabled || !this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 3.2;
    f.frequency.setValueAtTime(420, t);
    f.frequency.exponentialRampToValueAtTime(1950, t + 0.12);
    f.frequency.exponentialRampToValueAtTime(300, t + 0.24);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.02, t);
    ng.gain.linearRampToValueAtTime(0.32, t + 0.07);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    n.connect(f).connect(ng).connect(this.ctx.destination);
    n.start(t);
    n.stop(t + 0.26);
  }

  public playSwordHit(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.12);
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playHitmarker(headshot: boolean): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = headshot ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(headshot ? 1850 : 1080, t);
    osc.frequency.exponentialRampToValueAtTime(headshot ? 2650 : 620, t + 0.055);
    g.gain.setValueAtTime(headshot ? 0.28 : 0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.068);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.072);

    if (headshot) {
      // Distinct crisp metallic double-ping for headshots
      const ping = this.ctx.createOscillator();
      const pg = this.ctx.createGain();
      ping.type = 'sine';
      ping.frequency.setValueAtTime(2950, t + 0.025);
      ping.frequency.exponentialRampToValueAtTime(1950, t + 0.11);
      pg.gain.setValueAtTime(0.24, t + 0.025);
      pg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      ping.connect(pg).connect(this.ctx.destination);
      ping.start(t + 0.025);
      ping.stop(t + 0.125);
    }
  }

  public playKillConfirm(headshot = false): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    // Punchy tactical confirmation thump + rising chime
    const punch = this.ctx.createOscillator();
    const pg = this.ctx.createGain();
    punch.type = 'triangle';
    punch.frequency.setValueAtTime(260, t);
    punch.frequency.exponentialRampToValueAtTime(72, t + 0.11);
    pg.gain.setValueAtTime(0.26, t);
    pg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    punch.connect(pg).connect(this.ctx.destination);
    punch.start(t);
    punch.stop(t + 0.13);

    const freqs = headshot ? [1320, 1980] : [980, 1480];
    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const chime = this.ctx.createOscillator();
      const cg = this.ctx.createGain();
      chime.type = 'sine';
      const start = t + 0.03 + idx * 0.055;
      chime.frequency.setValueAtTime(freq, start);
      chime.frequency.exponentialRampToValueAtTime(freq * 1.12, start + 0.09);
      cg.gain.setValueAtTime(0.18, start);
      cg.gain.exponentialRampToValueAtTime(0.001, start + 0.11);
      chime.connect(cg).connect(this.ctx.destination);
      chime.start(start);
      chime.stop(start + 0.12);
    });
  }

  public playCountdownTick(isGo = false): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = isGo ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isGo ? 1046 : 660, t);
    if (isGo) {
      osc.frequency.exponentialRampToValueAtTime(1318, t + 0.14);
    }
    g.gain.setValueAtTime(isGo ? 0.22 : 0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (isGo ? 0.18 : 0.11));
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + (isGo ? 0.19 : 0.12));
  }

  public playReload(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    [0, 0.45, 0.85].forEach((offset, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(idx === 2 ? 540 : 340, t + offset);
      osc.frequency.exponentialRampToValueAtTime(140, t + offset + 0.045);
      g.gain.setValueAtTime(0.14, t + offset);
      g.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.05);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t + offset);
      osc.stop(t + offset + 0.06);
    });
  }

  public playEmpty(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(820, t);
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.035);
  }

  public playEnemyShot(dist: number): void {
    if (!this.enabled || !this.ctx) return;
    const vol = Math.max(0.02, Math.min(0.24, 3.2 / (dist + 2)));
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(290, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.08);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playHurt(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    g.gain.setValueAtTime(0.36, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.21);
  }

  public playPickup(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    [523, 659, 880].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.06);
      g.gain.setValueAtTime(0.14, t + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.12);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.13);
    });
  }

  public playPower(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.24);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  public playTutorialComplete(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    [587.33, 783.99, 1046.5].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);
      g.gain.setValueAtTime(0.18, t + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.18);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.2);
    });
  }

  public playPotBreak(): void {
    if (!this.enabled || !this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    [980, 1420, 660].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.025);
      osc.frequency.exponentialRampToValueAtTime(220, t + i * 0.025 + 0.07);
      g.gain.setValueAtTime(0.2, t + i * 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.025 + 0.08);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t + i * 0.025);
      osc.stop(t + i * 0.025 + 0.09);
    });
  }

  /**
   * Update Web Audio API 3D AudioListener position and forward/up orientation once per frame.
   */
  public updateListenerPose(
    x: number,
    y: number,
    z: number,
    fx: number,
    fy: number,
    fz: number,
    ux = 0,
    uy = 1,
    uz = 0
  ): void {
    if (!this.enabled || !this.ctx || this.footstepVolume <= 0.01) return;
    const listener = this.ctx.listener;
    if (!listener) return;
    const t = this.ctx.currentTime;
    try {
      if (listener.positionX && typeof listener.positionX.setValueAtTime === 'function') {
        listener.positionX.setValueAtTime(x, t);
        listener.positionY.setValueAtTime(y, t);
        listener.positionZ.setValueAtTime(z, t);
        listener.forwardX.setValueAtTime(fx, t);
        listener.forwardY.setValueAtTime(fy, t);
        listener.forwardZ.setValueAtTime(fz, t);
        listener.upX.setValueAtTime(ux, t);
        listener.upY.setValueAtTime(uy, t);
        listener.upZ.setValueAtTime(uz, t);
      } else if (typeof listener.setPosition === 'function' && typeof listener.setOrientation === 'function') {
        listener.setPosition(x, y, z);
        listener.setOrientation(fx, fy, fz, ux, uy, uz);
      }
    } catch {
      // Ignore browser AudioListener quirks
    }
  }

  /**
   * Subtle, short-range directional spatial footstep for nearby remote players using Web Audio PannerNode.
   * Zero audio nodes are allocated when muted, disabled, or outside short range (16m).
   */
  public playSpatialFootstep(
    srcX: number,
    srcY: number,
    srcZ: number,
    listenerX: number,
    listenerY: number,
    listenerZ: number,
    speedMps: number
  ): void {
    if (!this.enabled || !this.ctx || !this.noiseBuf || this.footstepVolume <= 0.01) return;
    if (this.ctx.state !== 'running') return;

    const dx = srcX - listenerX;
    const dy = srcY - listenerY;
    const dz = srcZ - listenerZ;
    const dist = Math.hypot(dx, dy, dz);
    const gain = computeFootstepGain(dist, speedMps, this.footstepVolume);
    if (gain <= 0.002) return;

    const t = this.ctx.currentTime;
    try {
      const panner = this.ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'linear';
      panner.refDistance = 1.8;
      panner.maxDistance = FOOTSTEP_MAX_RANGE_M;
      panner.rolloffFactor = 1.0;

      if (panner.positionX && typeof panner.positionX.setValueAtTime === 'function') {
        panner.positionX.setValueAtTime(srcX, t);
        panner.positionY.setValueAtTime(srcY + 0.15, t);
        panner.positionZ.setValueAtTime(srcZ, t);
      } else if (typeof panner.setPosition === 'function') {
        panner.setPosition(srcX, srcY + 0.15, srcZ);
      }

      const master = this.ctx.createGain();
      master.gain.setValueAtTime(1.0, t);
      master.connect(panner).connect(this.ctx.destination);

      // Subtle low-end boot thud
      const osc = this.ctx.createOscillator();
      const og = this.ctx.createGain();
      const pitchJitter = 0.92 + Math.random() * 0.16;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(98 * pitchJitter, t);
      osc.frequency.exponentialRampToValueAtTime(44 * pitchJitter, t + 0.052);
      og.gain.setValueAtTime(gain * 0.95, t);
      og.gain.exponentialRampToValueAtTime(0.0008, t + 0.06);
      osc.connect(og).connect(master);
      osc.start(t);
      osc.stop(t + 0.065);

      // Soft sole grit brush (band-passed short noise)
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(720 * pitchJitter, t);
      bp.Q.setValueAtTime(1.4, t);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(gain * 0.6, t);
      ng.gain.exponentialRampToValueAtTime(0.0008, t + 0.048);
      noise.connect(bp).connect(ng).connect(master);
      noise.start(t, Math.random() * 0.6, 0.055);
    } catch {
      // Never allow spatial audio failure to impact gameplay
    }
  }

  /**
   * Crisp synthesized reel tick during Lucky Spin scrolling.
   */
  public playSpinTick(pitchScale = 1.0): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = Math.max(420, Math.min(1650, 880 * pitchScale));
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, t + 0.026);
    g.gain.setValueAtTime(0.11, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.035);
  }

  /**
   * Synthesized reward reveal chime scaled by rarity (Common -> Legendary -> Mythic grand prismatic fanfare).
   */
  public playSpinReveal(rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    if (rarity === 'mythic') {
      // Grand prismatic Mythic fanfare: deep sub impact + shimmering crimson-white ascending arpeggio
      const sub = this.ctx.createOscillator();
      const sg = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(160, t);
      sub.frequency.exponentialRampToValueAtTime(42, t + 0.55);
      sg.gain.setValueAtTime(0.32, t);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      sub.connect(sg).connect(this.ctx.destination);
      sub.start(t);
      sub.stop(t + 0.62);

      const notes = [261.63, 392.0, 523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = idx < 3 ? 'sawtooth' : 'triangle';
        const start = t + idx * 0.055;
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.02, start + 0.58);
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(idx < 3 ? 1600 : 4200, start);
        g.gain.setValueAtTime(idx < 3 ? 0.14 : 0.17, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.72);
        osc.connect(filt).connect(g).connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.76);
      });
      return;
    }

    if (rarity === 'legendary') {
      // Rich obsidian-gold chord + ascending crystalline shimmer
      const notes = [293.66, 440, 587.33, 739.99, 880, 1174.66];
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = idx < 2 ? 'sawtooth' : 'triangle';
        const start = t + idx * 0.065;
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.015, start + 0.42);
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(idx < 2 ? 1200 : 3200, start);
        g.gain.setValueAtTime(idx < 2 ? 0.14 : 0.18, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
        osc.connect(filt).connect(g).connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.58);
      });
      return;
    }

    const chord =
      rarity === 'epic'
        ? [523.25, 659.25, 783.99, 1046.5]
        : rarity === 'rare'
          ? [493.88, 659.25, 987.77]
          : [523.25, 659.25];
    chord.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = rarity === 'epic' ? 'triangle' : 'sine';
      const start = t + idx * 0.06;
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(rarity === 'epic' ? 0.16 : 0.13, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + (rarity === 'epic' ? 0.34 : 0.2));
      osc.connect(g).connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }

  /**
   * Signature synthesized kill sound for Legendary AK-47 "Inferno Reaper":
   * Short fiery ember whoosh + warm obsidian-gold resonant impact (bigger on headshot).
   */
  public playInfernoKill(headshot = false): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Sub-ember bass thump
    const bass = this.ctx.createOscillator();
    const bg = this.ctx.createGain();
    bass.type = 'triangle';
    bass.frequency.setValueAtTime(headshot ? 210 : 175, t);
    bass.frequency.exponentialRampToValueAtTime(44, t + (headshot ? 0.24 : 0.18));
    bg.gain.setValueAtTime(headshot ? 0.34 : 0.26, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + (headshot ? 0.26 : 0.2));
    bass.connect(bg).connect(this.ctx.destination);
    bass.start(t);
    bass.stop(t + 0.28);

    // 2. Fiery filtered whoosh burst (if noise buffer ready)
    if (this.noiseBuf) {
      const n = this.ctx.createBufferSource();
      n.buffer = this.noiseBuf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(1.5, t);
      bp.frequency.setValueAtTime(headshot ? 1600 : 1200, t);
      bp.frequency.exponentialRampToValueAtTime(340, t + (headshot ? 0.34 : 0.24));
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(headshot ? 0.28 : 0.2, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + (headshot ? 0.36 : 0.26));
      n.connect(bp).connect(ng).connect(this.ctx.destination);
      n.start(t);
      n.stop(t + 0.38);
    }

    // 3. Golden harmonic forge ring
    const freqs = headshot ? [880, 1318.5, 1760] : [740, 1108.7];
    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      const start = t + 0.02 + idx * 0.045;
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.06, start + 0.18);
      g.gain.setValueAtTime(headshot ? 0.17 : 0.13, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + (headshot ? 0.32 : 0.22));
      osc.connect(g).connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.34);
    });
  }

  /**
   * Crisp Japanese forged-steel blade shimmer + silky air whoosh for Legendary Katana "Sakura Moonblade".
   */
  public playSakuraKatanaSlash(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Silky bandpass wind slash
    if (this.noiseBuf) {
      const n = this.ctx.createBufferSource();
      n.buffer = this.noiseBuf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(2.2, t);
      bp.frequency.setValueAtTime(2600, t);
      bp.frequency.exponentialRampToValueAtTime(520, t + 0.22);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.24, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      n.connect(bp).connect(ng).connect(this.ctx.destination);
      n.start(t);
      n.stop(t + 0.26);
    }

    // 2. Resonant folded-steel harmonic ring
    [1680, 2520].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t + 0.14);
      g.gain.setValueAtTime(idx === 0 ? 0.13 : 0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }

  /**
   * Signature harmonic pentatonic wind-chime + steel resonance for Legendary Katana "Sakura Moonblade" kills.
   */
  public playSakuraKatanaKill(headshot = false): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;

    // Japanese pentatonic chime chord (D5, F#5, A5, D6)
    const notes = headshot ? [587.3, 880, 1174.7, 1760] : [587.3, 880, 1174.7];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      const start = t + idx * 0.04;
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.015, start + 0.3);
      g.gain.setValueAtTime(headshot ? 0.16 : 0.12, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + (headshot ? 0.42 : 0.32));
      osc.connect(g).connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  /**
   * Layered futuristic plasma-rail resonance for Legendary AWM "Void Piercer" shot.
   */
  public playVoidPiercerShot(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Crisp cyan-violet energy rail sweep
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1480, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.22);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);

    // 2. Subtle sub-harmonic gravitational thump
    const sub = this.ctx.createOscillator();
    const sg = this.ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(112, t);
    sub.frequency.exponentialRampToValueAtTime(34, t + 0.26);
    sg.gain.setValueAtTime(0.28, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    sub.connect(sg).connect(this.ctx.destination);
    sub.start(t);
    sub.stop(t + 0.3);
  }

  /**
   * Signature synthesized kill sound for Legendary AWM "Void Piercer":
   * Brief gravitational pull + cosmic cyan-violet crystalline shockwave (bigger on headshot).
   */
  public playVoidPiercerKill(headshot = false): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Gravitational implosion bass drop
    const grav = this.ctx.createOscillator();
    const gg = this.ctx.createGain();
    grav.type = 'sine';
    grav.frequency.setValueAtTime(headshot ? 260 : 210, t);
    grav.frequency.exponentialRampToValueAtTime(38, t + (headshot ? 0.32 : 0.24));
    gg.gain.setValueAtTime(headshot ? 0.36 : 0.28, t);
    gg.gain.exponentialRampToValueAtTime(0.001, t + (headshot ? 0.34 : 0.26));
    grav.connect(gg).connect(this.ctx.destination);
    grav.start(t);
    grav.stop(t + 0.36);

    // 2. Airy cosmic filtered sweep
    if (this.noiseBuf) {
      const n = this.ctx.createBufferSource();
      n.buffer = this.noiseBuf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(2.6, t);
      bp.frequency.setValueAtTime(headshot ? 2400 : 1800, t);
      bp.frequency.exponentialRampToValueAtTime(380, t + (headshot ? 0.42 : 0.3));
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(headshot ? 0.24 : 0.17, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + (headshot ? 0.44 : 0.32));
      n.connect(bp).connect(ng).connect(this.ctx.destination);
      n.start(t);
      n.stop(t + 0.46);
    }

    // 3. Crystalline cyan-violet cosmic harmonic chord
    const notes = headshot ? [659.25, 987.77, 1318.51, 1975.53] : [587.33, 880, 1318.51];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      const start = t + 0.03 + idx * 0.04;
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.03, start + 0.22);
      g.gain.setValueAtTime(headshot ? 0.16 : 0.12, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + (headshot ? 0.38 : 0.26));
      osc.connect(g).connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }

  /**
   * Subtle sudden air-frequency shift when entering/exiting the Void Piercer holographic scope.
   */
  public playVoidScopeToggle(entering: boolean): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;

    // Air-pressure filter swoosh (high -> low when locking into scope; low -> high when exiting)
    if (this.noiseBuf) {
      const n = this.ctx.createBufferSource();
      n.buffer = this.noiseBuf;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.Q.setValueAtTime(2.2, t);
      filt.frequency.setValueAtTime(entering ? 2200 : 520, t);
      filt.frequency.exponentialRampToValueAtTime(entering ? 420 : 2100, t + 0.14);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.11, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      n.connect(filt).connect(ng).connect(this.ctx.destination);
      n.start(t);
      n.stop(t + 0.16);
    }

    // Ultra-clean holographic optics lock chime
    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(entering ? 820 : 1140, t);
    osc.frequency.exponentialRampToValueAtTime(entering ? 1280 : 680, t + 0.085);
    og.gain.setValueAtTime(0.065, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.095);
    osc.connect(og).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Layered electric-prismatic pulse over the heavy M249 LMG shot for Mythic "Tempest Aegis".
   * Pitch rises subtly as sustained-fire heat builds (heat01: 0..1).
   */
  public playTempestShot(heat01 = 0): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const h = Math.max(0, Math.min(1, heat01));

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    const startFreq = 760 + h * 460;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(160 + h * 90, t + 0.085);
    g.gain.setValueAtTime(0.11 + h * 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.095);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Signature synthesized Mythic kill sound for M249 "Tempest Aegis":
   * Deep multi-layer gravitational boom + electric lightning crackle + radiant harmonic swell.
   */
  public playTempestKill(headshot = false): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Multi-layer gravitational drop
    const sub = this.ctx.createOscillator();
    const sg = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(headshot ? 300 : 230, t);
    sub.frequency.exponentialRampToValueAtTime(34, t + (headshot ? 0.4 : 0.3));
    sg.gain.setValueAtTime(headshot ? 0.38 : 0.3, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + (headshot ? 0.42 : 0.32));
    sub.connect(sg).connect(this.ctx.destination);
    sub.start(t);
    sub.stop(t + 0.44);

    // 2. Electric lightning crackle burst (high-Q bandpass sweep)
    if (this.noiseBuf) {
      const n = this.ctx.createBufferSource();
      n.buffer = this.noiseBuf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(4.0, t);
      bp.frequency.setValueAtTime(headshot ? 3600 : 2800, t);
      bp.frequency.exponentialRampToValueAtTime(520, t + (headshot ? 0.36 : 0.26));
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(headshot ? 0.26 : 0.19, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + (headshot ? 0.38 : 0.28));
      n.connect(bp).connect(ng).connect(this.ctx.destination);
      n.start(t);
      n.stop(t + 0.4);
    }

    // 3. Prismatic crimson-white crystalline chord
    const freqs = headshot
      ? [523.25, 783.99, 1046.5, 1318.51, 1567.98]
      : [493.88, 739.99, 987.77, 1318.51];
    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      const start = t + 0.025 + idx * 0.036;
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.035, start + 0.26);
      g.gain.setValueAtTime(headshot ? 0.15 : 0.12, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + (headshot ? 0.44 : 0.32));
      osc.connect(g).connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.46);
    });
  }

  /**
   * Mechanical + holographic accent cues for Mythic M249 cinematic reload phases.
   */
  public playTempestReloadPhase(phase: 'open' | 'swap' | 'close' | 'charge'): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    if (phase === 'open') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(760, t + 0.08);
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    } else if (phase === 'swap') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.11);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    } else if (phase === 'close') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(95, t + 0.09);
      g.gain.setValueAtTime(0.11, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    } else {
      // 'charge'
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(1180, t + 0.12);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    }
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  /**
   * Short holographic shimmer cue when inspecting Mythic M249.
   */
  public playTempestInspect(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    [660, 990, 1320].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      const start = t + idx * 0.055;
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.075, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    });
  }

  /**
   * Short upbeat 3-second synth pulse for the exclusive Mythic M249 emote.
   */
  public playTempestEmote(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const melody = [523.25, 659.25, 783.99, 659.25, 1046.5, 987.77, 783.99, 1046.5];
    melody.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      const start = t + idx * 0.18;
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.095, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    });
  }

  /**
   * Layered golden-corona resonance over the booming SPAS-12 blast for Mythic "Eclipse Breacher".
   */
  public playEclipseShot(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Warm solar-corona harmonic punch
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(68, t + 0.17);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1950, t);
    lp.frequency.exponentialRampToValueAtTime(340, t + 0.18);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    osc.connect(lp).connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.21);

    // 2. Crisp golden metallic chime tail
    const ring = this.ctx.createOscillator();
    const rg = this.ctx.createGain();
    ring.type = 'sine';
    ring.frequency.setValueAtTime(1320, t + 0.01);
    ring.frequency.exponentialRampToValueAtTime(880, t + 0.14);
    rg.gain.setValueAtTime(0.085, t + 0.01);
    rg.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    ring.connect(rg).connect(this.ctx.destination);
    ring.start(t + 0.01);
    ring.stop(t + 0.16);
  }

  /**
   * Signature Supernova kill sound for Mythic SPAS-12 "Eclipse Breacher":
   * Gravitational collapse sub-drop + golden supernova burst + celestial shimmer (larger on headshot).
   */
  public playEclipseKill(headshot = false): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;

    // 1. Deep supernova core detonation
    const sub = this.ctx.createOscillator();
    const sg = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(headshot ? 280 : 220, t);
    sub.frequency.exponentialRampToValueAtTime(32, t + (headshot ? 0.42 : 0.32));
    sg.gain.setValueAtTime(headshot ? 0.42 : 0.32, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + (headshot ? 0.45 : 0.35));
    sub.connect(sg).connect(this.ctx.destination);
    sub.start(t);
    sub.stop(t + 0.48);

    // 2. Radiant stellar burst noise sweep
    if (this.noiseBuf) {
      const n = this.ctx.createBufferSource();
      n.buffer = this.noiseBuf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.setValueAtTime(2.2, t);
      bp.frequency.setValueAtTime(headshot ? 3200 : 2400, t);
      bp.frequency.exponentialRampToValueAtTime(420, t + (headshot ? 0.42 : 0.3));
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(headshot ? 0.28 : 0.2, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + (headshot ? 0.44 : 0.32));
      n.connect(bp).connect(ng).connect(this.ctx.destination);
      n.start(t);
      n.stop(t + 0.46);
    }

    // 3. Ascending golden supernova chord
    const notes = headshot
      ? [440, 659.25, 880, 1108.73, 1760]
      : [440, 659.25, 880, 1318.51];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      const start = t + 0.02 + idx * 0.042;
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.04, start + 0.28);
      g.gain.setValueAtTime(headshot ? 0.16 : 0.125, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + (headshot ? 0.48 : 0.36));
      osc.connect(g).connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  }

  /**
   * Cinematic reload audio for Eclipse Breacher: spinning shell click & final pump shockwave.
   */
  public playEclipseReloadPhase(phase: 'shell' | 'pump'): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    if (phase === 'shell') {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(780, t);
      osc.frequency.exponentialRampToValueAtTime(1240, t + 0.055);
      g.gain.setValueAtTime(0.11, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
      return;
    }

    // 'pump': bold tactical rack + golden shockwave hum
    const rack = this.ctx.createOscillator();
    const rg = this.ctx.createGain();
    rack.type = 'sawtooth';
    rack.frequency.setValueAtTime(290, t);
    rack.frequency.exponentialRampToValueAtTime(84, t + 0.16);
    rg.gain.setValueAtTime(0.17, t);
    rg.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    rack.connect(rg).connect(this.ctx.destination);
    rack.start(t);
    rack.stop(t + 0.2);

    const wave = this.ctx.createOscillator();
    const wg = this.ctx.createGain();
    wave.type = 'sine';
    wave.frequency.setValueAtTime(520, t + 0.04);
    wave.frequency.exponentialRampToValueAtTime(1180, t + 0.2);
    wg.gain.setValueAtTime(0.11, t + 0.04);
    wg.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    wave.connect(wg).connect(this.ctx.destination);
    wave.start(t + 0.04);
    wave.stop(t + 0.24);
  }

  /**
   * Subtle holographic ring optics activation cue when entering/exiting Eclipse ADS sight.
   */
  public playEclipseSightToggle(entering: boolean): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(entering ? 620 : 980, t);
    osc.frequency.exponentialRampToValueAtTime(entering ? 1080 : 540, t + 0.085);
    g.gain.setValueAtTime(0.065, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.095);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Refined golden resonance shimmer when inspecting Eclipse Breacher.
   */
  public playEclipseInspect(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    [587.33, 880, 1174.66].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      const start = t + idx * 0.065;
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.075, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.26);
    });
  }

  /**
   * Distinct 3-second celestial synth flourish for the exclusive Mythic SPAS-12 emote.
   */
  public playEclipseEmote(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73, 880, 1318.51, 1108.73];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      const start = t + idx * 0.21;
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.095, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.22);
    });
  }

  /**
   * Plasma turbine ignition & emerald harmonic dragon-whoosh for Legendary RPG-7V "Nova Dragon".
   */
  public playNovaDragonLaunch(): void {
    if (!this.enabled || !this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;

    // 1. Sub-harmonic dragon roar ignition sweep
    const sub = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(118, t);
    sub.frequency.exponentialRampToValueAtTime(295, t + 0.13);
    sub.frequency.exponentialRampToValueAtTime(42, t + 0.5);
    subG.gain.setValueAtTime(0.42, t);
    subG.gain.exponentialRampToValueAtTime(0.001, t + 0.52);
    sub.connect(subG).connect(this.ctx.destination);
    sub.start(t);
    sub.stop(t + 0.54);

    // 2. Emerald crystalline plasma whine harmonic
    const chime = this.ctx.createOscillator();
    const chimeG = this.ctx.createGain();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(880, t);
    chime.frequency.exponentialRampToValueAtTime(340, t + 0.34);
    chimeG.gain.setValueAtTime(0.16, t);
    chimeG.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    chime.connect(chimeG).connect(this.ctx.destination);
    chime.start(t);
    chime.stop(t + 0.38);

    // 3. Pressurized afterburner jet hiss
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.6;
    f.frequency.setValueAtTime(920, t);
    f.frequency.exponentialRampToValueAtTime(2200, t + 0.16);
    f.frequency.exponentialRampToValueAtTime(340, t + 0.48);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.54, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    n.connect(f).connect(ng).connect(this.ctx.destination);
    n.start(t);
    n.stop(t + 0.52);
  }

  /**
   * Tectonic supernova bass drop + shimmering emerald-gold plasma shockwave for Legendary RPG-7V "Nova Dragon".
   */
  public playNovaDragonExplosion(): void {
    if (!this.enabled || !this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;

    // 1. Massive tectonic sub-drop
    const sub = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(135, t);
    sub.frequency.exponentialRampToValueAtTime(22, t + 0.58);
    subG.gain.setValueAtTime(0.72, t);
    subG.gain.exponentialRampToValueAtTime(0.001, t + 0.62);
    sub.connect(subG).connect(this.ctx.destination);
    sub.start(t);
    sub.stop(t + 0.64);

    // 2. Emerald-gold harmonic shockwave ring
    [523.25, 783.99, 1046.5].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t + 0.02);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.52, t + 0.46);
      g.gain.setValueAtTime(0.11 / (idx + 1), t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t + 0.02);
      osc.stop(t + 0.5);
    });

    // 3. Broad detonation rumble
    const n = this.ctx.createBufferSource();
    n.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2200, t);
    f.frequency.exponentialRampToValueAtTime(140, t + 0.62);
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.66, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.66);
    n.connect(f).connect(ng).connect(this.ctx.destination);
    n.start(t);
    n.stop(t + 0.68);
  }

  /**
   * Victorious crystalline emerald-gold chord on Legendary RPG-7V "Nova Dragon" kills.
   */
  public playNovaDragonKill(headshot = false): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = headshot ? [587.33, 880, 1174.66, 1567.98] : [523.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      const start = t + idx * 0.045;
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.11, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.34);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  }
}
