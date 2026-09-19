import { audioManager } from "@/components/audio/AudioManager";
import { SceneAudio } from "@/components/audio/SceneAudio";
import { planAudio } from "@/lib/audioPlan";
import { FilmClock } from "@/lib/filmClock";
import { CueBus, CueScheduler } from "@/lib/cueScheduler";
import { createFilmState } from "@/lib/filmState";
import { compileFilm } from "@/lib/timelineBuilder";

/**
 * Process-wide singletons for the one film this page plays. Client-only: nothing in here touches the DOM at import
 * time, so importing it on the server is harmless, but only the CinematicController ever advances it.
 */
export const compiled = compileFilm();
export const film = createFilmState();
export const clock = new FilmClock(compiled.duration);
export const cues = new CueScheduler(compiled.cues);
export const cueBus = new CueBus();
export const sceneAudio = new SceneAudio(audioManager, planAudio(compiled));
