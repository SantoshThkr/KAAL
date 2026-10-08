"use client";

import { useEffect, useRef } from "react";
import { SHLOKA_BY_ID, scriptureLabel } from "@/data/shlokas";
import { clamp } from "@/lib/math";
import { subscribeUiTick } from "@/lib/uiTicker";
import { compiled, film } from "@/state/film";
import { useExperienceStore } from "@/state/experienceStore";

/**
 * The verses and the titles. Sanskrit is DOM text, not drawn in the canvas: the browser shapes Devanagari properly,
 * it stays crisp at any size, and a screen reader can read it.
 *
 * What is on screen is a pure function of film time, so scrubbing never leaves a half-faded line behind. Updates are
 * written straight to the DOM at 10 Hz; React renders this component once.
 */
const FADE = 1.1;

interface Line {
  text: string;
  /** 0..1 */
  opacity: number;
}

function sanskritAt(time: number): { lines: Line[]; meaning: string; meaningOpacity: number; reference: string; speaker: string } | null {
  for (const cue of compiled.cues) {
    if (cue.kind !== "shloka") continue;
    const scene = compiled.scenes[cue.sceneId === compiled.scenes[0].def.id ? 0 : compiled.scenes.findIndex((s) => s.def.id === cue.sceneId)];
    const start = scene.start;
    const shloka = SHLOKA_BY_ID[cue.cue.id];
    const from = start + (cue.cue.speakerAt ?? cue.cue.at);
    const end = start + cue.cue.end;
    if (time < from - 0.2 || time > end) continue;

    const lines: Line[] = shloka.sanskrit.map((text, index) => {
      const at = start + cue.cue.at + index * cue.cue.padaGap;
      const out = start + cue.cue.meaningAt;
      const appear = clamp((time - at) / FADE, 0, 1);
      const leave = 1 - clamp((time - out) / FADE, 0, 1);
      return { text, opacity: appear * leave };
    });
    const meaningStart = start + cue.cue.meaningAt + 0.3;
    const meaningOpacity = clamp((time - meaningStart) / FADE, 0, 1) * (1 - clamp((time - (end - FADE)) / FADE, 0, 1));
    const speakerOpacity = cue.cue.speakerAt !== undefined ? clamp((time - from) / FADE, 0, 1) * (1 - clamp((time - (start + cue.cue.at)) / FADE, 0, 1)) : 0;
    return {
      lines,
      meaning: shloka.meaningEnglish,
      meaningOpacity,
      reference: scriptureLabel(shloka),
      speaker: speakerOpacity > 0.05 ? (shloka.speaker ?? "") : ""
    };
  }
  return null;
}

function titleAt(time: number) {
  for (const cue of compiled.cues) {
    if (cue.kind !== "title") continue;
    const scene = compiled.scenes.find((s) => s.def.id === cue.sceneId);
    if (!scene) continue;
    const start = scene.start + cue.cue.at;
    const end = start + cue.cue.duration;
    if (time < start || time > end) continue;
    const appear = clamp((time - start) / 1.2, 0, 1);
    const leave = 1 - clamp((time - (end - 1.2)) / 1.2, 0, 1);
    return { text: cue.cue.text, style: cue.cue.style, opacity: appear * leave };
  }
  return null;
}

export function Captions() {
  const status = useExperienceStore((state) => state.status);
  const verse = useRef<HTMLDivElement>(null);
  const padas = useRef<(HTMLParagraphElement | null)[]>([]);
  const speaker = useRef<HTMLParagraphElement>(null);
  const meaning = useRef<HTMLParagraphElement>(null);
  const reference = useRef<HTMLParagraphElement>(null);
  const title = useRef<HTMLDivElement>(null);
  const titleText = useRef<HTMLParagraphElement>(null);
  const playing = status === "playing" || status === "ended";

  useEffect(() => {
    if (!playing) return;
    return subscribeUiTick(() => {
      const time = film.time;
      const shloka = sanskritAt(time);
      const block = verse.current;
      if (block) {
        block.style.opacity = shloka ? "1" : "0";
        if (shloka) {
          shloka.lines.forEach((line, index) => {
            const element = padas.current[index];
            if (!element) return;
            if (element.textContent !== line.text) element.textContent = line.text;
            element.style.opacity = line.opacity.toFixed(3);
            element.style.transform = `translateY(${((1 - line.opacity) * 0.35).toFixed(3)}em)`;
          });
          if (speaker.current) {
            speaker.current.textContent = shloka.speaker;
            speaker.current.style.opacity = shloka.speaker ? "1" : "0";
          }
          if (meaning.current) {
            if (meaning.current.textContent !== shloka.meaning) meaning.current.textContent = shloka.meaning;
            meaning.current.style.opacity = shloka.meaningOpacity.toFixed(3);
          }
          if (reference.current) {
            reference.current.textContent = shloka.reference;
            reference.current.style.opacity = (Math.max(...shloka.lines.map((line) => line.opacity), shloka.meaningOpacity) * 0.8).toFixed(3);
          }
        }
      }

      const card = titleAt(time);
      if (title.current && titleText.current) {
        title.current.style.opacity = card ? card.opacity.toFixed(3) : "0";
        title.current.dataset.style = card?.style ?? "title";
        if (card && titleText.current.textContent !== card.text) titleText.current.textContent = card.text;
      }
    });
  }, [playing]);

  if (!playing) return null;
  return (
    <>
      <div className="verse" ref={verse} aria-live="polite">
        <p className="verse-speaker" ref={speaker} />
        {[0, 1, 2, 3].map((index) => (
          <p
            className="verse-line"
            key={index}
            ref={(node) => {
              padas.current[index] = node;
            }}
          />
        ))}
        <p className="verse-meaning" ref={meaning} />
        <p className="verse-reference" ref={reference} />
      </div>
      <div className="title-card" ref={title} data-style="title">
        <p ref={titleText} />
      </div>
    </>
  );
}
