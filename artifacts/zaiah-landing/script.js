const revealItems = document.querySelectorAll(".reveal:not(.is-visible)");
const staggerParents = document.querySelectorAll(".reveal-stagger");

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
            { opacity: [0, 1], y: [18, 0] },
            { duration: 0.85, easing: [0.22, 1, 0.36, 1] }
          );
        }

        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  revealItems.forEach((item) => revealObserver.observe(item));

  staggerParents.forEach((parent) => {
    const children = parent.querySelectorAll(":scope > .reveal:not(.is-visible)");
    children.forEach((child) => revealObserver.observe(child));
  });
}

initRevealMotion();

const parallaxItems = Array.from(document.querySelectorAll(".parallax img"));
let ticking = false;

function updateParallax() {
  const viewport = window.innerHeight || 1;

  parallaxItems.forEach((image) => {
    const rect = image.parentElement.getBoundingClientRect();
    const progress = (rect.top + rect.height / 2 - viewport / 2) / viewport;
    const translate = Math.max(-10, Math.min(10, progress * -12));
    image.style.transform = `scale(1.04) translate3d(0, ${translate}px, 0)`;
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

/* ----------------------------------------------------------
   1) Replica del ban-intro debajo del footer (siempre en DOM).
   2) Banner pill flotante: oculto cuando el footer es visible.
   ---------------------------------------------------------- */
(function cloneBanIntroAfterFooter() {
  const banIntro = document.querySelector(".ban-intro");
  const footer = document.querySelector(".foot");
  if (!banIntro || !footer) return;

  const clone = banIntro.cloneNode(true);
  clone.classList.remove("reveal", "is-visible");
  clone.classList.add("ban-intro--docked");
  clone.removeAttribute("id");
  clone.setAttribute("aria-hidden", "false");

  if (footer.parentNode) {
    footer.parentNode.insertBefore(clone, footer);
  }
})();

(function floatBannerVisibility() {
  const banner = document.querySelector(".banner");
  const dockedIntro = document.querySelector(".ban-intro--docked");
  const footer = document.querySelector(".foot");
  if (!banner) return;

  const target = dockedIntro || footer;
  if (!target) return;

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          banner.classList.add("banner--hidden");
          document.body.classList.add("has-banner-docked");
        } else {
          banner.classList.remove("banner--hidden");
          document.body.classList.remove("has-banner-docked");
        }
      });
    },
    { threshold: 0, rootMargin: "0px 0px -10% 0px" }
  );

  obs.observe(target);
})();

/* ----------------------------------------------------------
   Formulario de reserva · validación + feedback
   Agrega tu endpoint en data-endpoint del form, ej:
   https://formspree.io/f/xxxxxxxx
   ---------------------------------------------------------- */
(function initReservaForm() {
  const form = document.getElementById("reserva-form");
  if (!form) return;

  const submitBtn = form.querySelector(".form-submit");
  const statusEl = form.querySelector(".form-status");
  const defaultBtnLabel = submitBtn?.textContent?.trim() || "Agendar mi recorrido →";

  function setStatus(type, message) {
    if (!statusEl) return;
    statusEl.hidden = false;
    statusEl.className = `form-status form-status--${type}`;
    statusEl.textContent = message;
  }

  function clearStatus() {
    if (!statusEl) return;
    statusEl.hidden = true;
    statusEl.className = "form-status";
    statusEl.textContent = "";
  }

  function setLoading(isLoading) {
    form.classList.toggle("is-loading", isLoading);
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? "Enviando…" : defaultBtnLabel;
  }

  form.addEventListener("input", () => {
    if (statusEl && !statusEl.hidden && statusEl.classList.contains("form-status--error")) {
      clearStatus();
    }
  });

  function goToGracias() {
    const next = form.dataset.thanks?.trim() || "./gracias.html";
    window.location.assign(next);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearStatus();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const endpoint = form.dataset.endpoint?.trim();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    setLoading(true);

    try {
      if (endpoint) {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 650));
        console.info("[reserva-form] Datos:", data);
      }

      goToGracias();
    } catch (error) {
      console.error("[reserva-form] Error al enviar:", error);
      setStatus(
        "error",
        "No pudimos enviar tu registro. Revisa tu conexión e inténtalo de nuevo."
      );
      statusEl?.focus({ preventScroll: true });
      setLoading(false);
    }
  });
})();

/* ----------------------------------------------------------
   Galería · carrusel moderno
   ---------------------------------------------------------- */
