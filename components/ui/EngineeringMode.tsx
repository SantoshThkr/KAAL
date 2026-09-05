"use client";

import { useEffect, useRef, useState } from "react";
import { useExperienceStore } from "../../state/experienceStore";

export function EngineeringMode() {
  const visible = useExperienceStore((state) => state.engineering);
  const progress = useExperienceStore((state) => state.progress);
  const scene = useExperienceStore((state) => state.scene);
  const activeClip = useExperienceStore((state) => state.activeClip);
  const [fps, setFps] = useState(0);
  const last = useRef(performance.now());
  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      if (now - last.current > 500) {
        setFps(Math.round(1000 / ((now - last.current) / Math.max(1, frame))));
        last.current = now;
        frame = 0;
      }
      frame += 1;
      requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  if (!visible) return null;
  return <aside className="engineering-panel"><strong>KAAL / ENGINEERING</strong><span>FPS <b>{fps || "--"}</b></span><span>DRAW CALLS <b>WEBGL</b></span><span>TRIANGLES <b>WEBGL</b></span><span>ACTIVE PARTICLES <b>DISABLED</b></span><span>SCENE <b>{scene}</b></span><span>ANIMATION <b>{activeClip}</b></span><span>TIMELINE <b>{Math.round(progress * 100)}%</b></span><span>GPU EFFECTS <b>BLOOM / VIGNETTE</b></span></aside>;
}
