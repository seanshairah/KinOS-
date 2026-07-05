"use client";

import { useEffect, useRef } from "react";

/**
 * DuskField — the living night sky behind everything.
 *
 * Five layers, all hand-rolled 2D canvas (a few KB, no WebGL):
 *   1. Aurora — three vast pools of light (lavender, a whisper of ember,
 *      a whisper of calm green) drifting on slow sine paths.
 *   2. The horizon breath — a warm glow at the foot of the sky that
 *      brightens and dims like slow breathing.
 *   3. Stars — depth-layered, twinkling, leaning gently toward the
 *      pointer and the scroll; near neighbours join into faint
 *      constellation lines. The brightest few carry a four-point glint.
 *   4. Fireflies — a handful of ember and calm motes wandering on
 *      Lissajous paths, brighter and nearer than any star.
 *   5. A rare meteor — catching one should feel like luck.
 *
 * prefers-reduced-motion renders one still frame of all five layers.
 */

interface Particle {
  x: number; // 0..1 of width
  y: number; // 0..1 of height
  depth: number; // 0.2 (far) .. 1 (near)
  r: number;
  hue: "halo" | "ink" | "ember" | "calm";
  phase: number;
  speed: number;
  drift: number;
  /** the lucky few that glint with a four-point sparkle */
  glint: boolean;
}

interface Firefly {
  cx: number; // 0..1 anchor
  cy: number;
  ax: number; // wander amplitudes in px
  ay: number;
  fx: number; // wander frequencies
  fy: number;
  phase: number;
  hue: "ember" | "calm" | "halo";
  r: number;
}

const COLORS: Record<Particle["hue"], string> = {
  halo: "169,167,224",
  ink: "237,235,246",
  ember: "217,138,61",
  calm: "78,158,126",
};

/** Deterministic scatter — the same sky greets you every visit. */
function seeded(seedStart: number) {
  let seed = seedStart;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

function makeParticles(count: number): Particle[] {
  const rand = seeded(9);
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const roll = rand();
    const depth = 0.2 + rand() * 0.8;
    particles.push({
      x: rand(),
      y: rand(),
      depth,
      r: 0.6 + rand() * 1.7,
      hue: roll > 0.96 ? "ember" : roll > 0.92 ? "calm" : roll > 0.55 ? "halo" : "ink",
      phase: rand() * Math.PI * 2,
      speed: 0.3 + rand() * 0.7,
      drift: rand() * Math.PI * 2,
      glint: depth > 0.85 && rand() > 0.72,
    });
  }
  return particles;
}

function makeFireflies(count: number): Firefly[] {
  const rand = seeded(31);
  const flies: Firefly[] = [];
  for (let i = 0; i < count; i++) {
    const roll = rand();
    flies.push({
      cx: 0.08 + rand() * 0.84,
      cy: 0.25 + rand() * 0.62,
      ax: 40 + rand() * 90,
      ay: 26 + rand() * 60,
      fx: 0.05 + rand() * 0.05,
      fy: 0.04 + rand() * 0.05,
      phase: rand() * Math.PI * 2,
      hue: roll > 0.6 ? "ember" : roll > 0.3 ? "calm" : "halo",
      r: 1.4 + rand() * 1.2,
    });
  }
  return flies;
}

/** The three pools of aurora light and their slow paths. */
const AURORAS = [
  { rgb: "140,138,214", alpha: 0.16, rx: 0.52, ry: 0.4, cx: 0.74, cy: 0.16, dx: 0.1, dy: 0.06, fa: 0.021, fb: 0.017 },
  { rgb: "217,138,61", alpha: 0.05, rx: 0.4, ry: 0.32, cx: 0.12, cy: 0.86, dx: 0.07, dy: 0.05, fa: 0.014, fb: 0.019 },
  { rgb: "78,158,126", alpha: 0.045, rx: 0.36, ry: 0.3, cx: 0.32, cy: 0.3, dx: 0.09, dy: 0.07, fa: 0.011, fb: 0.015 },
] as const;

