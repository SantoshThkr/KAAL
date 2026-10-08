"use client";

import { useEffect, useState, type ReactNode } from "react";
import { KRISHNA_PARTS } from "@/art/krishnaArt";
import { WORLD_PARTS } from "@/art/worldArt";
import { loadArt } from "@/art/artTextures";
import { useExperienceStore } from "@/state/experienceStore";
import { useQuality } from "@/hooks/useQuality";

/**
 * The art is drawn in code and rasterised once, before anything is shown. Weaker devices get smaller textures.
 * Nothing inside renders until every drawing is ready, so no scene ever appears half-dressed.
 */
export function ArtGate({ children }: { children: ReactNode }) {
  const quality = useQuality();
  const [ready, setReady] = useState(false);
  const setArtReady = useExperienceStore((state) => state.setArtReady);

  useEffect(() => {
    let cancelled = false;
    const scale = quality.tier === "low" ? 0.5 : quality.tier === "medium" ? 0.72 : 1;
    void loadArt([...KRISHNA_PARTS, ...WORLD_PARTS], scale).then(() => {
      if (cancelled) return;
      setReady(true);
      setArtReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [quality.tier, setArtReady]);

  if (!ready) return null;
  return <>{children}</>;
}
