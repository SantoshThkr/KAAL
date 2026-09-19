"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
import { DEG2RAD, damp } from "@/lib/math";
import type { CameraState } from "@/lib/filmState";
import { film } from "@/state/film";
import { useExperienceStore } from "@/state/experienceStore";

/** 1/seconds. About a twentieth of a second of lag: enough to soften scrub jerks, invisible in normal playback. */
const FOLLOW = 20;

const FIELDS: readonly (keyof CameraState)[] = ["px", "py", "pz", "tx", "ty", "tz", "focal", "roll", "shake"];

/**
 * Turns the film's camera state into a physical camera: position, aim, roll, focal length, plus handheld shake.
 * Hard cuts (film.cutId) snap; everything else eases, so the camera never pops mid-move.
 */
export function CameraRig() {
  const camera = useThree((state) => state.camera);
  const aim = useMemo(() => new Vector3(), []);
  const smooth = useRef<CameraState>({ ...film.cam });
  const lastCut = useRef(film.cutId);

  useFrame((_, delta) => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const dt = Math.min(delta, 0.1);
    const target = film.cam;
    const state = smooth.current;

    if (lastCut.current !== film.cutId) {
      Object.assign(state, target);
      lastCut.current = film.cutId;
    } else {
      for (const field of FIELDS) state[field] = damp(state[field], target[field], FOLLOW, dt);
    }

    // Handheld: slow incommensurate sines, never random jitter. Off entirely under reduced motion.
    const shake = useExperienceStore.getState().reducedMotion ? 0 : state.shake;
    const t = film.wallTime;
    const sx = shake * (Math.sin(t * 1.3) * 0.7 + Math.sin(t * 3.1 + 1.7) * 0.3) * 0.02;
    const sy = shake * (Math.sin(t * 1.9 + 0.6) * 0.7 + Math.sin(t * 4.3) * 0.3) * 0.02;
    const roll = state.roll + shake * Math.sin(t * 0.9 + 0.4) * 0.35;

    camera.position.set(state.px + sx, state.py + sy, state.pz);
    aim.set(state.tx + sx * 0.6, state.ty + sy * 0.6, state.tz);
    camera.lookAt(aim);
    if (roll !== 0) camera.rotateZ(roll * DEG2RAD);
    if (Math.abs(camera.getFocalLength() - state.focal) > 0.01) camera.setFocalLength(state.focal);
  }, -60);

  return null;
}
