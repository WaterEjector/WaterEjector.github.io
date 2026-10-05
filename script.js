(function initEarlyTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved ? saved : (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();

let audioContext;
let oscillator;
let gainNode;
let isPlaying = false;
let currentMode = "water";
let currentSpeaker = "both";
let progressInterval;
let vibrationInterval;
const NEXT_STEPS = {
  water: {
    title: "Water ejection complete!",
    message:
      "Still hearing muffled sound? Dust in the speaker grill is the most common cause.",
    stoppedTitle: "Water eject stopped",
    stoppedMessage:
      "A full 60-second pass works best. Restart it - or if the sound seems dusty rather than wet, try a deep dust clean.",
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
  stereo: {
    title: "Stereo Balance Test Complete!",
    message:
      "Is one speaker or earbud quieter? Trapped water or earwax is often the culprit. Try our primary Water Ejector to clear it out.",
    stoppedTitle: "Stereo Test Paused",
    stoppedMessage:
      "Speaker test paused. If your audio sounded muffled or uneven on either channel, run our water ejection cycle.",
    primaryText: "Run Water Ejector",
    primaryHref: "/",
    secondaryText: "Test Sound Again",
  },
  frequency: {
    title: "Custom Frequency Complete!",
    message:
      "Did this frequency shake out the water? Finish with a standard water eject cycle for the clearest sound.",
    stoppedTitle: "Frequency Tone Stopped",
    stoppedMessage:
      "Frequency playback stopped. If you found the optimal resonance frequency, run our standard water eject pass.",
    primaryText: "Run Standard Clean",
    primaryHref: "/",
    secondaryText: "Play Frequency Again",
  },
  port: {
    title: "30-Minute Drying Completed!",
    message:
      "Your charging port has air-dried for 30 minutes. You can now safely plug in your cable to check if the warning is gone.",
    stoppedTitle: "Drying Timer Paused",
    stoppedMessage:
      "Port drying paused. We strongly recommend letting it air-dry for at least 30 minutes before attempting to charge.",
    primaryText: "Test Speakers Next",
    primaryHref: "/",
    secondaryText: "Resume Timer",
  },
};

async function initApp() {
  await loadComponents();
  setupEventListeners();
  setupMobileMenu();
  setupThemeToggle();
  setupFAQ();
  setupCookieBanner();
  setupSmoothScroll();
  setupPWA();
  const activeModeBtn = document.querySelector("button.mode-btn.active");
  if (activeModeBtn) {
    currentMode = activeModeBtn.dataset.mode;
  }
}

if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}

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
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const modeBtns = document.querySelectorAll("button.mode-btn");
  const speakerBtns = document.querySelectorAll(".speaker-btn");

  if (modeBtns) {
    modeBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        modeBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentMode = btn.dataset.mode;
      });
    });
  }

  if (speakerBtns) {
    speakerBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        speakerBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentSpeaker = btn.dataset.speaker;
      });
    });
  }

  if (startBtn) {
    startBtn.addEventListener("click", startCleaning);
  }
  
  if (stopBtn) {
    stopBtn.addEventListener("click", () => {
      const stoppedMode = currentMode;
      stopCleaning();
      showNextStep(stoppedMode, true);
    });
  }
}
async function startCleaning() {
  if (isPlaying) return;
  if (!initializeAudioContext()) return;
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  isPlaying = true;
  updateUIState(true);
  hideNextStep();
  updateProgress(0, "Starting...");
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
function stopCleaning() {
  isPlaying = false;
  stopAllAudio();
  stopVibration();
  clearInterval(progressInterval);
  updateProgress(0, "Stopped");
  updateUIState(false);
}
async function waterEjectMode() {
  updateProgress(0, "Ejecting water...");
  const duration = 60000;
  playPulsedFrequency(165, duration, 1000, 300);
  animateProgress(duration, "Ejecting water...");
  await sleep(duration);
  if (isPlaying) {
    updateProgress(100, "Water ejection complete!");
    stopAllAudio();
    isPlaying = false;
    updateUIState(false);
    showNextStep("water");
  }
}
async function dustRemovalMode() {
  updateProgress(0, "Removing dust...");
  const frequencies = [200, 300, 450, 700, 1000, 1500];
  const durationPerFreq = 10000;
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
    await sleep(500);
  }
  if (isPlaying) {
    updateProgress(100, "Dust removal complete!");
    isPlaying = false;
    updateUIState(false);
    showNextStep("dust");
  }
}
async function vibrationMode() {
  const canVibrate = "vibrate" in navigator;
  const statusText = canVibrate ? "Vibrating..." : "Deep bass mode...";
  updateProgress(0, "Vibration mode active...");
  const duration = 30000;
  playFrequency(80, duration);
  if (canVibrate) {
    startVibrationPattern();
  }
  animateProgress(duration, statusText);
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
function createToneChain(frequency) {
  stopAllAudio();
  oscillator = audioContext.createOscillator();
  gainNode = audioContext.createGain();
  const panner = audioContext.createStereoPanner();
  switch (currentSpeaker) {
    case "left":
      panner.pan.value = -1;
      break;
    case "right":
      panner.pan.value = 1;
      break;
    case "both":
    default:
      panner.pan.value = 0;
      break;
  }
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  oscillator.connect(gainNode);
  gainNode.connect(panner);
  panner.connect(audioContext.destination);
}
function playFrequency(frequency, duration) {
  createToneChain(frequency);
  gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.1);
  oscillator.start();
  const stopTime = audioContext.currentTime + duration / 1000;
  gainNode.gain.setValueAtTime(1, stopTime - 0.1);
  gainNode.gain.linearRampToValueAtTime(0, stopTime);
  oscillator.stop(stopTime);
}
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
function stopAllAudio() {
  if (oscillator) {
    try {
      oscillator.stop();
      oscillator.disconnect();
    } catch (e) {
    }
    oscillator = null;
  }
  if (gainNode) {
    gainNode.disconnect();
    gainNode = null;
  }
}
function startVibrationPattern() {
  const pattern = [200, 100];
  vibrationInterval = setInterval(() => {
    if (isPlaying && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }, 300);
}
function stopVibration() {
  if (vibrationInterval) {
    clearInterval(vibrationInterval);
    vibrationInterval = null;
  }
  if ("vibrate" in navigator) {
    navigator.vibrate(0);
  }
}
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
function updateProgress(percent, status) {
  const progressFill = document.getElementById("progressFill");
  const progressPercent = document.getElementById("progressPercent");
  const statusText = document.getElementById("statusText");
  progressFill.style.width = `${percent}%`;
  progressPercent.textContent = `${Math.round(percent)}%`;
  statusText.textContent = status;
}
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
    const stereoBtn = document.getElementById("startStereoBtn");
    const freqBtn = document.getElementById("startFreqBtn");
    const timerBtn = document.getElementById("startTimerBtn");
    if (stereoBtn) {
      stereoBtn.click();
    } else if (freqBtn) {
      freqBtn.click();
    } else if (timerBtn) {
      timerBtn.click();
    } else {
      startCleaning();
    }
  });
  document.addEventListener("keydown", closeNextStepOnEscape);
  document.body.appendChild(overlay);
  document.body.classList.add("modal-open");
  if (typeof gtag === "function") {
    gtag("event", stopped ? "clean_stopped" : "clean_complete", { mode: mode });
  }
}
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


