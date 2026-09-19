/**
 * Bhagavad Gita verses used in the film.
 *
 * RULES
 *  - Sanskrit here is never edited by hand. It is locked by `sanskritSha256`; `npm test` fails if it drifts.
 *  - Sanskrit is rendered only through <ShlokaOverlay>, never typed into a component.
 *  - `verification.supersiteSignOff` stays `null` until a person has compared each verse on
 *    https://www.gitasupersite.in/ (formerly gitasupersite.iitk.ac.in). Its verse API needs a login, so this
 *    cannot be automated. `npm run shlokas:verify` reports the sign-off state.
 *
 * PROVENANCE (2026-09-18)
 *  - Sanskrit: supplied in the project brief, then compared letter-for-letter (whitespace, dandas and verse
 *    numbers stripped) against the bhagavadgita.io corpus (github.com/gita/gita, data/verse.json). 7/7 exact.
 *  - transliteration: IAST generated mechanically from the Devanagari (sanscript 1.3.3), word breaks taken from
 *    the same corpus. The corpus's own transliteration disagrees with its Devanagari in two places
 *    (15.7 "ānśo", 18.66 "tvāṁ"); the Devanagari was trusted and IAST derived from it.
 *  - meaningEnglish / meaningHindi: plain-language glosses written for this project, NOT taken from a copyrighted
 *    translation. `meaningReview` stays "draft" until a fluent reader has reviewed them.
 */

export const SHLOKA_IDS = ["BG-4-7", "BG-2-47", "BG-2-23", "BG-9-22", "BG-15-7", "BG-11-32", "BG-18-66"] as const;
export type ShlokaId = (typeof SHLOKA_IDS)[number];

/** A verse is four pādas (quarter-lines). Pāda 2 ends with । and pāda 4 with ॥. */
export type Padas = readonly [string, string, string, string];

export interface Shloka {
  readonly id: ShlokaId;
  readonly chapter: number;
  readonly verse: number;
  /** Spoken attribution that precedes the verse in the text (11.32) but is not part of the verse itself. */
  readonly speaker?: string;
  readonly sanskrit: Padas;
  readonly transliteration: Padas;
  readonly meaningHindi: string;
  readonly meaningEnglish: string;
  readonly meaningReview: "draft" | "reviewed";
  /** Why this verse is in the film. Every verse must earn its place. */
  readonly purpose: string;
  readonly verification: {
    /** SHA-256 of the four pādas joined with "\n" (NFC). Recomputed by tests. */
    readonly sanskritSha256: string;
    readonly crossChecks: readonly { readonly source: string; readonly on: string; readonly result: "exact" }[];
    readonly supersiteSignOff: { readonly by: string; readonly on: string } | null;
  };
}

const CORPUS_CHECK = {
  source: "bhagavadgita.io corpus (github.com/gita/gita, data/verse.json), Devanagari letters",
  on: "2026-09-18",
  result: "exact"
} as const;

