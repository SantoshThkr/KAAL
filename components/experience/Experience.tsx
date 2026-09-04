"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExperienceCanvas } from "./ExperienceCanvas";
import { AudioControl } from "../ui/AudioControl";
import { EngineeringMode } from "../ui/EngineeringMode";
import { ProgressIndicator } from "../ui/ProgressIndicator";
import { useExperienceStore } from "../../state/experienceStore";
import { AmbientAudio } from "../../lib/audio";

export function Experience() {
  const setProgress = useExperienceStore((state) => state.setProgress);
  const setReducedMotion = useExperienceStore((state) => state.setReducedMotion);
  const setEngineering = useExperienceStore((state) => state.setEngineering);
  const [audioOn, setAudioOn] = useState(false);
  const audio = useMemo(() => new AmbientAudio(), []);
  const audioRef = useRef(audio);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "e") setEngineering(!useExperienceStore.getState().engineering);
      const chapter = Number(event.key);
      if (chapter >= 1 && chapter <= 8) {
        window.scrollTo({ top: ((chapter - 1) / 7) * (document.body.scrollHeight - window.innerHeight), behavior: "smooth" });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, [setEngineering, setProgress, setReducedMotion]);

  const toggleAudio = async () => {
    const next = !audioOn;
    await audioRef.current.toggle(next);
    setAudioOn(next);
  };

  return (
    <main className="kaal-experience">
      <ExperienceCanvas />
      <div className="cinematic-copy">
        <span className="copy-eyebrow">KAAL / THE MANY FORMS OF KRISHNA</span>
        <h1>Witness becoming.</h1>
        <p>Scroll slowly. The child is already carrying the infinite.</p>
      </div>
      <div className="chapter-label">BAL KRISHNA <span>/</span> A LIVING STUDY</div>
      <ProgressIndicator />
      <AudioControl enabled={audioOn} onToggle={toggleAudio} />
      <button className="motion-control" type="button" onClick={() => setReducedMotion(!useExperienceStore.getState().reducedMotion)}>
        {useExperienceStore((state) => state.reducedMotion) ? "MOTION / REDUCED" : "MOTION / FULL"}
      </button>
      <EngineeringMode />
      <div className="scroll-spacer" />
    </main>
  );
}
