// Speaker Cleaner Tool - Main JavaScript File

// Global variables
let audioContext;
let oscillator;
let gainNode;
let isPlaying = false;
let currentMode = "water";
let currentSpeaker = "both";
let progressInterval;
let vibrationInterval;

// Next-step suggestions shown when a cleaning mode completes.
// Keyed by the mode that just ran; primaryHref points to the page
// hosting the suggested follow-up mode.
const NEXT_STEPS = {
  water: {
    title: "Water ejection complete!",
    message:
      "Still hearing muffled sound? Dust in the speaker grill is the most common cause.",
    stoppedTitle: "Water eject stopped",
    stoppedMessage:
      "A full 60-second pass works best. Restart it — or if the sound seems dusty rather than wet, try a deep dust clean.",
    primaryText: "Run Deep Dust Clean",
    primaryHref: "/deep-clean/",
    secondaryText: "Run Water Eject Again",
  },
  dust: {
    title: "Deep dust clean complete!",
    message:
      "Water still trapped inside? Vibration mode shakes out the remaining drops.",
    stoppedTitle: "Dust clean stopped",
    stoppedMessage:
      "Letting the full frequency sweep finish gives the best result. Or if trapped water is the problem, vibration mode may help more.",
    primaryText: "Try Vibration Mode",
    primaryHref: "/vibration/",
    secondaryText: "Run Dust Clean Again",
  },
  vibrate: {
    title: "Vibration complete!",
    message: "Finish with a standard water eject pass for the clearest sound.",
    stoppedTitle: "Vibration stopped",
    stoppedMessage:
      "A full cycle shakes out the most water. Restart it, or finish with a standard water eject pass.",
    primaryText: "Run Standard Clean",
    primaryHref: "/",
    secondaryText: "Run Vibration Again",
  },
};

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  // The audio context is created on first play, not here — browsers refuse
  // to start one before a user gesture anyway, and building it during load
  // only added main-thread work before the page was interactive.
  setupEventListeners();
  setupMobileMenu();
  setupFAQ();
  setupSmoothScroll();

  // Each page marks its own mode as active; links styled as mode
  // buttons navigate to the other mode pages.
  const activeModeBtn = document.querySelector("button.mode-btn.active");
  if (activeModeBtn) {
    currentMode = activeModeBtn.dataset.mode;
  }
});

// Create the Audio Context on demand. Returns false if the browser can't.
function initializeAudioContext() {
  if (audioContext) return true;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    return true;
  } catch (error) {
    console.error("Web Audio API not supported:", error);
    alert(
      "Your browser does not support the Web Audio API. Please use a modern browser."
    );
    return false;
  }
}

function setupEventListeners() {
  // Only setup if the tool is present (check for main button)
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  if (!startBtn || !stopBtn) return;

  // Mode selection buttons (anchors styled as mode buttons navigate
  // to their own page instead of switching in place)
  const modeBtns = document.querySelectorAll("button.mode-btn");
  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentMode = btn.dataset.mode;
    });
  });

  // Speaker selection buttons
  const speakerBtns = document.querySelectorAll(".speaker-btn");
  speakerBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      speakerBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentSpeaker = btn.dataset.speaker;
    });
  });

  // Control buttons
  startBtn.addEventListener("click", startCleaning);
  stopBtn.addEventListener("click", () => {
    const stoppedMode = currentMode;
    stopCleaning();
    showNextStep(stoppedMode, true);
  });
}

// Setup Event Listeners
// function setupEventListeners() {
//   // Mode selection buttons
//   const modeBtns = document.querySelectorAll(".mode-btn");
//   modeBtns.forEach((btn) => {
//     btn.addEventListener("click", () => {
//       modeBtns.forEach((b) => b.classList.remove("active"));
//       btn.classList.add("active");
//       currentMode = btn.dataset.mode;
//     });
//   });

//   // Speaker selection buttons
//   const speakerBtns = document.querySelectorAll(".speaker-btn");
//   speakerBtns.forEach((btn) => {
//     btn.addEventListener("click", () => {
//       speakerBtns.forEach((b) => b.classList.remove("active"));
//       btn.classList.add("active");
//       currentSpeaker = btn.dataset.speaker;
//     });
//   });

//   // Control buttons
//   document.getElementById("startBtn").addEventListener("click", startCleaning);
//   document.getElementById("stopBtn").addEventListener("click", stopCleaning);
// }