function setupMobileMenu() {
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const navLinks = document.getElementById("navLinks");
  
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      mobileMenuBtn.classList.toggle("active");
      navLinks.classList.toggle("active");
    };

    const links = navLinks.querySelectorAll("a:not(.dropdown-toggle)");
    links.forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenuBtn.classList.remove("active");
        navLinks.classList.remove("active");
      });
    });

    document.addEventListener("click", (e) => {
      if (!navLinks.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        mobileMenuBtn.classList.remove("active");
        navLinks.classList.remove("active");
      }
    });
  }

  const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
  dropdownToggles.forEach(toggle => {
    toggle.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const parent = toggle.parentElement;
      const willOpen = !parent.classList.contains('active');
      document.querySelectorAll('.dropdown.active').forEach(dd => {
        if (dd !== parent) {
          dd.classList.remove('active');
          const t = dd.querySelector('.dropdown-toggle');
          if (t) t.setAttribute('aria-expanded', 'false');
        }
      });
      parent.classList.toggle('active', willOpen);
      toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    };
  });

  document.addEventListener('click', (e) => {
    const activeDropdowns = document.querySelectorAll('.dropdown.active');
    activeDropdowns.forEach(dd => {
      if (!dd.contains(e.target)) {
        dd.classList.remove('active');
        const t = dd.querySelector('.dropdown-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      }
    });
  });
}

function setupFAQ() {
  const faqQuestions = document.querySelectorAll(".faq-question");
  faqQuestions.forEach((question) => {
    question.addEventListener("click", () => {
      const faqItem = question.parentElement;
      const isActive = faqItem.classList.contains("active");
      document.querySelectorAll(".faq-item").forEach((item) => {
        item.classList.remove("active");
      });
      if (!isActive) {
        faqItem.classList.add("active");
      }
    });
  });
}
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
  const sections = Array.from(document.querySelectorAll("section[id]"));
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
  window.addEventListener("resize", measure, { passive: true });
  window.addEventListener("load", measure);
  measure();
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
document.addEventListener("visibilitychange", () => { if (document.hidden && isPlaying) { stopCleaning(); } });
window.addEventListener("beforeunload", () => {
  stopCleaning();
  if (audioContext) {
    audioContext.close();
  }
});
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
    const elementsToAnimate = document.querySelectorAll('.content-card, .faq-item, .step-card, .stat-card, .hero-content, .tip-card, .benefit-card');
    elementsToAnimate.forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });
});


