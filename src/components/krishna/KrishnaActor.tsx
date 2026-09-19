"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { ActorId } from "@/data/cinematicTimeline";
import type { CharacterId } from "@/data/characters";
import { actorBeatAt, actorTravelAt } from "@/lib/timelineBuilder";
import { clock, compiled, film } from "@/state/film";
import { useExperienceStore } from "@/state/experienceStore";
import { getCharacter } from "./characterRegistry";
import { createPerformer, type Performer } from "./KrishnaPerformer";

interface KrishnaActorProps {
  character: CharacterId;
  /** Which actor's beats in the timeline this performer follows. */
  actor: ActorId;
  mark: { position: readonly [number, number, number]; facing: number };
  /** Ground height, so a walking Krishna stays on the bank. */
  ground: (x: number, z: number) => number;
  /** Other Krishnas on the same mark (the transformation): whoever has the more recent beat is the one we see. */
  rivals?: ActorId[];
}

/**
 * Puts one Krishna on his mark and keeps him performing: each frame the timeline says which beat he is in (found by
 * film time, so seeks land correctly), and the performer plays it. Renders nothing until the model has loaded.
 */
export function KrishnaActor({ character, actor, mark, ground, rivals = [] }: KrishnaActorProps) {
  const state = useExperienceStore((store) => store.characters[character]);
  const loaded = state === "ready" ? getCharacter(character) : null;
  const performerRef = useRef<Performer | null>(null);
  const beatKey = useRef<number | null>(null);
  const cut = useRef(-1);
  const label = useRef("");

  // The performer owns live resources (a mixer, the bansuri in the scene), so it is created and disposed together
  // in one effect. That keeps it correct under React's StrictMode double-mount, which a useMemo would not.
  useEffect(() => {
    if (!loaded) return;
    const performer = createPerformer(loaded);
    performerRef.current = performer;
    beatKey.current = null;
    return () => {
      performer.dispose();
      if (performerRef.current === performer) performerRef.current = null;
    };
  }, [loaded]);

  useFrame(({ camera }, delta) => {
    const performer = performerRef.current;
    if (!performer) return;
    const beat = actorBeatAt(compiled, actor, film.time);
    const key = beat ? beat.at : -1;
    const snapped = cut.current !== film.cutId && Math.abs(clock.time - clock.prevTime) > 0.5;
    if (key !== beatKey.current || snapped) {
      performer.setIntent(beat?.action ?? null, snapped || beatKey.current === null);
      beatKey.current = key;
    }
    cut.current = film.cutId;

    // On his mark, plus however far he has walked by now (a function of film time, so it scrubs).
    const root = performer.character.root;
    // Only a fully rigged Krishna can walk; a posed sculpt stays on his mark whatever the beat says.
    const travel = performer.character.rig.kind === "tpose" ? actorTravelAt(compiled, actor, film.time) : 0;
    const x = mark.position[0] + Math.sin(mark.facing) * travel;
    const z = mark.position[2] + Math.cos(mark.facing) * travel;
    root.position.set(x, ground(x, z), z);
    root.rotation.y = mark.facing;
    // During the transformation both Krishnas share a mark: show whichever one the timeline reached last.
    const mine = beat ? beat.at : -Infinity;
    root.visible = rivals.every((rival) => (actorBeatAt(compiled, rival, film.time)?.at ?? -Infinity) <= mine);
    // Krishna keeps his own time: he moves even while the world is frozen, and stops only when the film is paused.
    performer.update(clock.paused ? 0 : Math.min(delta, 0.1), film.time, camera);
    if (performer.label !== label.current) {
      label.current = performer.label;
      useExperienceStore.getState().setActiveClip(`${character}: ${performer.label}`);
    }
  });

  if (!loaded) return null;
  return <primitive object={loaded.root} />;
}