// Start Cleaning Process
async function startCleaning() {
  if (isPlaying) return;

  // First click is the user gesture the audio context needs to exist
  if (!initializeAudioContext()) return;

  // Resume audio context if suspended (required for user interaction)
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  isPlaying = true;
  updateUIState(true);
  hideNextStep();

  // Reset progress
  updateProgress(0, "Starting...");

  // Execute cleaning based on mode
  switch (currentMode) {
    case "water":
      await waterEjectMode();
      break;
    case "dust":
      await dustRemovalMode();
      break;
    case "vibrate":
      await vibrationMode();
      break;
  }
}

// Stop Cleaning Process
function stopCleaning() {
  isPlaying = false;
  stopAllAudio();
  stopVibration();
  clearInterval(progressInterval);
  updateProgress(0, "Stopped");
  updateUIState(false);
}

// Water Eject Mode
async function waterEjectMode() {
  updateProgress(0, "Ejecting water...");

  // Pulsed 165Hz bursts (1s on / 0.3s off) — 165Hz sits near the
  // resonant frequency of phone speaker membranes, and pulsing
  // mimics the pump cycles Apple's water eject uses
  const duration = 60000; // 60 seconds
  playPulsedFrequency(165, duration, 1000, 300);

  // Animate progress
  animateProgress(duration, "Ejecting water...");

  // Wait for completion
  await sleep(duration);

  if (isPlaying) {
    updateProgress(100, "Water ejection complete!");
    stopAllAudio();
    isPlaying = false;
    updateUIState(false);
    showNextStep("water");
  }
}

// Dust Removal Mode
async function dustRemovalMode() {
  updateProgress(0, "Removing dust...");

  // Cycle through frequencies for dust removal — kept within the
  // 200-1500Hz band where diaphragm excursion is large enough to
  // mechanically dislodge debris (higher tones barely move the cone)
  const frequencies = [200, 300, 450, 700, 1000, 1500];
  const durationPerFreq = 10000; // 10 seconds per frequency
  const totalDuration = frequencies.length * durationPerFreq;

  let elapsed = 0;

  for (let i = 0; i < frequencies.length && isPlaying; i++) {
    const freq = frequencies[i];
    playFrequency(freq, durationPerFreq);

    const startTime = Date.now();
    const endTime = startTime + durationPerFreq;

    while (Date.now() < endTime && isPlaying) {
      elapsed = i * durationPerFreq + (Date.now() - startTime);
      const progress = (elapsed / totalDuration) * 100;
      updateProgress(progress, `Removing dust... ${freq}Hz`);
      await sleep(100);
    }

    stopAllAudio();
    await sleep(500); // Brief pause between frequencies
  }

  if (isPlaying) {
    updateProgress(100, "Dust removal complete!");
    isPlaying = false;
    updateUIState(false);
    showNextStep("dust");
  }
}

// Vibration Mode
async function vibrationMode() {
  // iOS Safari has no Vibration API — fall back to the bass tone
  // alone instead of dead-ending the flow with an alert
  const canVibrate = "vibrate" in navigator;
  const statusText = canVibrate ? "Vibrating..." : "Deep bass mode...";

  updateProgress(0, "Vibration mode active...");

  // Play low frequency sound with vibration
  const duration = 30000; // 30 seconds
  playFrequency(80, duration);

  if (canVibrate) {
    startVibrationPattern();
  }

  // Animate progress
  animateProgress(duration, statusText);

  // Wait for completion
  await sleep(duration);

  if (isPlaying) {
    updateProgress(100, "Vibration complete!");
    stopAllAudio();
    stopVibration();
    isPlaying = false;
    updateUIState(false);
    showNextStep("vibrate");
  }
}

// Create oscillator -> gain -> panner chain for the selected speaker
function createToneChain(frequency) {
  stopAllAudio();

  oscillator = audioContext.createOscillator();
  gainNode = audioContext.createGain();

  // Create stereo panner for left/right speaker selection
  const panner = audioContext.createStereoPanner();

  // Set panning based on speaker selection
  switch (currentSpeaker) {
    case "left":
      panner.pan.value = -1; // Full left
      break;
    case "right":
      panner.pan.value = 1; // Full right
      break;
    case "both":
    default:
      panner.pan.value = 0; // Center (both)
      break;
  }

  // Configure oscillator
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);

  // Connect nodes
  oscillator.connect(gainNode);
  gainNode.connect(panner);
  panner.connect(audioContext.destination);
}

// Play Frequency (continuous tone)
function playFrequency(frequency, duration) {
  createToneChain(frequency);

  // Fade in
  gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.1);

  // Start oscillator
  oscillator.start();

  // Schedule fade out before stop
  const stopTime = audioContext.currentTime + duration / 1000;
  gainNode.gain.setValueAtTime(1, stopTime - 0.1);
  gainNode.gain.linearRampToValueAtTime(0, stopTime);
  oscillator.stop(stopTime);
}

