/**
 * E-Club — Entrepreneurship Club
 * Interactive Engine & Portal Controller
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

  // DOM Elements
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
  const hudPhases = document.querySelectorAll('.hud-phase');

  // About Section Line SVG
  const aboutLinePath = document.getElementById('aboutLinePath');
  let aboutLineLength = 0;


  // Frame Cache
  const frames = new Array(ROCKET_FRAME_COUNT);
  let currentFrameIndex = 0;
  let isTicking = false;

  // ==========================================================================
  // 2. PRELOADER & FRAME CACHING
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
      if (pct < 35) loaderStatus.textContent = 'Preparing student entrepreneurship portal...';
      else if (pct < 75) loaderStatus.textContent = 'Calibrating rocket aerodynamics & canvas...';
      else loaderStatus.textContent = 'Welcome to E-Club.';
    }
  }

  function triggerHeroTitleAnimation() {
    document.documentElement.classList.add('html-intro-done');
    const heroWords = document.querySelectorAll('.hero-word');
    heroWords.forEach((word) => {
      word.classList.add('animate-in');
    });
  }

  function finishPreloader() {
    sessionStorage.setItem('eclub_intro_seen', 'true');
    if (preloader) {
      preloader.style.opacity = '0';
      setTimeout(() => {
        preloader.style.display = 'none';
        triggerHeroTitleAnimation();
      }, 550);
    } else {
      triggerHeroTitleAnimation();
    }
  }

  function preloadRocketFrames() {
    if (sessionStorage.getItem('eclub_intro_seen')) {
      finishPreloader();
    }

    let loadedCount = 0;

    // Load first frame immediately
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
          setTimeout(finishPreloader, 250);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === ROCKET_FRAME_COUNT) finishPreloader();
      };
    }
  }

  // ==========================================================================
  // 3. HIGH-DPI CANVAS RENDERING WITH COVER-FIT
  // ==========================================================================
  function resizeCanvas() {
    if (aboutLinePath) {
      aboutLineLength = aboutLinePath.getTotalLength();
      aboutLinePath.style.strokeDasharray = aboutLineLength;
      aboutLinePath.style.strokeDashoffset = aboutLineLength;
    }

    if (!canvas || !ctx) return;
    // Cap DPR at 2 for optimal 60fps performance on high-DPI mobile devices
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
  // 4. SCROLL TICK & ROCKET SCRUBBER
  // ==========================================================================
  function onScroll() {
    // 1. Sticky Navbar shadow
    if (navbar) {
      if (window.scrollY > 25) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    }

    // 2. About section line drawing
    const aboutSection = document.getElementById('about');
    if (aboutSection && aboutLinePath) {
      const rect = aboutSection.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.max(0, Math.min(1, ((vh - rect.top) / (vh + rect.height)) * 1.7));
      const offset = aboutLineLength - (progress * aboutLineLength);
      aboutLinePath.style.strokeDashoffset = offset;
    }

    // 3. Rocket frame scrubbing
    if (heroContainer) {
      const rect = heroContainer.getBoundingClientRect();
      const totalScrollable = heroContainer.offsetHeight - window.innerHeight;

      if (totalScrollable > 0) {
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
          hudPhases.forEach((p) => p.classList.remove('active'));
          if (progress < 0.33) {
            hudPhases[0].classList.add('active');
          } else if (progress < 0.66) {
            hudPhases[1].classList.add('active');
          } else {
            hudPhases[2].classList.add('active');
          }
        }

        // Dynamic Mission Phase Transitions (01. THINK, 02. BUILD, 03. INNOVATE)
        const phase1 = document.getElementById('heroPhase1');
        const phase2 = document.getElementById('heroPhase2');
        const phase3 = document.getElementById('heroPhase3');

        // Phase 1 (THINK): active from 0.00 to 0.32
        if (phase1) {
          let op1;
          if (progress <= 0.20) {
            op1 = 1;
          } else if (progress < 0.32) {
            op1 = Math.max(0, (0.32 - progress) / (0.32 - 0.20));
          } else {
            op1 = 0;
          }
          phase1.style.opacity = op1;
          phase1.style.transform = `translateY(-${(1 - op1) * 30}px)`;
          if (op1 > 0.05) {
            phase1.style.visibility = 'visible';
            phase1.style.pointerEvents = 'auto';
            phase1.classList.add('active');
          } else {
            phase1.style.visibility = 'hidden';
            phase1.style.pointerEvents = 'none';
            phase1.classList.remove('active');
          }
        }

        // Phase 2 (BUILD): active from 0.24 to 0.66
        if (phase2) {
          let op2;
          if (progress < 0.24 || progress > 0.66) {
            op2 = 0;
          } else if (progress < 0.34) {
            op2 = (progress - 0.24) / (0.34 - 0.24);
          } else if (progress <= 0.56) {
            op2 = 1;
          } else {
            op2 = Math.max(0, (0.66 - progress) / (0.66 - 0.56));
          }
          phase2.style.opacity = op2;
          phase2.style.transform = `translate(-50%, calc(-50% + ${(1 - op2) * 25}px))`;
          if (op2 > 0.05) {
            phase2.style.visibility = 'visible';
            phase2.style.pointerEvents = 'auto';
            phase2.classList.add('active');
          } else {
            phase2.style.visibility = 'hidden';
            phase2.style.pointerEvents = 'none';
            phase2.classList.remove('active');
          }
        }

        // Phase 3 (INNOVATE): active from 0.58 to 0.96
        if (phase3) {
          let op3;
          if (progress < 0.58) {
            op3 = 0;
          } else if (progress < 0.68) {
            op3 = (progress - 0.58) / (0.68 - 0.58);
          } else if (progress <= 0.88) {
            op3 = 1;
          } else {
            op3 = Math.max(0, (0.98 - progress) / (0.98 - 0.88));
          }
          phase3.style.opacity = op3;
          phase3.style.transform = `translate(-50%, calc(-50% + ${(1 - op3) * 25}px))`;
          if (op3 > 0.05) {
            phase3.style.visibility = 'visible';
            phase3.style.pointerEvents = 'auto';
            phase3.classList.add('active');
          } else {
            phase3.style.visibility = 'hidden';
            phase3.style.pointerEvents = 'none';
            phase3.classList.remove('active');
          }
        }

        // Dynamic bottom fade: keeps launch view deep black, blooms into white only as approaching About section
        const bottomFade = document.querySelector('.canvas-bottom-fade');
        if (bottomFade) {
          const fadeProgress = Math.max(0, Math.min(1, (progress - 0.80) / 0.20));
          bottomFade.style.opacity = fadeProgress;
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
  // 5. SCROLL REVEALS
  // ==========================================================================
  function initScrollReveals() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal-card').forEach((c) => c.classList.add('revealed'));
      return;
    }

    // 1. Generic Observer (2-way) for standard elements
    const genericObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          } else {
            entry.target.classList.remove('revealed');
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -20px 0px' }
    );

    document.querySelectorAll('.reveal-card').forEach((card) => {
      genericObserver.observe(card);
    });

    // 2. About Section Typography Animation (One-off)
    const aboutHeading = document.getElementById('aboutHeading');
    const aboutTag = document.getElementById('aboutTag');
    const aboutDesc = document.getElementById('aboutDesc');

    if (aboutHeading) {
      const headingObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const lines = entry.target.querySelectorAll('.line-inner');
            lines.forEach((line, index) => {
              setTimeout(() => {
                line.classList.add('revealed');
              }, index * 150); // Stagger by 150ms
            });

            // Trigger tag and desc fade ups too
            if (aboutTag) {
              aboutTag.style.opacity = '1';
              aboutTag.style.transform = 'translateY(0)';
            }
            if (aboutDesc) {
              aboutDesc.style.opacity = '1';
              aboutDesc.style.transform = 'translateY(0)';
            }

            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });

      headingObserver.observe(aboutHeading);
    }

    // 3. About Rows Fade-up (One-off)
    const rowObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    document.querySelectorAll('.about-row-reveal').forEach(row => {
      rowObserver.observe(row);
    });
  }

  // ==========================================================================
  // 12. FLOATING SOCIALS OBSERVER
  // ==========================================================================
  function initFloatingSocials() {
    const floatingSocials = document.getElementById('floatingSocials');
    const aboutSection = document.getElementById('about');
    if (!floatingSocials || !aboutSection) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          floatingSocials.classList.add('visible');
        } else {
          floatingSocials.classList.remove('visible');
        }
      });
    }, {
      rootMargin: '0px 0px 0px 0px'
    });

    observer.observe(aboutSection);
  }

  // ==========================================================================
  // 8. FAQ ACCORDION CONTROLLER
  // ==========================================================================
  function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach((item) => {
      const btn = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');

      if (!btn || !answer) return;

      btn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        faqItems.forEach((other) => {
          if (other !== item) {
            other.classList.remove('active');
            const otherAns = other.querySelector('.faq-answer');
            if (otherAns) otherAns.style.maxHeight = null;
          }
        });

        if (isActive) {
          item.classList.remove('active');
          answer.style.maxHeight = null;
        } else {
          item.classList.add('active');
          answer.style.maxHeight = answer.scrollHeight + 30 + 'px';
        }
      });
    });
  }

  // ==========================================================================
  // 9. MOBILE NAVIGATION DRAWER
  // ==========================================================================
  function initMobileMenu() {
    if (!mobileToggle || !navMenu) return;

    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      mobileToggle.classList.toggle('active');
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        mobileToggle.classList.remove('active');
      });
    });

    // Close when clicking outside the mobile navigation drawer
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !mobileToggle.contains(e.target) && navMenu.classList.contains('open')) {
        navMenu.classList.remove('open');
        mobileToggle.classList.remove('active');
      }
    });
  }

  // ==========================================================================
  // 10. ACTIVE NAV LINK HIGHLIGHTING
  // ==========================================================================
  function initActiveNavHighlight() {
    const sections = document.querySelectorAll('section[id]');

    window.addEventListener('scroll', () => {
      const scrollPos = window.scrollY + 140;

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
  // 11. WHY JOIN US HOVER LIST
  // ==========================================================================
  function initWhyJoinHover() {
    const listItems = document.querySelectorAll('.wj-list-item');
    const images = document.querySelectorAll('.wj-img');
    if (!listItems.length || !images.length) return;

    listItems.forEach(item => {
      const handleActivate = () => {
        listItems.forEach(i => i.classList.remove('active'));
        images.forEach(img => img.classList.remove('active'));

        item.classList.add('active');

        const index = item.getAttribute('data-index');
        const img = document.querySelector(`.wj-img[data-index="${index}"]`);
        if (img) img.classList.add('active');
      };

      item.addEventListener('mouseenter', handleActivate);
      item.addEventListener('click', handleActivate);
    });
  }

  // ==========================================================================
  // TEAM CAROUSEL INERTIA & 3D TILT
  // ==========================================================================
  function initTeamCarousel() {
    const track = document.getElementById('teamCarouselTrack');
    const wrapper = document.getElementById('teamCarouselWrapper');
    if (!track || !wrapper) return;

    // 1. Duplicate cards for infinite loop
    const originalCards = Array.from(track.children);
    originalCards.forEach(card => {
      const clone = card.cloneNode(true);
      // Strip IDs if any exist
      if (clone.id) clone.removeAttribute('id');
      const allElements = clone.querySelectorAll('[id]');
      allElements.forEach(el => el.removeAttribute('id'));
      
      track.appendChild(clone);
    });

    let currentTranslate = 0;
    let animationID;
    
    // Autoplay variables
    let isAutoPlaying = true;
    const autoPlaySpeed = 0.6; // px per frame (~36px/sec)
    
    let singleSetWidth = 0;

    function updateMetrics() {
      // Wait for layout
      const totalScrollWidth = track.scrollWidth;
      // Single set is half the total
      singleSetWidth = totalScrollWidth / 2;
    }
    
    window.addEventListener('resize', updateMetrics);
    setTimeout(updateMetrics, 100);

    // --- Interaction Overrides (Pause Autoplay) ---
    function pauseAutoplay() {
      isAutoPlaying = false;
    }
    
    function resumeAutoplay() {
      isAutoPlaying = true;
    }

    // Only mouse hover triggers pause (touch/mobile doesn't pause)
    wrapper.addEventListener('mouseenter', pauseAutoplay);
    wrapper.addEventListener('mouseleave', resumeAutoplay);

    // --- Wrap Logic ---
    function applyWrap() {
      if (singleSetWidth <= 0) return;
      // Scrolled left past the first set
      if (currentTranslate <= -singleSetWidth) {
        currentTranslate += singleSetWidth;
      } 
    }

    // --- Main Animation Loop (Autoplay) ---
    function loop() {
      if (isAutoPlaying) {
        currentTranslate -= autoPlaySpeed;
        applyWrap();
        track.style.transform = `translateX(${currentTranslate}px)`;
      } else {
        // Hovered, fully stopped at current translate
        track.style.transform = `translateX(${currentTranslate}px)`;
      }
      animationID = requestAnimationFrame(loop);
    }
    
    // Start loop
    animationID = requestAnimationFrame(loop);
  }

  // ==========================================================================
  // 12. BOOTSTRAP INITIALIZATION
  // ==========================================================================
  window.addEventListener('DOMContentLoaded', () => {
    preloadRocketFrames();
    resizeCanvas();
    initScrollReveals();
    initFloatingSocials();
    initFaqAccordion();
    initMobileMenu();
    initActiveNavHighlight();
    initWhyJoinHover();
    initTeamCarousel();

    if (aboutLinePath) {
      aboutLineLength = aboutLinePath.getTotalLength();
      aboutLinePath.style.strokeDasharray = aboutLineLength;
      aboutLinePath.style.strokeDashoffset = aboutLineLength;
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', () => {
      setTimeout(resizeCanvas, 150);
    });
    window.addEventListener('scroll', requestScrollTick, { passive: true });

    // Safety fallback: ensure hero words animate in even if frame loading stalls
    setTimeout(() => {
      triggerHeroTitleAnimation();
    }, 2200);
  });
})();