let stereoPanner = null;
const startStereoBtn = document.getElementById("startStereoBtn");
if (startStereoBtn) {
  const speakerBtns = document.querySelectorAll(".speaker-btn");
  let currentPan = 0; 

  speakerBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      speakerBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentPan = parseFloat(btn.getAttribute("data-pan"));
      if (stereoPanner) {
        stereoPanner.pan.value = currentPan;
      }
    });
  });

  startStereoBtn.addEventListener("click", async () => {
    if (isPlaying) {
      stopCleaning();
      startStereoBtn.textContent = "Play Test Sound";
      document.getElementById("stereoProgress").style.display = "none";
      showNextStep("stereo", true);
      return;
    }
    
    if (!initializeAudioContext()) return;
    if (audioContext.state === "suspended") await audioContext.resume();
    
    isPlaying = true;
    startStereoBtn.textContent = "Stop Test Sound";
    document.getElementById("stereoProgress").style.display = "block";
    
    stopAllAudio();
    oscillator = audioContext.createOscillator();
    gainNode = audioContext.createGain();

    stereoPanner = audioContext.createStereoPanner();
    stereoPanner.pan.value = currentPan;

    oscillator.type = "sine";
    oscillator.frequency.value = 400; 
    
    oscillator.connect(gainNode);
    gainNode.connect(stereoPanner);
    stereoPanner.connect(audioContext.destination);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.1);
    
    oscillator.start();
  });
}

const freqSlider = document.getElementById("freqSlider");
const freqDisplay = document.getElementById("freqDisplay");
const startFreqBtn = document.getElementById("startFreqBtn");

if (freqSlider && startFreqBtn) {
  freqSlider.addEventListener("input", (e) => {
    const val = e.target.value;
    freqDisplay.textContent = val;
    if (isPlaying && oscillator) {
      oscillator.frequency.setValueAtTime(val, audioContext.currentTime);
    }
  });

  startFreqBtn.addEventListener("click", async () => {
    if (isPlaying) {
      stopCleaning();
      startFreqBtn.textContent = "Play Frequency";
      showNextStep("frequency", true);
      return;
    }
    
    if (!initializeAudioContext()) return;
    if (audioContext.state === "suspended") await audioContext.resume();
    
    isPlaying = true;
    startFreqBtn.textContent = "Stop Frequency";
    
    stopAllAudio();
    oscillator = audioContext.createOscillator();
    gainNode = audioContext.createGain();
    
    oscillator.type = "sine";
    oscillator.frequency.value = parseFloat(freqSlider.value);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.1);
    
    oscillator.start();
  });
}

const startTimerBtn = document.getElementById("startTimerBtn");
const timerDisplay = document.getElementById("timerDisplay");
let timerInterval;

