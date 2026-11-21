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

  public playChickenCluck(): void {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    [680, 920].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.055);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.35, t + i * 0.055 + 0.045);
      g.gain.setValueAtTime(0.18, t + i * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.055 + 0.06);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t + i * 0.055);
      osc.stop(t + i * 0.055 + 0.065);
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
}


