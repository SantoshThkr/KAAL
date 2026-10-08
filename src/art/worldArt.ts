import { PALETTE as C } from "./palette";
import type { PartArt } from "./krishnaArt";

/**
 * Vrindavan, drawn: trees, blossom, grass, lotus, the village, the animals. Flat stylised shapes in the film's
 * palette, placed as layers through the depth of the scene so the camera gets real parallax as it moves.
 *
 * Pivots sit at the FOOT of each drawing, so a tree or a hut stands on the ground wherever it is placed.
 */

const svg = (w: number, h: number, body: string, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs ? `<defs>${defs}</defs>` : ""}${body}</svg>`;

const standing = (id: string, w: number, h: number, body: string, defs?: string, texHeight = 768): PartArt => ({
  id,
  w,
  h,
  pivot: [w / 2, h],
  svg: svg(w, h, body, defs),
  texHeight
});

const canopy = (cx: number, cy: number, r: number, fill: string, light: string) => `
  <g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>
    <circle cx="${cx - r * 0.45}" cy="${cy + r * 0.2}" r="${r * 0.68}" fill="${fill}"/>
    <circle cx="${cx + r * 0.5}" cy="${cy + r * 0.16}" r="${r * 0.64}" fill="${fill}"/>
    <circle cx="${cx - r * 0.2}" cy="${cy - r * 0.42}" r="${r * 0.58}" fill="${light}" opacity="0.5"/>
    <circle cx="${cx + r * 0.3}" cy="${cy - r * 0.3}" r="${r * 0.42}" fill="${light}" opacity="0.35"/>
  </g>`;

/** The kadamba: a broad, round-crowned tree, the one Krishna's stories happen under. */
export const treeKadamba = standing(
  "treeKadamba",
  520,
  760,
  `
  <path d="M250,752 C246,640 244,560 250,470 C252,432 246,396 232,366 C222,344 214,322 216,300 l34,-8 c2,22 10,42 22,60 c10,-26 26,-48 48,-64 l22,22 c-26,20 -44,46 -52,78 c-6,24 -6,52 -4,84 c4,66 6,170 2,312 z" fill="url(#trunk)"/>
  ${canopy(258, 250, 165, C.leafDeep, C.leafLight)}
  ${canopy(150, 300, 118, C.leaf, C.leafLight)}
  ${canopy(372, 296, 126, C.leaf, C.leafLight)}
  ${canopy(258, 170, 120, C.leaf, C.leafLight)}
  <g fill="${C.blossomWhite}" opacity="0.92">
    <circle cx="150" cy="238" r="11"/><circle cx="338" cy="206" r="10"/><circle cx="222" cy="140" r="9"/>
    <circle cx="398" cy="320" r="10"/><circle cx="118" cy="344" r="9"/><circle cx="300" cy="372" r="10"/>
  </g>
  <g fill="${C.dhoti}" opacity="0.85">
    <circle cx="150" cy="238" r="5"/><circle cx="338" cy="206" r="4.5"/><circle cx="222" cy="140" r="4"/>
    <circle cx="398" cy="320" r="4.5"/><circle cx="118" cy="344" r="4"/><circle cx="300" cy="372" r="4.5"/>
  </g>
`,
  `<linearGradient id="trunk" x1="0" y1="0" x2="1" y2="0">
     <stop offset="0%" stop-color="${C.trunkShade}"/><stop offset="55%" stop-color="${C.trunk}"/><stop offset="100%" stop-color="${C.trunkShade}"/>
   </linearGradient>`
);

/** A slimmer tree with a leaning trunk, for variety in the grove. */
export const treeSlim = standing(
  "treeSlim",
  380,
  700,
  `
  <path d="M196,694 C188,580 180,470 168,392 C160,338 150,300 136,268 l30,-14 c16,34 28,74 36,130 c10,76 16,186 20,310 z" fill="url(#trunk2)"/>
  ${canopy(168, 214, 128, C.leafDeep, C.leafLight)}
  ${canopy(96, 268, 86, C.leaf, C.leafLight)}
  ${canopy(246, 252, 92, C.leaf, C.leafLight)}
  <g fill="${C.blossomPink}" opacity="0.9">
    <circle cx="104" cy="214" r="9"/><circle cx="222" cy="190" r="8"/><circle cx="268" cy="286" r="8"/>
  </g>
