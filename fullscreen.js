/**
 * WaterEjector - Universal Arcade Fullscreen Controller
 * Cross-platform full-screen management for HTML5 Canvas arcade games.
 * Supports:
 * - Desktop: Chrome, Edge, Firefox, Safari (HTML5 Fullscreen API + 'F' shortcut)
 * - Android: Chrome, Samsung Internet (HTML5 Fullscreen API)
 * - iOS: Safari on iPhone & iPad (Seamless CSS full-bleed viewport fallback)
 */
(function (root) {
    'use strict';

    const ArcadeFullscreen = {
        instance: null,

        init(options = {}) {
            const cardSelector = options.cardSelector || '#gameArea' || '#sonicGameArea' || '.game-viewport-card';
            const card = typeof cardSelector === 'string' ? document.querySelector(cardSelector) : cardSelector;
            if (!card) return null;

            const toggleBtnSelector = options.toggleBtnSelector || '.fs-toggle-btn';
            const exitBtnSelector = options.exitBtnSelector || '.fs-exit-action';
            const onResizeCallback = options.onResize || null;

            const isNativeFullscreen = () => {
                return !!(
                    document.fullscreenElement ||
                    document.webkitFullscreenElement ||
                    document.mozFullScreenElement ||
                    document.msFullscreenElement
                );
            };

            const isFullscreen = () => {
                return card.classList.contains('is-fullscreen') || isNativeFullscreen();
            };

            const syncUI = (active) => {
                card.classList.toggle('is-fullscreen', active);
                document.body.classList.toggle('game-fullscreen-active', active);

                // Update all toggle buttons
                const toggleBtns = document.querySelectorAll(toggleBtnSelector);
                toggleBtns.forEach(btn => {
                    const enterIcon = btn.querySelector('.fs-icon-enter');
                    const exitIcon = btn.querySelector('.fs-icon-exit');
                    const textSpan = btn.querySelector('.fs-btn-text');

                    if (enterIcon) enterIcon.classList.toggle('hidden', active);
                    if (exitIcon) exitIcon.classList.toggle('hidden', !active);
                    if (textSpan) textSpan.textContent = active ? 'Exit' : 'Full';

                    btn.setAttribute('title', active ? 'Exit Fullscreen (Esc / F)' : 'Play Fullscreen (F)');
                    btn.setAttribute('aria-label', active ? 'Exit Fullscreen' : 'Play Fullscreen');
                });

                // Update floating exit pill
                const exitBtns = document.querySelectorAll(exitBtnSelector);
                exitBtns.forEach(btn => {
                    btn.classList.toggle('hidden', !active);
                });

                // Trigger Canvas Resize
                const fireResize = () => {
                    window.dispatchEvent(new Event('resize'));
                    if (typeof onResizeCallback === 'function') {
                        try { onResizeCallback(active); } catch (e) {}
                    }
                };

                // Fire at multiple frames to handle mobile address bar animation
                fireResize();
                setTimeout(fireResize, 60);
                setTimeout(fireResize, 180);
                setTimeout(fireResize, 350);
            };

            const enter = () => {
                // 1. Try Native HTML5 Fullscreen API
                try {
                    if (card.requestFullscreen) {
                        card.requestFullscreen().catch(() => {});
                    } else if (card.webkitRequestFullscreen) {
                        card.webkitRequestFullscreen();
                    } else if (card.mozRequestFullScreen) {
                        card.mozRequestFullScreen();
                    } else if (card.msRequestFullscreen) {
                        card.msRequestFullscreen();
                    }
                } catch (err) {}

                // 2. Always apply CSS full-bleed mode (ensures iOS Safari iPhone coverage)
                syncUI(true);
            };

            const exit = () => {
                // 1. Try Native Exit
                try {
                    if (isNativeFullscreen()) {
                        if (document.exitFullscreen) {
                            document.exitFullscreen().catch(() => {});
                        } else if (document.webkitExitFullscreen) {
                            document.webkitExitFullscreen();
                        } else if (document.mozCancelFullScreen) {
                            document.mozCancelFullScreen();
                        } else if (document.msExitFullscreen) {
                            document.msExitFullscreen();
                        }
                    }
                } catch (err) {}

                // 2. Remove CSS overlay
                syncUI(false);
            };

            const toggle = () => {
                if (isFullscreen()) {
                    exit();
                } else {
                    enter();
                }
            };

            // Event Listeners for Buttons
            document.addEventListener('click', (e) => {
                const toggleTarget = e.target.closest(toggleBtnSelector);
                if (toggleTarget) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggle();
                    return;
                }

                const exitTarget = e.target.closest(exitBtnSelector);
                if (exitTarget) {
                    e.preventDefault();
                    e.stopPropagation();
                    exit();
                    return;
                }
            });

            // Listen to browser native fullscreen transitions (e.g. user pressed Esc)
            const handleNativeChange = () => {
                const nativeActive = isNativeFullscreen();
                if (!nativeActive && card.classList.contains('is-fullscreen')) {
                    syncUI(false);
                } else if (nativeActive && !card.classList.contains('is-fullscreen')) {
                    syncUI(true);
                }
            };

            ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
                document.addEventListener(evt, handleNativeChange);
            });

            // Keyboard shortcut listener: 'F' toggles, 'Esc' exits
            window.addEventListener('keydown', (e) => {
                const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
                if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

                if (e.key === 'f' || e.key === 'F') {
                    e.preventDefault();
                    toggle();
                } else if (e.key === 'Escape' && isFullscreen()) {
                    exit();
                }
            });

            this.instance = {
                toggle,
                enter,
                exit,
                isFullscreen
            };

            return this.instance;
        }
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const card = document.getElementById('gameArea') || document.getElementById('sonicGameArea') || document.querySelector('.game-viewport-card');
            if (card) ArcadeFullscreen.init({ cardSelector: card });
        });
    } else {
        const card = document.getElementById('gameArea') || document.getElementById('sonicGameArea') || document.querySelector('.game-viewport-card');
        if (card) ArcadeFullscreen.init({ cardSelector: card });
    }

    root.ArcadeFullscreen = ArcadeFullscreen;
})(window);
