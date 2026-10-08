"use client";

import { useEffect } from "react";
import { SCENE_KEYS } from "@/data/story";
import { nudge, replay, seekScene, stepScene, togglePause } from "@/lib/cinematicActions";
import { SECONDS_PER_PIXEL } from "@/lib/filmClock";
import { isEngineeringAllowed } from "@/lib/env";
import { film } from "@/state/film";
import { touchWater } from "@/lib/cinematicActions";
import { useExperienceStore } from "@/state/experienceStore";

/** Touch drags are shorter than wheel travel for the same intent. */
const TOUCH_GAIN = 1.4;
const ARROW_SECONDS = 5;

const isActive = () => {
  const { status } = useExperienceStore.getState();
  return status === "playing" || status === "ended";
};

/**
 * The ONE place viewer input becomes film time. Wheel, touch drag and keys all feed the same FilmClock; there is no
 * scroll listener in any other component and no scrollable page. Film time still runs by itself, so input only
 * pushes it forward, drags it back, or jumps it.
 *
 *   wheel / swipe / ← →   nudge film time; it settles back to normal playback
 *   Space                 pause / resume
 *   [ ] or PgUp PgDn      previous / next scene
 *   Home                  start over
 *   1-9, 0 (dev only)     jump to that chapter
 *   E (dev only)          engineering mode
 */
export function useCinematicTimeline() {
  useEffect(() => {
    let touchY: number | null = null;

    const onWheel = (event: WheelEvent) => {
      if (!isActive()) return;
      event.preventDefault();
      const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * window.innerHeight : event.deltaY;
      nudge(pixels * SECONDS_PER_PIXEL);
    };

    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY;
      if (touchY === null || y === undefined || !isActive()) return;
      event.preventDefault();
      nudge((touchY - y) * SECONDS_PER_PIXEL * TOUCH_GAIN);
      touchY = y;
    };
    const onTouchEnd = () => {
      touchY = null;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      const onControl = target !== null && target.closest("button, a, input, select, textarea") !== null;

      if (event.key === "e" || event.key === "E") {
        if (isEngineeringAllowed()) useExperienceStore.getState().toggleEngineering();
        return;
      }
      if (!isActive()) return;

      switch (event.key) {
        case " ":
          if (onControl) return;
          event.preventDefault();
          togglePause();
          return;
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          nudge(ARROW_SECONDS);
          return;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          nudge(-ARROW_SECONDS);
          return;
        case "]":
        case "PageDown":
          event.preventDefault();
          stepScene(1);
          return;
        case "[":
        case "PageUp":
          event.preventDefault();
          stepScene(-1);
          return;
        case "Home":
          event.preventDefault();
          replay();
          return;
        default: {
          const scene = SCENE_KEYS[event.key];
          if (scene && isEngineeringAllowed()) seekScene(scene);
        }
      }
    };

    // The pointer: Krishna's gaze follows it, and the camera drifts a little with it.
    const onPointerMove = (event: PointerEvent) => {
      film.pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
      film.pointerTarget.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    // A click touches the water where he is: rings spread, and the flute answers.
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("button, a")) return;
      touchWater();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
}
