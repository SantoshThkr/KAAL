"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useExperienceStore } from "../../state/experienceStore";

type KrishnaAnimatorProps = { root: THREE.Object3D; animations: THREE.AnimationClip[] };
const CLIP_ALIASES: Record<string, string[]> = {
  idle: ["idle", "breathing", "rest"],
  flute: ["flute", "fluteplay", "music"],
  look: ["look", "lookaround", "gaze"],
  walk: ["walk", "gesture"]
};

function findClip(clips: THREE.AnimationClip[], requested: string) {
  const aliases = CLIP_ALIASES[requested] ?? [requested];
  return clips.find((clip) => aliases.some((alias) => clip.name.toLowerCase().includes(alias)));
}

export function KrishnaAnimator({ root, animations }: KrishnaAnimatorProps) {
  const mixer = useRef<THREE.AnimationMixer>();
  const active = useRef<THREE.AnimationAction>();
  const setActiveClip = useExperienceStore((state) => state.setActiveClip);
  const progress = useExperienceStore((state) => state.progress);

  useEffect(() => {
    mixer.current = new THREE.AnimationMixer(root);
    const initial = findClip(animations, "idle");
    if (initial) {
      active.current = mixer.current.clipAction(initial);
      active.current.play();
      setActiveClip(initial.name);
    } else {
      setActiveClip("rig loaded / no idle clip");
    }
    return () => {
      mixer.current?.stopAllAction();
      mixer.current?.uncacheRoot(root);
    };
  }, [animations, root, setActiveClip]);

  useEffect(() => {
    const requested = progress > 0.54 && progress < 0.72 ? "flute" : "idle";
    const clip = findClip(animations, requested);
    if (!clip || !mixer.current || active.current?.getClip().uuid === clip.uuid) return;
    const next = mixer.current.clipAction(clip);
    next.reset().fadeIn(0.8).play();
    active.current?.fadeOut(0.8);
    active.current = next;
    setActiveClip(clip.name);
  }, [animations, progress, setActiveClip]);

  useFrame((_, delta) => mixer.current?.update(delta));
  return null;
}
