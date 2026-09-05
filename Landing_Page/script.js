/**
 * PARUL UNIVERSITY E-CLUB - CINEMATIC INTRO & HOME PAGE CONTROLLER
 * High-performance canvas-based intro playback with seamless, slow reveal to the Home Page
 */

// =========================================================
// 1. INTRO ANIMATION CONFIGURATION & STATE
// =========================================================
const INTRO_FRAME_FILES = (() => {
  const list = [];
  for (let i = 1; i <= 227; i++) {
    if (i === 210 || i === 219) continue; // Skip missing frame indices in assets
    list.push(`frame_${String(i).padStart(3, '0')}.webp`);
  }
  return list;
})();

const TOTAL_INTRO_FRAMES = INTRO_FRAME_FILES.length; // 225 frames
const TARGET_FPS = 32; // Smooth and responsive playback (~7s total duration)
const FRAME_DURATION = 1000 / TARGET_FPS;

// Intro Cache and DOM Elements
const introImages = new Array(TOTAL_INTRO_FRAMES);
const preloader = document.getElementById('preloader');
const loadPercent = document.getElementById('loadPercent');
const progressRingCircle = document.getElementById('progressRingCircle');
const loaderStatus = document.getElementById('loaderStatus');

const introStage = document.getElementById('intro-stage');
const introCanvas = document.getElementById('introCanvas');
const introCtx = introCanvas.getContext('2d', { alpha: false });
const websiteContainer = document.getElementById('website-container');

// State variables
let currentIntroFrameIndex = 0;
let isPlaying = false;
let isIntroFinished = false;
let introAnimationId = null;
let lastTimestamp = 0;
let timeAccumulator = 0;

// =========================================================
// 2. HOME PAGE ROCKET ANIMATION CONFIGURATION & STATE
// =========================================================
const ROCKET_FRAME_COUNT = 300;
const rocketImages = new Array(ROCKET_FRAME_COUNT);
let rocketImagesLoaded = 0;
let lastDrawnRocketIndex = -1;
let isRocketReady = false;

const rocketCanvas = document.getElementById('rocket-canvas');
const rocketCtx = rocketCanvas ? rocketCanvas.getContext('2d') : null;
const loadingState = document.getElementById('loading-state');
const rocketScroll = document.querySelector('.rocket-scroll');
const rocketSticky = document.querySelector('.rocket-sticky');
const contentBlocks = document.querySelectorAll('.content-block');
const numBlocks = contentBlocks.length;

// =========================================================
// 3. PRELOADING ENGINES
// =========================================================

// Preload Intro Frames (Foreground - controls preloader screen)
function preloadIntroFrames() {
  let loadedCount = 0;
  const circumference = 2 * Math.PI * 48; // r = 48
  progressRingCircle.style.strokeDasharray = circumference;
  progressRingCircle.style.strokeDashoffset = circumference;

  INTRO_FRAME_FILES.forEach((file, index) => {
    const img = new Image();
    img.src = `assets/${file}`;
    img.onload = () => {
      introImages[index] = img;
      loadedCount++;
      const percent = (loadedCount / TOTAL_INTRO_FRAMES) * 100;
      
      loadPercent.textContent = Math.round(percent) + '%';
      const offset = circumference - (percent / 100) * circumference;
      progressRingCircle.style.strokeDashoffset = offset;

      if (loadedCount === TOTAL_INTRO_FRAMES) {
        onIntroPreloadComplete();
      }
    };
    img.onerror = () => {
      console.warn(`Failed to load frame: ${file}`);
      loadedCount++;
      if (loadedCount === TOTAL_INTRO_FRAMES) {
        onIntroPreloadComplete();
      }
    };
  });
}

function onIntroPreloadComplete() {
  loaderStatus.textContent = "Ready";
  setTimeout(() => {
    preloader.classList.add('fade-out');
    document.body.classList.add('intro-active');
    resizeIntroCanvas();
    startIntroPlayback();

    // Start background preloading of Home Page 300 rocket frames during intro playback!
    preloadRocketFrames();
  }, 400);
}

