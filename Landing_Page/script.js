/**
 * PARUL UNIVERSITY E-CLUB - CINEMATIC INTRO ANIMATION ENGINE
 * High-performance canvas-based frame sequence playback
 */

// 1. Frame assets definition (225 sequential WebP frames in assets/, ending with smooth black frames)
const FRAME_FILES = (() => {
  const list = [];
  for (let i = 1; i <= 227; i++) {
    if (i === 210 || i === 219) continue; // Skip missing frame indices in assets
    list.push(`frame_${String(i).padStart(3, '0')}.webp`);
  }
  return list;
})();

const TOTAL_FRAMES = FRAME_FILES.length; // 225 frames

const TARGET_FPS = 32; // Smooth and responsive playback (~7s total duration)
const FRAME_DURATION = 1000 / TARGET_FPS;

// Cache array for preloaded image elements
const loadedImages = new Array(TOTAL_FRAMES);

// DOM Elements
const preloader = document.getElementById('preloader');
const loadPercent = document.getElementById('loadPercent');
const progressRingCircle = document.getElementById('progressRingCircle');
const loaderStatus = document.getElementById('loaderStatus');

const introStage = document.getElementById('intro-stage');
const canvas = document.getElementById('introCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const websiteContainer = document.getElementById('website-container');

// State variables
let currentFrameIndex = 0;
let isPlaying = false;
let isFinished = false;
let animationFrameId = null;
let lastTimestamp = 0;
let timeAccumulator = 0;

// 2. Preload all frame images
function preloadFrames() {
  let loadedCount = 0;
  const circumference = 2 * Math.PI * 48; // r = 48
  progressRingCircle.style.strokeDasharray = circumference;
  progressRingCircle.style.strokeDashoffset = circumference;

  FRAME_FILES.forEach((file, index) => {
    const img = new Image();
    img.src = `assets/${file}`;
    img.onload = () => {
      loadedImages[index] = img;
      loadedCount++;
      const percent = (loadedCount / TOTAL_FRAMES) * 100;
      
      // Update loader UI
      loadPercent.textContent = Math.round(percent) + '%';
      const offset = circumference - (percent / 100) * circumference;
      progressRingCircle.style.strokeDashoffset = offset;

      if (loadedCount === TOTAL_FRAMES) {
        onPreloadComplete();
      }
    };
    img.onerror = () => {
      console.warn(`Failed to load frame: ${file}`);
      loadedCount++;
      if (loadedCount === TOTAL_FRAMES) {
        onPreloadComplete();
      }
    };
  });
}

function onPreloadComplete() {
  loaderStatus.textContent = "Ready";
  setTimeout(() => {
    preloader.classList.add('fade-out');
    resizeCanvas();
    startPlayback();
  }, 400);
}

// 3. Canvas Sizing and Frame Rendering
function resizeCanvas() {
  // Cap devicePixelRatio at 2 on mobile to maximize battery life and render performance
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  renderFrame(currentFrameIndex);
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
  // Brief delay to allow mobile browser to calculate new dimensions after rotation
  setTimeout(resizeCanvas, 150);
});

function renderFrame(index) {
  const img = loadedImages[index];
  if (!img) return;

  const cw = canvas.width;
  const ch = canvas.height;
  const iw = img.naturalWidth || 1280;
  const ih = img.naturalHeight || 720;

  // Object-fit: cover math
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;

  ctx.drawImage(img, dx, dy, dw, dh);
}

// 4. Playback Animation Engine
function startPlayback() {
  if (isFinished) return;
  isPlaying = true;
  lastTimestamp = performance.now();
  timeAccumulator = 0;

  cancelAnimationFrame(animationFrameId);
  animationFrameId = requestAnimationFrame(animationLoop);
}

function pausePlayback() {
  isPlaying = false;
  cancelAnimationFrame(animationFrameId);
}

function togglePlayPause() {
  if (isPlaying) {
    pausePlayback();
  } else {
    if (isFinished) {
      replayIntro();
    } else {
      startPlayback();
    }
  }
}

function animationLoop(timestamp) {
  if (!isPlaying) return;

  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  timeAccumulator += delta;

  while (timeAccumulator >= FRAME_DURATION) {
    timeAccumulator -= FRAME_DURATION;
    currentFrameIndex++;

    if (currentFrameIndex >= TOTAL_FRAMES) {
      currentFrameIndex = TOTAL_FRAMES - 1;
      renderFrame(currentFrameIndex);
      completeIntro();
      return;
    }
  }

  renderFrame(currentFrameIndex);
  animationFrameId = requestAnimationFrame(animationLoop);
}

// 5. Completion Handling - Seamlessly transitions to solid black
function completeIntro() {
  isPlaying = false;
  isFinished = true;
  cancelAnimationFrame(animationFrameId);

  // Transition intro stage to solid black screen
  setTimeout(() => {
    introStage.classList.add('fade-out');
    websiteContainer.classList.remove('hidden');

    // Callback hook for your website initialization or redirection
    if (typeof window.onIntroComplete === 'function') {
      window.onIntroComplete();
    }
  }, 400);
}

function replayIntro() {
  isFinished = false;
  currentFrameIndex = 0;
  websiteContainer.classList.add('hidden');
  introStage.classList.remove('fade-out');
  renderFrame(0);
  startPlayback();
}

// Expose replay function globally for your website to call if needed
window.replayIntro = replayIntro;

// Optional click on canvas to pause/play
canvas.addEventListener('click', () => {
  if (!isFinished) {
    togglePlayPause();
  }
});

// Start preloading immediately when script executes
window.addEventListener('DOMContentLoaded', () => {
  preloadFrames();
});