// Play Frequency as repeated bursts. The silent gap between pulses
// lets ejected droplets settle away from the grille instead of being
// pulled back on the diaphragm's return stroke.
function playPulsedFrequency(frequency, duration, pulseMs, gapMs) {
  createToneChain(frequency);

  const now = audioContext.currentTime;
  const totalSec = duration / 1000;
  const pulseSec = pulseMs / 1000;
  const cycleSec = (pulseMs + gapMs) / 1000;
  const ramp = 0.04;

  for (let t = 0; t < totalSec; t += cycleSec) {
    const start = now + t;
    const end = Math.min(start + pulseSec, now + totalSec);
    gainNode.gain.setValueAtTime(0, start);
    gainNode.gain.linearRampToValueAtTime(1, start + ramp);
    gainNode.gain.setValueAtTime(1, Math.max(end - ramp, start + ramp));
    gainNode.gain.linearRampToValueAtTime(0, end);
  }

  oscillator.start();
  oscillator.stop(now + totalSec);
}

// Stop All Audio
function stopAllAudio() {
  if (oscillator) {
    try {
      oscillator.stop();
      oscillator.disconnect();
    } catch (e) {
      // Already stopped
    }
    oscillator = null;
  }
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
}

// Start Vibration Pattern
function startVibrationPattern() {
  // Vibrate pattern: [vibrate, pause, vibrate, pause, ...]
  const pattern = [200, 100]; // 200ms vibrate, 100ms pause

  vibrationInterval = setInterval(() => {
    if (isPlaying && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }, 300);
}

// Stop Vibration
function stopVibration() {
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }
  if ("vibrate" in navigator) {
    navigator.vibrate(0); // Stop any ongoing vibration
  }
}

// Animate Progress
function animateProgress(duration, statusText) {
  const startTime = Date.now();
  const endTime = startTime + duration;

  clearInterval(progressInterval);

  progressInterval = setInterval(() => {
    if (!isPlaying) {
      clearInterval(progressInterval);
      return;
    }

    const now = Date.now();
    const elapsed = now - startTime;
    const progress = Math.min((elapsed / duration) * 100, 100);

    updateProgress(progress, statusText);

    if (progress >= 100) {
      clearInterval(progressInterval);
    }
  }, 100);
}

// Update Progress Bar
function updateProgress(percent, status) {
  const progressFill = document.getElementById("progressFill");
  const progressPercent = document.getElementById("progressPercent");
  const statusText = document.getElementById("statusText");

  progressFill.style.width = `${percent}%`;
  progressPercent.textContent = `${Math.round(percent)}%`;
  statusText.textContent = status;
}



// Show the next-step popup after a cleaning cycle finishes or is stopped
function showNextStep(mode, stopped) {
  const step = NEXT_STEPS[mode];
  if (!step || !document.querySelector(".tool-card")) return;

  hideNextStep();

  const checkIcon = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>`;
  const pauseIcon = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1"></rect>
            <rect x="14" y="5" width="4" height="14" rx="1"></rect>
        </svg>`;

  const overlay = document.createElement("div");
  overlay.className = "next-step-overlay";
  overlay.id = "nextStepPanel";
  overlay.innerHTML = `
        <div class="next-step-modal${stopped ? " stopped" : ""}" role="dialog" aria-modal="true"
            aria-labelledby="nextStepTitle">
            <button type="button" class="next-step-close" aria-label="Close">&times;</button>
            <div class="next-step-check">${stopped ? pauseIcon : checkIcon}</div>
            <h3 id="nextStepTitle">${stopped ? step.stoppedTitle : step.title}</h3>
            <p>${stopped ? step.stoppedMessage : step.message}</p>
            <div class="next-step-actions">
                <a href="${step.primaryHref}" class="btn btn-primary">${step.primaryText}</a>
                <button type="button" class="btn btn-secondary" id="runAgainBtn">${step.secondaryText}</button>
            </div>
        </div>
    `;

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hideNextStep();
  });
  overlay.querySelector(".next-step-close").addEventListener("click", hideNextStep);
  overlay.querySelector(".btn-primary").addEventListener("click", () => {
    if (typeof gtag === "function") {
      gtag("event", "flow_next_step", { from_mode: mode, stopped: !!stopped });
    }
  });
  overlay.querySelector("#runAgainBtn").addEventListener("click", () => {
    hideNextStep();
    startCleaning();
  });
  
// Remove the next-step popup if present
function hideNextStep() {
  const overlay = document.getElementById("nextStepPanel");
  if (overlay) {
    overlay.remove();
  }
  document.body.classList.remove("modal-open");
  document.removeEventListener("keydown", closeNextStepOnEscape);
}