// Preload Rocket Frames (Background - seamless caching)
let currentTargetFrame = 1;

function preloadRocketFrames() {
  for (let i = 1; i <= ROCKET_FRAME_COUNT; i++) {
    const img = new Image();
    const padded = String(i).padStart(4, '0');
    img.src = `frames_webp_300/frame_${padded}.webp`;
    img.onload = () => {
      rocketImages[i - 1] = img;
      rocketImagesLoaded++;
      if (currentTargetFrame === i || (i === 1 && lastDrawnRocketIndex === -1)) {
        updateRocketCanvas(currentTargetFrame);
      }
      checkRocketLoaded();
    };
    img.onerror = () => {
      // Fallback path in case accessed from different context
      const fallback = new Image();
      fallback.src = `../home_page/frames_webp_300/frame_${padded}.webp`;
      fallback.onload = () => {
        rocketImages[i - 1] = fallback;
        rocketImagesLoaded++;
        if (currentTargetFrame === i || (i === 1 && lastDrawnRocketIndex === -1)) {
          updateRocketCanvas(currentTargetFrame);
        }
        checkRocketLoaded();
      };
      fallback.onerror = () => {
        rocketImagesLoaded++;
        checkRocketLoaded();
      };
    };
  }
}

function checkRocketLoaded() {
  if (rocketImagesLoaded >= ROCKET_FRAME_COUNT) {
    isRocketReady = true;
    if (loadingState) {
      loadingState.style.display = 'none';
    }
  }
}

// =========================================================
// 4. INTRO CANVAS RENDERING & PLAYBACK
// =========================================================
function resizeIntroCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  introCanvas.width = window.innerWidth * dpr;
  introCanvas.height = window.innerHeight * dpr;
  renderIntroFrame(currentIntroFrameIndex);
}

function renderIntroFrame(index) {
  const img = introImages[index];
  if (!img) return;

  const cw = introCanvas.width;
  const ch = introCanvas.height;
  const iw = img.naturalWidth || 1280;
  const ih = img.naturalHeight || 720;

  // Object-fit: cover math
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;

  introCtx.drawImage(img, dx, dy, dw, dh);
}

function startIntroPlayback() {
  if (isIntroFinished) return;
  isPlaying = true;
  lastTimestamp = performance.now();
  timeAccumulator = 0;

  cancelAnimationFrame(introAnimationId);
  introAnimationId = requestAnimationFrame(introLoop);
}

function introLoop(timestamp) {
  if (!isPlaying) return;

  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  timeAccumulator += delta;

  while (timeAccumulator >= FRAME_DURATION) {
    timeAccumulator -= FRAME_DURATION;
    currentIntroFrameIndex++;

    if (currentIntroFrameIndex >= TOTAL_INTRO_FRAMES) {
      currentIntroFrameIndex = TOTAL_INTRO_FRAMES - 1;
      renderIntroFrame(currentIntroFrameIndex);
      completeIntro();
      return;
    }
  }

  renderIntroFrame(currentIntroFrameIndex);
  introAnimationId = requestAnimationFrame(introLoop);
}

// =========================================================
// 5. SLOW CINEMATIC TRANSITION TO HOME PAGE
// =========================================================
function completeIntro() {
  if (isIntroFinished) return;
  isPlaying = false;
  isIntroFinished = true;
  cancelAnimationFrame(introAnimationId);

  // 1. Gently fade out intro stage
  introStage.classList.add('fade-out');

  // 2. Prepare home page container and trigger slow fade-in reveal
  websiteContainer.classList.remove('hidden');
  // Force browser layout reflow so transition is guaranteed
  void websiteContainer.offsetHeight;
  websiteContainer.classList.add('visible');

  // 3. Unlock scrolling smoothly
  document.body.classList.remove('intro-active');

  // 4. Initialize Rocket Canvas setup
  setupRocketCanvas();

  // 5. Remove intro stage from DOM paint tree after transition ends
  setTimeout(() => {
    introStage.style.display = 'none';
  }, 1600);
}


