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

  // Tabbed Portal Elements
  const tabMembershipBtn = document.getElementById('tabMembershipBtn');
  const tabIdeaBtn = document.getElementById('tabIdeaBtn');
  const panelMembership = document.getElementById('portal-membership');
  const panelIdea = document.getElementById('portal-idea');

  // Form Elements
  const membershipForm = document.getElementById('membershipForm');
  const mFeedback = document.getElementById('mFeedback');
  const ideaForm = document.getElementById('ideaForm');
  const iFeedback = document.getElementById('iFeedback');

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

  function finishPreloader() {
    sessionStorage.setItem('eclub_intro_seen', 'true');
    if (preloader) {
      preloader.style.opacity = '0';
      setTimeout(() => {
        preloader.style.display = 'none';
        document.documentElement.classList.add('html-intro-done');
      }, 550);
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

    // 2. Rocket frame scrubbing
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
  // 5. TABBED APPLICATION PORTAL CONTROLLER
  // ==========================================================================
  function switchPortalTab(tabType) {
    if (!tabMembershipBtn || !tabIdeaBtn || !panelMembership || !panelIdea) return;

    if (tabType === 'idea') {
      tabIdeaBtn.classList.add('active');
      tabMembershipBtn.classList.remove('active');
      panelIdea.classList.add('active');
      panelMembership.classList.remove('active');
    } else {
      tabMembershipBtn.classList.add('active');
      tabIdeaBtn.classList.remove('active');
      panelMembership.classList.add('active');
      panelIdea.classList.remove('active');
    }
  }

  function initPortalTabs() {
    if (tabMembershipBtn) {
      tabMembershipBtn.addEventListener('click', () => switchPortalTab('membership'));
    }
    if (tabIdeaBtn) {
      tabIdeaBtn.addEventListener('click', () => switchPortalTab('idea'));
    }

    // Intercept clicks on anchor tags pointing to portal tabs
    document.addEventListener('click', (e) => {
      const anchor = e.target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (href === '#portal-idea') {
        e.preventDefault();
        switchPortalTab('idea');
        const portalSection = document.getElementById('portal');
        if (portalSection) {
          portalSection.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (href === '#portal-membership') {
        e.preventDefault();
        switchPortalTab('membership');
        const portalSection = document.getElementById('portal');
        if (portalSection) {
          portalSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });

    // Check URL hash on page load
    if (window.location.hash === '#portal-idea') {
      switchPortalTab('idea');
    } else if (window.location.hash === '#portal-membership') {
      switchPortalTab('membership');
    }
  }

  // ==========================================================================
  // 6. FORM VALIDATION & STORAGE
  // ==========================================================================
  function initFormHandlers() {
    // 1. Membership Form Handler
    if (membershipForm && mFeedback) {
      membershipForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const fullName = document.getElementById('mFullName').value.trim();
        const email = document.getElementById('mEmail').value.trim();
        const mobile = document.getElementById('mMobile').value.trim();
        const studentId = document.getElementById('mStudentId').value.trim();
        const department = document.getElementById('mDepartment').value.trim();
        const yearSemester = document.getElementById('mYearSemester').value.trim();
        const interests = document.getElementById('mInterests').value.trim();
        const preferredTeam = document.getElementById('mPreferredTeam').value;
        const whyJoin = document.getElementById('mWhyJoin').value.trim();

        if (!fullName || !email || !mobile || !studentId || !department || !yearSemester || !interests || !preferredTeam || !whyJoin) {
          mFeedback.className = 'portal-feedback error';
          mFeedback.textContent = 'Please fill out all required fields marked with *';
          return;
        }

        if (!email.includes('@')) {
          mFeedback.className = 'portal-feedback error';
          mFeedback.textContent = 'Please provide a valid student or institutional email address.';
          return;
        }

        const memberData = {
          fullName, email, mobile, studentId, department, yearSemester,
          interests, preferredTeam, whyJoin,
          submittedAt: new Date().toISOString()
        };

        try {
          const existing = JSON.parse(localStorage.getItem('eclub_memberships') || '[]');
          existing.push(memberData);
          localStorage.setItem('eclub_memberships', JSON.stringify(existing));
        } catch (err) {
          console.error('Storage error', err);
        }

        mFeedback.className = 'portal-feedback success';
        mFeedback.innerHTML = `🎉 <strong>Welcome to E-Club, ${fullName}!</strong> Your membership application for the <em>${preferredTeam}</em> team has been submitted. Check your email (${email}) for orientation details.`;
        membershipForm.reset();
      });
    }

    // 2. Startup Idea Submission Handler
    if (ideaForm && iFeedback) {
      ideaForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('iFounderName').value.trim();
        const email = document.getElementById('iEmail').value.trim();
        const department = document.getElementById('iDepartment').value.trim();
        const startupName = document.getElementById('iStartupName').value.trim();
        const domain = document.getElementById('iDomain').value.trim();
        const currentStage = document.getElementById('iCurrentStage').value;
        const targetUsers = document.getElementById('iTargetUsers').value.trim();
        const teamMembers = document.getElementById('iTeamMembers').value.trim();
        const problem = document.getElementById('iProblem').value.trim();
        const description = document.getElementById('iDescription').value.trim();
        const pitchDeck = document.getElementById('iPitchDeck').value.trim();
        const demoLink = document.getElementById('iDemoLink').value.trim();

        const selectedSupport = Array.from(ideaForm.querySelectorAll('input[name="supportRequired"]:checked')).map(cb => cb.value);

        if (!name || !email || !department || !startupName || !domain || !currentStage || !targetUsers || !teamMembers || !problem || !description) {
          iFeedback.className = 'portal-feedback error';
          iFeedback.textContent = 'Please fill out all required venture fields marked with *';
          return;
        }

        if (selectedSupport.length === 0) {
          iFeedback.className = 'portal-feedback error';
          iFeedback.textContent = 'Please select at least one type of support required from E-Club & PIERC.';
          return;
        }

        const ventureData = {
          name, email, department, startupName, domain, currentStage,
          targetUsers, teamMembers, problem, description,
          supportRequired: selectedSupport,
          pitchDeck, demoLink,
          submittedAt: new Date().toISOString()
        };

        try {
          const existing = JSON.parse(localStorage.getItem('eclub_ideas') || '[]');
          existing.push(ventureData);
          localStorage.setItem('eclub_ideas', JSON.stringify(existing));
        } catch (err) {
          console.error('Storage error', err);
        }

        iFeedback.className = 'portal-feedback success';
        iFeedback.innerHTML = `🚀 <strong>Venture Logged!</strong> Congratulations, ${name}! Your startup <em>${startupName}</em> has been submitted for PIERC incubation &amp; mentorship review.`;
        ideaForm.reset();
      });
    }
  }

  // ==========================================================================
  // 7. INTERSECTION OBSERVER FOR CARD REVEALS
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
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    );

    revealCards.forEach((card) => observer.observe(card));
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
    });

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
      });
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
  // 11. BOOTSTRAP INITIALIZATION
  // ==========================================================================
  window.addEventListener('DOMContentLoaded', () => {
    preloadRocketFrames();
    resizeCanvas();
    initScrollReveals();
    initPortalTabs();
    initFormHandlers();
    initFaqAccordion();
    initMobileMenu();
    initActiveNavHighlight();

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('scroll', requestScrollTick, { passive: true });
  });
})();