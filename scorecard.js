/**
 * WaterEjector - Universal Dynamic Arcade Scorecard Generator
 * Generates high-res visual scorecards and handles cross-platform social sharing.
 * Persists player name in localStorage across both games.
 */
(function (root) {
    'use strict';

    const STORAGE_KEY = 'we_player_name';

    const Scorecard = {
        state: {
            gameName: 'Speaker Rescue',
            score: 0,
            bestScore: 0,
            level: 1,
            extraText: '',
            rank: 'Acoustic Specialist',
            url: 'https://waterejector.devdeskapp.com/game/'
        },

        getPlayerName() {
            return localStorage.getItem(STORAGE_KEY) || 'HydroPilot';
        },

        setPlayerName(name) {
            const clean = (name || '').trim().substring(0, 16) || 'HydroPilot';
            localStorage.setItem(STORAGE_KEY, clean);
            return clean;
        },

        getRank(score) {
            if (score >= 6000) return 'S-Tier Acoustic Legend ⭐⭐⭐';
            if (score >= 3500) return 'A+ Resonance Master ⭐⭐';
            if (score >= 1800) return 'Sonic Pro Cleaner ⭐';
            if (score >= 700) return 'Acoustic Specialist';
            return 'Sound Cadet';
        },

        init() {
            if (document.getElementById('scorecardModalRoot')) return;

            const modalHtml = `
            <div id="scorecardModalRoot" class="scorecard-modal-backdrop hidden" aria-hidden="true">
                <div class="scorecard-modal-box">
                    <div class="scorecard-modal-header">
                        <div class="scorecard-title-group">
                            <span class="scorecard-badge">Verified Scorecard</span>
                            <h3 class="scorecard-modal-title">Official Arcade Record</h3>
                        </div>
                        <button type="button" class="scorecard-close-btn" id="scCloseBtn" aria-label="Close Scorecard">&times;</button>
                    </div>

                    <div class="scorecard-body">
                        <!-- Dynamic Canvas Preview -->
                        <div class="scorecard-preview-wrapper">
                            <canvas id="scorecardCanvas" width="800" height="800"></canvas>
                        </div>

                        <!-- Player Name Customization -->
                        <div class="scorecard-inputs-row">
                            <label for="scPlayerNameInput">Pilot Name:</label>
                            <input type="text" id="scPlayerNameInput" maxlength="16" placeholder="Your Name" value="HydroPilot">
                        </div>

                        <!-- Action Buttons -->
                        <div class="scorecard-actions-grid">
                            <button type="button" class="btn btn-primary sc-btn-whatsapp" id="scWhatsAppBtn">
                                <span>💬 Share on WhatsApp</span>
                            </button>
                            <button type="button" class="btn btn-secondary sc-btn-download" id="scDownloadBtn">
                                <span>📥 Download Card (PNG)</span>
                            </button>
                            <button type="button" class="btn btn-secondary sc-btn-copy" id="scCopyBtn">
                                <span>📋 Copy Link / Image</span>
                            </button>
                        </div>

                        <div id="scToast" class="scorecard-toast hidden">Copied to clipboard!</div>
                    </div>
                </div>
            </div>`;

            const wrapper = document.createElement('div');
            wrapper.innerHTML = modalHtml;
            document.body.appendChild(wrapper.firstElementChild);

            // Bind Modal Events
            document.getElementById('scCloseBtn').addEventListener('click', () => this.close());
            document.getElementById('scorecardModalRoot').addEventListener('click', (e) => {
                if (e.target.id === 'scorecardModalRoot') this.close();
            });

            const nameInput = document.getElementById('scPlayerNameInput');
            nameInput.addEventListener('input', (e) => {
                this.setPlayerName(e.target.value);
                this.render();
            });

            document.getElementById('scDownloadBtn').addEventListener('click', () => this.downloadImage());
            document.getElementById('scWhatsAppBtn').addEventListener('click', () => this.shareWhatsApp());
            document.getElementById('scCopyBtn').addEventListener('click', () => this.copyCard());
        },

        show(options) {
            this.init();
            options = options || {};

            this.state.gameName = options.gameName || 'Speaker Rescue';
            this.state.score = typeof options.score === 'number' ? options.score : 0;
            this.state.bestScore = typeof options.bestScore === 'number' ? options.bestScore : this.state.score;
            this.state.level = options.level || 1;
            this.state.extraText = options.extraText || '';
            this.state.rank = this.getRank(this.state.score);
            this.state.url = options.url || window.location.href.split('?')[0];

            const nameInput = document.getElementById('scPlayerNameInput');
            if (nameInput) nameInput.value = this.getPlayerName();

            const modal = document.getElementById('scorecardModalRoot');
            if (modal) {
                modal.classList.remove('hidden');
                modal.setAttribute('aria-hidden', 'false');
            }

            this.render();
        },

        close() {
            const modal = document.getElementById('scorecardModalRoot');
            if (modal) {
                modal.classList.add('hidden');
                modal.setAttribute('aria-hidden', 'true');
            }
        },

        render() {
            const cvs = document.getElementById('scorecardCanvas');
            if (!cvs) return;
            const ctx = cvs.getContext('2d');
            const W = 800;
            const H = 800;

            const name = this.getPlayerName();
            const s = this.state;

            // 1. Deep Midnight Background
            const bgGrad = ctx.createLinearGradient(0, 0, W, H);
            bgGrad.addColorStop(0, '#0a1024');
            bgGrad.addColorStop(0.5, '#070b18');
            bgGrad.addColorStop(1, '#040710');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, W, H);

            // 2. Cosmic Radial Glow
            const glow = ctx.createRadialGradient(W / 2, 280, 20, W / 2, 280, 380);
            glow.addColorStop(0, 'rgba(139, 92, 246, 0.22)');
            glow.addColorStop(0.5, 'rgba(6, 182, 212, 0.12)');
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, W, H);

            // 3. Glowing Outer Border
            ctx.save();
            const borderGrad = ctx.createLinearGradient(0, 0, W, H);
            borderGrad.addColorStop(0, '#8B5CF6');
            borderGrad.addColorStop(0.5, '#06B6D4');
            borderGrad.addColorStop(1, '#8B5CF6');
            ctx.strokeStyle = borderGrad;
            ctx.lineWidth = 6;
            ctx.strokeRect(16, 16, W - 32, H - 32);
            ctx.restore();

            // 4. Header Bar: Logo & Verification Badge
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '800 24px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('WaterEjector', 46, 68);

            ctx.fillStyle = '#38BDF8';
            ctx.font = '700 13px Inter, sans-serif';
            ctx.fillText('165Hz ACOUSTIC ARCADE', 46, 90);

            // Verified Pill
            ctx.save();
            ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
            ctx.lineWidth = 1.5;
            if (ctx.roundRect) ctx.roundRect(570, 48, 184, 34, 17);
            else ctx.rect(570, 48, 184, 34);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#10B981';
            ctx.font = '800 13px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('✓ VERIFIED RECORD', 662, 70);
            ctx.restore();

            // Divider
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(46, 116);
            ctx.lineTo(W - 46, 116);
            ctx.stroke();

            // 5. Game Name Banner
            ctx.fillStyle = '#C4B5FD';
            ctx.font = '800 15px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('OFFICIAL ARCADE FLIGHT RECORD', W / 2, 155);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = '900 38px Inter, sans-serif';
            ctx.fillText(s.gameName.toUpperCase(), W / 2, 202);

            // 6. Player Name Card
            ctx.save();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.lineWidth = 1.5;
            if (ctx.roundRect) ctx.roundRect(W / 2 - 190, 222, 380, 44, 22);
            else ctx.rect(W / 2 - 190, 222, 380, 44);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#94A3B8';
            ctx.font = '700 13px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('PILOT:', W / 2 - 165, 250);

            ctx.fillStyle = '#38BDF8';
            ctx.font = '800 18px Inter, sans-serif';
            ctx.fillText(name, W / 2 - 105, 251);
            ctx.restore();

            // 7. Giant Score Box
            ctx.save();
            ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
            ctx.lineWidth = 2;
            if (ctx.roundRect) ctx.roundRect(W / 2 - 270, 290, 540, 160, 20);
            else ctx.rect(W / 2 - 270, 290, 540, 160);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#94A3B8';
            ctx.font = '800 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('RESONANCE SCORE', W / 2, 330);

            // Giant Glow Score Number
            ctx.shadowColor = '#38BDF8';
            ctx.shadowBlur = 24;
            const scoreGrad = ctx.createLinearGradient(0, 340, 0, 420);
            scoreGrad.addColorStop(0, '#FFFFFF');
            scoreGrad.addColorStop(0.5, '#7DD3FC');
            scoreGrad.addColorStop(1, '#06B6D4');
            ctx.fillStyle = scoreGrad;
            ctx.font = '900 78px Inter, sans-serif';
            ctx.fillText(s.score.toLocaleString(), W / 2, 415);
            ctx.shadowBlur = 0;
            ctx.restore();

            // 8. Stats Chips (4 columns)
            const chipY = 475;
            const chipW = 160;
            const chipH = 68;
            const chips = [
                { label: 'BEST RECORD', val: s.bestScore.toLocaleString(), col: '#F59E0B' },
                { label: 'PROGRESS', val: `Wave ${s.level}`, col: '#10B981' },
                { label: 'FREQUENCY', val: '165 Hz', col: '#8B5CF6' }
            ];

            const startX = W / 2 - ((chips.length * (chipW + 16) - 16) / 2);
            chips.forEach((c, i) => {
                const cx = startX + i * (chipW + 16);
                ctx.save();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
                ctx.lineWidth = 1;
                if (ctx.roundRect) ctx.roundRect(cx, chipY, chipW, chipH, 12);
                else ctx.rect(cx, chipY, chipW, chipH);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#94A3B8';
                ctx.font = '700 11px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(c.label, cx + chipW / 2, chipY + 26);

                ctx.fillStyle = c.col;
                ctx.font = '900 18px Inter, sans-serif';
                ctx.fillText(c.val, cx + chipW / 2, chipY + 52);
                ctx.restore();
            });

            // 9. Rank Banner
            ctx.fillStyle = '#F8FAFC';
            ctx.font = '800 20px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Rank: ${s.rank}`, W / 2, 580);

            // 10. Call to Action / Footer
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(46, 620);
            ctx.lineTo(W - 46, 620);
            ctx.stroke();

            ctx.fillStyle = '#38BDF8';
            ctx.font = '800 18px Inter, sans-serif';
            ctx.fillText('Can you beat my high score?', W / 2, 665);

            ctx.fillStyle = '#E2E8F0';
            ctx.font = '600 15px Inter, sans-serif';
            ctx.fillText('Play instantly on any browser: waterejector.devdeskapp.com', W / 2, 700);

            ctx.fillStyle = '#94A3B8';
            ctx.font = '500 12px Inter, sans-serif';
            ctx.fillText('Powered by DevDeskApp • Calibrated 165Hz Acoustic Wave Technology', W / 2, 735);
            ctx.restore();
        },

        downloadImage() {
            const cvs = document.getElementById('scorecardCanvas');
            if (!cvs) return;
            const link = document.createElement('a');
            const safeName = this.state.gameName.toLowerCase().replace(/[^a-z0-9]/g, '-');
            link.download = `${safeName}-${this.state.score}pts-${this.getPlayerName()}.png`;
            link.href = cvs.toDataURL('image/png');
            link.click();
            this.showToast('Scorecard image downloaded!');
        },

        shareWhatsApp() {
            const name = this.getPlayerName();
            const text = `🎮 *${sName(this.state.gameName)} Scorecard*\n\n🔥 Pilot: *${name}*\n🏆 Score: *${this.state.score.toLocaleString()} PTS*\n⭐ Rank: *${this.state.rank}*\n\nCan you beat my high score in 165Hz Acoustic Arcade? Race me here:\n👉 ${this.state.url}`;
            const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        },

        async copyCard() {
            const cvs = document.getElementById('scorecardCanvas');
            const text = `🎮 I scored ${this.state.score.toLocaleString()} pts in ${this.state.gameName} on WaterEjector! Can you beat me? Play free: ${this.state.url}`;

            if (cvs && cvs.toBlob && navigator.clipboard && navigator.clipboard.write) {
                try {
                    cvs.toBlob(async (blob) => {
                        try {
                            const item = new ClipboardItem({ 'image/png': blob });
                            await navigator.clipboard.write([item]);
                            this.showToast('Scorecard image copied to clipboard!');
                        } catch (err) {
                            await navigator.clipboard.writeText(text);
                            this.showToast('Scorecard link & stats copied!');
                        }
                    });
                    return;
                } catch (e) {}
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                this.showToast('Scorecard link & stats copied!');
            }
        },

        showToast(msg) {
            const t = document.getElementById('scToast');
            if (!t) return;
            t.textContent = msg;
            t.classList.remove('hidden');
            setTimeout(() => {
                t.classList.add('hidden');
            }, 2600);
        }
    };

    function sName(n) {
        return n || 'Arcade';
    }

    root.AcousticScorecard = Scorecard;
})(window);
