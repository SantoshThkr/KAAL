# Audio: sources and licences

Every sound in `flute/` and `ambience/` is cut from a real recording on Wikimedia Commons. Edits: trimmed, faded, high-passed,
a gentle downward expander to lower tape hiss, seamless loops made by crossfading tail into head, level-normalised, encoded to AAC.
Reverb is added live in the browser (a generated riverbank impulse response), not baked in.

## flute/first-note, flute/final-note, flute/bal-motif, flute/kishore-theme

- Source: [Bansuri sample E bass.ogg](https://commons.wikimedia.org/wiki/File:Bansuri_sample_E_bass.ogg)
- Author: own work
- Licence: Public domain

## flute/call-hint

- Source: [Carnatic flute.ogg](https://commons.wikimedia.org/wiki/File:Carnatic_flute.ogg)
- Author: Bansuri.arvind
- Licence: CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0)

## ambience/yamuna-night (crickets layer)

- Source: [Night original format.wav](https://commons.wikimedia.org/wiki/File:Night_original_format.wav)
- Author: Fortunamarco2003
- Licence: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0)

## ambience/yamuna-night (water layer, filtered)

- Source: [433589 jackthemurray stream-river-water-up-close.wav](https://commons.wikimedia.org/wiki/File:433589_jackthemurray_stream-river-water-up-close.wav)
- Author: jackthemurray
- Licence: CC0 (http://creativecommons.org/publicdomain/zero/1.0/deed.en)

## ambience/vrindavan-dawn

- Source: [Gentle breeze and birds singing.ogg](https://commons.wikimedia.org/wiki/File:Gentle_breeze_and_birds_singing.ogg)
- Author: ezwa
- Licence: Public domain

## ambience/storm-rain

- Source: [Light Rain Distant Thunder July 5th 2016.wav](https://commons.wikimedia.org/wiki/File:Light_Rain_Distant_Thunder_July_5th_2016.wav)
- Author: https://freesound.org/people/kvgarlic/
- Licence: CC0 (http://creativecommons.org/publicdomain/zero/1.0/deed.en)

## ambience/night-crickets

- Source: [Ringing cricket winding down.ogg](https://commons.wikimedia.org/wiki/File:Ringing_cricket_winding_down.ogg)
- Author: Jidanni
- Licence: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0)

## ambience/wind-harsh

- Source: [20090610 0 ambience.ogg](https://commons.wikimedia.org/wiki/File:20090610_0_ambience.ogg)
- Author: nille
- Licence: Public domain

Share-alike: `flute/call-hint` (CC BY-SA 3.0) and the crickets in `ambience/yamuna-night` and `ambience/night-crickets` (CC BY-SA 4.0) are
adaptations and are shared under the same licences.

Placeholders by reuse (until dedicated recordings exist): `ambience/yamuna-evening` plays `yamuna-night`; `vrindavan-evening` plays
`vrindavan-dawn`; `battlefield-wind` and `cosmic-wind` play `wind-harsh`. See `src/data/audioManifest.ts`.
