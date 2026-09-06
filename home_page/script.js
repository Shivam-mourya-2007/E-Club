// =========================================================
    // 1. INTRO ANIMATION CONFIGURATION & STATE
    // =========================================================
    const INTRO_FRAME_FILES = (() => {
      const list = [];
      for (let i = 1; i <= 227; i++) {
        if (i === 210 || i === 219) continue; // Skip missing indices
        list.push(`frame_${String(i).padStart(3, '0')}.webp`);
      }
      return list;
    })();

    const TOTAL_INTRO_FRAMES = INTRO_FRAME_FILES.length; // 225 frames
    const TARGET_FPS = 32;
    const FRAME_DURATION = 1000 / TARGET_FPS;

    const introImages = new Array(TOTAL_INTRO_FRAMES);
    const preloader = document.getElementById('preloader');
    const loadPercent = document.getElementById('loadPercent');
    const progressRingCircle = document.getElementById('progressRingCircle');
    const loaderStatus = document.getElementById('loaderStatus');

    const introStage = document.getElementById('intro-stage');
    const introCanvas = document.getElementById('introCanvas');
    const introCtx = introCanvas ? introCanvas.getContext('2d', { alpha: false }) : null;
    const skipIntroBtn = document.getElementById('skipIntroBtn');
    const websiteContainer = document.getElementById('website-container');

    let currentIntroFrameIndex = 0;
    let isIntroPlaying = false;
    let isIntroFinished = false;
    let introAnimationId = null;
    let lastIntroTimestamp = 0;
    let introTimeAccumulator = 0;

    // Check if intro has already been seen in this session (e.g. on refresh)
    const hasSeenIntro = !!sessionStorage.getItem('eclub_intro_seen');

    // =========================================================
    // 2. ROCKET SCROLL ANIMATION CONFIGURATION & STATE
    // =========================================================
    const ROCKET_FRAME_COUNT = 300;
    const rocketImages = new Array(ROCKET_FRAME_COUNT);
    let rocketImagesLoaded = 0;
    let lastDrawnRocketIndex = -1;
    let currentRocketFrame = 1;

    const rocketCanvas = document.getElementById('rocket-canvas');
    const rocketCtx = rocketCanvas ? rocketCanvas.getContext('2d') : null;
    const loadingState = document.getElementById('loading-state');
    const rocketScroll = document.querySelector('.rocket-scroll');
    const rocketSticky = document.querySelector('.rocket-sticky');
    const contentBlocks = document.querySelectorAll('.content-block');
    const N = contentBlocks.length;
    const DEBUG = false;
    const debugReadout = document.getElementById('debug-readout');

    function getBlockBoundaries() {
      if (!rocketScroll) return [];
      const totalContentHeight = Array.from(contentBlocks)
        .reduce((sum, block) => sum + block.getBoundingClientRect().height, 0);
      if (totalContentHeight <= 0) return [];
      let cumulative = 0;
      return Array.from(contentBlocks).map(block => {
        const start = cumulative / totalContentHeight;
        cumulative += block.getBoundingClientRect().height;
        const end = cumulative / totalContentHeight;
        return { start, end };
      });
    }

    let blockBoundaries = getBlockBoundaries();

    // =========================================================
    // 3. INITIALIZATION & REFRESH DETECTION
    // =========================================================
    if (hasSeenIntro) {
      // Refresh or subsequent visit: completely bypass intro!
      isIntroFinished = true;
      if (preloader) preloader.style.display = 'none';
      if (introStage) introStage.style.display = 'none';
      document.body.classList.remove('intro-active');
      if (websiteContainer) {
        websiteContainer.classList.add('visible');
        websiteContainer.style.opacity = '1';
        websiteContainer.style.pointerEvents = 'auto';
      }
      alignRocketSticky();
      initRocketCanvas();
      preloadRocketFrames();
    } else {
      // First visit: lock scroll and start preloading intro
      document.body.classList.add('intro-active');
      preloadIntroFrames();
    }

    // =========================================================
    // 4. INTRO FRAMES PRELOAD & PLAYBACK
    // =========================================================
    function preloadIntroFrames() {
      let loadedCount = 0;
      const circumference = 2 * Math.PI * 48; // r = 48
      if (progressRingCircle) {
        progressRingCircle.style.strokeDasharray = circumference;
        progressRingCircle.style.strokeDashoffset = circumference;
      }

      INTRO_FRAME_FILES.forEach((file, index) => {
        const img = new Image();
        img.src = `assets/${file}`;
        img.onload = () => {
          introImages[index] = img;
          loadedCount++;
          const percent = (loadedCount / TOTAL_INTRO_FRAMES) * 100;
          if (loadPercent) loadPercent.textContent = Math.round(percent) + '%';
          if (progressRingCircle) {
            const offset = circumference - (percent / 100) * circumference;
            progressRingCircle.style.strokeDashoffset = offset;
          }
          if (loadedCount === TOTAL_INTRO_FRAMES) {
            onIntroPreloadComplete();
          }
        };
        img.onerror = () => {
          // Fallback path in case accessed from parent directory
          const fallback = new Image();
          fallback.src = `../Landing_Page/assets/${file}`;
          fallback.onload = () => {
            introImages[index] = fallback;
            loadedCount++;
            if (loadedCount === TOTAL_INTRO_FRAMES) onIntroPreloadComplete();
          };
          fallback.onerror = () => {
            loadedCount++;
            if (loadedCount === TOTAL_INTRO_FRAMES) onIntroPreloadComplete();
          };
        };
      });
    }

    function onIntroPreloadComplete() {
      if (loaderStatus) loaderStatus.textContent = "Ready";
      setTimeout(() => {
        if (preloader) preloader.classList.add('fade-out');
        resizeIntroCanvas();
        startIntroPlayback();

        // Concurrently preload 300 rocket frames during intro playback
        preloadRocketFrames();
      }, 350);
    }

    function resizeIntroCanvas() {
      if (!introCanvas || isIntroFinished) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      introCanvas.width = window.innerWidth * dpr;
      introCanvas.height = window.innerHeight * dpr;
      renderIntroFrame(currentIntroFrameIndex);
    }

    function renderIntroFrame(index) {
      if (!introCtx) return;
      const img = introImages[index];
      if (!img) return;

      const cw = introCanvas.width;
      const ch = introCanvas.height;
      const iw = img.naturalWidth || 1280;
      const ih = img.naturalHeight || 720;

      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      introCtx.drawImage(img, dx, dy, dw, dh);
    }

    function startIntroPlayback() {
      if (isIntroFinished) return;
      isIntroPlaying = true;
      lastIntroTimestamp = performance.now();
      introTimeAccumulator = 0;
      cancelAnimationFrame(introAnimationId);
      introAnimationId = requestAnimationFrame(introLoop);
    }

    function introLoop(timestamp) {
      if (!isIntroPlaying || isIntroFinished) return;

      const delta = timestamp - lastIntroTimestamp;
      lastIntroTimestamp = timestamp;
      introTimeAccumulator += delta;

      while (introTimeAccumulator >= FRAME_DURATION) {
        introTimeAccumulator -= FRAME_DURATION;
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

    function completeIntro() {
      if (isIntroFinished) return;
      isIntroPlaying = false;
      isIntroFinished = true;
      cancelAnimationFrame(introAnimationId);

      // Save to sessionStorage so it never plays again upon refresh
      sessionStorage.setItem('eclub_intro_seen', 'true');

      if (introStage) introStage.classList.add('fade-out');

      if (websiteContainer) {
        websiteContainer.classList.add('visible');
        websiteContainer.style.opacity = '1';
        websiteContainer.style.pointerEvents = 'auto';
      }

      document.body.classList.remove('intro-active');
      alignRocketSticky();
      initRocketCanvas();

      setTimeout(() => {
        if (introStage) introStage.style.display = 'none';
        if (preloader) preloader.style.display = 'none';
      }, 1400);
    }

    if (skipIntroBtn) {
      skipIntroBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        completeIntro();
      });
    }

    if (introCanvas) {
      introCanvas.addEventListener('click', () => {
        if (!isIntroFinished) {
          isIntroPlaying = !isIntroPlaying;
          if (isIntroPlaying) {
            lastIntroTimestamp = performance.now();
            introAnimationId = requestAnimationFrame(introLoop);
          } else {
            cancelAnimationFrame(introAnimationId);
          }
        }
      });
    }

    // =========================================================
    // 5. ROCKET SCROLL ANIMATION SYSTEM
    // =========================================================
    function alignRocketSticky() {
      if (!rocketSticky) return;
      const header = document.querySelector('.navbar');
      const headerRect = header ? header.getBoundingClientRect() : null;
      const headerBottom = headerRect ? headerRect.bottom : 0;
      rocketSticky.style.top = `${Math.max(0, headerBottom)}px`;
    }

    function initRocketCanvas() {
      if (!rocketCanvas || !rocketCtx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      rocketCanvas.width = 1280 * dpr;
      rocketCanvas.height = 720 * dpr;
      rocketCtx.setTransform(1, 0, 0, 1, 0, 0);
      rocketCtx.scale(dpr, dpr);

      lastDrawnRocketIndex = -1;
      updateRocketCanvas(currentRocketFrame || 1);
      handleScroll();
    }

    function preloadRocketFrames() {
      for (let i = 1; i <= ROCKET_FRAME_COUNT; i++) {
        const img = new Image();
        const padded = String(i).padStart(4, '0');
        img.src = `frames_webp_300/frame_${padded}.webp`;
        img.onload = () => {
          rocketImages[i - 1] = img;
          rocketImagesLoaded++;
          if (loadingState) {
            const pct = Math.floor((rocketImagesLoaded / ROCKET_FRAME_COUNT) * 100);
            loadingState.innerText = `Loading ${pct}%`;
          }
          if (rocketImagesLoaded === ROCKET_FRAME_COUNT && loadingState) {
            loadingState.style.display = 'none';
          }
          if (currentRocketFrame === i || (i === 1 && lastDrawnRocketIndex === -1)) {
            updateRocketCanvas(currentRocketFrame);
          }
        };
        img.onerror = () => {
          rocketImagesLoaded++;
          if (rocketImagesLoaded === ROCKET_FRAME_COUNT && loadingState) {
            loadingState.style.display = 'none';
          }
        };
      }
    }

    function updateRocketCanvas(index) {
      currentRocketFrame = index;
      if (!rocketCtx) return;

      let img = rocketImages[index - 1];
      if (!img || !img.complete) {
        for (let d = 1; d <= 25; d++) {
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

      // HOLD_END = end of content-block[0]'s (Text 1) active range, i.e. where Text 2 (content-block[1]) begins.
      // Now driven by measured boundaries instead of assuming equal thirds.
      const HOLD_END = blockBoundaries.length > 0 ? blockBoundaries[0].end : 0;

      let frameIndex;
      if (scrollFraction <= HOLD_END) {
        // Phase 1 — HOLD: rocket stays completely static (frame 1) through all of Text 1 → Text 2 transition
        frameIndex = 1;
      } else {
        // Phase 2 — LAUNCH: remap remaining scroll (HOLD_END → 1) to the full frame sequence (smoke + upward movement)
        const launchFraction = Math.max(0, Math.min(1, (scrollFraction - HOLD_END) / (1 - HOLD_END)));
        frameIndex = Math.min(
          ROCKET_FRAME_COUNT,
          Math.max(1, Math.round(launchFraction * (ROCKET_FRAME_COUNT - 1)) + 1)
        );
      }

      if (DEBUG && debugReadout) {
        debugReadout.innerText = `Progress: ${(scrollFraction * 100).toFixed(2)}% | Frame: ${frameIndex}`;
      }

      updateRocketCanvas(frameIndex);

      // Rocket exit effect
      if (rocketCanvas) {
        const EXIT_START = 0.90; // start sliding out over the last 10% of scroll instead of last 1%
        if (scrollFraction > EXIT_START) {
          const exitProgress = (scrollFraction - EXIT_START) / (1 - EXIT_START);
          const translateX = exitProgress * 60;
          rocketCanvas.style.transform = `translateX(${translateX}%)`;
        } else {
          rocketCanvas.style.transform = `translateX(0%)`;
        }
      }

      // Sticky opacity
      if (rocketSticky) {
        if (scrollFraction >= 1) {
          rocketSticky.style.opacity = '0';
          rocketSticky.style.pointerEvents = 'none';
        } else {
          rocketSticky.style.opacity = '1';
          rocketSticky.style.pointerEvents = 'auto';
        }

      }

      // Text block fade sync
      if (blockBoundaries.length > 0) {
        contentBlocks.forEach((block, i) => {
          const { start, end } = blockBoundaries[i];
          if (scrollFraction >= start && scrollFraction <= end) {
            block.classList.add('active');
          } else {
            if (scrollFraction === 1 && i === N - 1) {
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

    window.addEventListener('resize', () => {
      blockBoundaries = getBlockBoundaries();
      if (!isIntroFinished) {
        resizeIntroCanvas();
      } else {
        alignRocketSticky();
        initRocketCanvas();
      }
    });

    // =========================================================
    // 6. MEMBERSHIP MODAL INTERACTION & LOGIC
    // =========================================================
    const membershipModal = document.getElementById('membershipModal');
    const membershipForm = document.getElementById('membershipForm');
    const membershipSuccess = document.getElementById('membershipSuccess');
    const closeMembershipModalBtn = document.getElementById('closeMembershipModal');
    const membershipModalBackdrop = document.getElementById('membershipModalBackdrop');
    const btnSuccessClose = document.getElementById('btnSuccessClose');
    const heroJoinBtn = document.getElementById('heroJoinBtn');
    const navMembershipBtn = document.getElementById('navMembershipBtn');

    function openMembershipModal() {
      if (!membershipModal) return;
      membershipModal.classList.add('active');
      membershipModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      const firstInput = membershipForm ? membershipForm.querySelector('input') : null;
      if (firstInput) setTimeout(() => firstInput.focus(), 120);
    }

    function closeMembershipModal() {
      if (!membershipModal) return;
      membershipModal.classList.remove('active');
      membershipModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');

      // Reset form view after animation if success was shown
      setTimeout(() => {
        if (membershipSuccess && membershipSuccess.style.display !== 'none') {
          membershipSuccess.style.display = 'none';
          if (membershipForm) {
            membershipForm.style.display = 'block';
            membershipForm.reset();
            membershipForm.querySelectorAll('.form-group').forEach(fg => fg.classList.remove('has-error'));
          }
        }
      }, 350);
    }

    if (heroJoinBtn) {
      heroJoinBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openMembershipModal();
      });
    }

    if (navMembershipBtn) {
      navMembershipBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openMembershipModal();
      });
    }

    // Global click listener for any link pointing to #membership
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a[href="#membership"], .btn-join-eclub');
      if (target) {
        e.preventDefault();
        openMembershipModal();
      }
    });

    if (closeMembershipModalBtn) {
      closeMembershipModalBtn.addEventListener('click', closeMembershipModal);
    }

    if (membershipModalBackdrop) {
      membershipModalBackdrop.addEventListener('click', closeMembershipModal);
    }

    if (btnSuccessClose) {
      btnSuccessClose.addEventListener('click', closeMembershipModal);
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && membershipModal && membershipModal.classList.contains('active')) {
        closeMembershipModal();
      }
    });

    // Form submission & validation
    if (membershipForm) {
      membershipForm.addEventListener('submit', (e) => {
        e.preventDefault();

        let isValid = true;
        const requiredInputs = membershipForm.querySelectorAll('input[required], textarea[required]');

        requiredInputs.forEach((input) => {
          const formGroup = input.closest('.form-group');
          let fieldValid = true;

          if (!input.value.trim()) {
            fieldValid = false;
          } else if (input.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            fieldValid = emailRegex.test(input.value.trim());
          }

          if (!fieldValid) {
            isValid = false;
            if (formGroup) formGroup.classList.add('has-error');
          } else {
            if (formGroup) formGroup.classList.remove('has-error');
          }

          input.addEventListener('input', () => {
            if (formGroup) formGroup.classList.remove('has-error');
          }, { once: true });
        });

        if (isValid) {
          const formData = {
            fullName: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim(),
            mobileNumber: document.getElementById('mobileNumber').value.trim(),
            studentEnrollment: document.getElementById('studentId').value.trim(),
            studentId: document.getElementById('studentId').value.trim(),
            department: document.getElementById('department').value.trim(),
            yearSemester: document.getElementById('yearSemester').value.trim(),
            areasOfInterest: document.getElementById('areasOfInterest').value.trim(),
            preferredTeam: document.getElementById('preferredTeam').value.trim(),
            whyJoin: document.getElementById('whyJoin').value.trim(),
            submittedAt: new Date().toISOString()
          };

          try {
            const existing = JSON.parse(localStorage.getItem('eclub_memberships') || '[]');
            existing.push(formData);
            localStorage.setItem('eclub_memberships', JSON.stringify(existing));
          } catch (err) {
            console.error('Storage error', err);
          }

          membershipForm.style.display = 'none';
          if (membershipSuccess) {
            membershipSuccess.style.display = 'block';
          }
        }
      });
    }

    if (window.location.hash === '#membership') {
      openMembershipModal();
    }

    // =========================================================
    // 7. SUBMIT YOUR IDEA MODAL INTERACTION & LOGIC
    // =========================================================
    const ideaModal = document.getElementById('ideaModal');
    const ideaForm = document.getElementById('ideaForm');
    const ideaSuccess = document.getElementById('ideaSuccess');
    const closeIdeaModalBtn = document.getElementById('closeIdeaModal');
    const ideaModalBackdrop = document.getElementById('ideaModalBackdrop');
    const btnIdeaSuccessClose = document.getElementById('btnIdeaSuccessClose');
    const heroIdeaBtn = document.getElementById('heroIdeaBtn');

    function openIdeaModal() {
      if (!ideaModal) return;
      ideaModal.classList.add('active');
      ideaModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      const firstInput = ideaForm ? ideaForm.querySelector('input') : null;
      if (firstInput) setTimeout(() => firstInput.focus(), 120);
    }

    function closeIdeaModal() {
      if (!ideaModal) return;
      ideaModal.classList.remove('active');
      ideaModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');

      setTimeout(() => {
        if (ideaSuccess && ideaSuccess.style.display !== 'none') {
          ideaSuccess.style.display = 'none';
          if (ideaForm) {
            ideaForm.style.display = 'block';
            ideaForm.reset();
            ideaForm.querySelectorAll('.form-group').forEach(fg => fg.classList.remove('has-error'));
          }
        }
      }, 350);
    }

    if (heroIdeaBtn) {
      heroIdeaBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openIdeaModal();
      });
    }

    document.addEventListener('click', (e) => {
      const target = e.target.closest('a[href="#idea"], .btn-submit-idea');
      if (target) {
        e.preventDefault();
        openIdeaModal();
      }
    });

    if (closeIdeaModalBtn) {
      closeIdeaModalBtn.addEventListener('click', closeIdeaModal);
    }

    if (ideaModalBackdrop) {
      ideaModalBackdrop.addEventListener('click', closeIdeaModal);
    }

    if (btnIdeaSuccessClose) {
      btnIdeaSuccessClose.addEventListener('click', closeIdeaModal);
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && ideaModal && ideaModal.classList.contains('active')) {
        closeIdeaModal();
      }
    });

    if (ideaForm) {
      ideaForm.addEventListener('submit', (e) => {
        e.preventDefault();

        let isValid = true;
        const requiredInputs = ideaForm.querySelectorAll('input[required], textarea[required]');

        requiredInputs.forEach((input) => {
          const formGroup = input.closest('.form-group');
          let fieldValid = true;

          if (!input.value.trim()) {
            fieldValid = false;
          } else if (input.type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            fieldValid = emailRegex.test(input.value.trim());
          }

          if (!fieldValid) {
            isValid = false;
            if (formGroup) formGroup.classList.add('has-error');
          } else {
            if (formGroup) formGroup.classList.remove('has-error');
          }

          input.addEventListener('input', () => {
            if (formGroup) formGroup.classList.remove('has-error');
          }, { once: true });
        });

        if (isValid) {
          const selectedSupport = Array.from(ideaForm.querySelectorAll('input[name="supportRequired"]:checked')).map(cb => cb.value);

          const ideaData = {
            name: document.getElementById('ideaFounderName').value.trim(),
            email: document.getElementById('ideaEmail').value.trim(),
            department: document.getElementById('ideaDepartment').value.trim(),
            startupName: document.getElementById('startupName').value.trim(),
            targetUsers: document.getElementById('targetUsers').value.trim(),
            currentStage: document.getElementById('currentStage').value.trim(),
            teamMembers: document.getElementById('teamMembers').value.trim(),
            domain: document.getElementById('domain').value.trim(),
            pitchDeck: document.getElementById('pitchDeck') ? document.getElementById('pitchDeck').value.trim() : '',
            demoLink: document.getElementById('demoLink') ? document.getElementById('demoLink').value.trim() : '',
            problemStatement: document.getElementById('problemStatement').value.trim(),
            ideaDescription: document.getElementById('ideaDescription').value.trim(),
            supportRequired: selectedSupport,
            submittedAt: new Date().toISOString()
          };

          try {
            const existing = JSON.parse(localStorage.getItem('eclub_ideas') || '[]');
            existing.push(ideaData);
            localStorage.setItem('eclub_ideas', JSON.stringify(existing));
          } catch (err) {
            console.error('Storage error', err);
          }

          ideaForm.style.display = 'none';
          if (ideaSuccess) {
            ideaSuccess.style.display = 'block';
          }
        }
      });
    }

    if (window.location.hash === '#idea') {
      openIdeaModal();
    }