import type { WebGLRenderer } from "three";
import { CHARACTERS, type CharacterId } from "@/data/characters";
import { probeAsset } from "@/lib/assetLoader";
import { useExperienceStore } from "@/state/experienceStore";
import { loadCharacter, type LoadedCharacter } from "./characterLoader";

const loaded = new Map<CharacterId, LoadedCharacter>();

export const getCharacter = (id: CharacterId) => loaded.get(id) ?? null;
export const loadedCharacters = () => [...loaded.values()];

let started = false;

/**
 * Find which Krishna models exist, then load and rig them while the entrance is on screen, so nothing hitches once
 * the film is playing. The film only becomes enterable when every character has either loaded or is known missing.
 */
export function prepareCharacters(renderer: WebGLRenderer) {
  if (started) return;
  started = true;
  const store = useExperienceStore.getState();
  for (const id of Object.keys(CHARACTERS) as CharacterId[]) {
    void probeAsset(CHARACTERS[id].url).then(async (present) => {
      if (!present) {
        store.setCharacter(id, "missing");
        return;
      }
      store.setCharacter(id, "loading");
      try {
        loaded.set(id, await loadCharacter(id, renderer));
        store.setCharacter(id, "ready");
      } catch (error) {
        console.error(`KAAL: could not load ${id}`, error);
        store.setCharacter(id, "error");
      }
    });
  }
}
