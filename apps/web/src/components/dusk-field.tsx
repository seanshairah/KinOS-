"use client";

import { useEffect, useRef } from "react";

/**
 * DuskField — a living night sky on canvas. Depth-layered particles drift
 * and breathe, respond gently to scroll (parallax) and pointer, and near
 * the centre they form faint constellation lines — the family, quietly
 * connected. Hand-rolled 2D canvas: a few KB, no WebGL library, honours
 * prefers-reduced-motion by rendering a single still frame.
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
}

const COLORS: Record<Particle["hue"], string> = {
  halo: "169,167,224",
  ink: "237,235,246",
  ember: "217,138,61",
  calm: "78,158,126",
};

function makeParticles(count: number): Particle[] {
  const particles: Particle[] = [];
  // Deterministic-ish scatter, no dependency on Math.random ordering per render.
  let seed = 9;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < count; i++) {
    const roll = rand();
    particles.push({
      x: rand(),
      y: rand(),
      depth: 0.2 + rand() * 0.8,
      r: 0.6 + rand() * 1.7,
      hue: roll > 0.96 ? "ember" : roll > 0.92 ? "calm" : roll > 0.55 ? "halo" : "ink",
      phase: rand() * Math.PI * 2,
      speed: 0.3 + rand() * 0.7,
      drift: rand() * Math.PI * 2,
    });
  }
  return particles;
}

export function DuskField({ density = 110 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particles = makeParticles(density);
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let scrollOffset = 0;
    let pointerX = 0.5;
    let pointerY = 0.4;
    let visible = true;
    // A rare meteor — catching one should feel like luck.
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

      // positions this frame (needed twice: lines then dots)
      const pts: { px: number; py: number; p: Particle; alpha: number }[] = [];
      for (const p of particles) {
        const sway = reduced ? 0 : Math.sin(time * 0.08 * p.speed + p.drift) * 14 * p.depth;
        const rise = reduced ? 0 : ((time * 2.2 * p.speed * p.depth) % (height + 80));
        const px =
          p.x * width +
          sway +
          (pointerX - 0.5) * 22 * p.depth;
        let py =
          ((p.y * height - rise - scrollOffset * 0.12 * p.depth) % (height + 80)) +
          (pointerY - 0.5) * 14 * p.depth;
        if (py < -40) py += height + 80;
        const twinkle = reduced ? 0.7 : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(time * p.speed + p.phase));
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

      // the meteor, when the sky grants one
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
          meteor.y += meteor.vy * dt;
          meteor.life -= dt / 1.3;
          if (meteor.life <= 0 || meteor.x > width + 60 || meteor.y > height + 60) {
            meteor = null;
          } else {
            const tail = 90 * meteor.life;
            const nx = meteor.vx / Math.hypot(meteor.vx, meteor.vy);
            const ny = meteor.vy / Math.hypot(meteor.vx, meteor.vy);
            const grad = ctx.createLinearGradient(
              meteor.x - nx * tail,
              meteor.y - ny * tail,
              meteor.x,
              meteor.y,
            );
            grad.addColorStop(0, "rgba(237,235,246,0)");
            grad.addColorStop(1, `rgba(237,235,246,${(0.55 * meteor.life).toFixed(3)})`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(meteor.x - nx * tail, meteor.y - ny * tail);
            ctx.lineTo(meteor.x, meteor.y);
            ctx.stroke();
          }
        }
      }

      // dots with soft glow
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