export const SHLOKAS: readonly Shloka[] = [
  {
    id: "BG-4-7",
    chapter: 4,
    verse: 7,
    sanskrit: ["यदा यदा हि धर्मस्य", "ग्लानिर्भवति भारत।", "अभ्युत्थानमधर्मस्य", "तदाऽऽत्मानं सृजाम्यहम्॥"],
    transliteration: ["yadā yadā hi dharmasya", "glānir bhavati bhārata", "abhyutthānam adharmasya", "tadātmānaṃ sṛjāmyaham"],
    meaningHindi: "जब-जब धर्म की हानि और अधर्म की वृद्धि होती है, तब-तब मैं स्वयं को प्रकट करता हूँ।",
    meaningEnglish: "Whenever there is decline of dharma and rise of adharma, I manifest Myself.",
    meaningReview: "draft",
    purpose: "Ends childhood on a promise: he arrives whenever the world needs him. Play becomes destiny as time freezes.",
    verification: {
      sanskritSha256: "0b8ba3aeacaac5cb2ea4fae6994f2be5d6067e948464292b4a637e86677cdd02",
      crossChecks: [CORPUS_CHECK],
      supersiteSignOff: null
    }
  },
  {
    id: "BG-2-47",
    chapter: 2,
    verse: 47,
    sanskrit: ["कर्मण्येवाधिकारस्ते", "मा फलेषु कदाचन।", "मा कर्मफलहेतुर्भूर्मा", "ते सङ्गोऽस्त्वकर्मणि॥"],
    transliteration: ["karmaṇy evādhikāras te", "mā phaleṣu kadācana", "mā karma-phala-hetur bhūr mā", "te saṅgo 'stvakarmaṇi"],
    meaningHindi:
      "तेरा अधिकार केवल कर्म करने में है, उसके फलों में कभी नहीं; तू कर्मफल का कारण मत बन, और कर्म न करने में भी तेरी आसक्ति न हो।",
    meaningEnglish:
      "Your right is to action, not to the fruits of action. Do not act for the fruit, and do not cling to inaction.",
    meaningReview: "draft",
    purpose: "Kishore walks toward the horizon carrying the teaching of action without attachment.",
    verification: {
      sanskritSha256: "a1426ddd7b64a363ed47f0dd985ef236312988e4d3690f411c1c8cef8afa6742",
      crossChecks: [CORPUS_CHECK],
      supersiteSignOff: null
    }
  },
  {
    id: "BG-2-23",
    chapter: 2,
    verse: 23,
    sanskrit: ["नैनं छिन्दन्ति शस्त्राणि", "नैनं दहति पावकः।", "न चैनं क्लेदयन्त्यापो", "न शोषयति मारुतः॥"],
    transliteration: ["nainaṃ chindanti śastrāṇi", "nainaṃ dahati pāvakaḥ", "na cainaṃ kledayanty āpo", "na śoṣayati mārutaḥ"],
    meaningHindi: "इस आत्मा को शस्त्र काट नहीं सकते, अग्नि जला नहीं सकती, जल भिगो नहीं सकता और वायु सुखा नहीं सकती।",
    meaningEnglish:
      "Weapons cannot cut the Self, fire cannot burn it, water cannot wet it, and wind cannot dry it.",
    meaningReview: "draft",
    purpose: "One pāda per element (weapon, fire, water, wind) over four cuts. The battlefield continues; the Self remains.",
    verification: {
      sanskritSha256: "b31e15db8586dbdd29848a0813278af0012a6e457234cd8596f34fb8110c9ac7",
      crossChecks: [CORPUS_CHECK],
      supersiteSignOff: null
    }
  },
  {
    id: "BG-9-22",
    chapter: 9,
    verse: 22,
    sanskrit: ["अनन्याश्चिन्तयन्तो मां", "ये जनाः पर्युपासते।", "तेषां नित्याभियुक्तानां", "योगक्षेमं वहाम्यहम्॥"],
    transliteration: ["ananyāś cintayanto māṃ", "ye janāḥ paryupāsate", "teṣāṃ nityābhiyuktānāṃ", "yoga-kṣemaṃ vahāmyaham"],
    meaningHindi:
      "जो अनन्य भाव से मेरा चिंतन करते हुए मेरी उपासना करते हैं, उन नित्य मुझमें लगे हुओं का योग और क्षेम मैं स्वयं वहन करता हूँ।",
    meaningEnglish:
      "For those who remain devoted and focused on Me, I carry what they lack and preserve what they have.",
    meaningReview: "draft",
    purpose: "The quiet promise inside the frozen battlefield: Krishna carries those who turn to him.",
    verification: {
      sanskritSha256: "ca966c7a0432a341cf032e97f54982398cb435a136a18d5f9c9cdfbe79459be4",
      crossChecks: [CORPUS_CHECK],
      supersiteSignOff: null
    }
  },
  {
    id: "BG-15-7",
    chapter: 15,
    verse: 7,
    sanskrit: ["ममैवांशो जीवलोके", "जीवभूतः सनातनः।", "मनःषष्ठानीन्द्रियाणि", "प्रकृतिस्थानि कर्षति॥"],
    transliteration: ["mamaivāṃśo jīva-loke", "jīva-bhūtaḥ sanātanaḥ", "manaḥ-ṣaṣṭhānīndriyāṇi", "prakṛti-sthāni karṣati"],
    meaningHindi:
      "इस जीवलोक में मेरा ही सनातन अंश जीव बना है, जो प्रकृति में स्थित मन सहित पाँचों इन्द्रियों को अपनी ओर खींचता है।",
    meaningEnglish:
      "An eternal portion of Myself, become the living soul in the world of life, draws the mind and the five senses that rest in nature.",
    meaningReview: "draft",
    purpose: "The bridge to the cosmic: the individual soul is a part of him. A human silhouette expands into consciousness.",
    verification: {
      sanskritSha256: "663bf4a610519ffc8ed1288114e4c13315f42b6baf21132606b2a1ba1257e62c",
      crossChecks: [CORPUS_CHECK],
      supersiteSignOff: null
    }
  },
  {
    id: "BG-11-32",
    chapter: 11,
    verse: 32,
    speaker: "श्रीभगवानुवाच",
    sanskrit: [
      "कालोऽस्मि लोकक्षयकृत्प्रवृद्धो",
      "लोकान्समाहर्तुमिह प्रवृत्तः।",
      "ऋतेऽपि त्वां न भविष्यन्ति सर्वे",
      "येऽवस्थिताः प्रत्यनीकेषु योधाः॥"
    ],
    transliteration: [
      "kālo 'smi loka-kṣaya-kṛt pravṛddho",
      "lokān samāhartum iha pravṛttaḥ",
      "ṛte 'pi tvāṃ na bhaviṣyanti sarve",
      "ye 'vasthitāḥ pratyanīkeṣu yodhāḥ"
    ],
    meaningHindi:
      "श्रीभगवान बोले: मैं लोकों का नाश करने वाला बढ़ा हुआ काल हूँ, और इस समय इन लोकों का संहार करने में प्रवृत्त हूँ। तुम्हारे बिना भी विपक्षी सेनाओं में स्थित सब योद्धा नहीं रहेंगे।",
    meaningEnglish:
      "The Blessed Lord said: I am Time, grown mighty, the destroyer of worlds, engaged here in gathering them in. Even without you, none of the warriors arrayed in the opposing armies will remain.",
    meaningReview: "draft",
    purpose: "Krishna declares himself Time. The darkest, most powerful moment: overwhelming, not horror.",
    verification: {
      sanskritSha256: "9fbc65b3820a13f73a23917f11a436a6eb4020d97cc26932a4b381b0cb8f3eb7",
      crossChecks: [CORPUS_CHECK],
      supersiteSignOff: null
    }
  },
  {
    id: "BG-18-66",
    chapter: 18,
    verse: 66,
    sanskrit: ["सर्वधर्मान्परित्यज्य", "मामेकं शरणं व्रज।", "अहं त्वा सर्वपापेभ्यो", "मोक्षयिष्यामि मा शुचः॥"],
    transliteration: ["sarva-dharmān parityajya", "mām ekaṃ śaraṇaṃ vraja", "ahaṃ tvā sarva-pāpebhyo", "mokṣayiṣyāmi mā śucaḥ"],
    meaningHindi: "सब धर्मों को त्यागकर तू केवल मेरी शरण में आ जा; मैं तुझे सभी पापों से मुक्त कर दूँगा, तू शोक मत कर।",
    meaningEnglish: "Take refuge in Me alone; I will free you from all wrongdoing; do not grieve.",
    meaningReview: "draft",
    purpose: "The emotional climax, delivered by a human-sized, silent, calm Krishna, after the cosmos has collapsed.",
    verification: {
      sanskritSha256: "580c2866de316bce71e8e6ebe58121e6e2ccf73552a845e8d2ad0640503d4b6e",
      crossChecks: [CORPUS_CHECK],
      supersiteSignOff: null
    }
  }
];

export const SHLOKA_BY_ID = Object.fromEntries(SHLOKAS.map((shloka) => [shloka.id, shloka])) as Record<ShlokaId, Shloka>;

/** The verse as one Devanagari string, one pāda per line. This is exactly what the hash covers. */
export const sanskritText = (shloka: Shloka) => shloka.sanskrit.join("\n").normalize("NFC");
