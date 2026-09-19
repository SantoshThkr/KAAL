"use client";

import { Plain } from "@/components/environment/Plain";
import { RiverBank } from "@/components/environment/RiverBank";
import { Sky } from "@/components/environment/Sky";
import { Yamuna } from "@/components/environment/Yamuna";
import { KrishnaActor } from "@/components/krishna/KrishnaActor";
import { STAGING } from "@/data/staging";
import { bankHeight } from "@/data/worldLayout";
import { useExperienceStore } from "@/state/experienceStore";

/**
 * Mounts the world the current scene happens in and puts its cast on their marks. A world stays mounted while
 * consecutive scenes share it (the Yamuna from the opening through the transformation), so there is no reload at a cut.
 */
export function SceneDirector() {
  const sceneId = useExperienceStore((state) => state.sceneId);
  const { world, cast } = STAGING[sceneId];
  if (!world) return null;
  const krishnas = cast.map((member) => member.actor);
  return (
    <>
      <Sky />
      {world === "yamuna" ? (
        <>
          <Yamuna />
          <RiverBank />
        </>
      ) : (
        <Plain />
      )}
      {cast.map((member) => (
        <KrishnaActor
          key={`${member.character}@${member.mark.position.join(",")}`}
          character={member.character}
          actor={member.actor}
          mark={member.mark}
          ground={world === "yamuna" ? bankHeight : flat}
          rivals={krishnas.filter((actor) => actor !== member.actor)}
        />
      ))}
    </>
  );
}

const flat = () => 0;
