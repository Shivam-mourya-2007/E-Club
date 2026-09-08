/**
 * GSAP "Stack to Scatter" Animation for Events
 * Replays seamlessly whenever the user scrolls back into view
 */

(function () {
  'use strict';

  window.addEventListener('DOMContentLoaded', () => {
    // Ensure GSAP is loaded
    if (typeof gsap === 'undefined') {
      console.warn('GSAP not loaded.');
      return;
    }

    const eventsSection = document.querySelector('#events');
    const grid = document.querySelector('.events-grid');
    const cards = gsap.utils.toArray('.event-card');

    if (!grid || !cards.length || !eventsSection) return;

    // Configuration
    const CARD_DURATION = 1.35;
    const STAGGER_OFFSET = 0.15;

    // Deterministic offset arrays for fan/jitter
    const rotVals = [-8, 5, -6, 8, -4, 6];
    const jX = [-10, 8, -6, 10, -8, 5];
    const jY = [5, -10, 8, -5, 10, -8];

    let mm = gsap.matchMedia();

    // Debounce helper for window resize
    function debounce(func, wait) {
      let timeout;
      return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    }

    mm.add("(min-width: 769px)", () => {
      let tl;
      let observer;
      let hasPlayed = false;

      function buildAnimation() {
        if (tl) tl.kill();
        if (observer) observer.disconnect();

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

        // 4. Create Paused Timeline
        tl = gsap.timeline({ paused: true });

        // 5. Animate from stack to natural positions
        cards.forEach((card, i) => {
          tl.to(card, {
            x: 0,
            y: 0,
            rotation: 0,
            rotateY: 0,
            duration: CARD_DURATION,
            ease: "power3.out"
          }, i * STAGGER_OFFSET);
        });

        // 6. Setup IntersectionObserver for repeated replay
        hasPlayed = false;

        observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
              if (!hasPlayed) {
                hasPlayed = true;
                tl.restart();
              }
            } else if (!entry.isIntersecting) {
              hasPlayed = false;
              tl.pause(0);
            }
          });
        }, {
          threshold: [0, 0.2]
        });

        observer.observe(eventsSection);
      }

      buildAnimation();

      const handleResize = debounce(() => {
        buildAnimation();
      }, 250);

      window.addEventListener("resize", handleResize);

      // Cleanup
      return () => {
        window.removeEventListener("resize", handleResize);
        if (tl) tl.kill();
        if (observer) observer.disconnect();
        gsap.set(cards, { clearProps: "all" });
      };
    });

    // Mobile fallback: simple fade/slide-in repeating on scroll
    mm.add("(max-width: 768px)", () => {
      let observer;

      cards.forEach((card) => {
        gsap.set(card, { opacity: 0, y: 30 });
      });

      observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const card = entry.target;
          if (entry.isIntersecting) {
            gsap.to(card, {
              opacity: 1,
              y: 0,
              duration: 1.15,
              ease: "power3.out"
            });
          } else {
            gsap.set(card, {
              opacity: 0,
              y: 30
            });
          }
        });
      }, {
        threshold: 0.15
      });

      cards.forEach(card => observer.observe(card));

      return () => {
        if (observer) observer.disconnect();
        gsap.set(cards, { clearProps: "all" });
      };
    });

  });
})();
