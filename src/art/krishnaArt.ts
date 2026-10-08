import { PALETTE as C } from "./palette";

/**
 * Krishna, drawn as vector art, part by part. Every part is its own small SVG with a declared pivot, so the rig
 * (components/krishna/puppet.ts) can swing an arm, tilt the head, drop an eyelid or slide an iris independently.
 *
 * Coordinates inside a part are its own viewBox units; `pivot` is where the part attaches to its parent, in those
 * units. `anchor()` converts any point in a part's art into an offset from that part's pivot, which is how the rig
 * knows where the eyes sit in the face or where the shoulder sits on the torso.
 */

export interface PartArt {
  id: string;
  /** viewBox width and height, the part's own units. */
  w: number;
  h: number;
  /** Where this part attaches to its parent, in art units. */
  pivot: [number, number];
  svg: string;
  /** Texture height in pixels. Faces get more; limbs need less. */
  texHeight?: number;
}

const svg = (w: number, h: number, body: string, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs ? `<defs>${defs}</defs>` : ""}${body}</svg>`;

/** Offset of an art point from the part's pivot, in art units (y up, as the rig uses). */
export const anchor = (part: PartArt, x: number, y: number): [number, number] => [x - part.pivot[0], part.pivot[1] - y];

// ---------------------------------------------------------------------------------------------------- head

const FACE_W = 230;
const FACE_H = 250;
/** Landmarks inside the face art, reused by the rig to place eyes, brows, mouth and the crown. */
export const FACE = {
  eyeLeft: [82, 156] as const,
  eyeRight: [148, 156] as const,
  browLeft: [82, 128] as const,
  browRight: [148, 128] as const,
  mouth: [115, 198] as const,
  crown: [115, 60] as const,
  neck: [115, 243] as const,
  earLeft: [26, 160] as const,
  earRight: [204, 160] as const
};

export const head: PartArt = {
  id: "head",
  w: FACE_W,
  h: FACE_H,
  pivot: [FACE.neck[0], FACE.neck[1]],
  texHeight: 1024,
  svg: svg(
    FACE_W,
    FACE_H,
    `
    <!-- ears -->
    <g>
      <path d="M30,146 q-16,2 -16,20 q0,20 16,24 q6,2 8,-4 l0,-36 z" fill="${C.skinShade}"/>
      <path d="M200,146 q16,2 16,20 q0,20 -16,24 q-6,2 -8,-4 l0,-36 z" fill="${C.skinShade}"/>
      <!-- gold earrings (makara kundala), hanging below the ears -->
      <g fill="none" stroke="${C.gold}" stroke-width="7" stroke-linecap="round">
        <path d="M24,186 q-10,10 -2,20 q8,9 18,2"/>
        <path d="M206,186 q10,10 2,20 q-8,9 -18,2"/>
      </g>
      <circle cx="26" cy="212" r="7" fill="${C.goldDeep}"/>
      <circle cx="204" cy="212" r="7" fill="${C.goldDeep}"/>
    </g>
    <!-- face: soft round child's face with a small chin -->
    <path d="M115,16 C62,16 26,58 26,116 C26,160 44,196 76,218 C92,229 104,236 115,236 C126,236 138,229 154,218 C186,196 204,160 204,116 C204,58 168,16 115,16 Z" fill="url(#skin)" stroke="${C.ink}" stroke-width="5" stroke-opacity="0.55"/>
    <!-- cheeks and chin shading -->
    <ellipse cx="72" cy="178" rx="24" ry="15" fill="${C.blush}" opacity="0.30"/>
    <ellipse cx="158" cy="178" rx="24" ry="15" fill="${C.blush}" opacity="0.30"/>
    <path d="M115,232 c-16,0 -29,-8 -37,-16 c12,16 24,21 37,21 c13,0 25,-5 37,-21 c-8,8 -21,16 -37,16 z" fill="${C.skinDeep}" opacity="0.35"/>
    <!-- nose -->
    <path d="M110,162 q7,14 11,20 q-3,6 -12,4" fill="none" stroke="${C.skinDeep}" stroke-width="4.5" stroke-linecap="round" opacity="0.75"/>
    <!-- tilak on the forehead -->
    <path d="M115,74 q-11,22 -5,34 q5,8 10,0 q6,-12 -5,-34 z" fill="${C.dhotiLight}" opacity="0.95"/>
    <path d="M115,86 q-5,14 -2,20 q2,4 4,0 q3,-6 -2,-20 z" fill="${C.sash}" opacity="0.9"/>
  `,
    `<radialGradient id="skin" cx="42%" cy="34%" r="78%">
       <stop offset="0%" stop-color="${C.skinLight}"/>
       <stop offset="52%" stop-color="${C.skin}"/>
       <stop offset="100%" stop-color="${C.skinShade}"/>
     </radialGradient>`
  )
};

export const hairBack: PartArt = {
  id: "hairBack",
  w: 270,
  h: 280,
  pivot: [135, 273],
  texHeight: 768,
  svg: svg(
    270,
    280,
    `
    <path d="M135,10 C64,10 26,62 26,128 C26,172 34,214 44,246 C50,264 66,268 72,250 C60,206 58,166 62,138 C86,150 184,150 208,138 C212,166 210,206 198,250 C204,268 220,264 226,246 C236,214 244,172 244,128 C244,62 206,10 135,10 Z" fill="url(#hairG)"/>
    <!-- loose curls at the ends -->
    <g fill="${C.hair}">
      <circle cx="60" cy="252" r="17"/><circle cx="84" cy="266" r="13"/>
      <circle cx="210" cy="252" r="17"/><circle cx="186" cy="266" r="13"/>
    </g>
  `,
    `<linearGradient id="hairG" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0%" stop-color="${C.hairSheen}"/>
       <stop offset="60%" stop-color="${C.hair}"/>
     </linearGradient>`
  )
};

export const hairFront: PartArt = {
  id: "hairFront",
  w: FACE_W,
  h: FACE_H,
  pivot: [FACE.neck[0], FACE.neck[1]],
  texHeight: 1024,
  svg: svg(
    FACE_W,
    FACE_H,
    `
    <!-- fringe: a row of soft curls over the brow, open in the middle -->
    <path d="M26,112 C26,56 64,18 115,18 C166,18 204,56 204,112 C196,96 186,86 176,82 C168,96 150,104 138,100 C146,88 146,76 142,70 C128,86 104,92 86,86 C92,76 92,66 88,60 C68,70 46,88 38,110 C34,118 28,120 26,112 Z" fill="url(#hairF)"/>
    <g fill="${C.hair}">
      <circle cx="50" cy="96" r="14"/><circle cx="78" cy="78" r="13"/>
      <circle cx="152" cy="78" r="13"/><circle cx="180" cy="96" r="14"/>
      <circle cx="115" cy="66" r="12"/>
    </g>
    <!-- side locks in front of the ears -->
    <path d="M34,120 q-8,36 2,64 q6,16 16,10 q-10,-34 -6,-70 z" fill="${C.hair}"/>
    <path d="M196,120 q8,36 -2,64 q-6,16 -16,10 q10,-34 6,-70 z" fill="${C.hair}"/>
    <!-- the single curl on the forehead -->
    <path d="M115,88 q-15,8 -11,20 q3,11 14,9 q-9,-6 -7,-15 q2,-9 4,-14 z" fill="${C.hairSheen}"/>
  `,
    `<linearGradient id="hairF" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0%" stop-color="${C.hairSheen}"/>
       <stop offset="70%" stop-color="${C.hair}"/>
     </linearGradient>`
  )
};

/** The crown band with the peacock feather. Pivot sits on the forehead where the band crosses. */
export const crown: PartArt = {
  id: "crown",
  w: 300,
  h: 360,
  pivot: [150, 330],
  texHeight: 1024,
  svg: svg(
    300,
    360,
    `
    <!-- peacock feather: stem, barbs, eye -->
    <g>
      <path d="M150,330 C150,308 154,288 162,268 C170,248 180,228 188,212" fill="none" stroke="${C.featherTeal}" stroke-width="7" stroke-linecap="round"/>
      <g stroke="${C.featherTeal}" stroke-width="3.2" stroke-linecap="round" opacity="0.95">
        <path d="M154,312 l-20,8"/><path d="M157,300 l-21,7"/><path d="M161,288 l-22,5"/>
        <path d="M166,274 l-23,4"/><path d="M172,258 l-23,2"/><path d="M179,240 l-23,0"/>
        <path d="M154,312 l18,10"/><path d="M157,300 l19,9"/><path d="M161,288 l20,7"/>
        <path d="M166,274 l21,6"/><path d="M172,258 l21,4"/><path d="M179,240 l21,2"/>
      </g>
      <!-- the eye of the feather -->
      <ellipse cx="196" cy="186" rx="38" ry="47" fill="${C.featherTeal}"/>
      <ellipse cx="196" cy="183" rx="29" ry="37" fill="${C.featherGold}"/>
      <ellipse cx="196" cy="181" rx="21" ry="27" fill="${C.featherBlue}"/>
      <ellipse cx="196" cy="179" rx="11" ry="16" fill="${C.featherDeep}"/>
      <ellipse cx="192" cy="172" rx="4" ry="6" fill="${C.featherTeal}" opacity="0.8"/>
      <g stroke="${C.featherTeal}" stroke-width="2.6" stroke-linecap="round" opacity="0.9">
        <path d="M196,140 l-4,-20"/><path d="M208,144 l6,-18"/><path d="M184,144 l-8,-17"/>
      </g>
    </g>
    <!-- gold band -->
    <path d="M58,330 C58,306 100,292 150,292 C200,292 242,306 242,330 C242,338 236,342 228,340 C196,330 174,326 150,326 C126,326 104,330 72,340 C64,342 58,338 58,330 Z" fill="url(#crownG)"/>
    <path d="M150,282 l9,16 18,3 -13,13 3,18 -17,-9 -17,9 3,-18 -13,-13 18,-3 z" fill="${C.gold}"/>
    <circle cx="150" cy="300" r="8" fill="${C.gem}"/>
    <g fill="${C.gemGreen}"><circle cx="106" cy="312" r="5"/><circle cx="194" cy="312" r="5"/></g>
  `,
    `<linearGradient id="crownG" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0%" stop-color="${C.gold}"/>
       <stop offset="100%" stop-color="${C.goldDeep}"/>
     </linearGradient>`
  )
};

// ---------------------------------------------------------------------------------------------------- eyes

export const eyeWhite: PartArt = {
  id: "eyeWhite",
  w: 72,
  h: 52,
  pivot: [36, 26],
  texHeight: 256,
  svg: svg(
    72,
    52,
    `<path d="M4,28 C12,10 26,4 38,4 C52,4 64,12 68,26 C62,42 50,48 36,48 C22,48 10,42 4,28 Z" fill="${C.eyeWhite}"/>`
  )
};

export const iris: PartArt = {
  id: "iris",
  w: 48,
  h: 48,
  pivot: [24, 24],
  texHeight: 256,
  svg: svg(
    48,
    48,
    `<circle cx="24" cy="24" r="21" fill="${C.iris}"/>
     <circle cx="24" cy="26" r="19" fill="url(#irisG)"/>
     <circle cx="24" cy="25" r="11" fill="${C.pupil}"/>
     <circle cx="18" cy="17" r="6.5" fill="#FFFFFF" opacity="0.95"/>
     <circle cx="30" cy="32" r="3" fill="#FFFFFF" opacity="0.55"/>`,
    `<radialGradient id="irisG" cx="50%" cy="70%" r="60%">
       <stop offset="0%" stop-color="${C.irisLight}"/>
       <stop offset="100%" stop-color="${C.iris}"/>
     </radialGradient>`
  )
};

/** Upper lid, in skin tone, with the lash line. Scaled from 0 (open) to 1 (shut) about its top edge. */
export const eyelid: PartArt = {
  id: "eyelid",
  w: 76,
  h: 56,
  pivot: [38, 6],
  texHeight: 256,
  svg: svg(
    76,
    56,
    `<path d="M0,4 C0,4 16,0 38,0 C60,0 76,4 76,4 L76,32 C68,48 54,54 38,54 C22,54 8,48 0,32 Z" fill="url(#lidG)"/>
     <path d="M5,24 C13,11 26,6 38,6 C50,6 63,11 71,24" fill="none" stroke="${C.lash}" stroke-width="5.5" stroke-linecap="round"/>
     <g stroke="${C.lash}" stroke-width="3.4" stroke-linecap="round" fill="none" opacity="0.85">
       <path d="M11,19 l-4,-5"/><path d="M38,6 l0,-5"/><path d="M65,19 l4,-5"/>
     </g>`,
    `<linearGradient id="lidG" x1="0" y1="0" x2="0.3" y2="1">
       <stop offset="0%" stop-color="${C.skin}"/>
       <stop offset="100%" stop-color="${C.skinShade}"/>
     </linearGradient>`
  )
};

export const brow: PartArt = {
  id: "brow",
  w: 76,
  h: 26,
  pivot: [38, 18],
  texHeight: 128,
  svg: svg(76, 26, `<path d="M6,20 C18,6 44,2 70,10" fill="none" stroke="${C.hair}" stroke-width="9" stroke-linecap="round"/>`)
};

const mouth = (id: string, body: string): PartArt => ({
  id,
  w: 90,
  h: 60,
  pivot: [45, 12],
  texHeight: 256,
  svg: svg(90, 60, body)
});

export const mouthSmile = mouth(
  "mouthSmile",
  `<path d="M18,14 C30,34 60,34 72,14 C66,34 54,44 45,44 C36,44 24,34 18,14 Z" fill="${C.lip}"/>
   <path d="M24,18 C34,30 56,30 66,18 C58,24 32,24 24,18 Z" fill="#FFFFFF" opacity="0.9"/>`
);

export const mouthOpen = mouth(
  "mouthOpen",
  `<path d="M20,12 C32,10 58,10 70,12 C68,38 58,50 45,50 C32,50 22,38 20,12 Z" fill="${C.lip}"/>
   <path d="M26,15 C36,13 54,13 64,15 C62,22 54,26 45,26 C36,26 28,22 26,15 Z" fill="#FFFFFF" opacity="0.92"/>
   <path d="M34,44 C38,38 52,38 56,44 C52,48 38,48 34,44 Z" fill="${C.lipLight}" opacity="0.8"/>`
);

export const mouthFlute = mouth(
  "mouthFlute",
  `<ellipse cx="45" cy="26" rx="13" ry="10" fill="${C.lip}"/>
   <ellipse cx="45" cy="25" rx="7" ry="5" fill="${C.pupil}" opacity="0.55"/>`
);

export const mouthSoft = mouth("mouthSoft", `<path d="M26,20 C34,30 56,30 64,20" fill="none" stroke="${C.lip}" stroke-width="7" stroke-linecap="round"/>`);

// ---------------------------------------------------------------------------------------------------- body

export const torso: PartArt = {
  id: "torso",
  w: 200,
  h: 230,
  pivot: [100, 224],
  texHeight: 640,
  svg: svg(
    200,
    230,
    `
    <!-- neck -->
    <path d="M76,2 L124,2 L122,34 C122,44 78,44 78,34 Z" fill="${C.skinShade}"/>
    <!-- chest and belly: a child's round body -->
    <path d="M100,16 C58,16 30,40 24,78 C18,116 20,154 32,186 C44,216 70,226 100,226 C130,226 156,216 168,186 C180,154 182,116 176,78 C170,40 142,16 100,16 Z" fill="url(#bodyG)" stroke="${C.ink}" stroke-width="5" stroke-opacity="0.5"/>
    <ellipse cx="100" cy="150" rx="56" ry="56" fill="${C.skinShade}" opacity="0.22"/>
    <ellipse cx="100" cy="170" rx="13" ry="9" fill="${C.skinDeep}" opacity="0.45"/>
    <!-- yellow sash across the chest -->
    <path d="M24,74 C58,100 142,100 176,74 C180,94 178,108 172,116 C138,140 62,140 28,116 C22,108 20,94 24,74 Z" fill="url(#sashG)"/>
    <path d="M24,74 C58,100 142,100 176,74 C177,80 177,86 176,92 C142,116 58,116 24,92 C23,86 23,80 24,74 Z" fill="${C.dhotiLight}" opacity="0.6"/>
    <!-- necklace and pendant -->
    <path d="M62,30 C78,62 122,62 138,30" fill="none" stroke="${C.gold}" stroke-width="10" stroke-linecap="round"/>
    <circle cx="100" cy="58" r="12" fill="${C.gem}" stroke="${C.goldDeep}" stroke-width="3"/>
    <!-- garland of forest flowers -->
    <path d="M64,26 C54,92 76,156 100,196 C124,156 146,92 136,26" fill="none" stroke="${C.gemGreen}" stroke-width="5" opacity="0.9"/>
    <g fill="${C.blossomWhite}">
      <circle cx="62" cy="70" r="8"/><circle cx="68" cy="108" r="8"/><circle cx="80" cy="146" r="8"/><circle cx="94" cy="178" r="8"/>
      <circle cx="138" cy="70" r="8"/><circle cx="132" cy="108" r="8"/><circle cx="120" cy="146" r="8"/><circle cx="106" cy="178" r="8"/>
    </g>
    <g fill="${C.blossomPink}">
      <circle cx="62" cy="70" r="3.6"/><circle cx="68" cy="108" r="3.6"/><circle cx="80" cy="146" r="3.6"/><circle cx="94" cy="178" r="3.6"/>
      <circle cx="138" cy="70" r="3.6"/><circle cx="132" cy="108" r="3.6"/><circle cx="120" cy="146" r="3.6"/><circle cx="106" cy="178" r="3.6"/>
    </g>
  `,
    `<linearGradient id="bodyG" x1="0.2" y1="0" x2="0.9" y2="1">
       <stop offset="0%" stop-color="${C.skinLight}"/>
       <stop offset="45%" stop-color="${C.skin}"/>
       <stop offset="100%" stop-color="${C.skinShade}"/>
     </linearGradient>
     <linearGradient id="sashG" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0%" stop-color="${C.dhoti}"/>
       <stop offset="100%" stop-color="${C.dhotiShade}"/>
     </linearGradient>`
  )
};

export const dhoti: PartArt = {
  id: "dhoti",
  w: 300,
  h: 230,
  pivot: [150, 26],
  texHeight: 640,
  svg: svg(
    300,
    230,
    `
    <path d="M150,8 C104,8 68,20 60,40 C46,76 36,126 28,172 C22,204 46,220 70,206 C94,192 122,184 150,184 C178,184 206,192 230,206 C254,220 278,204 272,172 C264,126 254,76 240,40 C232,20 196,8 150,8 Z" fill="url(#dhotiG)" stroke="${C.ink}" stroke-width="5" stroke-opacity="0.45"/>
    <g stroke="${C.dhotiShade}" stroke-width="4.5" fill="none" opacity="0.7" stroke-linecap="round">
      <path d="M96,34 C86,84 76,134 66,186"/>
      <path d="M150,38 C150,88 150,136 150,188"/>
      <path d="M204,34 C214,84 224,134 234,186"/>
    </g>
    <!-- red sash tied at the waist, one end flying -->
    <path d="M52,24 C110,50 190,50 248,24 C252,44 250,58 244,64 C186,88 114,88 56,64 C50,58 48,44 52,24 Z" fill="url(#waistG)"/>
    <path d="M248,36 C274,48 290,74 282,104 C274,86 260,70 242,60 Z" fill="${C.sashShade}"/>
    <!-- hem -->
    <path d="M28,172 C62,196 106,208 150,208 C194,208 238,196 272,172 C276,196 254,220 230,208 C206,196 178,188 150,188 C122,188 94,196 70,208 C46,220 24,196 28,172 Z" fill="${C.dhotiLight}" opacity="0.9"/>
  `,
    `<linearGradient id="dhotiG" x1="0.1" y1="0" x2="0.9" y2="1">
       <stop offset="0%" stop-color="${C.dhotiLight}"/>
       <stop offset="55%" stop-color="${C.dhoti}"/>
       <stop offset="100%" stop-color="${C.dhotiShade}"/>
     </linearGradient>
     <linearGradient id="waistG" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0%" stop-color="${C.sash}"/>
       <stop offset="100%" stop-color="${C.sashShade}"/>
     </linearGradient>`
  )
};

const limb = (id: string, w: number, h: number, body: string, defs?: string): PartArt => ({
  id,
  w,
  h,
  pivot: [w / 2, 14],
  texHeight: 384,
  svg: svg(w, h, body, defs)
});

export const armUpper = limb(
  "armUpper",
  70,
  130,
  `<path d="M35,6 C16,6 8,22 10,44 C12,70 16,96 20,116 C24,130 46,130 50,116 C54,96 58,70 60,44 C62,22 54,6 35,6 Z" fill="url(#armG)" stroke="${C.ink}" stroke-width="5" stroke-opacity="0.5"/>
   <!-- armlet -->
   <path d="M13,52 C22,60 48,60 57,52 C58,62 57,70 55,74 C46,82 24,82 15,74 C13,70 12,62 13,52 Z" fill="${C.gold}"/>
   <circle cx="35" cy="66" r="5" fill="${C.gem}"/>`,
  `<linearGradient id="armG" x1="0.1" y1="0" x2="1" y2="0.6">
     <stop offset="0%" stop-color="${C.skin}"/><stop offset="55%" stop-color="${C.skinShade}"/><stop offset="100%" stop-color="${C.skinDeep}"/>
   </linearGradient>`
);

export const armFore = limb(
  "armFore",
  62,
  120,
  `<path d="M31,6 C14,6 8,20 10,40 C12,64 16,86 19,102 C22,116 42,116 45,102 C48,86 52,64 54,40 C56,20 48,6 31,6 Z" fill="url(#foreG)" stroke="${C.ink}" stroke-width="5" stroke-opacity="0.5"/>
   <!-- bangles at the wrist -->
   <g fill="${C.gold}"><rect x="12" y="96" width="38" height="8" rx="4"/><rect x="13" y="106" width="36" height="7" rx="3.5"/></g>`,
  `<linearGradient id="foreG" x1="0.1" y1="0" x2="1" y2="0.6">
     <stop offset="0%" stop-color="${C.skin}"/><stop offset="55%" stop-color="${C.skinShade}"/><stop offset="100%" stop-color="${C.skinDeep}"/>
   </linearGradient>`
);

/** Relaxed open hand. */
export const hand = limb(
  "hand",
  72,
  86,
  `<path d="M36,4 C20,4 12,16 12,34 C12,54 18,72 30,80 C40,86 52,82 58,70 C64,56 64,34 60,20 C56,8 48,4 36,4 Z" fill="url(#handG)" stroke="${C.ink}" stroke-width="4.5" stroke-opacity="0.5"/>
   <g stroke="${C.skinDeep}" stroke-width="3" opacity="0.5" fill="none" stroke-linecap="round">
     <path d="M28,44 C26,56 28,66 34,74"/><path d="M40,42 C40,56 42,66 46,72"/><path d="M50,40 C52,52 54,60 56,66"/>
   </g>`,
  `<linearGradient id="handG" x1="0" y1="0" x2="1" y2="1">
     <stop offset="0%" stop-color="${C.skinLight}"/><stop offset="60%" stop-color="${C.skin}"/><stop offset="100%" stop-color="${C.skinShade}"/>
   </linearGradient>`
);

/** Hand curled round the flute: fingers wrap forward. */
export const handGrip = limb(
  "handGrip",
  72,
  80,
  `<path d="M36,4 C20,4 12,16 12,32 C12,52 20,68 34,74 C46,79 58,72 61,58 C64,42 62,24 56,14 C51,6 46,4 36,4 Z" fill="url(#gripG)" stroke="${C.ink}" stroke-width="4.5" stroke-opacity="0.5"/>
   <g stroke="${C.skinDeep}" stroke-width="5" opacity="0.65" fill="none" stroke-linecap="round">
     <path d="M20,34 C30,30 46,30 56,36"/><path d="M20,46 C30,42 46,42 56,48"/><path d="M22,58 C32,54 44,54 52,60"/>
   </g>`,
  `<linearGradient id="gripG" x1="0" y1="0" x2="1" y2="1">
     <stop offset="0%" stop-color="${C.skinLight}"/><stop offset="60%" stop-color="${C.skin}"/><stop offset="100%" stop-color="${C.skinShade}"/>
   </linearGradient>`
);

export const legThigh = limb(
  "legThigh",
  86,
  130,
  `<path d="M43,6 C20,6 10,24 12,50 C14,78 20,104 26,120 C32,134 54,134 60,120 C66,104 72,78 74,50 C76,24 66,6 43,6 Z" fill="url(#legG)" stroke="${C.ink}" stroke-width="5" stroke-opacity="0.5"/>`,
  `<linearGradient id="legG" x1="0.1" y1="0" x2="1" y2="0.6">
     <stop offset="0%" stop-color="${C.skinLight}"/><stop offset="55%" stop-color="${C.skin}"/><stop offset="100%" stop-color="${C.skinShade}"/>
   </linearGradient>`
);

export const legShin = limb(
  "legShin",
  76,
  126,
  `<path d="M38,6 C18,6 10,22 12,46 C14,72 18,94 22,110 C26,124 50,124 54,110 C58,94 62,72 64,46 C66,22 58,6 38,6 Z" fill="url(#shinG)" stroke="${C.ink}" stroke-width="5" stroke-opacity="0.5"/>
   <!-- anklets -->
   <g fill="${C.gold}"><rect x="16" y="104" width="44" height="9" rx="4.5"/><rect x="18" y="115" width="40" height="7" rx="3.5"/></g>`,
  `<linearGradient id="shinG" x1="0.1" y1="0" x2="1" y2="0.6">
     <stop offset="0%" stop-color="${C.skinLight}"/><stop offset="55%" stop-color="${C.skin}"/><stop offset="100%" stop-color="${C.skinShade}"/>
   </linearGradient>`
);

export const foot: PartArt = {
  id: "foot",
  w: 100,
  h: 60,
  pivot: [34, 10],
  texHeight: 256,
  svg: svg(
    100,
    60,
    `<path d="M20,6 C8,6 4,18 6,32 C8,46 18,54 36,54 C58,54 80,50 90,44 C98,39 96,28 86,26 C70,23 58,18 50,10 C44,5 30,6 20,6 Z" fill="url(#footG)" stroke="${C.ink}" stroke-width="4.5" stroke-opacity="0.5"/>
     <g fill="${C.skinDeep}" opacity="0.4"><circle cx="84" cy="36" r="5"/><circle cx="74" cy="42" r="4.4"/><circle cx="64" cy="46" r="4"/></g>`,
    `<linearGradient id="footG" x1="0" y1="0" x2="0.4" y2="1">
       <stop offset="0%" stop-color="${C.skin}"/><stop offset="100%" stop-color="${C.skinShade}"/>
     </linearGradient>`
  )
};

/** The bansuri. Pivot at the blowing hole, so it can be parented to the mouth. */
export const flute: PartArt = {
  id: "flute",
  w: 420,
  h: 48,
  pivot: [54, 24],
  texHeight: 128,
  svg: svg(
    420,
    48,
    `<rect x="8" y="14" width="404" height="20" rx="10" fill="url(#fluteG)"/>
     <g fill="${C.bambooShade}" opacity="0.85"><rect x="96" y="13" width="7" height="22" rx="3"/><rect x="250" y="13" width="7" height="22" rx="3"/></g>
     <g fill="${C.featherDeep}" opacity="0.85">
       <ellipse cx="54" cy="24" rx="7" ry="5"/>
       <ellipse cx="170" cy="24" rx="5.5" ry="4"/><ellipse cx="200" cy="24" rx="5.5" ry="4"/><ellipse cx="230" cy="24" rx="5.5" ry="4"/>
       <ellipse cx="286" cy="24" rx="5.5" ry="4"/><ellipse cx="316" cy="24" rx="5.5" ry="4"/><ellipse cx="346" cy="24" rx="5.5" ry="4"/>
     </g>
     <g fill="${C.sash}"><rect x="376" y="12" width="9" height="24" rx="4"/><rect x="389" y="12" width="6" height="24" rx="3"/></g>
     <g fill="${C.gold}"><rect x="20" y="12" width="8" height="24" rx="4"/></g>`,
    `<linearGradient id="fluteG" x1="0" y1="0" x2="0" y2="1">
       <stop offset="0%" stop-color="#EAC98A"/><stop offset="55%" stop-color="${C.bamboo}"/><stop offset="100%" stop-color="${C.bambooShade}"/>
     </linearGradient>`
  )
};

export const KRISHNA_PARTS: PartArt[] = [
  head,
  hairBack,
  hairFront,
  crown,
  eyeWhite,
  iris,
  eyelid,
  brow,
  mouthSmile,
  mouthOpen,
  mouthFlute,
  mouthSoft,
  torso,
  dhoti,
  armUpper,
  armFore,
  hand,
  handGrip,
  legThigh,
  legShin,
  foot,
  flute
];
