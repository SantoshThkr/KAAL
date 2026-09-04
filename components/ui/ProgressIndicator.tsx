"use client";

import { useExperienceStore } from "../../state/experienceStore";

export function ProgressIndicator() {
  const progress = useExperienceStore((state) => state.progress);
  return <div className="progress-indicator"><span style={{ height: `${progress * 100}%` }} /></div>;
}
