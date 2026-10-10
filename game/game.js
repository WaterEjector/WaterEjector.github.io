/**
 * ============================================================================
 * Speaker Rescue: Water Eject Arcade (165Hz Sonic Blaster)
 * Integrated for WaterEjector (waterejector.devdeskapp.com/game/)
 * Pure HTML5 Canvas + Web Audio API Synthesizer + LocalStorage (Zero External Libs)
 * ============================================================================
 */

(function () {
    'use strict';

    // ========================================================================
    // 1. PROCEDURAL SOUND SYNTHESIZER (0KB External Audio Assets)
    // ========================================================================
    class SoundEngine {
        constructor() {
            this.ctx = null;
            this.muted = localStorage.getItem('we_game_muted') === 'true';
            this.initOnGesture = this.initOnGesture.bind(this);
            window.addEventListener('pointerdown', this.initOnGesture, { once: true });
            window.addEventListener('keydown', this.initOnGesture, { once: true });
        }

        initOnGesture() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        toggleMute() {
            this.muted = !this.muted;
            localStorage.setItem('we_game_muted', this.muted);
            return this.muted;
        }

        playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.2, endFreq = null) {
            if (this.muted || !this.ctx) return;
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                if (endFreq !== null) {
                    osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), this.ctx.currentTime + duration);
                }

                gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            } catch (e) {}
        }

        play165HzShoot() {
            if (this.muted || !this.ctx) return;
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(165, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(330, this.ctx.currentTime + 0.08);

                gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.11);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.11);
            } catch (e) {}
        }

        playDropPop(pitchFactor = 1.0) {
            this.playTone(340 * pitchFactor, 'sine', 0.08, 0.22, 720 * pitchFactor);
        }

        playDustHit() {
            this.playTone(180, 'triangle', 0.07, 0.22, 60);
        }

        playOverheatBeep() {
            this.playTone(880, 'sawtooth', 0.15, 0.25, 440);
        }

        playCombo(comboCount) {
            const baseFreq = 440;
            const noteFreq = baseFreq * Math.pow(1.08, Math.min(12, comboCount));
            this.playTone(noteFreq, 'sine', 0.14, 0.22, noteFreq * 1.25);
        }

        playPowerup() {
            if (this.muted || !this.ctx) return;
            const notes = [261.63, 329.63, 392.00, 523.25];
            notes.forEach((freq, idx) => {
                setTimeout(() => {
                    this.playTone(freq, 'sine', 0.12, 0.2, freq * 1.05);
                }, idx * 45);
            });
        }

        playSuperPulse() {
            if (this.muted || !this.ctx) return;
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(165, this.ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(55, this.ctx.currentTime + 0.6);

                gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 0.6);
            } catch (e) {}
        }

        playDamage() {
            this.playTone(130, 'sawtooth', 0.22, 0.35, 40);
        }

        playVictory() {
            const notes = [392, 523.25, 659.25, 783.99];
            notes.forEach((freq, idx) => {
                setTimeout(() => {
                    this.playTone(freq, 'sine', 0.25, 0.25);
                }, idx * 90);
            });
        }

        playGameOver() {
            const notes = [300, 260, 220, 180];
            notes.forEach((freq, idx) => {
                setTimeout(() => {
                    this.playTone(freq, 'triangle', 0.3, 0.3);
                }, idx * 110);
            });
        }
    }

    // ========================================================================
    // 2. PARTICLE & ENTITY SYSTEM
    // ========================================================================
    class Particle {
        constructor(x, y, color, size, vx, vy, life = 1.0) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.size = size;
            this.vx = vx;
            this.vy = vy;
            this.life = life;
            this.maxLife = life;
            this.decay = 0.02 + Math.random() * 0.03;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += 0.08;
            this.life -= this.decay;
        }

        draw(ctx) {
            const alpha = Math.max(0, this.life / this.maxLife);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    class FloatingText {
        constructor(x, y, text, color = '#38BDF8', size = 16) {
            this.x = x;
            this.y = y;
            this.text = text;
            this.color = color;
            this.size = size;
            this.alpha = 1.0;
            this.vy = -1.2;
        }

        update() {
            this.y += this.vy;
            this.alpha -= 0.022;
        }

        draw(ctx) {
            if (this.alpha <= 0) return;
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = this.color;
            ctx.font = `bold ${this.size}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 8;
            ctx.fillText(this.text, this.x, this.y);
            ctx.restore();
        }
    }

    // ========================================================================
    // 3. MAIN GAME CONTROLLER
    // ========================================================================
    class GameApp {
        constructor() {
            this.canvas = document.getElementById('gameCanvas');
            if (!this.canvas) return;
            this.ctx = this.canvas.getContext('2d');
            this.sound = new SoundEngine();

            this.dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.width = 400;
            this.height = 500;

            // States: 'MENU', 'PLAYING', 'GAMEOVER', 'LEVEL_CLEAR'
            this.state = 'MENU';
            this.score = 0;
            this.highScore = parseInt(localStorage.getItem('we_game_highscore') || '0', 10);
            this.level = 1;
            this.health = 100;
            this.heat = 0;             // Speaker coil heat: 0 to 100
            this.isOverheated = false;
            this.combo = 0;
            this.maxCombo = 0;
            this.comboTimer = 0;
            this.dropsCleaned = 0;
            this.dustCleaned = 0;
            this.autoFire = false;
            this.screenShake = 0;

            this.player = {
                x: 200,
                y: 455,
                width: 60,
                height: 30,
                vx: 0,
                speed: 7.0,
                recoil: 0,
                shieldActive: false,
                shieldTimer: 0,
                triShotTimer: 0
            };

            this.waves = [];
            this.enemies = [];
            this.boss = null;
            this.powerups = [];
            this.particles = [];
            this.floatTexts = [];

            this.spawnTimer = 0;
            this.spawnInterval = 85;
            this.lastShootTime = 0;
            this.shootCooldown = 190;

            this.keys = {};
            this.pointerActive = false;
            this.pointerX = 200;

            this.initDOM();
            this.initEvents();
            this.resize();
            this.loop = this.loop.bind(this);
            requestAnimationFrame(this.loop);
        }

        initDOM() {
            this.uiScore = document.getElementById('hudScore');
            this.uiHigh = document.getElementById('hudHigh');
            this.uiCombo = document.getElementById('hudCombo');
            this.uiLevel = document.getElementById('hudLevel');
            this.uiHealthFill = document.getElementById('healthFill');
            this.uiHeatFill = document.getElementById('heatFill');

            this.startScreen = document.getElementById('startScreen');
            this.gameOverScreen = document.getElementById('gameOverScreen');
            this.levelClearScreen = document.getElementById('levelClearScreen');

            this.startBtn = document.getElementById('startBtn');
            this.restartBtn = document.getElementById('restartBtn');
            this.nextLevelBtn = document.getElementById('nextLevelBtn');
            this.muteBtn = document.getElementById('gameMuteBtn');
            this.shareBtn = document.getElementById('shareBtn');
            this.autoFireToggle = document.getElementById('autoFireToggle');

            this.btnLeft = document.getElementById('btnLeft');
            this.btnRight = document.getElementById('btnRight');
            this.btnFire = document.getElementById('btnFire');

            this.updateHUD();
        }

        initEvents() {
            window.addEventListener('resize', () => this.resize());

            // Keyboard Controls
            window.addEventListener('keydown', (e) => {
                this.keys[e.key] = true;
                if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                    e.preventDefault();
                    if (this.state === 'PLAYING') this.shootWave();
                }
            });

            window.addEventListener('keyup', (e) => {
                this.keys[e.key] = false;
            });

            // Smooth Direct Canvas Drag / Touch Controls
            const isFsMode = () => document.body.classList.contains('game-fullscreen-active');
            const handlePointer = (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : this.pointerX);
                this.pointerX = (clientX - rect.left) * (this.width / rect.width);
            };

            this.canvas.addEventListener('pointerdown', (e) => {
                if (isFsMode() && e.cancelable) e.preventDefault();
                this.pointerActive = true;
                handlePointer(e);
                if (this.state === 'PLAYING' && !this.autoFire) {
                    this.shootWave();
                }
            });

            this.canvas.addEventListener('pointermove', (e) => {
                if (this.pointerActive) {
                    if (isFsMode() && e.cancelable) e.preventDefault();
                    handlePointer(e);
                }
            });

            this.canvas.addEventListener('touchmove', (e) => {
                if (isFsMode() && e.cancelable) {
                    e.preventDefault();
                }
            });

            const endPointer = () => { this.pointerActive = false; };
            window.addEventListener('pointerup', endPointer);
            window.addEventListener('pointercancel', endPointer);

            // Ergonomic Touch D-Pad buttons
            const setupButton = (el, pressCallback, releaseCallback) => {
                if (!el) return;
                el.addEventListener('pointerdown', (e) => {
                    e.preventDefault();
                    pressCallback();
                });
                el.addEventListener('pointerup', (e) => {
                    e.preventDefault();
                    if (releaseCallback) releaseCallback();
                });
                el.addEventListener('pointerleave', (e) => {
                    if (releaseCallback) releaseCallback();
                });
            };

            setupButton(this.btnLeft, () => { this.keys['ArrowLeft'] = true; }, () => { this.keys['ArrowLeft'] = false; });
            setupButton(this.btnRight, () => { this.keys['ArrowRight'] = true; }, () => { this.keys['ArrowRight'] = false; });
            setupButton(this.btnFire, () => { if (this.state === 'PLAYING') this.shootWave(); });

            if (this.startBtn) this.startBtn.addEventListener('click', () => this.startGame(1));
            if (this.restartBtn) this.restartBtn.addEventListener('click', () => this.startGame(1));
            if (this.nextLevelBtn) this.nextLevelBtn.addEventListener('click', () => this.startGame(this.level + 1));

            // Auto-fire Toggle
            if (this.autoFireToggle) {
                this.autoFireToggle.addEventListener('click', () => {
                    this.autoFire = !this.autoFire;
                    const toggleSwitch = this.autoFireToggle.querySelector('.toggle-switch');
                    if (toggleSwitch) {
                        if (this.autoFire) toggleSwitch.classList.add('active');
                        else toggleSwitch.classList.remove('active');
                    }
                });
            }

            // Mute Button
            if (this.muteBtn) {
                this.muteBtn.addEventListener('click', () => {
                    const isMuted = this.sound.toggleMute();
                    this.muteBtn.innerHTML = isMuted
                        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'
                        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
                });
            }

            if (this.shareBtn) {
                this.shareBtn.addEventListener('click', () => this.shareScore());
            }
        }

        resize() {
            if (!this.canvas || !this.canvas.parentElement) return;
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.width = rect.width;
            this.height = rect.height;

            this.canvas.width = this.width * this.dpr;
            this.canvas.height = this.height * this.dpr;
            this.ctx.scale(this.dpr, this.dpr);

            if (this.player) {
                this.player.y = this.height - 45;
                this.player.x = Math.max(30, Math.min(this.width - 30, this.player.x));
            }
        }

        startGame(levelNum = 1) {
            this.level = levelNum;
            this.score = (levelNum === 1) ? 0 : this.score;
            this.health = 100;
            this.heat = 0;
            this.isOverheated = false;
            this.combo = 0;
            this.comboTimer = 0;
            this.screenShake = 0;
            if (levelNum === 1) {
                this.dropsCleaned = 0;
                this.dustCleaned = 0;
                this.maxCombo = 0;
            }

            this.waves = [];
            this.enemies = [];
            this.boss = null;
            this.powerups = [];
            this.particles = [];
            this.floatTexts = [];

            this.player.x = this.width / 2;
            this.player.shieldActive = false;
            this.player.triShotTimer = 0;

            this.spawnTimer = 0;
            // Higher level = faster spawns
            this.spawnInterval = Math.max(34, 85 - (this.level * 5));

            // Check if this is a Boss Level (e.g. Level 3, 6, 9)
            if (this.level % 3 === 0) {
                const bossHp = 12 + (this.level * 4);
                this.boss = new TitanBoss(this.width / 2, 70, bossHp);
                this.floatTexts.push(new FloatingText(this.width / 2, 130, '⚠️ WARNING: TITAN BOSS INCOMING!', '#EF4444', 18));
            }

            if (this.startScreen) this.startScreen.classList.add('hidden');
            if (this.gameOverScreen) this.gameOverScreen.classList.add('hidden');
            if (this.levelClearScreen) this.levelClearScreen.classList.add('hidden');

            this.state = 'PLAYING';
            this.sound.play165HzShoot();
            this.updateHUD();
        }

        shootWave() {
            if (this.isOverheated) {
                this.sound.playOverheatBeep();
                this.floatTexts.push(new FloatingText(this.player.x, this.player.y - 30, 'COIL OVERHEATED!', '#EF4444', 14));
                return;
            }

            const now = performance.now();
            if (now - this.lastShootTime < this.shootCooldown) return;
            this.lastShootTime = now;

            // Heat builds up with each shot (+13%)
            this.heat += 13;
            if (this.heat >= 100) {
                this.heat = 100;
                this.isOverheated = true;
                this.sound.playOverheatBeep();
                this.floatTexts.push(new FloatingText(this.player.x, this.player.y - 45, '⚠️ OVERHEATED (COOLING...)', '#EF4444', 16));
                // Steam particles
                for (let s = 0; s < 8; s++) {
                    this.particles.push(new Particle(this.player.x, this.player.y - 15, '#CBD5E1', 3, (Math.random() - 0.5) * 3, -2, 0.7));
                }
            }

            this.sound.play165HzShoot();
            this.player.recoil = 6;

            if (this.player.triShotTimer > 0) {
                this.waves.push(new SonicWave(this.player.x, this.player.y - 12, 0, -8.5));
                this.waves.push(new SonicWave(this.player.x - 12, this.player.y - 10, -2.5, -8));
                this.waves.push(new SonicWave(this.player.x + 12, this.player.y - 10, 2.5, -8));
            } else {
                this.waves.push(new SonicWave(this.player.x, this.player.y - 12, 0, -9));
            }
        }

        triggerSuperPulse() {
            this.sound.playSuperPulse();
            this.screenShake = 14;
            this.floatTexts.push(new FloatingText(this.width / 2, this.height / 2, '⚡ 165Hz SUPER PULSE!', '#38BDF8', 22));

            // Damage or eliminate all enemies
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const en = this.enemies[i];
                this.destroyEnemy(en, i, true);
            }

            if (this.boss) {
                this.boss.hp -= 8;
                if (this.boss.hp <= 0) {
                    this.destroyBoss();
                }
            }

            for (let i = 0; i < 40; i++) {
                const angle = (i / 40) * Math.PI * 2;
                const spd = 6 + Math.random() * 4;
                this.particles.push(new Particle(
                    this.width / 2,
                    this.height / 2,
                    '#38BDF8',
                    3.5,
                    Math.cos(angle) * spd,
                    Math.sin(angle) * spd,
                    1.2
                ));
            }
        }

        spawnEnemy() {
            const x = 30 + Math.random() * (this.width - 60);
            const rand = Math.random();

            // Diversity based on level
            if (rand < 0.45) {
                // Regular Drop
                this.enemies.push(new WaterDrop(x, -25, 1.5 + (this.level * 0.18)));
            } else if (rand < 0.65) {
                // Speed Rain Droplet (Fast attack)
                this.enemies.push(new SpeedDrop(x, -25, 2.6 + (this.level * 0.22)));
            } else if (rand < 0.82) {
                // Micro Dust Clod (Tough, 2 hits)
                this.enemies.push(new DustClod(x, -25, 1.2 + (this.level * 0.14)));
            } else if (rand < 0.94) {
                // Toxic Acid Drop (Zigzags, heavy damage)
                this.enemies.push(new AcidDrop(x, -25, 1.4 + (this.level * 0.15)));
            } else {
                // Golden Drop
                this.enemies.push(new GoldenDrop(x, -25, 1.8));
            }
        }

        destroyEnemy(en, index, fromSuper = false) {
            this.enemies.splice(index, 1);

            for (let p = 0; p < en.particleCount; p++) {
                const spd = 2 + Math.random() * 4;
                const ang = Math.random() * Math.PI * 2;
                this.particles.push(new Particle(
                    en.x,
                    en.y,
                    en.particleColor,
                    2.5,
                    Math.cos(ang) * spd,
                    Math.sin(ang) * spd,
                    0.8
                ));
            }

            // Power-up spawn chance
            if (en.type === 'gold' || Math.random() < 0.08) {
                this.spawnPowerup(en.x, en.y);
            }

            // Clutch save bonus (popped right before grill)
            let clutchBonus = 0;
            if (en.y > this.height - 80) {
                clutchBonus = 50;
                this.floatTexts.push(new FloatingText(en.x, en.y - 15, 'CLUTCH SAVE! +50', '#10B981', 14));
            }

            this.combo++;
            this.comboTimer = 140;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;

            const comboMultiplier = Math.min(5, 1 + Math.floor(this.combo / 4));
            const pts = (en.baseScore + clutchBonus) * comboMultiplier;
            this.score += pts;

            if (en.type === 'dust') this.dustCleaned++;
            else this.dropsCleaned++;

            this.sound.playCombo(this.combo);
            this.floatTexts.push(new FloatingText(en.x, en.y, `+${pts}`, en.particleColor, 14));

            if (this.combo >= 4 && this.combo % 4 === 0) {
                this.floatTexts.push(new FloatingText(this.player.x, this.player.y - 45, `COMBO x${comboMultiplier}!`, '#F59E0B', 18));
            }

            // Check level clear condition
            const targetDrops = 18 + (this.level * 6);
            if ((this.dropsCleaned + this.dustCleaned) >= targetDrops && !this.boss) {
                this.levelClear();
            }
        }

        destroyBoss() {
            if (!this.boss) return;
            this.sound.playSuperPulse();
            this.screenShake = 18;

            for (let p = 0; p < 45; p++) {
                const spd = 2 + Math.random() * 6;
                const ang = Math.random() * Math.PI * 2;
                this.particles.push(new Particle(this.boss.x, this.boss.y, '#8B5CF6', 3.5, Math.cos(ang) * spd, Math.sin(ang) * spd, 1.2));
            }

            this.score += 1500;
            this.floatTexts.push(new FloatingText(this.boss.x, this.boss.y, '+1,500 BOSS CLEARED!', '#10B981', 22));
            this.boss = null;
            this.levelClear();
        }

        spawnPowerup(x, y) {
            const types = ['165HZ', 'SPREAD', 'SHIELD', 'HEAL'];
            const chosen = types[Math.floor(Math.random() * types.length)];
            this.powerups.push(new PowerupItem(x, y, chosen));
        }

        applyPowerup(item) {
            this.sound.playPowerup();
            switch (item.type) {
                case '165HZ':
                    this.triggerSuperPulse();
                    break;
                case 'SPREAD':
                    this.player.triShotTimer = 400;
                    this.floatTexts.push(new FloatingText(this.player.x, this.player.y - 40, 'TRI-WAVE CANNON!', '#A78BFA', 18));
                    break;
                case 'SHIELD':
                    this.player.shieldActive = true;
                    this.player.shieldTimer = 450;
                    this.floatTexts.push(new FloatingText(this.player.x, this.player.y - 40, 'SONIC SHIELD ON!', '#10B981', 18));
                    break;
                case 'HEAL':
                    this.health = Math.min(100, this.health + 30);
                    this.floatTexts.push(new FloatingText(this.player.x, this.player.y - 40, '+30% SPEAKER HEALTH', '#10B981', 18));
                    break;
            }
        }

        speakerDamaged(damage = 18) {
            if (this.player.shieldActive) {
                this.sound.playDustHit();
                this.floatTexts.push(new FloatingText(this.player.x, this.player.y - 35, 'SHIELD BLOCKED!', '#38BDF8', 16));
                return;
            }

            this.health = Math.max(0, this.health - damage);
            this.combo = 0;
            this.screenShake = 12;
            this.sound.playDamage();
            if (navigator.vibrate) navigator.vibrate(50);
            this.floatTexts.push(new FloatingText(this.player.x, this.player.y - 35, `-${damage}% HEALTH`, '#EF4444', 16));

            if (this.health <= 0) {
                this.gameOver();
            }
        }

        levelClear() {
            this.state = 'LEVEL_CLEAR';
            this.sound.playVictory();

            const cScore = document.getElementById('clearScore');
            const cDrops = document.getElementById('clearDrops');
            const cCombo = document.getElementById('clearCombo');
            if (cScore) cScore.textContent = this.score;
            if (cDrops) cDrops.textContent = this.dropsCleaned;
            if (cCombo) cCombo.textContent = `${this.maxCombo}x`;
            if (this.levelClearScreen) this.levelClearScreen.classList.remove('hidden');
        }

        gameOver() {
            this.state = 'GAMEOVER';
            this.sound.playGameOver();

            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('we_game_highscore', this.highScore);
            }

            const fScore = document.getElementById('finalScore');
            const fHigh = document.getElementById('finalHigh');
            const fDrops = document.getElementById('finalDrops');
            const fLevel = document.getElementById('finalLevel');
            if (fScore) fScore.textContent = this.score;
            if (fHigh) fHigh.textContent = this.highScore;
            if (fDrops) fDrops.textContent = this.dropsCleaned;
            if (fLevel) fLevel.textContent = this.level;

            if (this.gameOverScreen) this.gameOverScreen.classList.remove('hidden');
        }

        updateHUD() {
            if (this.uiScore) this.uiScore.textContent = this.score;
            if (this.uiHigh) this.uiHigh.textContent = this.highScore;
            if (this.uiCombo) this.uiCombo.textContent = this.combo > 1 ? `${this.combo}x` : '1x';
            if (this.uiLevel) this.uiLevel.textContent = this.level;

            if (this.uiHealthFill) {
                this.uiHealthFill.style.width = `${this.health}%`;
                if (this.health < 35) {
                    this.uiHealthFill.classList.add('warning');
                } else {
                    this.uiHealthFill.classList.remove('warning');
                }
            }

            // Heat Bar update
            if (this.uiHeatFill) {
                this.uiHeatFill.style.width = `${this.heat}%`;
                if (this.isOverheated) {
                    this.uiHeatFill.classList.add('overheat');
                } else {
                    this.uiHeatFill.classList.remove('overheat');
                }
            }
        }

        update() {
            if (this.state !== 'PLAYING') return;

            // Heat dissipation (-0.65 per frame)
            if (this.heat > 0) {
                this.heat = Math.max(0, this.heat - 0.65);
                if (this.isOverheated && this.heat <= 25) {
                    this.isOverheated = false;
                    this.floatTexts.push(new FloatingText(this.player.x, this.player.y - 30, 'COIL COOLED!', '#10B981', 14));
                }
            }

            if (this.autoFire && !this.isOverheated) {
                this.shootWave();
            }

            // Smooth Player Movement
            if (this.pointerActive) {
                const targetX = Math.max(30, Math.min(this.width - 30, this.pointerX));
                this.player.x += (targetX - this.player.x) * 0.25;
            } else {
                if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
                    this.player.x -= this.player.speed;
                }
                if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
                    this.player.x += this.player.speed;
                }
                this.player.x = Math.max(30, Math.min(this.width - 30, this.player.x));
            }

            if (this.player.recoil > 0) this.player.recoil -= 0.6;

            if (this.player.shieldTimer > 0) {
                this.player.shieldTimer--;
                if (this.player.shieldTimer <= 0) this.player.shieldActive = false;
            }
            if (this.player.triShotTimer > 0) {
                this.player.triShotTimer--;
            }

            if (this.combo > 0) {
                this.comboTimer--;
                if (this.comboTimer <= 0) {
                    this.combo = 0;
                }
            }

            // Sonic Waves
            for (let i = this.waves.length - 1; i >= 0; i--) {
                const w = this.waves[i];
                w.update();
                if (w.y < -30) {
                    this.waves.splice(i, 1);
                }
            }

            // Boss Logic
            if (this.boss) {
                this.boss.update(this.width);
                if (Math.random() < 0.035) {
                    // Boss spawns mini drops
                    this.enemies.push(new SpeedDrop(this.boss.x + (Math.random() - 0.5) * 40, this.boss.y + 20, 2.5));
                }

                // Check wave hits against Boss
                for (let j = this.waves.length - 1; j >= 0; j--) {
                    const wave = this.waves[j];
                    const dist = Math.hypot(wave.x - this.boss.x, wave.y - this.boss.y);
                    if (dist < wave.radius + this.boss.radius) {
                        this.boss.hp--;
                        this.sound.playDropPop(0.85);
                        for (let p = 0; p < 3; p++) {
                            this.particles.push(new Particle(wave.x, wave.y, '#8B5CF6', 2, (Math.random() - 0.5) * 3, -2));
                        }
                        this.waves.splice(j, 1);
                        if (this.boss.hp <= 0) {
                            this.destroyBoss();
                            break;
                        }
                    }
                }
            }

            // Normal Enemy Spawns
            this.spawnTimer++;
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnTimer = 0;
                this.spawnEnemy();
            }

            // Enemies Update & Collision
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const en = this.enemies[i];
                en.update();

                // Hit speaker base line
                if (en.y >= this.height - 35) {
                    this.speakerDamaged(en.damage);
                    this.enemies.splice(i, 1);
                    continue;
                }

                // Hit by sound wave
                for (let j = this.waves.length - 1; j >= 0; j--) {
                    const wave = this.waves[j];
                    const dist = Math.hypot(wave.x - en.x, wave.y - en.y);
                    if (dist < wave.radius + en.radius) {
                        en.hp--;
                        this.sound.playDropPop(1.0 + (3 - en.hp) * 0.2);

                        for (let p = 0; p < 4; p++) {
                            this.particles.push(new Particle(wave.x, wave.y, '#38BDF8', 2, (Math.random() - 0.5) * 3, -2));
                        }

                        this.waves.splice(j, 1);

                        if (en.hp <= 0) {
                            this.destroyEnemy(en, i);
                        }
                        break;
                    }
                }
            }

            // Power-ups Update
            for (let i = this.powerups.length - 1; i >= 0; i--) {
                const p = this.powerups[i];
                p.update();

                const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
                if (dist < 38) {
                    this.applyPowerup(p);
                    this.powerups.splice(i, 1);
                    continue;
                }

                if (p.y > this.height) {
                    this.powerups.splice(i, 1);
                }
            }

            // Particles
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const pt = this.particles[i];
                pt.update();
                if (pt.life <= 0) this.particles.splice(i, 1);
            }

            // Floating Text
            for (let i = this.floatTexts.length - 1; i >= 0; i--) {
                const ft = this.floatTexts[i];
                ft.update();
                if (ft.alpha <= 0) this.floatTexts.splice(i, 1);
            }

            this.updateHUD();
        }

        draw() {
            this.ctx.save();
            this.ctx.clearRect(0, 0, this.width, this.height);

            // Screen Shake displacement
            if (this.screenShake > 0) {
                const sx = (Math.random() - 0.5) * this.screenShake;
                const sy = (Math.random() - 0.5) * this.screenShake;
                this.ctx.translate(sx, sy);
                this.screenShake *= 0.86;
                if (this.screenShake < 0.4) this.screenShake = 0;
            }

            this.drawBackgroundGrid();

            for (let i = 0; i < this.particles.length; i++) this.particles[i].draw(this.ctx);
            for (let i = 0; i < this.powerups.length; i++) this.powerups[i].draw(this.ctx);
            for (let i = 0; i < this.enemies.length; i++) this.enemies[i].draw(this.ctx);
            if (this.boss) this.boss.draw(this.ctx);
            for (let i = 0; i < this.waves.length; i++) this.waves[i].draw(this.ctx);
            this.drawPlayer();
            for (let i = 0; i < this.floatTexts.length; i++) this.floatTexts[i].draw(this.ctx);

            this.ctx.restore();
        }

        drawBackgroundGrid() {
            this.ctx.save();
            this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
            this.ctx.lineWidth = 1;
            const step = 40;
            for (let x = 0; x < this.width; x += step) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.height);
                this.ctx.stroke();
            }
            this.ctx.restore();
        }

        drawPlayer() {
            const p = this.player;
            const yPos = p.y + p.recoil;

            this.ctx.save();

            // Sonic Shield Glow
            if (p.shieldActive) {
                this.ctx.beginPath();
                this.ctx.arc(p.x, yPos, 42, 0, Math.PI * 2);
                this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
                this.ctx.lineWidth = 3;
                this.ctx.shadowColor = '#10B981';
                this.ctx.shadowBlur = 15;
                this.ctx.stroke();

                this.ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
                this.ctx.fill();
            }

            // Overheated steam aura
            if (this.isOverheated) {
                this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(p.x - 30, yPos - 8, 60, 28);
            }

            // Speaker Base Housing (Metal chassis)
            this.ctx.fillStyle = '#1E293B';
            this.ctx.strokeStyle = this.isOverheated ? '#EF4444' : '#475569';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            if (this.ctx.roundRect) {
                this.ctx.roundRect(p.x - 28, yPos - 6, 56, 26, 8);
            } else {
                this.ctx.rect(p.x - 28, yPos - 6, 56, 26);
            }
            this.ctx.fill();
            this.ctx.stroke();

            // Speaker Cone Gradient
            const grad = this.ctx.createRadialGradient(p.x, yPos - 10, 2, p.x, yPos - 10, 24);
            if (this.isOverheated) {
                grad.addColorStop(0, '#EF4444');
                grad.addColorStop(1, '#7F1D1D');
            } else {
                grad.addColorStop(0, '#9333EA');
                grad.addColorStop(0.6, '#6D28D9');
                grad.addColorStop(1, '#06B6D4');
            }

            this.ctx.beginPath();
            this.ctx.arc(p.x, yPos - 8, 22, 0, Math.PI, true);
            this.ctx.fillStyle = grad;
            this.ctx.fill();
            this.ctx.strokeStyle = this.isOverheated ? '#EF4444' : '#38BDF8';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Dust Cap / Acoustic Core
            this.ctx.beginPath();
            this.ctx.arc(p.x, yPos - 8, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = this.isOverheated ? '#FCA5A5' : '#F8FAFC';
            this.ctx.shadowColor = '#38BDF8';
            this.ctx.shadowBlur = 10;
            this.ctx.fill();

            // 165Hz label
            this.ctx.fillStyle = '#CBD5E1';
            this.ctx.font = '800 8px Inter, sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('165Hz', p.x, yPos + 12);

            this.ctx.restore();
        }

        loop() {
            this.update();
            this.draw();
            requestAnimationFrame(this.loop);
        }

        shareScore() {
            if (window.AcousticScorecard) {
                window.AcousticScorecard.show({
                    gameName: 'Speaker Rescue',
                    score: this.score,
                    bestScore: this.highScore,
                    level: this.level,
                    extraText: `Drops Cleaned: ${this.dropsCleaned} | Max Combo: ${this.maxCombo}x`,
                    url: 'https://waterejector.devdeskapp.com/game/'
                });
                return;
            }

            const off = document.createElement('canvas');
            off.width = 600;
            off.height = 600;
            const oCtx = off.getContext('2d');

            const bgGrad = oCtx.createLinearGradient(0, 0, 600, 600);
            bgGrad.addColorStop(0, '#0F172A');
            bgGrad.addColorStop(1, '#0B0F19');
            oCtx.fillStyle = bgGrad;
            oCtx.fillRect(0, 0, 600, 600);

            oCtx.strokeStyle = '#8B5CF6';
            oCtx.lineWidth = 10;
            oCtx.strokeRect(10, 10, 580, 580);

            oCtx.fillStyle = '#FFFFFF';
            oCtx.font = 'bold 32px Inter, sans-serif';
            oCtx.textAlign = 'center';
            oCtx.fillText('🔊 SPEAKER RESCUE', 300, 80);

            oCtx.fillStyle = '#38BDF8';
            oCtx.font = '600 18px Inter, sans-serif';
            oCtx.fillText('Water & Dust Eject Arcade by WaterEjector', 300, 115);

            oCtx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            if (oCtx.roundRect) {
                oCtx.roundRect(80, 150, 440, 200, 20);
            } else {
                oCtx.rect(80, 150, 440, 200);
            }
            oCtx.fill();

            oCtx.fillStyle = '#94A3B8';
            oCtx.font = '700 16px Inter, sans-serif';
            oCtx.fillText('TOTAL RESCUE SCORE', 300, 195);

            oCtx.fillStyle = '#38BDF8';
            oCtx.font = '900 68px Inter, sans-serif';
            oCtx.fillText(this.score.toLocaleString(), 300, 275);

            oCtx.fillStyle = '#F8FAFC';
            oCtx.font = '700 18px Inter, sans-serif';
            oCtx.fillText(`Level: ${this.level}   |   Cleaned: ${this.dropsCleaned}   |   Max Combo: ${this.maxCombo}x`, 300, 325);

            let rank = 'Sound Cadet';
            if (this.score > 5000) rank = 'Acoustic Legend ⭐⭐⭐';
            else if (this.score > 2500) rank = 'Master Cleaner ⭐⭐';
            else if (this.score > 1000) rank = 'Sonic Specialist ⭐';

            oCtx.fillStyle = '#10B981';
            oCtx.font = 'bold 22px Inter, sans-serif';
            oCtx.fillText(`Rank: ${rank}`, 300, 400);

            oCtx.fillStyle = '#F8FAFC';
            oCtx.font = '600 18px Inter, sans-serif';
            oCtx.fillText('Play Free: waterejector.devdeskapp.com/game/', 300, 480);

            oCtx.fillStyle = '#8B5CF6';
            oCtx.font = '700 16px Inter, sans-serif';
            oCtx.fillText('Fix Real Speaker with 165Hz Sound Ejector', 300, 520);

            off.toBlob((blob) => {
                if (navigator.share && blob) {
                    const file = new File([blob], 'speaker-rescue-score.png', { type: 'image/png' });
                    navigator.share({
                        title: 'Speaker Rescue High Score!',
                        text: `I scored ${this.score} points ejecting water and dust in Speaker Rescue! Can you beat me?`,
                        url: 'https://waterejector.devdeskapp.com/game/',
                        files: [file]
                    }).catch(() => {});
                } else {
                    const link = document.createElement('a');
                    link.download = `speaker-rescue-${this.score}.png`;
                    link.href = off.toDataURL('image/png');
                    link.click();
                }
            });
        }
    }

    // ========================================================================
    // 4. ENTITY CLASSES (Waves, Drops, Boss, Dust, Power-ups)
    // ========================================================================
    class SonicWave {
        constructor(x, y, vx, vy) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.radius = 12;
            this.maxRadius = 26;
            this.growth = 0.5;
            this.alpha = 1.0;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.radius < this.maxRadius) this.radius += this.growth;
        }

        draw(ctx) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, Math.PI * 1.1, Math.PI * 1.9);
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#06B6D4';
            ctx.shadowBlur = 12;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(this.x, this.y + 4, this.radius * 0.6, Math.PI * 1.15, Math.PI * 1.85);
            ctx.strokeStyle = '#A78BFA';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }
    }

    class WaterDrop {
        constructor(x, y, speed) {
            this.type = 'water';
            this.x = x;
            this.y = y;
            this.speed = speed;
            this.radius = 14;
            this.hp = 1;
            this.damage = 15;
            this.baseScore = 50;
            this.wobble = Math.random() * Math.PI * 2;
            this.particleColor = '#38BDF8';
            this.particleCount = 10;
        }

        update() {
            this.y += this.speed;
            this.wobble += 0.08;
            this.x += Math.sin(this.wobble) * 0.6;
        }

        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);

            ctx.beginPath();
            ctx.moveTo(0, -this.radius * 1.2);
            ctx.quadraticCurveTo(this.radius * 1.1, 0, this.radius * 0.9, this.radius * 0.8);
            ctx.arc(0, this.radius * 0.6, this.radius * 0.9, 0, Math.PI);
            ctx.quadraticCurveTo(-this.radius * 1.1, 0, 0, -this.radius * 1.2);

            const grad = ctx.createLinearGradient(0, -this.radius, 0, this.radius);
            grad.addColorStop(0, '#7DD3FC');
            grad.addColorStop(1, '#0284C7');
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(-this.radius * 0.35, -this.radius * 0.2, 2.5, 5, -0.4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fill();

            ctx.restore();
        }
    }

    class SpeedDrop {
        constructor(x, y, speed) {
            this.type = 'speed';
            this.x = x;
            this.y = y;
            this.speed = speed;
            this.radius = 11;
            this.hp = 1;
            this.damage = 18;
            this.baseScore = 80;
            this.particleColor = '#06B6D4';
            this.particleCount = 10;
        }

        update() {
            this.y += this.speed;
        }

        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);

            // Sleek narrow stream droplet
            ctx.beginPath();
            ctx.moveTo(0, -this.radius * 1.6);
            ctx.lineTo(this.radius * 0.8, this.radius * 0.6);
            ctx.lineTo(-this.radius * 0.8, this.radius * 0.6);
            ctx.closePath();

            ctx.fillStyle = '#06B6D4';
            ctx.shadowColor = '#38BDF8';
            ctx.shadowBlur = 8;
            ctx.fill();

            ctx.restore();
        }
    }

    class AcidDrop {
        constructor(x, y, speed) {
            this.type = 'acid';
            this.x = x;
            this.y = y;
            this.speed = speed;
            this.radius = 15;
            this.hp = 1;
            this.damage = 25; // High damage!
            this.baseScore = 100;
            this.angle = Math.random() * Math.PI;
            this.particleColor = '#22C55E';
            this.particleCount = 14;
        }

        update() {
            this.y += this.speed;
            this.angle += 0.08;
            this.x += Math.sin(this.angle) * 1.4; // Zigzag attack
        }

        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);

            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#15803D';
            ctx.strokeStyle = '#4ADE80';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#22C55E';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.stroke();

            // Hazard warning dot
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#FACC15';
            ctx.fill();

            ctx.restore();
        }
    }

    class DustClod {
        constructor(x, y, speed) {
            this.type = 'dust';
            this.x = x;
            this.y = y;
            this.speed = speed;
            this.radius = 16;
            this.hp = 2; // Needs 2 hits
            this.damage = 22;
            this.baseScore = 80;
            this.rot = Math.random() * Math.PI;
            this.rotSpeed = (Math.random() - 0.5) * 0.04;
            this.particleColor = '#F59E0B';
            this.particleCount = 12;
        }

        update() {
            this.y += this.speed;
            this.rot += this.rotSpeed;
        }

        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rot);

            ctx.beginPath();
            const sides = 6;
            for (let i = 0; i < sides; i++) {
                const angle = (i / sides) * Math.PI * 2;
                const r = this.radius * (0.8 + (i % 2) * 0.3);
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();

            ctx.fillStyle = this.hp === 2 ? '#B45309' : '#D97706';
            ctx.fill();
            ctx.strokeStyle = '#FDE68A';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if (this.hp === 1) {
                ctx.beginPath();
                ctx.moveTo(-6, -6);
                ctx.lineTo(2, 2);
                ctx.lineTo(8, -2);
                ctx.strokeStyle = '#FEF3C7';
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    class TitanBoss {
        constructor(x, y, hp) {
            this.x = x;
            this.y = y;
            this.maxHp = hp;
            this.hp = hp;
            this.radius = 34;
            this.vx = 1.6;
            this.pulse = 0;
        }

        update(boundsWidth) {
            this.x += this.vx;
            if (this.x < 45 || this.x > boundsWidth - 45) {
                this.vx *= -1;
            }
            this.pulse += 0.05;
        }

        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);

            // Outer acoustic aura
            const scale = 1 + Math.sin(this.pulse) * 0.08;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * scale, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(147, 51, 234, 0.25)';
            ctx.strokeStyle = '#A855F7';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#C084FC';
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.stroke();

            // Inner boss sphere
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.75, 0, Math.PI * 2);
            ctx.fillStyle = '#6D28D9';
            ctx.fill();

            // Boss HP Bar above boss
            ctx.restore();
            ctx.save();
            const barW = 70;
            const barH = 6;
            const fillW = Math.max(0, (this.hp / this.maxHp) * barW);
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(this.x - barW / 2, this.y - 45, barW, barH);
            ctx.fillStyle = '#EF4444';
            ctx.fillRect(this.x - barW / 2, this.y - 45, fillW, barH);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x - barW / 2, this.y - 45, barW, barH);
            ctx.restore();
        }
    }

    class GoldenDrop {
        constructor(x, y, speed) {
            this.type = 'gold';
            this.x = x;
            this.y = y;
            this.speed = speed;
            this.radius = 15;
            this.hp = 1;
            this.damage = 10;
            this.baseScore = 200;
            this.sparkle = 0;
            this.particleColor = '#FBBF24';
            this.particleCount = 16;
        }

        update() {
            this.y += this.speed;
            this.sparkle += 0.12;
        }

        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);

            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#F59E0B';
            ctx.shadowColor = '#FCD34D';
            ctx.shadowBlur = 14;
            ctx.fill();
            ctx.strokeStyle = '#FEF3C7';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 13px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('★', 0, 0);

            ctx.restore();
        }
    }

    class PowerupItem {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.type = type;
            this.vy = 2.2;
            this.radius = 16;
            this.rot = 0;
        }

        update() {
            this.y += this.vy;
            this.rot += 0.05;
        }

        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);

            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);

            let icon = '⚡';
            let color = '#38BDF8';
            if (this.type === '165HZ') { icon = '🔊'; color = '#06B6D4'; }
            if (this.type === 'SPREAD') { icon = '🌊'; color = '#8B5CF6'; }
            if (this.type === 'SHIELD') { icon = '🛡️'; color = '#10B981'; }
            if (this.type === 'HEAL') { icon = '❤️'; color = '#EF4444'; }

            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.stroke();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(icon, 0, 0);

            ctx.restore();
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        window.weGame = new GameApp();
    });

})();
