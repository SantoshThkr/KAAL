"use client";

import { useEffect, useRef } from "react";

type ParticleFieldProps = {
  progress: number;
  intensity: number;
  reducedMotion: boolean;
};

type Particle = { x: number; y: number; z: number; size: number; seed: number };

export function ParticleField({ progress, intensity, reducedMotion }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ progress, intensity, reducedMotion });

  useEffect(() => {
    stateRef.current = { progress, intensity, reducedMotion };
  }, [progress, intensity, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const particles: Particle[] = [];
    const density = Math.min(11500, Math.max(3000, Math.floor(window.innerWidth * window.innerHeight / 95)));
    for (let index = 0; index < density; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), 1.8);
      particles.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: Math.random(),
        size: Math.random() * 1.5 + 0.2,
        seed: Math.random() * 100
      });
    }

    let frame = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const render = (time: number) => {
      const { progress: scroll, intensity: strength, reducedMotion: calm } = stateRef.current;
      const width = window.innerWidth;
      const height = window.innerHeight;
      context.clearRect(0, 0, width, height);
      const breathing = calm ? 0 : Math.sin(time * 0.0002) * 0.008;
      particles.forEach((particle) => {
        const twinkle = 0.45 + Math.sin(time * 0.001 + particle.seed) * 0.35;
        const transformation = Math.max(0, Math.min(1, (scroll - 0.42) * 2.4));
        const orbit = transformation * (particle.seed % 2 ? 0.12 : -0.12);
        const x = particle.x * (1 + breathing) + Math.cos(time * 0.00015 + particle.seed) * orbit;
        const y = particle.y * (1 + breathing) + Math.sin(time * 0.0002 + particle.seed) * orbit;
        const scale = 0.85 + particle.z * 0.8 + transformation * 0.25;
        const px = width * 0.5 + x * width * 0.56;
        const py = height * 0.52 + y * height * 0.52;
        const alpha = Math.max(0, Math.min(0.8, twinkle * (0.25 + particle.z * 0.35) * strength));
        const warm = transformation > 0.35 && particle.seed % 3 === 0;
        context.fillStyle = warm ? `rgba(224, 175, 101, ${alpha})` : `rgba(152, 181, 209, ${alpha})`;
        context.beginPath();
        context.arc(px, py, particle.size * scale, 0, Math.PI * 2);
        context.fill();
      });
      frame = requestAnimationFrame(render);
    };
    resize();
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-field" aria-hidden="true" />;
}
