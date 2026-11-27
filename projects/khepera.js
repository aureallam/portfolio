
/* ========================================
   KHEPERA IV — SCIENTIFIC VISUALIZATIONS
   ======================================== */

(() => {
  const colors = {
    background: "#17191b",
    grid: "#303234",
    muted: "#888888",
    white: "#dededb",
    red: "#e34346",
  };

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  /* ========================================
     01 — SHARED DRAWING FUNCTIONS
     ======================================== */

  function createScene(id, render) {
    const canvas = document.getElementById(id);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let visible = false;
    let time = 0;
    let previous = null;
    let animationId = null;

    function resize() {
      width = canvas.clientWidth;
      height = canvas.clientHeight;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      draw(0);
    }

    function draw(dt) {
      ctx.clearRect(0, 0, width, height);

      render(ctx, width, height, time, dt);
    }

    function frame(timestamp) {
      animationId = null;

      const dt = previous === null
        ? 0
        : Math.min((timestamp - previous) / 1000, 0.05);

      previous = timestamp;
      time += dt;

      draw(dt);

      if (visible && !reducedMotion.matches) {
        animationId = requestAnimationFrame(frame);
      }
    }

    function update() {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }

      previous = null;

      if (visible && !reducedMotion.matches) {
        animationId = requestAnimationFrame(frame);
      } else {
        draw(0);
      }
    }

    new ResizeObserver(resize).observe(canvas);

    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    }).observe(canvas);

    reducedMotion.addEventListener("change", update);

    resize();

    return {
      redraw: () => draw(0),
    };
  }

  function line(ctx, a, b, color, dash = []) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash(dash);
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function grid(ctx, width, height) {
    for (let x = 0; x < width; x += 20) {
      line(ctx, [x, 0], [x, height], colors.grid);
    }

    for (let y = 0; y < height; y += 20) {
      line(ctx, [0, y], [width, y], colors.grid);
    }
  }

  function label(ctx, text, x, y, color = colors.muted) {
    ctx.fillStyle = color;
    ctx.font = "10px IBM Plex Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
  }

  function robot(ctx, x, y, angle, radius, leader = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const color = leader ? colors.red : colors.white;

    ctx.fillStyle = "#252729";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Differential-drive wheels

    ctx.fillStyle = colors.white;

    ctx.fillRect(
      -radius * 0.55,
      -radius,
      radius * 1.1,
      radius * 0.3
    );

    ctx.fillRect(
      -radius * 0.55,
      radius * 0.7,
      radius * 1.1,
      radius * 0.3
    );

    // Central tracking marker

    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Heading indicator

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius * 1.4, 0);
    ctx.lineTo(radius, -radius * 0.25);

    ctx.moveTo(radius * 1.4, 0);
    ctx.lineTo(radius, radius * 0.25);
    ctx.stroke();

    ctx.restore();
  }

  function polygon(ctx, points, color, fill = null) {
    ctx.beginPath();

    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(...p);
      else ctx.lineTo(...p);
    });

    ctx.closePath();

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /* ========================================
     02 — INDIVIDUAL VS COLLECTIVE MOTION
     ======================================== */

  let playing = !reducedMotion.matches;
  let speed = 1;
  let motionTime = 0;

  const motionScene = createScene(
    "collective-motion",
    (ctx, w, h, time, dt) => {
      if (playing) motionTime += dt * speed * 0.65;

      const t = motionTime;
      const cy = h * 0.5;
      const r = Math.min(w * 0.13, h * 0.22);
      const offset = Math.min(w * 0.075, 36);
      const size = Math.min(w * 0.026, 12);

      grid(ctx, w, h);

      line(
        ctx,
        [w / 2, 0],
        [w / 2, h],
        "#555555"
      );

      label(ctx, "INDEPENDENT", w * 0.25, 24);
      label(ctx, "COORDINATED", w * 0.75, 24, colors.red);

      function independent(s, i) {
        const a = s * (1 + i * 0.12) + i * 2.1;

        return [
          w * 0.25 + r * Math.cos(a),
          cy + r * 1.2 * Math.sin(a),
        ];
      }

      function collective(s, i) {
        const a = s + Math.PI / 2;

        const x = i === 0 ? 0 : -offset;

        const y = i === 0
          ? 0
          : (i === 1 ? -1 : 1) * offset * 0.75;

        return [
          w * 0.75 + r * 0.65 * Math.cos(s)
            + x * Math.cos(a) - y * Math.sin(a),

          cy + r * 0.65 * Math.sin(s)
            + x * Math.sin(a) + y * Math.cos(a),
        ];
      }

      [independent, collective].forEach((fn, side) => {
        const points = [0, 1, 2].map(i => fn(t, i));

        for (let i = 0; i < 3; i++) {
          ctx.beginPath();

          for (let j = 0; j < 100; j++) {
            const p = fn(t - (99 - j) * 0.025, i);

            if (j === 0) ctx.moveTo(...p);
            else ctx.lineTo(...p);
          }

          ctx.strokeStyle = side
            ? (i === 0 ? colors.red : "#804247")
            : "#666666";

          ctx.lineWidth = 1;
          ctx.stroke();
        }

        if (side === 1) {
          polygon(ctx, points, colors.red, "#b8202512");
        }

        points.forEach((p, i) => {
          const next = fn(t + 0.001, i);

          const angle = Math.atan2(
            next[1] - p[1],
            next[0] - p[0]
          );

          robot(ctx, ...p, angle, size, side === 1 && i === 0);
        });
      });

      label(ctx, "INDIVIDUAL GOALS", w * 0.25, h - 20);
      label(ctx, "SHARED GOAL", w * 0.75, h - 20, colors.red);
    }
  );

  const toggle = document.getElementById("motion-toggle");

  if (toggle) {
    toggle.textContent = playing ? "Pause" : "Play";

    toggle.addEventListener("click", () => {
      playing = !playing;
      toggle.textContent = playing ? "Pause" : "Play";
      motionScene?.redraw();
    });
  }

  document
    .getElementById("motion-speed")
    ?.addEventListener("input", event => {
      speed = Number(event.target.value);
    });

  /* ========================================
     03 — FORMATION ARCHITECTURES
     ======================================== */

  let formationMode = "leader";

  const descriptions = {
    behaviour: {
      title: "Behaviour-based control",
      text: "Individual behaviours such as attraction, separation and obstacle avoidance are combined to generate coordinated motion.",
      note: "LOCAL BEHAVIOURAL INTERACTIONS",
    },

    virtual: {
      title: "Virtual structure",
      text: "The robots track positions associated with a common virtual geometric structure.",
      note: "SHARED GEOMETRIC REFERENCE",
    },

    leader: {
      title: "Leader-follower",
      text: "The leader provides a moving reference. Each follower adjusts its motion to maintain a desired relative position.",
      note: "APPROACH INVESTIGATED IN THIS PROJECT",
    },
  };

  const formationScene = createScene(
    "formation-architectures",
    (ctx, w, h, time) => {
      grid(ctx, w, h);

      const t = time * 0.6;
      const cx = w / 2 + Math.sin(t * 0.7) * w * 0.08;
      const cy = h / 2;

      const s = Math.min(w * 0.22, h * 0.25, 100);
      const a = 0.4 * Math.sin(t);
      const radius = Math.min(w * 0.045, 18);

      const offsets = [
        [s, 0],
        [-s, -s * 0.8],
        [-s, s * 0.8],
      ];

      const points = offsets.map(([x, y], i) => {
        const dx = formationMode === "behaviour"
          ? Math.sin(t * 1.7 + i * 2) * 14
          : 0;

        const dy = formationMode === "behaviour"
          ? Math.cos(t * 1.4 + i * 2) * 12
          : 0;

        return [
          cx + x * Math.cos(a) - y * Math.sin(a) + dx,
          cy + x * Math.sin(a) + y * Math.cos(a) + dy,
        ];
      });

      if (formationMode === "behaviour") {
        points.forEach((p, i) => {
          ctx.beginPath();
          ctx.arc(...p, s * 0.75, 0, Math.PI * 2);
          ctx.fillStyle = "#b8202512";
          ctx.fill();
          ctx.strokeStyle = "#804247";
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          line(
            ctx,
            p,
            points[(i + 1) % 3],
            "#804247",
            [4, 4]
          );
        });
      }

      if (formationMode === "virtual") {
        polygon(ctx, points, colors.red, "#b8202520");

        line(ctx, [cx - 10, cy], [cx + 10, cy], colors.red);
        line(ctx, [cx, cy - 10], [cx, cy + 10], colors.red);

        label(ctx, "VIRTUAL REFERENCE", cx, cy - 20, colors.red);
      }

      if (formationMode === "leader") {
        [1, 2].forEach(i => {
          const start = points[0];
          const end = points[i];

          line(ctx, start, end, colors.red, [5, 5]);

          const angle = Math.atan2(
            end[1] - start[1],
            end[0] - start[0]
          );

          const x = start[0] + (end[0] - start[0]) * 0.6;
          const y = start[1] + (end[1] - start[1]) * 0.6;

          line(ctx, [x, y], [
            x - 10 * Math.cos(angle - 0.5),
            y - 10 * Math.sin(angle - 0.5),
          ], colors.red);

          line(ctx, [x, y], [
            x - 10 * Math.cos(angle + 0.5),
            y - 10 * Math.sin(angle + 0.5),
          ], colors.red);
        });
      }

      points.forEach((p, i) => {
        const isLeader = formationMode === "leader" && i === 0;

        robot(ctx, ...p, a, radius, isLeader);

        const name = formationMode === "leader"
          ? (i === 0 ? "LEADER" : `FOLLOWER ${i}`)
          : `AGENT ${i + 1}`;

        label(
          ctx,
          name,
          p[0],
          p[1] + radius + 19,
          isLeader ? colors.red : colors.white
        );
      });
    }
  );

  document.querySelectorAll("[data-formation]").forEach(button => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.formation === formationMode)
    );

    button.addEventListener("click", () => {
      formationMode = button.dataset.formation;

      document.querySelectorAll("[data-formation]").forEach(b => {
        const active = b === button;

        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", String(active));
      });

      const data = descriptions[formationMode];

      document.getElementById("formation-title").textContent =
        data.title;

      document.getElementById("formation-description").textContent =
        data.text;

      document.getElementById("formation-note").textContent =
        data.note;

      formationScene?.redraw();
    });
  });

  /* ========================================
     04 — MODEL VS REALITY
     ======================================== */

  createScene("model-reality", (ctx, w, h, time) => {
    grid(ctx, w, h);

    const progress = reducedMotion.matches
      ? 1
      : Math.min((time % 8) / 6, 1);

    const half = w / 2;

    line(ctx, [half, 0], [half, h], "#555555");

    label(ctx, "IDEAL MODEL", half * 0.5, 24);
    label(ctx, "PHYSICAL SYSTEM", half * 1.5, 24);

    function trajectory(s, side, disturbed = false) {
      const x = side * half + half * (0.12 + 0.76 * s);

      let y = h * 0.7 - h * 0.38 * Math.sin(Math.PI * s);

      if (disturbed) {
        y += h * 0.025 * Math.sin(s * 35);
        y += h * 0.018 * Math.sin(s * 73);
        y += h * 0.04 * s;
      }

      return [x, y];
    }

    function trace(side, disturbed, end, color, dash = []) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(dash);

      for (let i = 0; i <= 150; i++) {
        const p = trajectory(i / 150 * end, side, disturbed);

        if (i === 0) ctx.moveTo(...p);
        else ctx.lineTo(...p);
      }

      ctx.stroke();
      ctx.setLineDash([]);
    }

    trace(0, false, 1, "#555555", [4, 4]);
    trace(1, false, 1, "#777777", [4, 4]);

    trace(0, false, progress, colors.red);
    trace(1, true, progress, colors.red);

    [0, 1].forEach(side => {
      const p = trajectory(progress, side, side === 1);

      const next = trajectory(
        progress + 0.001,
        side,
        side === 1
      );

      const angle = Math.atan2(
        next[1] - p[1],
        next[0] - p[0]
      );

      robot(ctx, ...p, angle, 10);
    });

    label(ctx, "REFERENCE TRAJECTORY", half * 0.5, h - 18);
    label(ctx, "ILLUSTRATIVE DEVIATIONS", half * 1.5, h - 18);
  });
})();

