"use client";

import { useEffect, useState } from "react";
import { KRISHNA_ASSETS } from "../../lib/assets";
import { useExperienceStore } from "../../state/experienceStore";
import { KrishnaCharacter } from "./KrishnaCharacter";

export function Krishna() {
  const [availability, setAvailability] = useState({ bal: false, kishore: false });
  const setAssetStatus = useExperienceStore((state) => state.setAssetStatus);

  useEffect(() => {
    let cancelled = false;
    Promise.all(Object.entries(KRISHNA_ASSETS).map(async ([key, path]) => {
      const response = await fetch(path, { method: "HEAD" });
      return [key, response.ok] as const;
    })).then((entries) => {
      if (cancelled) return;
      const next = Object.fromEntries(entries) as { bal: boolean; kishore: boolean };
      setAvailability(next);
      setAssetStatus(next.bal ? "available" : "missing");
    }).catch(() => {
      if (!cancelled) setAssetStatus("missing");
    });
    return () => { cancelled = true; };
  }, [setAssetStatus]);

  return <KrishnaCharacter balAvailable={availability.bal} kishoreAvailable={availability.kishore} />;
}
