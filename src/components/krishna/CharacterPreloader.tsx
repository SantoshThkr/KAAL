"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { prepareCharacters } from "./characterRegistry";

/** Starts loading and rigging every Krishna model that exists, as soon as the renderer does. */
export function CharacterPreloader() {
  const gl = useThree((state) => state.gl);
  useEffect(() => prepareCharacters(gl), [gl]);
  return null;
}
