/* ========================================
   GENERATIVE PROJECT ANIMATION
   ======================================== */

(() => {
  const canvas = document.getElementById("projects-animation");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  const gallery = canvas.closest(".projects-gallery");

  const desktop = window.matchMedia("(min-width: 1100px)");
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  /* ANIMATION SETTINGS */

  const config = {
    lines: 28,
    speed: 0.0002,
    frequency: 0.013,
    amplitude: 0.37,
    opacity: 0.055,
    lineWidth: 0.8,
    resolution: 4,
  };

  let width = 0;
  let height = 0;

  let animationId = null;
  let visible = false;

  let intensity = 1;
  let targetIntensity = 1;

  /* CANVAS DIMENSIONS */

  function resizeCanvas() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    draw(0);
  }

  /* GENERATIVE CURVES */

  function draw(time) {
    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);

    intensity += (targetIntensity - intensity) * 0.025;

    for (let j = 0; j < config.lines; j++) {
      ctx.beginPath();

      const opacity =
        (config.opacity + j * 0.005) * intensity;

      ctx.strokeStyle = `rgba(184, 32, 37, ${opacity})`;
      ctx.lineWidth = config.lineWidth;

      for (let y = 0; y <= height; y += config.resolution) {
        const phase =
          y * config.frequency + time * config.speed;

        const x =
          width *
          (
            0.65 +
            config.amplitude * Math.sin(phase + j * 0.055) +
            0.19 * Math.sin(phase * 2.1 + j * 0.075)
          );

        if (y === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    }
  }

  /* ANIMATION LOOP */

  function animate(time) {
    animationId = null;

    draw(time);

    if (visible && desktop.matches && !reducedMotion.matches) {
      animationId = requestAnimationFrame(animate);
    }
  }

  function updateAnimation() {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    if (!desktop.matches) return;

    if (reducedMotion.matches) {
      draw(0);
      return;
    }

    if (visible) {
      animationId = requestAnimationFrame(animate);
    }
  }

  /* HOVER INTERACTION */

  gallery.querySelectorAll(".project-info").forEach((project) => {
    project.addEventListener("pointerenter", () => {
      targetIntensity = 1.8;
    });

    project.addEventListener("pointerleave", () => {
      targetIntensity = 1;
    });
  });

  /* RESPONSIVE CANVAS */

  const resizeObserver = new ResizeObserver(resizeCanvas);

  resizeObserver.observe(gallery);
  resizeObserver.observe(canvas);

  /* PERFORMANCE — PAUSE OUTSIDE VIEWPORT */

  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      updateAnimation();
    },
    { threshold: 0 }
  );

  observer.observe(gallery);

  desktop.addEventListener("change", () => {
    resizeCanvas();
    updateAnimation();
  });

  reducedMotion.addEventListener("change", updateAnimation);

  resizeCanvas();
})();