if (startTimerBtn && timerDisplay) {
  startTimerBtn.addEventListener("click", () => {
    if (startTimerBtn.textContent.includes("Stop")) {
      clearInterval(timerInterval);
      timerDisplay.textContent = "30:00";
      startTimerBtn.textContent = "Start 30-Minute Timer";
      showNextStep("port", true);
      return;
    }
    
    startTimerBtn.textContent = "Stop Timer";
    let timeLeft = 30 * 60; 
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timerDisplay.textContent = "00:00";
        startTimerBtn.textContent = "Start 30-Minute Timer";
        showNextStep("port", false);
        return;
      }
      
      const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
      const s = (timeLeft % 60).toString().padStart(2, '0');
      timerDisplay.textContent = `${m}:${s}`;
    }, 1000);
  });
}

const recordBtn = document.getElementById("recordBtn");
const recordBtnText = document.getElementById("recordBtnText");
const micProgress = document.getElementById("micProgress");
const micProgressBar = document.getElementById("micProgressBar");
const playbackContainer = document.getElementById("playbackContainer");
const audioPlayback = document.getElementById("audioPlayback");
let mediaRecorder;
let audioChunks = [];

if (recordBtn) {
  recordBtn.addEventListener("click", async () => {

    if (recordBtn.classList.contains("recording")) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPlayback.src = audioUrl;

        stream.getTracks().forEach(track => track.stop());
        
        recordBtn.classList.remove("recording");
        recordBtnText.textContent = "Start Recording (5s)";
        micProgress.style.display = "none";
        playbackContainer.style.display = "block";
      };

      playbackContainer.style.display = "none";
      recordBtn.classList.add("recording");
      recordBtnText.textContent = "Recording... Speak Now!";
      micProgress.style.display = "block";
      
      mediaRecorder.start();

      let width = 0;
      micProgressBar.style.width = "0%";
      const progressInt = setInterval(() => {
        width += 2; 
        micProgressBar.style.width = width + "%";
        if (width >= 100) clearInterval(progressInt);
      }, 100);

      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 5000);
      
    } catch (err) {
      alert("Microphone access denied or not available on this device. Please check your browser permissions.");
    }
  });
}


function setupThemeToggle() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (!themeToggleBtn) return;
  
  function updateThemeUI(theme) {
    const sun = themeToggleBtn.querySelector('.sun-icon');
    const moon = themeToggleBtn.querySelector('.moon-icon');
    if (sun && moon) {
      if (theme === 'dark') {
        sun.style.display = 'block';
        moon.style.display = 'none';
      } else {
        sun.style.display = 'none';
        moon.style.display = 'block';
      }
    }
  }

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeUI(currentTheme);

  themeToggleBtn.onclick = (e) => {
    e.preventDefault();
    const activeTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', activeTheme);
    localStorage.setItem('theme', activeTheme);
    updateThemeUI(activeTheme);
  };
}

async function loadComponents() {
  try {
    const [headerRes, footerRes] = await Promise.all([
      fetch('/components/header.html'),
      fetch('/components/footer.html')
    ]);
    
    if (headerRes.ok) {
      const headerPlaceholder = document.getElementById('header-placeholder');
      if (headerPlaceholder) {
        headerPlaceholder.innerHTML = await headerRes.text();
      }
    }
    if (footerRes.ok) {
      const footerPlaceholder = document.getElementById('footer-placeholder');
      if (footerPlaceholder) {
        footerPlaceholder.innerHTML = await footerRes.text();
      }
    }
    
    setupMobileMenu();
    setupThemeToggle();
    highlightActiveNavTools();
  } catch (error) {
    console.error("Error loading components:", error);
  }
}

function highlightActiveNavTools() {
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  const dropdownItems = document.querySelectorAll('.dropdown-item');
  let isToolPage = false;
  dropdownItems.forEach((item) => {
    const itemPath = (item.getAttribute('href') || '').replace(/\/$/, '') || '/';
    if (itemPath === currentPath) {
      item.classList.add('active');
      isToolPage = true;
    } else {
      item.classList.remove('active');
    }
  });

  const dropdownToggle = document.querySelector('.dropdown-toggle');
  if (dropdownToggle && isToolPage && currentPath !== '/') {
    dropdownToggle.classList.add('active');
  }
}


function setupCookieBanner() {
    const banner = document.getElementById('cookieBanner');
    const acceptBtn = document.getElementById('acceptCookies');
    
    if (banner && acceptBtn) {
        if (!localStorage.getItem('cookiesAccepted')) {
            banner.style.display = 'flex';
        } else {
            banner.style.display = 'none';
        }
        
        acceptBtn.addEventListener('click', () => {
            localStorage.setItem('cookiesAccepted', 'true');
            banner.style.opacity = '0';
            setTimeout(() => {
                banner.style.display = 'none';
            }, 300);
        });
    }
}

