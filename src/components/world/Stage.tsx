"use client";

import { Krishna } from "@/components/krishna/Krishna";
import { ArtGate } from "./ArtGate";
import { World } from "./World";

/** Everything the camera can see: Vrindavan, and the two Krishnas who grow through it. */
export function Stage() {
  return (
    <ArtGate>
      <World />
      <Krishna who="bal" />
      <Krishna who="kishore" />
    </ArtGate>
  );
}
