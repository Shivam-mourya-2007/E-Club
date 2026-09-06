/**
 * E-Club | Venture Accelerator
 * High-Performance Scroll & Interactive System
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. CONSTANTS & CONFIGURATION
  // ==========================================================================
  const ROCKET_FRAME_COUNT = 300;
  const FRAMES_DIR = 'frames_webp_300/';
  const FRAME_PREFIX = 'frame_';
  const FRAME_EXT = '.webp';

  // Elements
  const preloader = document.getElementById('preloader');
  const progressRing = document.getElementById('progressRingCircle');
  const loadPercentText = document.getElementById('loadPercent');
  const loaderStatus = document.getElementById('loaderStatus');

  const navbar = document.getElementById('mainNavbar');
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link');

  const canvas = document.getElementById('rocket-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;
  const heroContainer = document.getElementById('home');
  const scrollTrack = document.getElementById('scrollTrack');
  const hudPhases = document.querySelectorAll('.hud-phase');

  // Frame Cache
  const frames = new Array(ROCKET_FRAME_COUNT);
  let framesLoaded = 0;
  let currentFrameIndex = 0;
  let isTicking = false;

  // ==========================================================================
  // 2. PRELOADER & FRAME LOADER
  // ==========================================================================
  function getFrameSrc(index) {
    const padded = String(index).padStart(4, '0');
    return `${FRAMES_DIR}${FRAME_PREFIX}${padded}${FRAME_EXT}`;
  }

  function updatePreloaderProgress(pct) {
    if (!progressRing || !loadPercentText) return;
    const circumference = 301.59;
    const offset = circumference - (pct / 100) * circumference;
    progressRing.style.strokeDashoffset = offset;
    loadPercentText.textContent = `${pct}%`;

    if (loaderStatus) {
      if (pct < 40) loaderStatus.textContent = 'Loading venture flight telemetry...';
      else if (pct < 80) loaderStatus.textContent = 'Calibrating rocket aerodynamics...';
      else loaderStatus.textContent = 'Launch systems primed.';
    }
  }

  function finishPreloader() {
    sessionStorage.setItem('eclub_intro_seen', 'true');
    if (preloader) {
      preloader.style.opacity = '0';
      setTimeout(() => {
        preloader.style.display = 'none';
        document.documentElement.classList.add('html-intro-done');
      }, 600);
    }
  }

  function preloadRocketFrames() {
    // Check if session already seen
    if (sessionStorage.getItem('eclub_intro_seen')) {
      finishPreloader();
    }

    let loadedCount = 0;
    // Load first frame immediately for fast initial paint
    const firstImg = new Image();
    firstImg.src = getFrameSrc(1);
    firstImg.onload = () => {
      frames[0] = firstImg;
      loadedCount++;
      drawRocketFrame(0);
    };

    // Preload remaining frames
    for (let i = 1; i <= ROCKET_FRAME_COUNT; i++) {
      const img = new Image();
      img.src = getFrameSrc(i);
      img.onload = () => {
        frames[i - 1] = img;
        loadedCount++;
        const pct = Math.floor((loadedCount / ROCKET_FRAME_COUNT) * 100);
        updatePreloaderProgress(pct);

        if (loadedCount === ROCKET_FRAME_COUNT) {
          setTimeout(finishPreloader, 300);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === ROCKET_FRAME_COUNT) finishPreloader();
      };
    }
  }

  // ==========================================================================
  // 3. HIGH-DPI CANVAS RENDERING & ASPECT-FIT
  // ==========================================================================
  function resizeCanvas() {
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    drawRocketFrame(currentFrameIndex);
  }

  function drawRocketFrame(index) {
    if (!ctx || !canvas) return;
    const img = frames[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    ctx.clearRect(0, 0, width, height);

    // Cover-fit calculation
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const screenRatio = width / height;

    let renderW, renderH, offsetX, offsetY;

    if (screenRatio > imgRatio) {
      renderW = width;
      renderH = width / imgRatio;
      offsetX = 0;
      offsetY = (height - renderH) / 2;
    } else {
      renderH = height;
      renderW = height * imgRatio;
      offsetX = (width - renderW) / 2;
      offsetY = 0;
    }

    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
  }

  // ==========================================================================
  // 4. SCROLL-BOUND ROCKET ANIMATION
  // ==========================================================================
  function onScroll() {
    // 1. Sticky Navbar styling
    if (navbar) {
      if (window.scrollY > 30) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    }

    // 2. Rocket frame scrubbing
    if (heroContainer) {
      const rect = heroContainer.getBoundingClientRect();
      const totalScrollable = heroContainer.offsetHeight - window.innerHeight;

      if (totalScrollable > 0) {
        // How much of the hero track has scrolled past the top
        const scrolled = -rect.top;
        const progress = Math.max(0, Math.min(1, scrolled / totalScrollable));

        const targetFrame = Math.min(
          ROCKET_FRAME_COUNT - 1,
          Math.floor(progress * (ROCKET_FRAME_COUNT - 1))
        );

        if (targetFrame !== currentFrameIndex) {
          currentFrameIndex = targetFrame;
          drawRocketFrame(currentFrameIndex);
        }

        // Update HUD Phases
        if (hudPhases && hudPhases.length === 3) {
          hudPhases.forEach((phase) => phase.classList.remove('active'));
          if (progress < 0.33) {
            hudPhases[0].classList.add('active');
          } else if (progress < 0.66) {
            hudPhases[1].classList.add('active');
          } else {
            hudPhases[2].classList.add('active');
          }
        }
      }
    }
  }

  function requestScrollTick() {
    if (!isTicking) {
      requestAnimationFrame(() => {
        onScroll();
        isTicking = false;
      });
      isTicking = true;
    }
  }

  // ==========================================================================
  // 5. INTERSECTION OBSERVER FOR CARD REVEALS
  // ==========================================================================
  function initScrollReveals() {
    const revealCards = document.querySelectorAll('.reveal-card');
    if (!('IntersectionObserver' in window)) {
      revealCards.forEach((c) => c.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    revealCards.forEach((card) => observer.observe(card));
  }

  // ==========================================================================
  // 6. COUNTDOWN TIMER
  // ==========================================================================
  function initDemoCountdown() {
    const cdDays = document.getElementById('cdDays');
    const cdHours = document.getElementById('cdHours');
    const cdMins = document.getElementById('cdMins');
    const cdSecs = document.getElementById('cdSecs');

    if (!cdDays || !cdHours || !cdMins || !cdSecs) return;

    // Target demo day: 45 days from current
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 42);
    targetDate.setHours(10, 0, 0, 0);

    function updateTimer() {
      const now = new Date().getTime();
      const diff = targetDate - now;

      if (diff <= 0) return;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      cdDays.textContent = String(days).padStart(2, '0');
      cdHours.textContent = String(hours).padStart(2, '0');
      cdMins.textContent = String(mins).padStart(2, '0');
      cdSecs.textContent = String(secs).padStart(2, '0');
    }

    updateTimer();
    setInterval(updateTimer, 1000);
  }

  // ==========================================================================
  // 7. FAQ ACCORDION
  // ==========================================================================
  function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach((item) => {
      const btn = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');

      if (!btn || !answer) return;

      btn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Close all other items
        faqItems.forEach((other) => {
          if (other !== item) {
            other.classList.remove('active');
            const otherAns = other.querySelector('.faq-answer');
            if (otherAns) otherAns.style.maxHeight = null;
          }
        });

        // Toggle current item
        if (isActive) {
          item.classList.remove('active');
          answer.style.maxHeight = null;
        } else {
          item.classList.add('active');
          answer.style.maxHeight = answer.scrollHeight + 40 + 'px';
        }
      });
    });
  }

  // ==========================================================================
  // 8. APPLICATION FORM HANDLING
  // ==========================================================================
  function initApplicationForm() {
    const form = document.getElementById('eclubApplicationForm');
    const feedback = document.getElementById('formFeedback');
    const submitBtn = document.getElementById('submitFormBtn');

    if (!form || !feedback || !submitBtn) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const fullName = document.getElementById('fullName').value.trim();
      const email = document.getElementById('collegeEmail').value.trim();
      const studentId = document.getElementById('studentId').value.trim();
      const stage = document.getElementById('startupStage').value;
      const sector = document.getElementById('ventureSector').value;
      const pitch = document.getElementById('pitchSummary').value.trim();

      if (!fullName || !email || !studentId || !stage || !sector || !pitch) {
        feedback.className = 'form-feedback error';
        feedback.textContent = 'Please fill out all required fields marked with *';
        return;
      }

      // Basic email check
      if (!email.includes('@')) {
        feedback.className = 'form-feedback error';
        feedback.textContent = 'Please provide a valid college or founder email address.';
        return;
      }

      // Simulated success submission
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting Application...';

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Cohort Application ➔';
        feedback.className = 'form-feedback success';
        feedback.innerHTML = `🚀 <strong>Congratulations, ${fullName}!</strong> Your venture application has been logged for Cohort '25 review. Check your inbox (<em>${email}</em>) for next steps and interview scheduling.`;
        form.reset();
      }, 1000);
    });
  }

  // ==========================================================================
  // 9. MOBILE NAVIGATION DRAWER
  // ==========================================================================
  function initMobileMenu() {
    if (!mobileToggle || !navMenu) return;

    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
      });
    });
  }

  // ==========================================================================
  // 10. ACTIVE LINK HIGHLIGHTING ON SCROLL
  // ==========================================================================
  function initActiveNavHighlight() {
    const sections = document.querySelectorAll('section[id]');

    window.addEventListener('scroll', () => {
      const scrollPos = window.scrollY + 120;

      sections.forEach((sec) => {
        const top = sec.offsetTop;
        const height = sec.offsetHeight;
        const id = sec.getAttribute('id');

        if (scrollPos >= top && scrollPos < top + height) {
          navLinks.forEach((link) => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${id}`) {
              link.classList.add('active');
            }
          });
        }
      });
    });
  }

  // ==========================================================================
  // 11. INITIALIZATION
  // ==========================================================================
  window.addEventListener('DOMContentLoaded', () => {
    preloadRocketFrames();
    resizeCanvas();
    initScrollReveals();
    initDemoCountdown();
    initFaqAccordion();
    initApplicationForm();
    initMobileMenu();
    initActiveNavHighlight();

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('scroll', requestScrollTick, { passive: true });
  });
})();