// ==========================================
// PWA INSTALLATION & SERVICE WORKER
// ==========================================
let deferredInstallPrompt = null;

// Catch beforeinstallprompt early
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;

  const navBtn = document.getElementById('navInstallBtn');
  if (navBtn) navBtn.style.display = 'inline-flex';

  triggerPWAPrompt(false);
});

window.addEventListener('appinstalled', () => {
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) {
    banner.classList.remove('show');
    setTimeout(() => banner.remove(), 400);
  }
  const navBtn = document.getElementById('navInstallBtn');
  if (navBtn) navBtn.style.display = 'none';
  localStorage.setItem('pwa_installed', 'true');
  deferredInstallPrompt = null;
});

function triggerPWAPrompt(isManualClick = false) {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;
  if (isStandalone) return;

  const dismissedTime = localStorage.getItem('pwa_dismissed_time');
  const now = Date.now();
  if (!isManualClick && dismissedTime && (now - parseInt(dismissedTime, 10)) < 24 * 3600 * 1000) {
    return;
  }

  if (document.getElementById('pwaInstallBanner')) return;

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;

  const banner = document.createElement('div');
  banner.id = 'pwaInstallBanner';
  banner.className = 'pwa-install-banner';

  if (isIOS) {
    banner.innerHTML = `
      <div class="pwa-install-card">
        <div class="pwa-app-icon">
          <img src="/icon-192.png" alt="WaterEjector App Icon" width="46" height="46">
        </div>
        <div class="pwa-info">
          <div class="pwa-title">Install WaterEjector App</div>
          <div class="pwa-subtitle">Tap <span class="ios-share-badge">Share ⎋</span> then select <strong>'Add to Home Screen' ➕</strong></div>
        </div>
        <div class="pwa-actions">
          <button id="pwaCloseBtn" class="btn btn-primary btn-pwa-install">Got It</button>
        </div>
      </div>
    `;
  } else {
    banner.innerHTML = `
      <div class="pwa-install-card">
        <div class="pwa-app-icon">
          <img src="/icon-192.png" alt="WaterEjector App Icon" width="46" height="46">
        </div>
        <div class="pwa-info">
          <div class="pwa-title">Install WaterEjector App</div>
          <div class="pwa-subtitle">Instant offline access • Eject water & clean speaker anytime</div>
        </div>
        <div class="pwa-actions">
          <button id="pwaInstallBtn" class="btn-pwa-install">Install App</button>
          <button id="pwaCloseBtn" class="btn-pwa-close" aria-label="Close">&times;</button>
        </div>
      </div>
    `;
  }

  document.body.appendChild(banner);

  setTimeout(() => {
    banner.classList.add('show');
  }, isManualClick ? 60 : 1500);

  const installBtn = banner.querySelector('#pwaInstallBtn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          banner.classList.remove('show');
          setTimeout(() => banner.remove(), 400);
        }
        deferredInstallPrompt = null;
      } else {
        alert('To install WaterEjector:\n- On Chrome/Edge: Click the install icon (⊕) in the browser address bar.\n- On Mobile: Tap browser menu (⋮) and select "Install app" or "Add to Home Screen".');
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 400);
      }
    });
  }

  const closeBtn = banner.querySelector('#pwaCloseBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      banner.classList.remove('show');
      localStorage.setItem('pwa_dismissed_time', Date.now().toString());
      setTimeout(() => banner.remove(), 400);
    });
  }
}

function setupPWA() {
  // 1. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(() => {
        // SW registered successfully
      }).catch((err) => {
        console.warn('SW registration failed:', err);
      });
    });
  }

  // 2. Setup Header install button
  const navBtn = document.getElementById('navInstallBtn');
  if (navBtn) {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone === true;
    if (!isStandalone) {
      navBtn.style.display = 'inline-flex';
      navBtn.addEventListener('click', () => {
        triggerPWAPrompt(true);
      });
    }
  }

  // 3. Auto-prompt on initial page load if not in standalone and not dismissed
  setTimeout(() => {
    triggerPWAPrompt(false);
  }, 2000);
}