/* ========================================
   GENERATIVE EDITORIAL MARGIN
   ======================================== */

(() => {
  const canvas = document.getElementById(
    "project-margin-animation"
  );

  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const desktop = window.matchMedia("(min-width: 1100px)");

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const config = {
    lines: 28,
    speed: 0.000085,
    frequency: 0.013,
    amplitude: 0.37,
    opacity: 0.065,
    lineWidth: 0.9,
    resolution: 3,
  };

  let width = 0;
  let height = 0;
  let visible = false;
  let animationId = null;

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    draw(0);
  }

  function draw(time) {
    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);

    for (let j = 0; j < config.lines; j++) {
      ctx.beginPath();

      const opacity = config.opacity + j * 0.003;

      ctx.strokeStyle = `rgba(190, 25, 30, ${opacity})`;
      ctx.lineWidth = config.lineWidth;

      for (let y = 0; y <= height; y += config.resolution) {
        const phase =
          y * config.frequency + time * config.speed;

        const x =
          width *
          (
            0.5 +
            config.amplitude * Math.sin(phase + j * 0.055) +
            0.19 * Math.sin(phase * 2.1 + j * 0.075)
          );

        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
    }
  }

  function animate(time) {
    animationId = null;

    draw(time);

    if (visible && desktop.matches && !reducedMotion.matches) {
      animationId = requestAnimationFrame(animate);
    }
  }

  function update() {
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

  new ResizeObserver(resize).observe(canvas);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  }).observe(canvas);

  desktop.addEventListener("change", () => {
    resize();
    update();
  });

  reducedMotion.addEventListener("change", update);

  resize();
})();