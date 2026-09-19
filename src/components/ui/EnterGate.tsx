"use client";

import { useEffect, useRef } from "react";
import { enterExperience } from "@/lib/cinematicActions";
import { useExperienceStore } from "@/state/experienceStore";

/**
 * Before the film: a black screen and one small control. No hero, no logo, no copy beyond what a cinema needs to say.
 * The click is what lets the browser start audio, so it is also what starts the film.
 */
export function EnterGate() {
  const status = useExperienceStore((state) => state.status);
  const button = useRef<HTMLButtonElement>(null);
  const open = status === "booting" || status === "ready" || status === "unsupported";

  useEffect(() => {
    if (status === "ready") button.current?.focus({ preventScroll: true });
  }, [status]);

  return (
    <div className="gate" data-open={open} data-booting={status === "booting"} inert={!open}>
      {status === "unsupported" ? (
        <p className="gate-note">This film needs a browser with WebGL 2.</p>
      ) : (
        <>
          <button ref={button} type="button" className="enter" disabled={status !== "ready"} onClick={enterExperience}>
            ENTER EXPERIENCE
          </button>
          <p className="gate-note">Sound recommended</p>
        </>
      )}
    </div>
  );
}