`,
  `<linearGradient id="trunk2" x1="0" y1="0" x2="1" y2="0">
     <stop offset="0%" stop-color="${C.trunkShade}"/><stop offset="60%" stop-color="${C.trunk}"/><stop offset="100%" stop-color="${C.trunkShade}"/>
   </linearGradient>`
);

export const bush = standing(
  "bush",
  260,
  170,
  `${canopy(130, 96, 74, C.leafDeep, C.leafLight)}${canopy(62, 118, 52, C.leaf, C.leafLight)}${canopy(196, 116, 56, C.leaf, C.leafLight)}
   <g fill="${C.blossomPink}"><circle cx="76" cy="96" r="7"/><circle cx="150" cy="70" r="6"/><circle cx="196" cy="100" r="6"/></g>`,
  undefined,
  384
);

export const grassTuft = standing(
  "grassTuft",
  180,
  120,
  `<g fill="none" stroke="${C.grass}" stroke-width="9" stroke-linecap="round">
     <path d="M90,116 C80,86 66,62 48,44"/><path d="M90,116 C92,84 94,56 92,28"/><path d="M90,116 C100,86 118,62 138,46"/>
     <path d="M90,116 C74,96 56,82 34,74"/><path d="M90,116 C110,98 130,88 152,82"/>
   </g>
   <g fill="none" stroke="${C.grassDeep}" stroke-width="6" stroke-linecap="round" opacity="0.8">
     <path d="M90,116 C84,94 74,74 60,58"/><path d="M90,116 C104,92 116,74 130,62"/>
   </g>`,
  undefined,
  256
);

export const flowerCluster = standing(
  "flowerCluster",
  200,
  140,
  `<g stroke="${C.grassDeep}" stroke-width="5" fill="none" stroke-linecap="round">
     <path d="M60,136 C58,110 54,92 48,76"/><path d="M104,136 C104,106 104,86 104,66"/><path d="M148,136 C150,112 154,96 160,82"/>
   </g>
   <g>
     <g transform="translate(48,70)"><g fill="${C.blossomPink}"><circle cx="0" cy="-14" r="11"/><circle cx="13" cy="-4" r="11"/><circle cx="8" cy="11" r="11"/><circle cx="-8" cy="11" r="11"/><circle cx="-13" cy="-4" r="11"/></g><circle r="7" fill="${C.dhotiLight}"/></g>
     <g transform="translate(104,60)"><g fill="${C.blossomWhite}"><circle cx="0" cy="-15" r="12"/><circle cx="14" cy="-5" r="12"/><circle cx="9" cy="12" r="12"/><circle cx="-9" cy="12" r="12"/><circle cx="-14" cy="-5" r="12"/></g><circle r="7" fill="${C.dhoti}"/></g>
     <g transform="translate(160,76)"><g fill="${C.blossomPink}"><circle cx="0" cy="-12" r="10"/><circle cx="11" cy="-3" r="10"/><circle cx="7" cy="10" r="10"/><circle cx="-7" cy="10" r="10"/><circle cx="-11" cy="-3" r="10"/></g><circle r="6" fill="${C.dhotiLight}"/></g>
   </g>`,
  undefined,
  256
);

export const lotus = standing(
  "lotus",
  220,
  120,
  `<ellipse cx="110" cy="104" rx="96" ry="14" fill="${C.leafDeep}" opacity="0.55"/>
   <g fill="${C.blossomPink}">
     <path d="M110,30 C122,52 122,76 110,92 C98,76 98,52 110,30 Z"/>
     <path d="M76,44 C96,58 108,78 108,94 C88,88 74,68 76,44 Z"/>
     <path d="M144,44 C124,58 112,78 112,94 C132,88 146,68 144,44 Z"/>
     <path d="M48,66 C72,70 94,84 100,96 C78,98 56,88 48,66 Z"/>
     <path d="M172,66 C148,70 126,84 120,96 C142,98 164,88 172,66 Z"/>
   </g>
   <ellipse cx="110" cy="94" rx="18" ry="10" fill="${C.dhoti}"/>`,
  undefined,
  256
);

/** A village house with a thatched roof, for the morning scene. */
export const hut = standing(
  "hut",
  420,
  340,
  `<path d="M60,332 L60,186 L360,186 L360,332 Z" fill="url(#wall)"/>
   <path d="M30,192 L210,52 L390,192 Z" fill="url(#roof)"/>
   <path d="M30,192 L210,52 L390,192" fill="none" stroke="${C.trunkShade}" stroke-width="8" stroke-linejoin="round"/>
   <path d="M168,332 L168,232 C168,210 252,210 252,232 L252,332 Z" fill="${C.trunkShade}"/>
   <rect x="92" y="222" width="52" height="46" rx="6" fill="${C.featherDeep}" opacity="0.65"/>
   <rect x="278" y="222" width="52" height="46" rx="6" fill="${C.featherDeep}" opacity="0.65"/>
   <g stroke="${C.dhotiShade}" stroke-width="4" opacity="0.5"><path d="M60,250 L360,250"/><path d="M60,292 L360,292"/></g>`,
  `<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
     <stop offset="0%" stop-color="#E8C9A0"/><stop offset="100%" stop-color="#C19C72"/>
   </linearGradient>
   <linearGradient id="roof" x1="0" y1="0" x2="0" y2="1">
     <stop offset="0%" stop-color="#C58F4A"/><stop offset="100%" stop-color="#8E5F2C"/>
   </linearGradient>`
);

/** Clay butter pots, hanging and stacked: the reason for all the trouble. */
export const butterPots = standing(
  "butterPots",
  260,
  220,
  `<g>
     <path d="M66,214 C34,214 20,190 20,164 C20,134 40,112 66,112 C92,112 112,134 112,164 C112,190 98,214 66,214 Z" fill="url(#clay)"/>
     <ellipse cx="66" cy="112" rx="34" ry="12" fill="#8E5F2C"/>
     <ellipse cx="66" cy="110" rx="26" ry="8" fill="${C.blossomWhite}"/>
     <path d="M186,210 C158,210 146,190 146,168 C146,142 164,124 186,124 C208,124 226,142 226,168 C226,190 214,210 186,210 Z" fill="url(#clay)"/>
     <ellipse cx="186" cy="124" rx="29" ry="10" fill="#8E5F2C"/>
     <ellipse cx="186" cy="122" rx="22" ry="7" fill="${C.blossomWhite}"/>
   </g>`,
  `<linearGradient id="clay" x1="0" y1="0" x2="1" y2="0.6">
     <stop offset="0%" stop-color="#C8743F"/><stop offset="60%" stop-color="#A65A2E"/><stop offset="100%" stop-color="#7E4120"/>
   </linearGradient>`,
  384
);

export const cow = standing(
  "cow",
  420,
  300,
  `<path d="M96,282 l0,-62 l26,0 l0,62 z M168,286 l0,-66 l26,0 l0,66 z M276,282 l0,-62 l26,0 l0,62 z M336,286 l0,-66 l26,0 l0,66 z" fill="#C9B9A6"/>
   <path d="M86,224 C70,186 78,146 110,130 C150,110 272,108 316,128 C352,144 366,186 348,224 C330,258 120,258 86,224 Z" fill="url(#hide)"/>
   <path d="M330,150 C356,130 392,128 404,146 C414,162 404,186 384,194 C372,199 352,196 344,188 C352,172 346,158 330,150 Z" fill="#EFE4D6"/>
   <path d="M396,140 C404,120 394,106 378,104 C390,112 392,126 386,138 Z" fill="#8E5F2C"/>
   <circle cx="378" cy="160" r="7" fill="${C.featherDeep}"/>
   <path d="M404,186 q12,6 10,16 q-10,4 -16,-6 z" fill="#D8A48A"/>
   <path d="M96,214 C86,236 80,258 84,282 l14,0 c-4,-24 2,-44 10,-60 z" fill="#C9B9A6"/>
   <g fill="#EFE4D6" opacity="0.85"><ellipse cx="180" cy="170" rx="34" ry="24"/><ellipse cx="268" cy="196" rx="26" ry="18"/></g>`,
  `<linearGradient id="hide" x1="0" y1="0" x2="0" y2="1">
     <stop offset="0%" stop-color="#E6D8C6"/><stop offset="100%" stop-color="#C2AC94"/>
   </linearGradient>`
);

export const peacock = standing(
  "peacock",
  420,
  420,
  `<g opacity="0.95">
     <path d="M210,330 C120,330 56,266 56,196 C56,126 120,66 210,66 C300,66 364,126 364,196 C364,266 300,330 210,330 Z" fill="${C.featherTeal}" opacity="0.28"/>
     <g stroke="${C.featherTeal}" stroke-width="5" fill="none" opacity="0.8">
       <path d="M210,320 C150,300 104,250 96,186"/><path d="M210,320 C176,286 148,232 146,166"/>
       <path d="M210,320 C212,268 206,212 200,158"/><path d="M210,320 C244,286 272,232 274,166"/>
       <path d="M210,320 C270,300 316,250 324,186"/>
     </g>
     <g>
       <circle cx="96" cy="176" r="17" fill="${C.featherGold}"/><circle cx="96" cy="176" r="10" fill="${C.featherBlue}"/>
       <circle cx="146" cy="156" r="17" fill="${C.featherGold}"/><circle cx="146" cy="156" r="10" fill="${C.featherBlue}"/>
       <circle cx="200" cy="148" r="18" fill="${C.featherGold}"/><circle cx="200" cy="148" r="11" fill="${C.featherBlue}"/>
       <circle cx="274" cy="156" r="17" fill="${C.featherGold}"/><circle cx="274" cy="156" r="10" fill="${C.featherBlue}"/>
       <circle cx="324" cy="176" r="17" fill="${C.featherGold}"/><circle cx="324" cy="176" r="10" fill="${C.featherBlue}"/>
     </g>
   </g>
   <path d="M196,412 l0,-54 l12,0 l0,54 z M232,412 l0,-54 l12,0 l0,54 z" fill="${C.goldDeep}"/>
   <path d="M214,360 C176,360 156,330 160,296 C164,262 190,242 216,246 C244,250 262,276 258,308 C254,338 240,360 214,360 Z" fill="${C.featherBlue}"/>
   <path d="M232,252 C228,222 236,198 252,186 C268,174 288,178 294,194 C300,210 290,228 272,238 C258,246 242,250 232,252 Z" fill="${C.featherTeal}"/>
   <circle cx="286" cy="196" r="7" fill="${C.featherDeep}"/>
   <path d="M300,200 l22,6 -22,8 z" fill="${C.dhoti}"/>
   <g stroke="${C.featherTeal}" stroke-width="3" fill="none"><path d="M276,176 l6,-20"/><path d="M286,178 l10,-18"/><path d="M266,178 l0,-20"/></g>`,
  undefined,
  640
);

export const butterfly: PartArt = {
  id: "butterfly",
  w: 140,
  h: 120,
  pivot: [70, 60],
  texHeight: 192,
  svg: svg(
    140,
    120,
    `<g>
       <path d="M68,60 C44,22 18,14 10,32 C2,50 24,70 66,66 Z" fill="${C.dhoti}"/>
       <path d="M72,60 C96,22 122,14 130,32 C138,50 116,70 74,66 Z" fill="${C.dhoti}"/>
       <path d="M68,62 C48,92 28,104 20,92 C12,80 34,66 66,64 Z" fill="${C.sash}"/>
       <path d="M72,62 C92,92 112,104 120,92 C128,80 106,66 74,64 Z" fill="${C.sash}"/>
       <ellipse cx="70" cy="62" rx="6" ry="24" fill="${C.featherDeep}"/>
       <g stroke="${C.featherDeep}" stroke-width="3" fill="none" stroke-linecap="round"><path d="M68,40 C62,28 54,22 48,20"/><path d="M72,40 C78,28 86,22 92,20"/></g>
     </g>`
  )
};

export const cloud: PartArt = {
  id: "cloud",
  w: 520,
  h: 220,
  pivot: [260, 110],
  texHeight: 384,
  svg: svg(
    520,
    220,
    `<g fill="#FFFFFF">
       <ellipse cx="180" cy="140" rx="130" ry="62"/>
       <ellipse cx="300" cy="118" rx="112" ry="76"/>
       <ellipse cx="392" cy="146" rx="94" ry="52"/>
       <ellipse cx="238" cy="96" rx="78" ry="56"/>
     </g>
     <g fill="#DCE8FA" opacity="0.75">
       <ellipse cx="180" cy="168" rx="120" ry="30"/><ellipse cx="368" cy="170" rx="96" ry="26"/>
     </g>`
  )
};

/** A soft round glow, used for fireflies, light motes and the divine light. */
export const glow: PartArt = {
  id: "glow",
  w: 128,
  h: 128,
  pivot: [64, 64],
  texHeight: 128,
  svg: svg(
    128,
    128,
    `<circle cx="64" cy="64" r="62" fill="url(#g)"/>`,
    `<radialGradient id="g" cx="50%" cy="50%" r="50%">
       <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
       <stop offset="28%" stop-color="#FFF0C0" stop-opacity="0.75"/>
       <stop offset="100%" stop-color="#FFD98A" stop-opacity="0"/>
     </radialGradient>`
  )
};

/** The peacock feather that falls through the opening. */
export const featherFalling: PartArt = {
  id: "featherFalling",
  w: 150,
  h: 420,
  pivot: [75, 400],
  texHeight: 512,
  svg: svg(
    150,
    420,
    `<path d="M75,410 C75,350 76,300 80,250" fill="none" stroke="${C.featherTeal}" stroke-width="5" stroke-linecap="round"/>
     <g stroke="${C.featherTeal}" stroke-width="2.6" stroke-linecap="round" opacity="0.9">
       <path d="M76,330 l-20,10"/><path d="M77,310 l-21,8"/><path d="M78,290 l-22,6"/><path d="M79,270 l-22,4"/>
       <path d="M76,330 l20,11"/><path d="M77,310 l21,9"/><path d="M78,290 l22,7"/><path d="M79,270 l22,5"/>
     </g>
     <ellipse cx="82" cy="150" rx="46" ry="62" fill="${C.featherTeal}"/>
     <ellipse cx="82" cy="146" rx="35" ry="48" fill="${C.featherGold}"/>
     <ellipse cx="82" cy="142" rx="25" ry="34" fill="${C.featherBlue}"/>
     <ellipse cx="82" cy="140" rx="13" ry="19" fill="${C.featherDeep}"/>
     <g stroke="${C.featherTeal}" stroke-width="2.4" stroke-linecap="round" opacity="0.85">
       <path d="M82,88 l-5,-26"/><path d="M96,92 l7,-24"/><path d="M68,92 l-9,-22"/>
     </g>`
  )
};

export const WORLD_PARTS: PartArt[] = [
  treeKadamba,
  treeSlim,
  bush,
  grassTuft,
  flowerCluster,
  lotus,
  hut,
  butterPots,
  cow,
  peacock,
  butterfly,
  cloud,
  glow,
  featherFalling
];
