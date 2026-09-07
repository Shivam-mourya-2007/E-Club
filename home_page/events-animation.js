/**
 * GSAP Scroll-Scrubbed "Stack to Scatter" Animation for Events
 */

(function () {
  'use strict';

  window.addEventListener('DOMContentLoaded', () => {
    // Ensure GSAP and ScrollTrigger are loaded
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('GSAP or ScrollTrigger not loaded.');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const grid = document.querySelector('.events-grid');
    const cards = gsap.utils.toArray('.event-card');
    
    if (!grid || !cards.length) return;

    // Configuration
    const SCRUB_SPEED = 1;
    const CARD_DURATION = 0.6;
    const STAGGER_OFFSET = 0.08;

    // Deterministic offset arrays for fan/jitter
    const rotVals = [-8, 5, -6, 8, -4, 6];
    const jX = [-10, 8, -6, 10, -8, 5];
    const jY = [5, -10, 8, -5, 10, -8];

    let mm = gsap.matchMedia();

    // Debounce helper for window resize
    function debounce(func, wait) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    }

    mm.add("(min-width: 769px)", () => {
      let tl;
      
      function buildAnimation() {
        // Kill existing timeline to clear inline styles and pins for clean recalculation
        if (tl) {
          tl.kill();
        }

        // Strip all GSAP inline styles to measure natural DOM positions
        gsap.set(cards, { clearProps: "all" });

        // 1. Calculate Grid Center
        const gridRect = grid.getBoundingClientRect();
        const gridCenterX = gridRect.left + gridRect.width / 2;
        const gridCenterY = gridRect.top + gridRect.height / 2;

        // 2. Pre-calculate travel distances for each card
        cards.forEach((card, i) => {
          const cardRect = card.getBoundingClientRect();
          const cardCenterX = cardRect.left + cardRect.width / 2;
          const cardCenterY = cardRect.top + cardRect.height / 2;

          const deltaX = gridCenterX - cardCenterX;
          const deltaY = gridCenterY - cardCenterY;

          const rot = rotVals[i % rotVals.length];
          const jitterX = jX[i % jX.length];
          const jitterY = jY[i % jY.length];

          card.dataset.startX = deltaX + jitterX;
          card.dataset.startY = deltaY + jitterY;
          card.dataset.startRot = rot;
        });

        // 3. Set Initial Stacked State
        cards.forEach((card, i) => {
          gsap.set(card, {
            x: parseFloat(card.dataset.startX),
            y: parseFloat(card.dataset.startY),
            rotation: parseFloat(card.dataset.startRot),
            rotateY: 90,   // Edge-on ready to flip
            zIndex: i,     // Layer like a real deck
            opacity: 1
          });
        });

        // 4. Create Scrub Timeline
        tl = gsap.timeline({
          scrollTrigger: {
            trigger: "#events",
            pin: true,
            scrub: SCRUB_SPEED,
            start: "top top",
            end: "+=150%"
          }
        });

        // 5. Animate from stack to natural positions
        cards.forEach((card, i) => {
          // Use explicit position parameter for overlapping stagger
          tl.to(card, {
            x: 0,
            y: 0,
            rotation: 0,
            rotateY: 0,
            duration: CARD_DURATION,
            ease: "none"
          }, i * STAGGER_OFFSET);
        });
      }

      // Initial build
      buildAnimation();

      // Recalculate cleanly on resize
      const handleResize = debounce(() => {
        buildAnimation();
        ScrollTrigger.refresh();
      }, 250);

      window.addEventListener("resize", handleResize);

      // Cleanup
      return () => {
        window.removeEventListener("resize", handleResize);
        if (tl) tl.kill();
        gsap.set(cards, { clearProps: "all" });
      };
    });

    // Mobile fallback: simple fade/slide-in, no pin
    mm.add("(max-width: 768px)", () => {
      cards.forEach((card, i) => {
        gsap.set(card, { opacity: 0, y: 30 });
        gsap.to(card, {
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
          },
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
          clearProps: "all"
        });
      });

      return () => {
        cards.forEach(card => gsap.set(card, { clearProps: "all" }));
      };
    });

  });
})();