// Click canvas to toggle play/pause
introCanvas.addEventListener('click', () => {
  if (!isIntroFinished) {
    isPlaying = !isPlaying;
    if (isPlaying) {
      lastTimestamp = performance.now();
      introAnimationId = requestAnimationFrame(introLoop);
    } else {
      cancelAnimationFrame(introAnimationId);
    }
  }
});

// =========================================================
// 6. HOME PAGE ROCKET SCROLL CONTROLLER
// =========================================================
function setupRocketCanvas() {
  if (!rocketCanvas || !rocketCtx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  rocketCanvas.width = 1280 * dpr;
  rocketCanvas.height = 720 * dpr;
  rocketCtx.setTransform(1, 0, 0, 1, 0, 0);
  rocketCtx.scale(dpr, dpr);

  lastDrawnRocketIndex = -1;
  updateRocketCanvas(currentTargetFrame || 1);
  handleScroll();
}

function updateRocketCanvas(index) {
  currentTargetFrame = index;
  if (!rocketCtx) return;

  let img = rocketImages[index - 1];
  // If target frame is still loading, look for nearest available frame
  if (!img || !img.complete) {
    for (let d = 1; d <= 20; d++) {
      if (index - 1 - d >= 0 && rocketImages[index - 1 - d]?.complete) {
        img = rocketImages[index - 1 - d];
        break;
      }
      if (index - 1 + d < ROCKET_FRAME_COUNT && rocketImages[index - 1 + d]?.complete) {
        img = rocketImages[index - 1 + d];
        break;
      }
    }
  }

  if (!img || !img.complete) return;

  rocketCtx.clearRect(0, 0, 1280, 720);
  rocketCtx.drawImage(img, 0, 0, 1280, 720);
  lastDrawnRocketIndex = index;
}

let scrollTicking = false;

function handleScroll() {
  if (!rocketScroll) return;

  const scrollRect = rocketScroll.getBoundingClientRect();
  const scrollTop = -scrollRect.top;
  const maxScroll = scrollRect.height - window.innerHeight;

  if (maxScroll <= 0) return;

  let scrollFraction = Math.max(0, Math.min(1, scrollTop / maxScroll));

  // Map to frame index (1–300)
  const frameIndex = Math.min(
    ROCKET_FRAME_COUNT,
    Math.max(1, Math.round(scrollFraction * (ROCKET_FRAME_COUNT - 1)) + 1)
  );

  updateRocketCanvas(frameIndex);

  // Exit phase: fly off to the right when progress > 0.92
  if (rocketCanvas) {
    if (scrollFraction > 0.92) {
      const exitProgress = (scrollFraction - 0.92) / 0.08;
      const translateX = exitProgress * 150;
      rocketCanvas.style.transform = `translateX(${translateX}%)`;
    } else {
      rocketCanvas.style.transform = `translateX(0%)`;
    }
  }

  // Handle sticky visual opacity
  if (rocketSticky) {
    if (scrollFraction >= 1) {
      rocketSticky.style.opacity = '0';
      rocketSticky.style.pointerEvents = 'none';
    } else {
      rocketSticky.style.opacity = '1';
      rocketSticky.style.pointerEvents = 'auto';
    }
  }

  // Handle block opacity fading strictly mapped to [i/N, (i+1)/N]
  if (numBlocks > 0) {
    contentBlocks.forEach((block, i) => {
      const start = i / numBlocks;
      const end = (i + 1) / numBlocks;

      if (scrollFraction >= start && scrollFraction <= end) {
        block.classList.add('active');
      } else {
        if (scrollFraction === 1 && i === numBlocks - 1) {
          block.classList.add('active');
        } else {
          block.classList.remove('active');
        }
      }
    });
  }
}

window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    window.requestAnimationFrame(() => {
      handleScroll();
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}, { passive: true });

// Window resize handler
window.addEventListener('resize', () => {
  if (!isIntroFinished) {
    resizeIntroCanvas();
  } else {
    setupRocketCanvas();
  }
});

// Start preloading both intro and rocket frames immediately when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  preloadIntroFrames();
  preloadRocketFrames();
});