function closeNextStepOnEscape(e) {
  if (e.key === "Escape") hideNextStep();
}

// Update UI State
function updateUIState(playing) {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const modeBtns = document.querySelectorAll(".mode-btn");
  const speakerBtns = document.querySelectorAll(".speaker-btn");

  startBtn.disabled = playing;
  stopBtn.disabled = !playing;

  modeBtns.forEach((btn) => (btn.disabled = playing));
  speakerBtns.forEach((btn) => (btn.disabled = playing));

  if (!playing) {
    startBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
            <span>Start Cleaning</span>
        `;
  } else {
    startBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" opacity="0.5"/>
            </svg>
            <span>Running...</span>
        `;
  }
}

// Mobile Menu
function setupMobileMenu() {
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const navLinks = document.getElementById("navLinks");

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", () => {
      navLinks.classList.toggle("active");
      mobileMenuBtn.classList.toggle("active");
    });

    // Close menu when clicking on a link
    const links = navLinks.querySelectorAll("a");
    links.forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("active");
        mobileMenuBtn.classList.remove("active");
      });
    });
  }
}

// FAQ Accordion
function setupFAQ() {
  const faqQuestions = document.querySelectorAll(".faq-question");

  faqQuestions.forEach((question) => {
    question.addEventListener("click", () => {
      const faqItem = question.parentElement;
      const isActive = faqItem.classList.contains("active");

      // Close all other FAQ items
      document.querySelectorAll(".faq-item").forEach((item) => {
        item.classList.remove("active");
      });

      // Toggle current item
      if (!isActive) {
        faqItem.classList.add("active");
      }
    });
  });
}

// Smooth Scroll
function setupSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (href === "#") return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  });

  // Update active nav link on scroll.
  // Reading offsetTop inside the scroll handler forced a layout on every
  // scroll event; offsets are measured once instead and only remeasured
  // when the layout can actually have changed.
  const sections = Array.from(document.querySelectorAll("section[id]"));

  // Nav hrefs are root-relative ("/#benefits"), so match on the fragment
  // rather than the whole href — comparing full hrefs never matched and
  // the highlight silently did nothing.
  const anchorLinks = Array.from(document.querySelectorAll(".nav-link"))
    .map((link) => ({ link, id: (link.getAttribute("href") || "").split("#")[1] }))
    .filter((entry) => entry.id);
  if (!sections.length || !anchorLinks.length) return;

  let offsets = [];
  let ticking = false;
  let activeId = null;

  function measure() {
    offsets = sections.map((section) => ({
      id: section.getAttribute("id"),
      top: section.offsetTop,
    }));
  }

  function updateActiveLink() {
    ticking = false;

    let current = "";
    for (const section of offsets) {
      if (window.scrollY >= section.top - 200) current = section.id;
    }

    // Only touch the DOM when the highlighted link actually changes
    if (current === activeId) return;
    activeId = current;

    anchorLinks.forEach((entry) => {
      entry.link.classList.toggle("active", entry.id === current);
    });
  }

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateActiveLink);
    },
    { passive: true }
  );

  // Ads and late-loading fonts change section positions after first paint
  window.addEventListener("resize", measure, { passive: true });
  window.addEventListener("load", measure);
  measure();
}

// Utility function for sleep
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Handle page visibility change (pause when tab is hidden)
document.addEventListener("visibilitychange", () => {
  if (document.hidden && isPlaying) {
    // Optionally stop when tab is hidden
    // stopCleaning();
  }
});

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  stopCleaning();
  if (audioContext) {
    audioContext.close();
  }
});

// --- ANIMATIONS OBSERVER ---
document.addEventListener("DOMContentLoaded", () => {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
                entry.target.classList.add('animate-on-scroll');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Select all sections and cards to animate
    const elementsToAnimate = document.querySelectorAll('.content-card, .faq-item, .step-card, .stat-card, .hero-content');
    elementsToAnimate.forEach(el => {
        el.style.opacity = '0'; // hide initially
        observer.observe(el);
    });
});

// --- THEME TOGGLE (DARK/LIGHT MODE) ---
document.addEventListener("DOMContentLoaded", () => {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (!themeToggleBtn) return;
    
    const iconSun = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`;
    const iconMoon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>`;

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeToggleBtn.innerHTML = theme === 'dark' ? iconSun : iconMoon;
    }

    // Check LocalStorage or OS Preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        setTheme(savedTheme);
    } else if (prefersDark) {
        setTheme('dark');
    } else {
        setTheme('light');
    }

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
});
