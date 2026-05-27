const revealItems = document.querySelectorAll(".reveal:not(.is-visible)");

async function initRevealMotion() {
  let motionAnimate = null;

  try {
    const motion = await Promise.race([
      import("https://esm.sh/framer-motion@11.18.2"),
      new Promise((resolve) => window.setTimeout(() => resolve(null), 700))
    ]);
    motionAnimate = motion?.animate || null;
  } catch {
    motionAnimate = null;
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");

        if (motionAnimate) {
          motionAnimate(
            entry.target,
            { opacity: [0, 1], y: [26, 0] },
            { duration: 0.8, easing: [0.22, 1, 0.36, 1] }
          );
        }

        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

initRevealMotion();

const parallaxItems = Array.from(document.querySelectorAll(".parallax img"));
let ticking = false;

function updateParallax() {
  const viewport = window.innerHeight || 1;

  parallaxItems.forEach((image) => {
    const rect = image.parentElement.getBoundingClientRect();
    const progress = (rect.top + rect.height / 2 - viewport / 2) / viewport;
    const translate = Math.max(-18, Math.min(18, progress * -22));
    image.style.transform = `scale(1.06) translate3d(0, ${translate}px, 0)`;
  });

  ticking = false;
}

function requestParallax() {
  if (!ticking) {
    window.requestAnimationFrame(updateParallax);
    ticking = true;
  }
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  updateParallax();
  window.addEventListener("scroll", requestParallax, { passive: true });
  window.addEventListener("resize", requestParallax);
}
