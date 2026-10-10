/**
 * Sonic Droplet Ghost Challenge - Game Engine
 * Pure Vanilla JavaScript & Web Audio API (Zero External Dependencies)
 * WaterEjector Acoustic Arcade Collection
 */
(function () {
    'use strict';

    /* ==========================================================================
       1. CORE ENGINE STATE & SELECTORS
       ========================================================================== */
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const wrapper = document.getElementById('gameWrapper');

    let audioContext = null;
    let micStream = null;
    let micAnalyser = null;
    let micDataArray = null;
    let isMicEnabled = false;
    let isSoundMuted = false;

    let W = 700;
    let H = 520;

    let gameState = 'LOBBY'; // 'LOBBY' | 'PLAYING' | 'GAMEOVER'
    let frameCount = 0;
    let currentScore = 0;
    let runPearlsCollected = 0;
    let totalPearls = parseInt(localStorage.getItem('we_pearls') || '25', 10);
    let highScore = parseInt(localStorage.getItem('waterejector_sonic_hi') || '0', 10);

    // Selected Cleaning Mode: 'WATER' | 'DUST' | 'VIBRATION'
    let currentCleaningMode = 'WATER';

    // Combo system
    let comboMultiplier = 1;
    let comboTimer = 0;

    // Screen Shake effect
    let shakeIntensity = 0;

    // Deterministic PRNG Seed
    let currentSeed = Math.floor(Math.random() * 2147483647);
    let seededRNG = null;

    function createMulberry32(seed) {
        return function () {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    /* ==========================================================================
       2. SKINS & COSMETICS LOCKER DEFINITION
       ========================================================================== */
    const SKINS = [
        { id: 'classic', name: 'Hydro Pure', cost: 0, glow: '#00b4d8', c1: '#e0f2fe', c2: '#00b4d8', c3: '#0284c7' },
        { id: 'cyber', name: 'Neon Cyber', cost: 50, glow: '#10b981', c1: '#a7f3d0', c2: '#10b981', c3: '#047857' },
        { id: 'gold', name: 'Resonance Gold', cost: 120, glow: '#f59e0b', c1: '#fef3c7', c2: '#fbbf24', c3: '#d97706' },
        { id: 'vapor', name: 'Vapor Wave', cost: 200, glow: '#ec4899', c1: '#fce7f3', c2: '#ec4899', c3: '#9333ea' },
        { id: 'solar', name: 'Volcanic Flame', cost: 350, glow: '#ef4444', c1: '#fee2e2', c2: '#f97316', c3: '#dc2626' }
    ];

    let unlockedSkins = JSON.parse(localStorage.getItem('we_unlocked_skins') || '["classic"]');
    let selectedSkinId = localStorage.getItem('we_selected_skin') || 'classic';

    // Player Droplet State
    const player = {
        x: 0,
        y: 0,
        radius: 17,
        vy: 0,
        gravity: 0.36,
        jumpForce: -6.6,
        tilt: 0,
        hasShield: false,
        sonicBurstTime: 0,
        magnetTime: 0
    };

    // Obstacles, Items, Hazards, Popups
    let obstacles = [];
    let pearls = [];
    let powerups = [];
    let dustMotes = [];
    let particles = [];
    let floatingTexts = [];
    let acousticWaves = [];

    // Ghost Replay Array (every 3 frames)
    let currentRunSamples = [];
    const SAMPLE_RATE_FRAMES = 3;
    let activeGhost = null;

    /* ==========================================================================
       3. SYNTHESIZED WEB AUDIO API SYSTEM (Zero External Files)
       ========================================================================== */
    function initAudio() {
        if (!audioContext) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioCtx();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }

    function playTone(freqStart, freqEnd, duration, type, volume) {
        type = type || 'sine';
        volume = volume || 0.25;
        if (isSoundMuted || !audioContext) return;
        try {
            const t = audioContext.currentTime;
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freqStart, t);
            osc.frequency.exponentialRampToValueAtTime(Math.max(10, freqEnd), t + duration);

            gain.gain.setValueAtTime(volume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

            osc.connect(gain);
            gain.connect(audioContext.destination);

            osc.start(t);
            osc.stop(t + duration);
        } catch (e) {}
    }

    function playPulseSound() {
        const baseFreq = currentCleaningMode === 'DUST' ? 400 : 165;
        playTone(baseFreq, baseFreq * 1.8, 0.11, 'sine', 0.28);
    }

    function playPearlPickupSound() {
        playTone(660, 1320, 0.09, 'triangle', 0.22);
    }

    function playPowerupSound() {
        playTone(260, 980, 0.22, 'square', 0.25);
    }

    function playBurstDashSound() {
        playTone(90, 360, 0.35, 'sawtooth', 0.45);
    }

    function playShieldPopSound() {
        playTone(400, 100, 0.18, 'sine', 0.35);
    }

    function playScoreTick() {
        playTone(520, 880, 0.07, 'sine', 0.15);
    }

    function playCrashSound() {
        playTone(130, 40, 0.3, 'sawtooth', 0.45);
    }

    /* ==========================================================================
       4. VOICE FREQUENCY INPUT ENGINE (MIC DETECTION)
       ========================================================================== */
    async function toggleMicrophone() {
        const micBtn = document.getElementById('micToggleBtn');
        const micIcon = document.getElementById('micIcon');

        if (isMicEnabled) {
            isMicEnabled = false;
            if (micStream) {
                micStream.getTracks().forEach(track => track.stop());
                micStream = null;
            }
            if (micBtn) micBtn.classList.remove('active');
            if (micIcon) micIcon.style.color = '';
            showToast('Microphone disabled');
        } else {
            try {
                initAudio();
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const source = audioContext.createMediaStreamSource(micStream);
                micAnalyser = audioContext.createAnalyser();
                micAnalyser.fftSize = 256;
                micAnalyser.smoothingTimeConstant = 0.5;
                source.connect(micAnalyser);
                micDataArray = new Uint8Array(micAnalyser.frequencyBinCount);

                isMicEnabled = true;
                if (micBtn) micBtn.classList.add('active');
                if (micIcon) micIcon.style.color = '#38bdf8';
                showToast('Mic Voice Jump enabled! Blow or speak to pulse.');
            } catch (err) {
                isMicEnabled = false;
                showToast('Microphone access denied or unavailable.');
            }
        }
    }

    function checkMicrophoneInput() {
        if (!isMicEnabled || !micAnalyser) return;
        micAnalyser.getByteFrequencyData(micDataArray);
        let sum = 0;
        for (let i = 0; i < micDataArray.length; i++) {
            sum += micDataArray[i];
        }
        const avgVol = sum / micDataArray.length;
        if (avgVol > 36 && player.vy > -2.2) {
            jumpDroplet();
        }
    }

    /* ==========================================================================
       5. URL REPLAY ENCODER / DECODER (Zero-Backend P2P Ghost Racing)
       ========================================================================== */
    function encodeReplayPacket(name, score, seed, samples, mode, skinId) {
        const data = {
            n: name.substring(0, 14),
            s: score,
            sd: seed,
            m: mode,
            k: skinId,
            p: samples
        };
        return btoa(encodeURIComponent(JSON.stringify(data)));
    }

    function decodeReplayPacket(hashString) {
        try {
            const jsonStr = decodeURIComponent(atob(hashString));
            const parsed = JSON.parse(jsonStr);
            if (parsed && typeof parsed.s === 'number' && parsed.sd && Array.isArray(parsed.p)) {
                return {
                    name: parsed.n || 'Challenger',
                    score: parsed.s,
                    seed: parsed.sd,
                    mode: parsed.m || 'WATER',
                    skinId: parsed.k || 'classic',
                    samples: parsed.p.map(val => val / 255),
                    currentIndex: 0,
                    x: 0,
                    y: 0,
                    crashed: false
                };
            }
        } catch (err) {
            console.warn('Ghost packet decode error:', err);
        }
        return null;
    }

    function checkIncomingChallenge() {
        const urlParams = new URLSearchParams(window.location.search);
        const challengeToken = urlParams.get('challenge') || window.location.hash.substring(1);

        if (challengeToken) {
            const decodedGhost = decodeReplayPacket(challengeToken);
            if (decodedGhost) {
                activeGhost = decodedGhost;
                currentSeed = activeGhost.seed;
                if (activeGhost.mode) setCleaningMode(activeGhost.mode);

                const card = document.getElementById('incomingChallengeCard');
                if (card) card.classList.remove('hidden');
                const inviterName = document.getElementById('inviterNameDisplay');
                if (inviterName) inviterName.textContent = activeGhost.name;
                const inviterScore = document.getElementById('inviterScoreDisplay');
                if (inviterScore) inviterScore.textContent = activeGhost.score;

                const tracker = document.getElementById('ghostRaceTracker');
                if (tracker) tracker.classList.remove('hidden');
                const ghostName = document.getElementById('ghostNameHud');
                if (ghostName) ghostName.textContent = activeGhost.name;
                const targetBadge = document.getElementById('ghostTargetBadge');
                if (targetBadge) targetBadge.classList.remove('hidden');
                const targetScore = document.getElementById('targetScoreDisplay');
                if (targetScore) targetScore.textContent = activeGhost.score;
            }
        }
    }

    /* ==========================================================================
       6. PROCEDURAL WORLD GENERATION & REFRESH
       ========================================================================== */
    const GRILL_WIDTH = 58;
    const GRILL_GAP = 165;
    const GRILL_SPACING = 270;

    function resetLevel() {
        seededRNG = createMulberry32(currentSeed);
        obstacles = [];
        pearls = [];
        powerups = [];
        dustMotes = [];
        particles = [];
        floatingTexts = [];
        acousticWaves = [];
        currentRunSamples = [];

        frameCount = 0;
        currentScore = 0;
        runPearlsCollected = 0;
        comboMultiplier = 1;
        comboTimer = 0;
        shakeIntensity = 0;

        player.x = Math.max(90, W * 0.22);
        player.y = H * 0.45;
        player.vy = 0;
        player.tilt = 0;
        player.hasShield = false;
        player.sonicBurstTime = 0;
        player.magnetTime = 0;

        updateBuffsUI();

        if (activeGhost) {
            activeGhost.currentIndex = 0;
            activeGhost.x = player.x;
            activeGhost.y = activeGhost.samples.length > 0 ? activeGhost.samples[0] * H : player.y;
            activeGhost.crashed = false;
        }

        let spawnX = W + 120;
        for (let i = 0; i < 6; i++) {
            spawnGrillObstacle(spawnX);
            spawnX += GRILL_SPACING;
        }
    }

    function spawnGrillObstacle(spawnX) {
        const minTop = 50;
        const maxTop = H - GRILL_GAP - 70;
        const topHeight = minTop + seededRNG() * (maxTop - minTop);
        const bottomHeight = topHeight + GRILL_GAP;

        obstacles.push({
            x: spawnX,
            top: topHeight,
            bottom: bottomHeight,
            width: GRILL_WIDTH,
            passed: false,
            shattered: false,
            closeCallScored: false
        });

        // 1. Procedural Acoustic Pearls (75% chance per column)
        if (seededRNG() < 0.75) {
            const pearlY = topHeight + 25 + seededRNG() * (GRILL_GAP - 50);
            pearls.push({
                x: spawnX + GRILL_WIDTH / 2,
                y: pearlY,
                radius: 9,
                collected: false
            });
        }

        // 2. Procedural Floating Dust Mote Hazard (35% chance)
        if (seededRNG() < 0.35) {
            dustMotes.push({
                x: spawnX + GRILL_WIDTH / 2,
                y: topHeight + GRILL_GAP / 2,
                radius: 10,
                vy: (seededRNG() - 0.5) * 1.5,
                minY: topHeight + 25,
                maxY: bottomHeight - 25
            });
        }

        // 3. Procedural Powerups: Shield, Sonic Burst, Magnet (22% chance)
        if (seededRNG() < 0.22) {
            const types = ['shield', 'burst', 'magnet'];
            const type = types[Math.floor(seededRNG() * types.length)];
            const powerupY = topHeight + 35 + seededRNG() * (GRILL_GAP - 70);

            powerups.push({
                x: spawnX + GRILL_SPACING * 0.5,
                y: powerupY,
                type: type,
                radius: 13,
                collected: false,
                pulse: 0
            });
        }
    }

    /* ==========================================================================
       7. PARTICLE, VISUAL EFFECTS & POPUP SYSTEM
       ========================================================================== */
    function spawnSplash(x, y, count, color) {
        count = count || 12;
        color = color || '#00b4d8';
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5.4 + 1.8;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 3 + 1.5,
                color: color,
                life: 1.0,
                decay: Math.random() * 0.035 + 0.02
            });
        }
    }

    function spawnAcousticPulseWave(x, y) {
        acousticWaves.push({
            x: x,
            y: y,
            radius: 6,
            maxRadius: 52,
            alpha: 0.85
        });
    }

    function addFloatingText(x, y, text, color) {
        color = color || '#38bdf8';
        floatingTexts.push({
            x: x,
            y: y,
            text: text,
            color: color,
            life: 1.0,
            vy: -1.8
        });
    }

    /* ==========================================================================
       8. PLAYER CONTROLS & FLIGHT DYNAMICS
       ========================================================================== */
    function jumpDroplet() {
        if (gameState !== 'PLAYING') return;
        player.vy = player.jumpForce;
        spawnSplash(player.x - 6, player.y + 4, 8, getSkinConfig().glow);
        spawnAcousticPulseWave(player.x, player.y);
        playPulseSound();

        if (navigator.vibrate) {
            try { navigator.vibrate(28); } catch (e) {}
        }
    }

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            initAudio();
            if (gameState === 'PLAYING') {
                jumpDroplet();
            } else if (gameState === 'GAMEOVER') {
                restartMatch();
            }
        }
    });

    const isFsMode = () => document.body.classList.contains('game-fullscreen-active');

    function handleTriggerJump(e) {
        if (e && isFsMode()) {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
        }
        initAudio();
        if (gameState === 'PLAYING') {
            jumpDroplet();
        }
    }

    if (canvas) {
        canvas.addEventListener('pointerdown', handleTriggerJump);
        canvas.addEventListener('touchmove', (e) => {
            if (isFsMode() && e.cancelable) e.preventDefault();
        });
    }

    const deckPulseBtn = document.getElementById('deckPulseBtn');
    if (deckPulseBtn) {
        deckPulseBtn.addEventListener('pointerdown', (e) => {
            if (e && isFsMode() && e.cancelable) e.preventDefault();
            initAudio();
            if (gameState === 'PLAYING') {
                jumpDroplet();
            }
        });
    }

    /* ==========================================================================
       9. POWERUPS, COMBO & SKINS SYSTEM
       ========================================================================== */
    function activatePowerup(type) {
        playPowerupSound();
        if (type === 'shield') {
            player.hasShield = true;
            addFloatingText(player.x, player.y - 20, '🛡️ SHIELD ACTIVE!', '#38bdf8');
        } else if (type === 'burst') {
            player.sonicBurstTime = 220; // ~3.6s hyper invincibility
            shakeIntensity = 10;
            playBurstDashSound();
            addFloatingText(player.x, player.y - 20, '⚡ 165Hz SONIC BURST!', '#fbbf24');
        } else if (type === 'magnet') {
            player.magnetTime = 300; // ~5s pearl attraction
            addFloatingText(player.x, player.y - 20, '🧲 RESONANCE MAGNET!', '#c084fc');
        }
        updateBuffsUI();
    }

    function updateBuffsUI() {
        const shieldIcon = document.getElementById('shieldHudIcon');
        const burstHud = document.getElementById('sonicDashHud');
        const burstBar = document.getElementById('sonicDashTimerBar');
        const magnetHud = document.getElementById('magnetHud');
        const magnetBar = document.getElementById('magnetTimerBar');

        if (shieldIcon) {
            if (player.hasShield) shieldIcon.classList.remove('hidden');
            else shieldIcon.classList.add('hidden');
        }

        if (burstHud && burstBar) {
            if (player.sonicBurstTime > 0) {
                burstHud.classList.remove('hidden');
                burstBar.style.width = `${(player.sonicBurstTime / 220) * 100}%`;
            } else {
                burstHud.classList.add('hidden');
            }
        }

        if (magnetHud && magnetBar) {
            if (player.magnetTime > 0) {
                magnetHud.classList.remove('hidden');
                magnetBar.style.width = `${(player.magnetTime / 300) * 100}%`;
            } else {
                magnetHud.classList.add('hidden');
            }
        }
    }

    function getSkinConfig() {
        return SKINS.find(s => s.id === selectedSkinId) || SKINS[0];
    }

    function renderSkinsShop() {
        const container = document.getElementById('skinsListContainer');
        const pearlCountElem = document.getElementById('shopPearlCount');
        const pearlCounterHud = document.getElementById('pearlCounterHud');
        if (pearlCountElem) pearlCountElem.textContent = `${totalPearls} 💎`;
        if (pearlCounterHud) pearlCounterHud.textContent = totalPearls;
        if (!container) return;
        container.innerHTML = '';

        SKINS.forEach(skin => {
            const isUnlocked = unlockedSkins.includes(skin.id);
            const isSelected = selectedSkinId === skin.id;

            const card = document.createElement('div');
            card.className = `skin-shop-card ${isSelected ? 'selected' : ''}`;

            card.innerHTML = `
                <div class="skin-card-header">
                    <div class="skin-swatch" style="background: radial-gradient(circle at 35% 35%, ${skin.c1}, ${skin.c2}); box-shadow: 0 0 10px ${skin.glow};"></div>
                    <div>
                        <div class="skin-name">${skin.name}</div>
                        <div class="skin-status">${isUnlocked ? (isSelected ? 'EQUIPPED' : 'OWNED') : `💎 ${skin.cost}`}</div>
                    </div>
                </div>
                <button type="button" class="btn ${isSelected ? 'btn-equipped' : isUnlocked ? 'btn-secondary' : 'btn-primary'} skin-action-btn">
                    ${isSelected ? 'Active' : isUnlocked ? 'Select' : 'Unlock'}
                </button>
            `;

            const btn = card.querySelector('.skin-action-btn');
            btn.addEventListener('click', () => {
                if (isSelected) return;
                if (isUnlocked) {
                    selectedSkinId = skin.id;
                    localStorage.setItem('we_selected_skin', selectedSkinId);
                    renderSkinsShop();
                } else if (totalPearls >= skin.cost) {
                    totalPearls -= skin.cost;
                    localStorage.setItem('we_pearls', totalPearls);
                    unlockedSkins.push(skin.id);
                    localStorage.setItem('we_unlocked_skins', JSON.stringify(unlockedSkins));
                    selectedSkinId = skin.id;
                    localStorage.setItem('we_selected_skin', selectedSkinId);
                    playPowerupSound();
                    renderSkinsShop();
                } else {
                    showToast('Need more Pearls! Collect them during runs.');
                }
            });

            container.appendChild(card);
        });
    }

    /* ==========================================================================
       10. GAME OVER & SHARING CHALLENGE
       ========================================================================= */
    function triggerGameOver() {
        if (player.hasShield) {
            player.hasShield = false;
            playShieldPopSound();
            shakeIntensity = 14;
            spawnSplash(player.x, player.y, 25, '#38bdf8');
            addFloatingText(player.x, player.y - 20, '🛡️ SHIELD BROKEN!', '#38bdf8');
            player.vy = -5.0;
            updateBuffsUI();
            return;
        }

        gameState = 'GAMEOVER';
        playCrashSound();
        shakeIntensity = 20;
        spawnSplash(player.x, player.y, 30, getSkinConfig().c2);
        spawnSplash(player.x, player.y, 18, '#ffffff');

        totalPearls += runPearlsCollected;
        localStorage.setItem('we_pearls', totalPearls);

        if (currentScore > highScore) {
            highScore = currentScore;
            localStorage.setItem('waterejector_sonic_hi', highScore);
        }

        const finalScoreElem = document.getElementById('finalScoreVal');
        if (finalScoreElem) finalScoreElem.textContent = currentScore;
        const bestScoreElem = document.getElementById('bestScoreVal');
        if (bestScoreElem) bestScoreElem.textContent = highScore;
        const runPearlsElem = document.getElementById('runPearlsVal');
        if (runPearlsElem) runPearlsElem.textContent = `+${runPearlsCollected}`;

        const victoryBadge = document.getElementById('victoryBadge');
        const defeatBadge = document.getElementById('defeatBadge');
        const ghostBox = document.getElementById('ghostComparisonBox');
        const ghostResultText = document.getElementById('ghostResultText');

        if (activeGhost) {
            if (ghostBox) ghostBox.classList.remove('hidden');
            if (currentScore > activeGhost.score) {
                if (victoryBadge) victoryBadge.classList.remove('hidden');
                if (defeatBadge) defeatBadge.classList.add('hidden');
                if (ghostResultText) ghostResultText.innerHTML = `🏆 <strong style="color: #10B981;">Record Shattered!</strong> You beat <strong>${activeGhost.name}</strong>'s score of ${activeGhost.score} by <strong>+${currentScore - activeGhost.score}</strong> points!`;
            } else if (currentScore === activeGhost.score) {
                if (victoryBadge) victoryBadge.classList.remove('hidden');
                if (defeatBadge) defeatBadge.classList.add('hidden');
                if (ghostResultText) ghostResultText.innerHTML = `🤝 <strong style="color: #38bdf8;">Tied!</strong> Matched <strong>${activeGhost.name}</strong> at ${currentScore} points.`;
            } else {
                if (defeatBadge) defeatBadge.classList.remove('hidden');
                if (victoryBadge) victoryBadge.classList.add('hidden');
                if (ghostResultText) ghostResultText.innerHTML = `⚡ <strong style="color: #38bdf8;">Keep Cleaning!</strong> <strong>${activeGhost.name}</strong> was ${activeGhost.score - currentScore} points ahead.`;
            }
        } else {
            if (victoryBadge) victoryBadge.classList.add('hidden');
            if (defeatBadge) defeatBadge.classList.remove('hidden');
            if (ghostBox) ghostBox.classList.add('hidden');
        }

        const gameOverOverlay = document.getElementById('gameOverOverlay');
        if (gameOverOverlay) gameOverOverlay.classList.remove('hidden');
    }

    function shareChallenge() {
        const nameInput = document.getElementById('playerNameInput');
        const playerName = (nameInput && nameInput.value.trim()) || (window.AcousticScorecard ? window.AcousticScorecard.getPlayerName() : 'HydroPilot');
        const packet = encodeReplayPacket(playerName, currentScore, currentSeed, currentRunSamples, currentCleaningMode, selectedSkinId);
        const shareUrl = `${window.location.origin}${window.location.pathname}?challenge=${packet}`;

        if (window.AcousticScorecard) {
            window.AcousticScorecard.show({
                gameName: 'Sonic Droplet Challenge',
                score: currentScore,
                bestScore: highScore,
                level: Math.max(1, Math.floor(currentScore / 100)),
                extraText: `Mode: ${currentCleaningMode.toUpperCase()} | Pearls: +${runPearlsCollected}`,
                url: shareUrl
            });
            return;
        }

        const shareData = {
            title: 'WaterEjector Ghost Challenge - DevDesk App',
            text: `💧 I scored ${currentScore} in WaterEjector 165Hz Challenge! Can you beat my Ghost replay in the speaker cavity? Race me here:`,
            url: shareUrl
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            navigator.share(shareData).catch(() => copyToClipboard(shareUrl));
        } else {
            copyToClipboard(shareUrl);
        }
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => showToast('Challenge Link Copied! Share via WhatsApp / Chat.')).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('Challenge Link Copied!');
        } catch (err) {
            showToast('Failed to copy link.');
        }
        document.body.removeChild(textarea);
    }

    function showToast(message) {
        const toast = document.getElementById('copyToast');
        if (!toast) return;
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 2800);
    }

    function setCleaningMode(mode) {
        currentCleaningMode = mode;
        const bWater = document.getElementById('modeWaterBtn');
        const bDust = document.getElementById('modeDustBtn');
        const bVibe = document.getElementById('modeVibeBtn');
        const modeLabel = document.getElementById('sonicModeLabel');

        [bWater, bDust, bVibe].forEach(b => {
            if (b) b.classList.remove('active');
        });

        if (mode === 'WATER') {
            if (bWater) bWater.classList.add('active');
            if (modeLabel) modeLabel.textContent = '165Hz Acoustic Pulse';
        } else if (mode === 'DUST') {
            if (bDust) bDust.classList.add('active');
            if (modeLabel) modeLabel.textContent = '400Hz Dust Sweep';
        } else if (mode === 'VIBRATION') {
            if (bVibe) bVibe.classList.add('active');
            if (modeLabel) modeLabel.textContent = '80Hz Haptic Pulse';
        }
    }

    function startMatch() {
        initAudio();
        const startOverlay = document.getElementById('startOverlay');
        const gameOverOverlay = document.getElementById('gameOverOverlay');
        if (startOverlay) startOverlay.classList.add('hidden');
        if (gameOverOverlay) gameOverOverlay.classList.add('hidden');
        resetLevel();
        gameState = 'PLAYING';
    }

    function restartMatch() {
        if (!activeGhost) {
            currentSeed = Math.floor(Math.random() * 2147483647);
        }
        startMatch();
    }

    /* ==========================================================================
       11. 60FPS PHYSICS UPDATE LOOP
       ========================================================================== */
    function resizeCanvas() {
        if (!wrapper || !canvas) return;
        W = canvas.width = wrapper.clientWidth;
        H = canvas.height = wrapper.clientHeight;
        if (gameState === 'LOBBY') {
            player.x = W * 0.22;
            player.y = H * 0.45;
        }
    }
    window.addEventListener('resize', resizeCanvas);

    function update() {
        if (gameState !== 'PLAYING') return;

        frameCount++;
        checkMicrophoneInput();

        if (shakeIntensity > 0) shakeIntensity *= 0.88;

        if (frameCount % SAMPLE_RATE_FRAMES === 0) {
            const normalizedY = Math.min(255, Math.max(0, Math.round((player.y / H) * 255)));
            currentRunSamples.push(normalizedY);
        }

        if (comboTimer > 0) {
            comboTimer--;
            if (comboTimer <= 0) {
                comboMultiplier = 1;
                const comboBadge = document.getElementById('comboBadge');
                if (comboBadge) comboBadge.classList.add('hidden');
            }
        }

        if (player.sonicBurstTime > 0) {
            player.sonicBurstTime--;
            spawnSplash(player.x - 12, player.y, 2, '#fbbf24');
        }
        if (player.magnetTime > 0) player.magnetTime--;
        updateBuffsUI();

        const isBursting = player.sonicBurstTime > 0;
        player.vy += player.gravity * (isBursting ? 0.6 : 1.0);
        player.y += player.vy;
        player.tilt = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, player.vy * 0.08));

        // Top & Bottom boundary
        if (player.y - player.radius <= 0) {
            player.y = player.radius;
            player.vy = 0;
        }
        if (player.y + player.radius >= H) {
            triggerGameOver();
            return;
        }

        // Ghost racer synchronization
        if (activeGhost && !activeGhost.crashed) {
            const targetSampleIndex = Math.floor(frameCount / SAMPLE_RATE_FRAMES);
            if (targetSampleIndex < activeGhost.samples.length) {
                const targetY = activeGhost.samples[targetSampleIndex] * H;
                activeGhost.y += (targetY - activeGhost.y) * 0.45;
                activeGhost.x = player.x;
            } else {
                activeGhost.crashed = true;
                spawnSplash(activeGhost.x, activeGhost.y, 16, '#38bdf8');
            }

            const ghostTrackerFill = document.getElementById('ghostTrackerFill');
            const ghostDiffText = document.getElementById('ghostDiffText');
            if (ghostDiffText) {
                const diff = currentScore - activeGhost.score;
                ghostDiffText.textContent = (diff >= 0 ? '+' : '') + diff;
                ghostDiffText.style.color = diff >= 0 ? '#10B981' : '#38bdf8';
            }
            if (ghostTrackerFill) {
                const progressPercent = Math.min(100, (currentScore / Math.max(1, activeGhost.score)) * 100);
                ghostTrackerFill.style.width = progressPercent + '%';
            }
        }

        // Forward speed
        const baseSpeed = 3.4 + Math.min(2.0, currentScore * 0.045);
        const gameSpeed = isBursting ? baseSpeed * 1.7 : baseSpeed;

        // Obstacles collision & management
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.x -= gameSpeed;

            if (!obs.shattered) {
                const inPipeX = (player.x + player.radius > obs.x) && (player.x - player.radius < obs.x + obs.width);
                if (inPipeX) {
                    const inUpperGrill = player.y - player.radius < obs.top;
                    const inLowerGrill = player.y + player.radius > obs.bottom;

                    if (inUpperGrill || inLowerGrill) {
                        if (isBursting) {
                            obs.shattered = true;
                            shakeIntensity = 12;
                            spawnSplash(obs.x + obs.width / 2, player.y, 25, '#fbbf24');
                            addFloatingText(player.x, player.y - 15, '⚡ SMASHED!', '#fbbf24');
                            playCrashSound();
                        } else {
                            triggerGameOver();
                            return;
                        }
                    } else {
                        // Close shave risk bonus
                        const topDist = Math.abs((player.y - player.radius) - obs.top);
                        const botDist = Math.abs(obs.bottom - (player.y + player.radius));
                        if ((topDist < 14 || botDist < 14) && !obs.closeCallScored) {
                            obs.closeCallScored = true;
                            comboMultiplier = Math.min(5, comboMultiplier + 1);
                            comboTimer = 180;
                            currentScore += 2 * comboMultiplier;
                            const comboBadge = document.getElementById('comboBadge');
                            if (comboBadge) {
                                comboBadge.textContent = `x${comboMultiplier} COMBO`;
                                comboBadge.classList.remove('hidden');
                            }
                            addFloatingText(player.x, player.y - 18, `🔥 CLOSE SHAVE! +${2 * comboMultiplier}`, '#fbbf24');
                        }
                    }
                }
            }

            if (!obs.passed && obs.x + obs.width < player.x) {
                obs.passed = true;
                currentScore += 1 * comboMultiplier;
                const scoreElem = document.getElementById('scoreNumber');
                if (scoreElem) scoreElem.textContent = currentScore;
                playScoreTick();
            }

            if (obs.x + obs.width < -80) {
                obstacles.splice(i, 1);
                const lastObstacle = obstacles[obstacles.length - 1];
                const newX = lastObstacle ? lastObstacle.x + GRILL_SPACING : W + 120;
                spawnGrillObstacle(newX);
            }
        }

        // Pearls
        for (let i = pearls.length - 1; i >= 0; i--) {
            const prl = pearls[i];
            prl.x -= gameSpeed;

            if (player.magnetTime > 0) {
                const dx = player.x - prl.x;
                const dy = player.y - prl.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 220) {
                    prl.x += (dx / dist) * 7.5;
                    prl.y += (dy / dist) * 7.5;
                }
            }

            const dist = Math.hypot(player.x - prl.x, player.y - prl.y);
            if (dist < player.radius + prl.radius && !prl.collected) {
                prl.collected = true;
                runPearlsCollected++;
                currentScore += 5;
                playPearlPickupSound();
                spawnSplash(prl.x, prl.y, 8, '#fbbf24');
                addFloatingText(prl.x, prl.y - 10, '+5 💎', '#fbbf24');
                const pearlCounter = document.getElementById('pearlCounterHud');
                if (pearlCounter) pearlCounter.textContent = totalPearls + runPearlsCollected;
                pearls.splice(i, 1);
                continue;
            }

            if (prl.x < -40) pearls.splice(i, 1);
        }

        // Powerups
        for (let i = powerups.length - 1; i >= 0; i--) {
            const pup = powerups[i];
            pup.x -= gameSpeed;
            pup.pulse += 0.08;

            const dist = Math.hypot(player.x - pup.x, player.y - pup.y);
            if (dist < player.radius + pup.radius && !pup.collected) {
                pup.collected = true;
                activatePowerup(pup.type);
                spawnSplash(pup.x, pup.y, 14, pup.type === 'burst' ? '#fbbf24' : '#38bdf8');
                powerups.splice(i, 1);
                continue;
            }

            if (pup.x < -40) powerups.splice(i, 1);
        }

        // Dust Motes
        for (let i = dustMotes.length - 1; i >= 0; i--) {
            const mote = dustMotes[i];
            mote.x -= gameSpeed;
            mote.y += mote.vy;
            if (mote.y < mote.minY || mote.y > mote.maxY) mote.vy *= -1;

            const dist = Math.hypot(player.x - mote.x, player.y - mote.y);
            if (dist < player.radius + mote.radius) {
                if (isBursting) {
                    spawnSplash(mote.x, mote.y, 10, '#f59e0b');
                    dustMotes.splice(i, 1);
                } else {
                    triggerGameOver();
                    return;
                }
            }

            if (mote.x < -40) dustMotes.splice(i, 1);
        }

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) particles.splice(i, 1);
        }

        // Acoustic Waves
        for (let i = acousticWaves.length - 1; i >= 0; i--) {
            const w = acousticWaves[i];
            w.radius += 2.6;
            w.alpha -= 0.045;
            if (w.alpha <= 0 || w.radius >= w.maxRadius) acousticWaves.splice(i, 1);
        }

        // Floating text
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.y += ft.vy;
            ft.life -= 0.025;
            if (ft.life <= 0) floatingTexts.splice(i, 1);
        }
    }

    /* ==========================================================================
       12. CANVAS RENDERING
       ========================================================================== */
    function draw() {
        ctx.save();

        if (shakeIntensity > 0.5) {
            const dx = (Math.random() - 0.5) * shakeIntensity;
            const dy = (Math.random() - 0.5) * shakeIntensity;
            ctx.translate(dx, dy);
        }

        ctx.clearRect(0, 0, W, H);

        // Acoustic Chamber Backdrop
        ctx.fillStyle = '#060b14';
        ctx.fillRect(0, 0, W, H);

        const ambientGlow = ctx.createRadialGradient(W / 2, H, 10, W / 2, H, H * 0.85);
        ambientGlow.addColorStop(0, 'rgba(0, 180, 216, 0.12)');
        ambientGlow.addColorStop(1, 'rgba(6, 11, 20, 0)');
        ctx.fillStyle = ambientGlow;
        ctx.fillRect(0, 0, W, H);

        // Sound waves resonance curves
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0, 180, 216, 0.08)';
        const waveShift = frameCount * 0.025;
        for (let y = 50; y < H; y += 70) {
            ctx.beginPath();
            for (let x = 0; x < W; x += 25) {
                const sinY = y + Math.sin(x * 0.015 + waveShift) * 12;
                if (x === 0) ctx.moveTo(x, sinY);
                else ctx.lineTo(x, sinY);
            }
            ctx.stroke();
        }

        // Speaker Grill Obstacles
        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            if (obs.shattered) continue;

            const grillGrad = ctx.createLinearGradient(obs.x, 0, obs.x + obs.width, 0);
            grillGrad.addColorStop(0, '#0a1224');
            grillGrad.addColorStop(0.5, '#15243d');
            grillGrad.addColorStop(1, '#0a1224');

            // Upper Grill
            ctx.fillStyle = grillGrad;
            ctx.fillRect(obs.x, 0, obs.width, obs.top);
            ctx.fillStyle = '#00b4d8';
            ctx.fillRect(obs.x - 2, obs.top - 5, obs.width + 4, 6);

            // Lower Grill
            ctx.fillStyle = grillGrad;
            ctx.fillRect(obs.x, obs.bottom, obs.width, H - obs.bottom);
            ctx.fillStyle = '#00b4d8';
            ctx.fillRect(obs.x - 2, obs.bottom, obs.width + 4, 6);

            // Speaker Perforated Mesh Holes
            ctx.fillStyle = 'rgba(0, 180, 216, 0.22)';
            for (let gy = 20; gy < obs.top - 15; gy += 16) {
                for (let gx = obs.x + 10; gx < obs.x + obs.width - 8; gx += 12) {
                    ctx.beginPath();
                    ctx.arc(gx, gy, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            for (let gy = obs.bottom + 18; gy < H - 15; gy += 16) {
                for (let gx = obs.x + 10; gx < obs.x + obs.width - 8; gx += 12) {
                    ctx.beginPath();
                    ctx.arc(gx, gy, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Collectible Pearls
        for (let i = 0; i < pearls.length; i++) {
            const prl = pearls[i];
            ctx.save();
            ctx.translate(prl.x, prl.y);
            ctx.beginPath();
            ctx.arc(0, 0, prl.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-2, -3, prl.radius * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.restore();
        }

        // Powerups
        for (let i = 0; i < powerups.length; i++) {
            const pup = powerups[i];
            ctx.save();
            ctx.translate(pup.x, pup.y);
            const pScale = 1 + Math.sin(pup.pulse) * 0.12;
            ctx.scale(pScale, pScale);

            const pColor = pup.type === 'burst' ? '#f59e0b' : pup.type === 'shield' ? '#00b4d8' : '#a855f7';
            const pEmoji = pup.type === 'burst' ? '⚡' : pup.type === 'shield' ? '🛡️' : '🧲';

            ctx.beginPath();
            ctx.arc(0, 0, pup.radius, 0, Math.PI * 2);
            ctx.fillStyle = pColor;
            ctx.shadowColor = pColor;
            ctx.shadowBlur = 16;
            ctx.fill();

            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pEmoji, 0, 1);
            ctx.restore();
        }

        // Dust Motes
        for (let i = 0; i < dustMotes.length; i++) {
            const mote = dustMotes[i];
            ctx.save();
            ctx.translate(mote.x, mote.y);
            ctx.beginPath();
            ctx.arc(0, 0, mote.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🌪️', 0, 1);
            ctx.restore();
        }

        // Acoustic Pulse Waves
        for (let i = 0; i < acousticWaves.length; i++) {
            const w = acousticWaves[i];
            ctx.beginPath();
            ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 180, 216, ${w.alpha})`;
            ctx.lineWidth = 2.4;
            ctx.stroke();
        }

        // Particles
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        // Floating texts
        for (let i = 0; i < floatingTexts.length; i++) {
            const ft = floatingTexts[i];
            ctx.save();
            ctx.font = '800 13px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = ft.color;
            ctx.globalAlpha = Math.max(0, ft.life);
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 8;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }

        // Ghost Droplet Racer
        if (activeGhost && !activeGhost.crashed) {
            ctx.save();
            ctx.translate(activeGhost.x, activeGhost.y);
            ctx.globalAlpha = 0.45;

            ctx.beginPath();
            ctx.arc(0, 0, player.radius + 2, 0, Math.PI * 2);
            ctx.fillStyle = '#38bdf8';
            ctx.fill();

            ctx.globalAlpha = 0.85;
            ctx.fillStyle = '#7dd3fc';
            ctx.font = '700 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`👻 ${activeGhost.name}`, 0, -player.radius - 8);
            ctx.restore();
        }

        // Active Player Droplet
        if (gameState === 'PLAYING' || gameState === 'LOBBY') {
            const skin = getSkinConfig();
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(player.tilt);

            // Shield Bubble
            if (player.hasShield) {
                ctx.beginPath();
                ctx.arc(0, 0, player.radius + 7, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
                ctx.lineWidth = 2.5;
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 15;
                ctx.stroke();
            }

            // Droplet Body Glow
            ctx.shadowBlur = player.sonicBurstTime > 0 ? 28 : 20;
            ctx.shadowColor = player.sonicBurstTime > 0 ? '#fbbf24' : skin.glow;

            // Droplet Outer Sphere
            ctx.beginPath();
            ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
            const dropGrad = ctx.createRadialGradient(-3, -4, 2, 0, 0, player.radius);
            dropGrad.addColorStop(0, skin.c1);
            dropGrad.addColorStop(0.4, skin.c2);
            dropGrad.addColorStop(1, skin.c3);
            ctx.fillStyle = dropGrad;
            ctx.fill();

            ctx.shadowBlur = 0;

            // Specular Highlight
            ctx.beginPath();
            ctx.arc(-4, -5, player.radius * 0.33, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
            ctx.fill();

            // Player Name Badge
            const nameInput = document.getElementById('playerNameInput');
            const myName = (nameInput && nameInput.value.trim()) || 'You';
            ctx.fillStyle = '#ffffff';
            ctx.font = '700 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(myName, 0, -player.radius - 8);

            ctx.restore();
        }

        ctx.restore();
        requestAnimationFrame(loop);
    }

    function loop() {
        update();
        draw();
    }

    /* ==========================================================================
       13. EVENT LISTENERS & LIFECYCLE
       ========================================================================== */
    const startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.addEventListener('click', startMatch);

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) restartBtn.addEventListener('click', restartMatch);

    const challengeFriendBtn = document.getElementById('challengeFriendBtn');
    if (challengeFriendBtn) challengeFriendBtn.addEventListener('click', shareChallenge);

    const micToggleBtn = document.getElementById('micToggleBtn');
    if (micToggleBtn) micToggleBtn.addEventListener('click', toggleMicrophone);

    const bWater = document.getElementById('modeWaterBtn');
    const bDust = document.getElementById('modeDustBtn');
    const bVibe = document.getElementById('modeVibeBtn');
    if (bWater) bWater.addEventListener('click', () => setCleaningMode('WATER'));
    if (bDust) bDust.addEventListener('click', () => setCleaningMode('DUST'));
    if (bVibe) bVibe.addEventListener('click', () => setCleaningMode('VIBRATION'));

    // Skins Modal
    const openSkinsBtn = document.getElementById('openSkinsBtn');
    const closeSkinsBtn = document.getElementById('closeSkinsBtn');
    const skinsModal = document.getElementById('skinsModal');

    if (openSkinsBtn) {
        openSkinsBtn.addEventListener('click', () => {
            renderSkinsShop();
            if (skinsModal) skinsModal.classList.remove('hidden');
        });
    }

    if (closeSkinsBtn) {
        closeSkinsBtn.addEventListener('click', () => {
            if (skinsModal) skinsModal.classList.add('hidden');
        });
    }

    // Sound Mute Toggle
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', () => {
            isSoundMuted = !isSoundMuted;
            const soundIcon = document.getElementById('soundIcon');
            if (soundIcon) {
                soundIcon.style.opacity = isSoundMuted ? '0.4' : '1.0';
            }
            showToast(isSoundMuted ? 'Sound Muted' : 'Sound Enabled');
        });
    }

    // Initialize once DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        resizeCanvas();
        checkIncomingChallenge();
        renderSkinsShop();
        resetLevel();
        loop();
    }
})();
