"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Group, Vector3 } from "three";
import { KRISHNA_PARTS } from "@/art/krishnaArt";
import { artTexture } from "@/art/artTextures";
import { film } from "@/state/film";
import { KrishnaAnimator, type KrishnaAction } from "./KrishnaAnimator";
import { BAL, KISHORE, buildPuppet, type Puppet } from "./puppet";

export type KrishnaWho = "bal" | "kishore";

/**
 * Krishna on screen: the drawings, assembled into a puppet, driven by the animator. Everything the story wants from
 * him arrives through `film.actors` (where he stands, what he is doing), which the master timeline writes each frame.
 *
 * The puppet owns live resources, so it is built and destroyed inside one effect: that stays correct under React's
 * StrictMode double-mount, which a useMemo would not.
 */
export function Krishna({ who }: { who: KrishnaWho }) {
  const holder = useRef<Group>(null);
  const puppet = useRef<Puppet | null>(null);
  const animator = useRef<KrishnaAnimator | null>(null);
  const tint = useRef(new Color());
  const lookTarget = useRef(new Vector3());

  useEffect(() => {
    const group = holder.current;
    if (!group) return;
    const textures = new Map(KRISHNA_PARTS.map((part) => [part.id, artTexture(part.id)!]));
    const built = buildPuppet(who === "bal" ? BAL : KISHORE, textures);
    group.add(built.root);
    puppet.current = built;
    animator.current = new KrishnaAnimator(built, who === "bal" ? "child" : "youth");
    return () => {
      built.dispose();
      puppet.current = null;
      animator.current = null;
    };
  }, [who]);

  useFrame(({ camera }, delta) => {
    const actor = film.actors[who];
    const group = holder.current;
    const body = puppet.current;
    const performer = animator.current;
    if (!group || !body || !performer) return;
    group.visible = actor.opacity > 0.01;
    if (!group.visible) return;

    group.position.set(actor.x, actor.y, actor.z);
    group.scale.setScalar(actor.scale);
    group.rotation.y = actor.facing;

    if (performer.action !== actor.action) performer.setAction(actor.action as KrishnaAction);

    // His eyes follow the viewer's pointer, placed a little in front of him; scenes can switch this off.
    const pointer = film.pointer;
    lookTarget.current.set(actor.x + pointer.x * 2.6, actor.y + body.proportions.height * 0.82 + pointer.y * 1.4, actor.z + 2.5);
    performer.update({
      dt: delta,
      lookAt: actor.lookAtPointer > 0.5 ? lookTarget.current : null,
      audio: film.audio.energy,
      camera
    });

    tint.current.setRGB(film.mood.tint.r, film.mood.tint.g, film.mood.tint.b);
    body.setTint(tint.current, actor.opacity);
  });

  return <group ref={holder} name={`krishna-${who}`} />;
}
