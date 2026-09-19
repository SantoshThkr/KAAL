"use client";

import { useEffect, useRef } from "react";
import { SHLOKAS } from "@/data/shlokas";
import { audioManager } from "@/components/audio/AudioManager";
import { debugCounters } from "@/lib/debugCounters";
import { formatTime } from "@/lib/math";
import { subscribeUiTick } from "@/lib/uiTicker";
import { clock, compiled, film } from "@/state/film";
import { useExperienceStore } from "@/state/experienceStore";

const ROWS = [
  ["fps", "FPS"],
  ["calls", "DRAW CALLS"],
  ["geometry", "TRIANGLES"],
  ["particles", "ACTIVE PARTICLES"],
  ["scene", "SCENE"],
  ["shot", "CAMERA SHOT"],
  ["clip", "ANIMATION"],
  ["time", "TIMELINE"],
  ["world", "WORLD"],
  ["audio", "AUDIO"],
  ["quality", "QUALITY"],
  ["assets", "KRISHNA ASSETS"],
  ["shlokas", "SHLOKAS"],
  ["cue", "LAST CUE"],
  ["renders", "REACT COMMITS"]
] as const;
type RowKey = (typeof ROWS)[number][0];

const shlokaSummary = () => {
  const signedOff = SHLOKAS.filter((shloka) => shloka.verification.supersiteSignOff !== null).length;
  const draft = SHLOKAS.filter((shloka) => shloka.meaningReview === "draft").length;
  return `${SHLOKAS.length} corpus-checked · ${signedOff} Supersite-signed · ${draft} meanings draft`;
};

/**
 * Press E. Every number is measured, none is decorative: FPS from frame deltas, draw calls and triangles from
 * renderer.info across every pass, audio from the live analyser. Values are written straight to DOM nodes at 10 Hz,
 * so the panel itself causes no React work while the film plays.
 */
export function EngineeringPanel() {
  const visible = useExperienceStore((state) => state.engineering);
  const cells = useRef<Partial<Record<RowKey, HTMLElement | null>>>({});

  useEffect(() => {
    if (!visible) return;
    return subscribeUiTick(() => {
      const store = useExperienceStore.getState();
      const { stats, world, audio } = film;
      const scene = compiled.scenes[film.sceneIndex];
      const shot = compiled.shots[film.shotIndex];
      const values: Record<RowKey, string> = {
        fps: `${stats.fps.toFixed(0)} fps · ${stats.frameMs.toFixed(1)} ms`,
        calls: `${stats.calls} (all passes)`,
        geometry: `${stats.triangles.toLocaleString()} · geo ${stats.geometries} · tex ${stats.textures}`,
        particles: stats.particles === 0 ? "0 (none registered yet)" : stats.particles.toLocaleString(),
        scene: `${scene.def.id} · ${scene.index + 1}/${compiled.scenes.length}`,
        shot: `${shot.def.id} (${shot.def.kind})${shot.authored ? "" : " · UNAUTHORED"}`,
        clip: store.activeClip,
        time: `${formatTime(film.time)} / ${formatTime(clock.duration)} · ${(film.progress * 100).toFixed(1)}% · ${film.rate.toFixed(2)}x${clock.paused ? " · PAUSED" : ""}`,
        world: `time x${world.timeScale.toFixed(2)} · muffle ${world.muffle.toFixed(2)} · wind ${world.wind.toFixed(2)}`,
        audio: `${audioManager.status} · energy ${audio.energy.toFixed(2)} · L ${audio.low.toFixed(2)} M ${audio.mid.toFixed(2)} H ${audio.high.toFixed(2)}`,
        quality: `${store.quality}${store.qualityLocked ? " (pinned)" : ""} · pixel ratio ${stats.pixelRatio.toFixed(2)}`,
        assets: `kishore ${store.characters.kishore.toUpperCase()} · bal ${store.characters.bal.toUpperCase()}`,
        shlokas: shlokaSummary(),
        cue: store.lastCue,
        renders: `dom ${debugCounters.domCommits} · canvas ${debugCounters.canvasCommits} · store writes ${debugCounters.storeWrites}`
      };
      for (const [key] of ROWS) {
        const cell = cells.current[key];
        if (cell && cell.textContent !== values[key]) cell.textContent = values[key];
      }
    });
  }, [visible]);

  if (!visible) return null;
  return (
    <aside className="engineering" aria-label="Engineering readout">
      <dl>
        {ROWS.map(([key, label]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd
              ref={(node) => {
                cells.current[key] = node;
              }}
            />
          </div>
        ))}
      </dl>
    </aside>
  );
}