export function DuskField({ density = 110 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particles = makeParticles(density);
    const fireflies = makeFireflies(Math.max(4, Math.round(density / 16)));
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let scrollOffset = 0;
    let pointerX = 0.5;
    let pointerY = 0.4;
    let visible = true;
    let meteor: { x: number; y: number; vx: number; vy: number; life: number } | null = null;
    let nextMeteorAt = 12 + Math.random() * 16;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      const time = t / 1000;

      // ——— 1. aurora: vast, slow pools of light ———
      for (const a of AURORAS) {
        const cx = (a.cx + (reduced ? 0 : Math.sin(time * a.fa * Math.PI * 2) * a.dx)) * width;
        const cy = (a.cy + (reduced ? 0 : Math.cos(time * a.fb * Math.PI * 2) * a.dy)) * height;
        // the pool itself breathes a little
        const swell = reduced ? 1 : 1 + 0.12 * Math.sin(time * 0.05 * Math.PI * 2 + a.cx * 7);
        const radius = Math.max(width, height) * a.rx * swell;
        const pool = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        pool.addColorStop(0, `rgba(${a.rgb},${a.alpha})`);
        pool.addColorStop(0.55, `rgba(${a.rgb},${(a.alpha * 0.4).toFixed(3)})`);
        pool.addColorStop(1, `rgba(${a.rgb},0)`);
        ctx.fillStyle = pool;
        ctx.fillRect(0, 0, width, height);
      }

      // ——— 2. the horizon breath ———
      const breath = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(time * 0.09 * Math.PI * 2);
      const horizon = ctx.createLinearGradient(0, height * 0.82, 0, height);
      horizon.addColorStop(0, "rgba(217,138,61,0)");
      horizon.addColorStop(1, `rgba(217,138,61,${(0.035 + breath * 0.03).toFixed(3)})`);
      ctx.fillStyle = horizon;
      ctx.fillRect(0, height * 0.82, width, height * 0.18);

      // ——— 3. stars: positions this frame (needed twice: lines then dots) ———
      const pts: { px: number; py: number; p: Particle; alpha: number }[] = [];
      for (const p of particles) {
        const sway = reduced ? 0 : Math.sin(time * 0.08 * p.speed + p.drift) * 14 * p.depth;
        const rise = reduced ? 0 : ((time * 2.2 * p.speed * p.depth) % (height + 80));
        const px = p.x * width + sway + (pointerX - 0.5) * 22 * p.depth;
        let py =
          ((p.y * height - rise - scrollOffset * 0.12 * p.depth) % (height + 80)) +
          (pointerY - 0.5) * 14 * p.depth;
        if (py < -40) py += height + 80;
        const twinkle = reduced
          ? 0.7
          : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * p.speed + p.phase));
        pts.push({ px, py, p, alpha: twinkle * (0.25 + 0.55 * p.depth) });
      }

      // constellation lines between near, close particles — faint, calm
      ctx.lineWidth = 0.6;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]!;
        if (a.p.depth < 0.72) continue;
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j]!;
          if (b.p.depth < 0.72) continue;
          const dx = a.px - b.px;
          const dy = a.py - b.py;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < 110 * 110) {
            const fade = 1 - Math.sqrt(dist2) / 110;
            ctx.strokeStyle = `rgba(169,167,224,${(fade * 0.16).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.px, a.py);
            ctx.lineTo(b.px, b.py);
            ctx.stroke();
          }
        }
      }

      // ——— 5. the meteor, when the sky grants one ———
      if (!reduced) {
        if (!meteor && time > nextMeteorAt) {
          const fromLeft = Math.random() > 0.5;
          meteor = {
            x: fromLeft ? -30 : width * (0.55 + Math.random() * 0.4),
            y: height * (0.05 + Math.random() * 0.25),
            vx: (fromLeft ? 1 : 0.8) * (420 + Math.random() * 160),
            vy: 150 + Math.random() * 90,
            life: 1,
          };
          nextMeteorAt = time + 20 + Math.random() * 18;
        }
        if (meteor) {
          const dt = 1 / 60;
          meteor.x += meteor.vx * dt;
          // a hint of gravity so the streak arcs like a real one
          meteor.vy += 60 * dt;
          meteor.y += meteor.vy * dt;
          meteor.life -= dt / 1.3;
          if (meteor.life <= 0 || meteor.x > width + 60 || meteor.y > height + 60) {
            meteor = null;
          } else {
            const tail = 96 * meteor.life;
            const nx = meteor.vx / Math.hypot(meteor.vx, meteor.vy);
            const ny = meteor.vy / Math.hypot(meteor.vx, meteor.vy);
            const grad = ctx.createLinearGradient(
              meteor.x - nx * tail,
              meteor.y - ny * tail,
              meteor.x,
              meteor.y,
            );
            grad.addColorStop(0, "rgba(237,235,246,0)");
            grad.addColorStop(0.7, `rgba(169,167,224,${(0.3 * meteor.life).toFixed(3)})`);
            grad.addColorStop(1, `rgba(237,235,246,${(0.6 * meteor.life).toFixed(3)})`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(meteor.x - nx * tail, meteor.y - ny * tail);
            ctx.lineTo(meteor.x, meteor.y);
            ctx.stroke();
            // a bright head, briefly a star itself
            ctx.fillStyle = `rgba(254,252,249,${(0.8 * meteor.life).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(meteor.x, meteor.y, 1.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // ——— stars: dots with soft glow, glints on the brightest ———
      for (const { px, py, p, alpha } of pts) {
        const rgb = COLORS[p.hue];
        if (p.hue === "ember" || p.hue === "calm") {
          const glow = ctx.createRadialGradient(px, py, 0, px, py, p.r * 7);
          glow.addColorStop(0, `rgba(${rgb},${(alpha * 0.5).toFixed(3)})`);
          glow.addColorStop(1, `rgba(${rgb},0)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(px, py, p.r * 7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${rgb},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, p.r * (0.6 + 0.6 * p.depth), 0, Math.PI * 2);
        ctx.fill();
        // the four-point glint — only when the twinkle peaks
        if (p.glint && alpha > 0.62) {
          const len = p.r * (3.2 + 4.5 * (alpha - 0.62));
          ctx.strokeStyle = `rgba(${rgb},${((alpha - 0.62) * 1.1).toFixed(3)})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(px - len, py);
          ctx.lineTo(px + len, py);
          ctx.moveTo(px, py - len);
          ctx.lineTo(px, py + len);
          ctx.stroke();
        }
      }

      // ——— 4. fireflies: near, warm, wandering ———
      for (const f of fireflies) {
        const wx = reduced ? 0 : Math.sin(time * f.fx * Math.PI * 2 + f.phase) * f.ax;
        const wy = reduced ? 0 : Math.sin(time * f.fy * Math.PI * 2 + f.phase * 1.7) * f.ay;
        const fx = f.cx * width + wx + (pointerX - 0.5) * 30;
        const fy = f.cy * height + wy - scrollOffset * 0.16 + (pointerY - 0.5) * 18;
        if (fy < -30 || fy > height + 30) continue;
        const pulse = reduced ? 0.7 : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * 0.9 + f.phase * 3));
        const rgb = COLORS[f.hue];
        const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, f.r * 9);
        glow.addColorStop(0, `rgba(${rgb},${(pulse * 0.55).toFixed(3)})`);
        glow.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(fx, fy, f.r * 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${rgb},${(0.5 + pulse * 0.5).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(fx, fy, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (t: number) => {
      if (visible) draw(t);
      if (!reduced) raf = requestAnimationFrame(loop);
    };

    const onScroll = () => {
      scrollOffset = window.scrollY;
    };
    const onPointer = (e: PointerEvent) => {
      pointerX = e.clientX / window.innerWidth;
      pointerY = e.clientY / window.innerHeight;
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });

    resize();
    io.observe(canvas);
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    if (reduced) {
      draw(0);
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
