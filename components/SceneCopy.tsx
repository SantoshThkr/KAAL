"use client";

import { useMemo } from "react";

export function SceneCopy({ progress }: { progress: number }) {
  const copy = useMemo(() => {
    if (progress < 0.12) return { eyebrow: "A STUDY IN BECOMING", title: "KAAL", body: "Before the first note, there is only silence." };
    if (progress < 0.28) return { eyebrow: "THE HOUR BEFORE DAWN", title: "MIDNIGHT", body: "In the dark, something divine takes its first breath." };
    if (progress < 0.48) return { eyebrow: "BAL KRISHNA", title: "THE BEGINNING", body: "Every eternity begins as a single, curious gaze." };
    if (progress < 0.68) return { eyebrow: "THE FLUTE REMEMBERS", title: "BECOMING", body: "The body is only one way for a story to move through time." };
    if (progress < 0.84) return { eyebrow: "KISHORE KRISHNA", title: "THE NOTE", body: "When music becomes physical, the world leans closer." };
    return { eyebrow: "THE MANY FORMS", title: "WHO AM I?", body: "रूप बदलते रहे। प्रश्न वही रहा।" };
  }, [progress]);

  return (
    <div className="scene-copy">
      <span className="eyebrow">{copy.eyebrow}</span>
      <h1>{copy.title}</h1>
      <p>{copy.body}</p>
      <div className="chapter-index">
        <span>0{Math.min(7, Math.floor(progress * 7) + 1)}</span>
        <span className="chapter-rule" />
        <span>07</span>
      </div>
    </div>
  );
}
