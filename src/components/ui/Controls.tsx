"use client";

import { useEffect, useRef } from "react";
import { replay, skip } from "@/lib/cinematicActions";
import { subscribeUiTick } from "@/lib/uiTicker";
import { compiled, film } from "@/state/film";
import { useExperienceStore } from "@/state/experienceStore";

/**
 * The only chrome: sound, motion, skip, a hairline of progress and a small chapter label. It appears when the pointer
 * moves and leaves when it rests, so during the film there is nothing on screen but the film.
 */
export function Controls({ visible }: { visible: boolean }) {
  const status = useExperienceStore((state) => state.status);
  const sceneId = useExperienceStore((state) => state.sceneId);
  const soundOn = useExperienceStore((state) => state.soundOn);
  const audioStatus = useExperienceStore((state) => state.audioStatus);
  const reducedMotion = useExperienceStore((state) => state.reducedMotion);
  const setSound = useExperienceStore((state) => state.setSound);
  const setReducedMotion = useExperienceStore((state) => state.setReducedMotion);
  const bar = useRef<HTMLElement>(null);
  const shown = status === "playing" || status === "ended";

  useEffect(() => {
    if (!shown) return;
    return subscribeUiTick(() => {
      bar.current?.style.setProperty("transform", `scaleX(${film.progress.toFixed(4)})`);
    });
  }, [shown]);

  if (!shown) return null;
  const title = compiled.scenes.find((scene) => scene.def.id === sceneId)?.def.title ?? "";
  const soundUnavailable = audioStatus === "unsupported";

  return (
    <div className="controls" data-visible={visible}>
      <p className="chapter">{title}</p>
      <div className="controls-left">
        <button type="button" className="control" aria-pressed={soundOn && !soundUnavailable} disabled={soundUnavailable} onClick={() => setSound(!soundOn)}>
          {soundUnavailable ? "SOUND UNAVAILABLE" : soundOn ? "SOUND ON" : "SOUND OFF"}
        </button>
        <button type="button" className="control" aria-pressed={reducedMotion} onClick={() => setReducedMotion(!reducedMotion)}>
          {reducedMotion ? "MOTION REDUCED" : "MOTION FULL"}
        </button>
      </div>
      <div className="controls-right">
        {status === "ended" ? (
          <button type="button" className="control" onClick={replay}>
            WATCH AGAIN
          </button>
        ) : (
          <button type="button" className="control" onClick={skip}>
            SKIP
          </button>
        )}
      </div>
      <div className="hairline" aria-hidden>
        <i ref={bar} />
      </div>
    </div>
  );
}
