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

  function showGracias() {
    const gracias = document.getElementById("gracias-card");
    if (!gracias) return;
    form.hidden = true;
    gracias.hidden = false;
    gracias.scrollIntoView({ behavior: "smooth", block: "center" });
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

      showGracias();
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

/* WhatsApp CTAs (hero) */
(function initWhatsAppLinks() {
  const WA_NUMBER = "5215584004709";
  const WA_REF = "zaiah-landing-recorrido";
  const baseMsg =
    "Hola, vengo de la página de Zaiah Health y quiero agendar mi recorrido privado 1:1.";

  function waLink(msg) {
    return (
      "https://wa.me/" +
      WA_NUMBER +
      "?text=" +
      encodeURIComponent(msg + " [ref: " + WA_REF + "]")
    );
  }

  const waHero = document.getElementById("waHero");
  if (waHero) waHero.href = waLink(baseMsg);

  const waClose = document.getElementById("waClose");
  if (waClose) waClose.href = waLink(baseMsg);
})();