(function initGaleriaCarousel() {
  const root = document.querySelector("[data-carousel]");
  if (!root) return;

  const slides = Array.from(root.querySelectorAll("[data-carousel-slide]"));
  if (!slides.length) return;

  const prevBtn = root.querySelector("[data-carousel-prev]");
  const nextBtn = root.querySelector("[data-carousel-next]");
  const dotsWrap = root.querySelector("[data-carousel-dots]");
  const thumbsWrap = root.querySelector("[data-carousel-thumbs]");
  const progressBar = root.querySelector("[data-carousel-progress]");
  const currentEl = root.querySelector("[data-carousel-current]");
  const totalEl = root.querySelector("[data-carousel-total]");
  const stage = root.querySelector(".galeria-stage");

  let index = 0;
  let timer = null;
  let progressRaf = null;
  let startedAt = 0;
  const AUTO_MS = 5200;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (totalEl) {
    totalEl.textContent = String(slides.length).padStart(2, "0");
  }

  slides.forEach((slide, i) => {
    const img = slide.querySelector("img");
    const caption = slide.querySelector("figcaption")?.textContent?.trim() || `Imagen ${i + 1}`;

    if (dotsWrap) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "galeria-dot";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", caption);
      dot.addEventListener("click", () => goTo(i, true));
      dotsWrap.appendChild(dot);
    }

    if (thumbsWrap && img) {
      const thumb = document.createElement("button");
      thumb.type = "button";
      thumb.className = "galeria-thumb";
      thumb.setAttribute("aria-label", caption);
      thumb.innerHTML = `<img src="${img.currentSrc || img.src}" alt="" loading="lazy" decoding="async" />`;
      thumb.addEventListener("click", () => goTo(i, true));
      thumbsWrap.appendChild(thumb);
    }
  });

  const dots = Array.from(root.querySelectorAll(".galeria-dot"));
  const thumbs = Array.from(root.querySelectorAll(".galeria-thumb"));

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function render() {
    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === index);
      slide.setAttribute("aria-hidden", i === index ? "false" : "true");
    });
    dots.forEach((dot, i) => {
      const active = i === index;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-selected", active ? "true" : "false");
    });
    thumbs.forEach((thumb, i) => {
      thumb.classList.toggle("is-active", i === index);
    });
    if (currentEl) currentEl.textContent = pad(index + 1);
  }

  function stopProgress() {
    if (progressRaf) cancelAnimationFrame(progressRaf);
    progressRaf = null;
    if (progressBar) progressBar.style.width = "0%";
  }

  function tickProgress() {
    if (!progressBar || reduceMotion) return;
    const elapsed = Date.now() - startedAt;
    const pct = Math.min(100, (elapsed / AUTO_MS) * 100);
    progressBar.style.width = `${pct}%`;
    if (pct < 100) {
      progressRaf = requestAnimationFrame(tickProgress);
    }
  }

  function stopAuto() {
    if (timer) clearInterval(timer);
    timer = null;
    stopProgress();
  }

  function startAuto() {
    stopAuto();
    if (reduceMotion) return;
    startedAt = Date.now();
    tickProgress();
    timer = window.setInterval(() => goTo(index + 1), AUTO_MS);
  }

  function goTo(next, userInitiated = false) {
    index = ((next % slides.length) + slides.length) % slides.length;
    render();
    if (userInitiated) startAuto();
    else {
      startedAt = Date.now();
      stopProgress();
      tickProgress();
    }
  }

  prevBtn?.addEventListener("click", () => goTo(index - 1, true));
  nextBtn?.addEventListener("click", () => goTo(index + 1, true));

  root.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1, true);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1, true);
    }
  });

  let touchX = null;
  stage?.addEventListener(
    "touchstart",
    (event) => {
      touchX = event.changedTouches[0]?.clientX ?? null;
      stopAuto();
    },
    { passive: true }
  );
  stage?.addEventListener(
    "touchend",
    (event) => {
      if (touchX == null) return;
      const dx = (event.changedTouches[0]?.clientX ?? touchX) - touchX;
      if (Math.abs(dx) > 42) goTo(index + (dx < 0 ? 1 : -1), true);
      else startAuto();
      touchX = null;
    },
    { passive: true }
  );

  root.addEventListener("mouseenter", stopAuto);
  root.addEventListener("mouseleave", startAuto);
  root.addEventListener("focusin", stopAuto);
  root.addEventListener("focusout", (event) => {
    if (!root.contains(event.relatedTarget)) startAuto();
  });

  root.setAttribute("tabindex", "0");
  render();
  startAuto();
})();
