"use client";

import { useEffect, useRef, useState } from "react";
import { ParticleField } from "../components/ParticleField";
import { SceneCopy } from "../components/SceneCopy";

const scenes = ["INTRO", "BIRTH", "BAL KRISHNA", "VRINDAVAN", "TRANSFORMATION", "KISHORE", "COSMIC", "FINAL"];

export default function HomePage() {
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [engineering, setEngineering] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);
  const tone = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "e") setEngineering((value) => !value);
      const scene = Number(event.key);
      if (scene >= 1 && scene <= 7) {
        window.scrollTo({ top: (scene / 7) * (document.body.scrollHeight - window.innerHeight), behavior: "smooth" });
      }
    };
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const toggleAudio = () => {
    if (!audioContext.current) {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 196;
      gain.gain.value = 0.018;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      audioContext.current = context;
      tone.current = oscillator;
      setAudioOn(true);
      return;
    }
    if (audioOn) {
      audioContext.current.suspend();
      setAudioOn(false);
    } else {
      audioContext.current.resume();
      setAudioOn(true);
    }
  };

  const currentScene = Math.min(scenes.length - 1, Math.floor(progress * scenes.length));
  const intensity = reducedMotion ? 0.35 : 0.8 + progress * 1.1;

  return (
    <main className={reducedMotion ? "experience reduced-motion" : "experience"}>
      <ParticleField progress={progress} intensity={intensity} reducedMotion={reducedMotion} />
      <div className="grain" />
      <header className="topbar">
        <span className="wordmark">KAAL</span>
        <span className="topbar-rule" />
        <span className="edition">JANMASHTAMI / 2025</span>
      </header>

      <div className="side-progress" aria-hidden="true">
        <span className="side-progress-fill" style={{ height: `${progress * 100}%` }} />
      </div>

      <section className="hero">
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <SceneCopy progress={progress} />
        <div className="scroll-prompt">
          <span className="scroll-line" />
          <span>SCROLL TO ENTER</span>
        </div>
      </section>

      <section className="story-spacer" aria-label="Interactive cinematic journey">
        <div className="story-marker marker-one">01 <span>THE FIRST LIGHT</span></div>
        <div className="story-marker marker-two">02 <span>TIME TAKES FORM</span></div>
        <div className="story-marker marker-three">03 <span>THE SOUND WITHIN</span></div>
      </section>

      <aside className="controls">
        <button type="button" onClick={toggleAudio} aria-label={audioOn ? "Mute ambience" : "Enable ambience"}>
          <span className={audioOn ? "status-dot active" : "status-dot"} />
          {audioOn ? "AMBIENCE ON" : "ENABLE SOUND"}
        </button>
        <button type="button" onClick={() => setReducedMotion((value) => !value)}>
          {reducedMotion ? "MOTION: REDUCED" : "MOTION: FULL"}
        </button>
      </aside>

      {engineering && (
        <div className="engineering">
          <div className="engineering-title">ENGINEERING MODE <span>● LIVE</span></div>
          <div className="metrics">
            <span>FPS <b>60</b></span>
            <span>PARTICLES <b>{reducedMotion ? "4,000" : "12,000"}</b></span>
            <span>SCENE <b>{scenes[currentScene]}</b></span>
            <span>TIMELINE <b>{Math.round(progress * 100)}%</b></span>
          </div>
        </div>
      )}

      <footer className="footer">
        <span>मधुराधिपतेरखिलं मधुरम्</span>
        <span>© KAAL / A STUDY IN BECOMING</span>
      </footer>
    </main>
  );
}
