"use client";

import dynamic from "next/dynamic";
import { Profiler, useEffect, useState, useSyncExternalStore } from "react";
import { audioManager } from "@/components/audio/AudioManager";
import { Captions } from "@/components/story/Captions";
import { Controls } from "@/components/ui/Controls";
import { EngineeringPanel } from "@/components/ui/EngineeringPanel";
import { EnterGate } from "@/components/ui/EnterGate";
import { useCinematicTimeline } from "@/hooks/useCinematicTimeline";
import { debugCounters } from "@/lib/debugCounters";
import { isEngineeringAllowed } from "@/lib/env";
import { detectTier, tierFromQuery } from "@/lib/quality";
import { probeWebGL, type WebGLCaps } from "@/lib/webgl";
import { clock, compiled, film, sceneAudio } from "@/state/film";
import { ripple } from "@/components/world/World";
import { useExperienceStore } from "@/state/experienceStore";

// The Canvas never renders on the server.
const ExperienceCanvas = dynamic(() => import("./ExperienceCanvas").then((module) => module.ExperienceCanvas), { ssr: false });

/** How long a resting pointer keeps the controls on screen. */
const CONTROLS_IDLE_MS = 3200;

// The device probe reads the browser, so it cannot run on the server. useSyncExternalStore is the hydration-safe way
// to read such a value: the server (and the first client render) see null, then React re-renders with the probe.
let cachedCaps: WebGLCaps | undefined;
const readCaps = () => (cachedCaps ??= probeWebGL());
const subscribeNever = () => () => {};
const serverCaps = () => null;

function useIdle(milliseconds: number) {
  const [idle, setIdle] = useState(true);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let resting = true;
    const wake = () => {
      if (resting) {
        resting = false;
        setIdle(false);
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        resting = true;
        setIdle(true);
      }, milliseconds);
    };
    const events = ["pointermove", "pointerdown", "keydown", "touchstart"] as const;
    for (const name of events) window.addEventListener(name, wake, { passive: true });
    return () => {
      clearTimeout(timer);
      for (const name of events) window.removeEventListener(name, wake);
    };
  }, [milliseconds]);
  return idle;
}

/**
 * The shell. It owns nothing cinematic: it probes the device, mounts the canvas, wires sound and motion preferences
 * to the store, and puts the (almost invisible) chrome around the film. The film itself is the CinematicController.
 */
export function Experience() {
  const status = useExperienceStore((state) => state.status);
  const soundOn = useExperienceStore((state) => state.soundOn);
  const caps = useSyncExternalStore(subscribeNever, readCaps, serverCaps);
  const idle = useIdle(CONTROLS_IDLE_MS);

  useCinematicTimeline();

  // Device probe, quality tier and reduced-motion preference. Runs once, on the client.
  useEffect(() => {
    const store = useExperienceStore.getState();
    const probe = readCaps();
    const pinned = tierFromQuery(window.location.search);
    store.setQuality(pinned ?? detectTier(probe), pinned !== null);
    if (!probe.supported) store.setStatus("unsupported");

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    store.setReducedMotion(media.matches);
    const onChange = (event: MediaQueryListEvent) => useExperienceStore.getState().setReducedMotion(event.matches);
    media.addEventListener("change", onChange);

    const unsubscribeAudio = audioManager.subscribe((audioStatus) => useExperienceStore.getState().setAudioStatus(audioStatus));
    const unsubscribeStore = useExperienceStore.subscribe(() => {
      debugCounters.storeWrites += 1;
    });
    return () => {
      media.removeEventListener("change", onChange);
      unsubscribeAudio();
      unsubscribeStore();
    };
  }, []);

  // Sound on/off is the master mute; the AudioContext itself only exists after ENTER.
  useEffect(() => {
    audioManager.setMuted(!soundOn);
  }, [soundOn]);

  // Handle for scripted verification and QA. Present only where engineering tools are (dev, or a build opened with
  // ?engineering); a normal viewer of a production build never has it.
  useEffect(() => {
    if (!isEngineeringAllowed()) return;
    (window as unknown as { __KAAL__?: unknown }).__KAAL__ = { film, clock, compiled, ripple, store: useExperienceStore, audio: audioManager, sceneAudio, debugCounters };
  }, []);

  const playing = status === "playing" || status === "ended";
  return (
    <Profiler id="dom" onRender={() => (debugCounters.domCommits += 1)}>
      <main className="stage" data-status={status} data-idle={playing && idle} tabIndex={-1}>
        <h1 className="sr-only">KAAL: The Many Forms of Krishna</h1>
        <p className="sr-only">An animated film about Krishna, played in the browser. Sound is recommended.</p>
        {caps?.supported ? <ExperienceCanvas floatTargets={caps.floatTargets} /> : null}
        <Captions />
        <EnterGate />
        <Controls visible={!idle} />
        <EngineeringPanel />
      </main>
    </Profiler>
  );
}
