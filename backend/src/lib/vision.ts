/**
 * Vision-adapter — Google Gemini.
 *
 * To-trinns identifisering:
 *   1. Kategoritrinn: modellen velger én av 14 kategorier fra bildet.
 *   2. Artstrinn: modellen velger blant artene i den kategorien (med kjennetegn).
 *
 * Hvis du bytter leverandør: bare callModel (+ ev. parsing) trenger å endres.
 */

export type Candidate = {
  id: string;
  navnNo: string;
  navnLatin: string;
  kategori: string;
  kjennetegn?: string;
  forveksling?: string;
};
export type Treff = Candidate & { konfidens: number };
export type VisionStatus = "treff" | "usikker" | "ikke_skadedyr";
export type VisionResult = { status: VisionStatus; treff: Treff[] };
export type AntVisualAudit = {
  colorPattern: "helsvart" | "tofarget_rodbrun_sort" | "uklar";
  redBrownVisible: boolean;
};

const CONFIDENCE_THRESHOLD = Number(process.env.CONFIDENCE_THRESHOLD ?? 0.7);
const CONFIDENCE_MARGIN_THRESHOLD = Number(process.env.CONFIDENCE_MARGIN_THRESHOLD ?? 0.15);
const BLACK_ANT_ALTERNATIVE_IDS = ["sauemaur", "svart-jordmaur", "svart-tremaur"];

// Schema for trinn 1 — kategorigjenkjenning
const CATEGORY_SCHEMA = {
  type: "OBJECT",
  properties: {
    kategori: { type: "STRING" },
    status: { type: "STRING", enum: ["treff", "ikke_skadedyr"] },
  },
  required: ["kategori", "status"],
};

// Schema for trinn 2 — artsgjenkjenning (samme som før)
const SPECIES_SCHEMA = {
  type: "OBJECT",
  properties: {
    status: { type: "STRING", enum: ["treff", "usikker", "ikke_skadedyr"] },
    treff: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          navnNo: { type: "STRING" },
          navnLatin: { type: "STRING" },
          kategori: { type: "STRING" },
          konfidens: { type: "NUMBER" },
          id: { type: "STRING" },
        },
        required: ["id", "navnNo", "navnLatin", "kategori", "konfidens"],
      },
    },
  },
  required: ["status", "treff"],
};

const ANT_VISUAL_AUDIT_SCHEMA = {
  type: "OBJECT",
  properties: {
    colorPattern: {
      type: "STRING",
      enum: ["helsvart", "tofarget_rodbrun_sort", "uklar"],
    },
    redBrownVisible: { type: "BOOLEAN" },
  },
  required: ["colorPattern", "redBrownVisible"],
};

function buildCategoryPrompt(categories: string[]): string {
  return `Du er en ekspert på skadedyr og insekter i Norge. Du får ett eller flere bilder av samme funn.
Oppgaven din er å avgjøre hvilken kategori organismen på bildet tilhører.

KATEGORIER:
${categories.join("\n")}

REGLER:
- Velg KUN én kategori fra listen over.
- Bruk kategorinavnet NØYAKTIG slik det står i listen.
- Hvis bildet ikke viser noe dyr/insekt/skadedyr i det hele tatt, sett "status": "ikke_skadedyr" og "kategori": "".
- Ellers sett "status": "treff" og "kategori" til den beste kategorien.
- Svar KUN med gyldig JSON.

SVARFORMAT: {"status":"treff"|"ikke_skadedyr","kategori":"string"}`;
}

export function buildSpeciesPrompt(candidates: Candidate[]): string {
  const liste = candidates
    .map((c) => {
      const kj = c.kjennetegn ? ` | ${c.kjennetegn}` : "";
      const forv = c.forveksling ? `\n  NB forveksling: ${c.forveksling}` : "";
      return `${c.id} | ${c.navnNo} | ${c.navnLatin}${kj}${forv}`;
    })
    .join("\n");

  return `Du er en ekspert på skadedyr og insekter i Norge. Du får ett eller flere bilder av samme funn og en liste over mulige arter i kategorien. Oppgaven din er å avgjøre hvilken art på lista bildene mest sannsynlig viser.

REGLER:
- Velg KUN blant artene i kandidatlista under. Ikke finn på arter utenfor lista.
- Bruk id, navnNo og navnLatin NØYAKTIG slik de står i lista. Bruk kategori fra lista.
- Returner ALLTID de 5 mest sannsynlige artene (med mindre bildet ikke viser noe skadedyr i det hele tatt), sortert med høyest konfidens først.
- Vær realistisk og forsiktig med konfidens. Sett høy konfidens (over ca. 0.8) KUN når kjennetegnene i bildet er tydelige og entydige for én art. Fordel ellers sannsynligheten mer jevnt.
- Ikke bruk en sjelden variant som hovedforklaring når bildet bare viser et vanlig trekk. For maur: en helsvart maur skal ikke identifiseres som Stokkmaur bare fordi en sjelden helsvart stokkmaurvariant finnes. Ikke velg Stokkmaur for helsvarte maur. Sjeldne helsvarte stokkmaurvarianter skal ikke brukes som standard bildetreff. Når bildet viser helsvarte maur uten tydelig rødbrun/sort tofarging, velg Svart jordmaur, Sauemaur eller Svart tremaur, eller sett "status": "usikker". Velg Stokkmaur først når stor/kraftig kropp, jevnt krummet rygg og øvrige stokkmaurtrekk er tydelige.
- Hvis du er usikker, sett "status": "usikker".
- Hvis bildet ikke viser et dyr/skadedyr, sett "status": "ikke_skadedyr" og "treff": [].
- Ellers sett "status": "treff".
- Svar KUN med gyldig JSON.

SVARFORMAT:
{"status":"treff"|"usikker"|"ikke_skadedyr","treff":[{"id":"string","navnNo":"string","navnLatin":"string","kategori":"string","konfidens":0.0}]}

KANDIDATLISTE (id | navnNo | navnLatin | kjennetegn):
${liste}`;
}

function buildAntVisualAuditPrompt(): string {
  return `Du skal bare beskrive synlige trekk hos maurene på bildet, ikke artsbestemme.

REGLER:
- Sett colorPattern til "helsvart" når maurene fremstår svarte/mørke uten tydelig rødbrunt bryst eller kroppsparti.
- Sett colorPattern til "tofarget_rodbrun_sort" bare når både rødbrunt og sort er tydelig synlig på samme maur.
- Sett colorPattern til "uklar" hvis fargene ikke kan vurderes sikkert.
- Sett redBrownVisible til true bare når rødbrunt kroppsparti er tydelig synlig.
- Svar KUN med gyldig JSON.

SVARFORMAT: {"colorPattern":"helsvart"|"tofarget_rodbrun_sort"|"uklar","redBrownVisible":true|false}`;
}

function parseModelJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

export function buildGenerationConfig(responseSchema: unknown): {
  responseMimeType: "application/json";
  responseSchema: unknown;
  temperature: 0;
} {
  return {
    responseMimeType: "application/json",
    responseSchema,
    temperature: 0,
  };
}

async function callModel(
  systemPrompt: string,
  imageBase64List: string[],
  responseSchema: unknown,
  userPrompt?: string,
): Promise<string> {
  const apiKey = process.env.VISION_API_KEY;
  const apiUrl = process.env.VISION_API_URL;
  const model = process.env.VISION_MODEL;

  if (!apiKey || !apiUrl || !model) {
    throw new Error("VISION_API_KEY / VISION_API_URL / VISION_MODEL mangler i .env");
  }

  const url = `${apiUrl.replace(/\/+$/, "")}/${model}:generateContent`;
  const imageParts = imageBase64List.map((imageBase64) => ({
    inlineData: { mimeType: "image/jpeg", data: imageBase64 },
  }));
  const imagePrompt =
    userPrompt ??
    (imageBase64List.length === 1
      ? "Hvilken art viser dette bildet?"
      : `Hvilken art viser disse ${imageBase64List.length} bildene? Bildene viser samme funn fra ulike vinkler. Bruk samlet visuell informasjon.`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [
            { text: imagePrompt },
            ...imageParts,
          ],
        },
      ],
      generationConfig: buildGenerationConfig(responseSchema),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Vision-API (Gemini) svarte ${response.status}: ${body}`);
  }

  const data: unknown = await response.json();
  const text = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Fant ikke tekst i Gemini-svaret");
  }
  return text;
}

function isAntColorPattern(value: unknown): value is AntVisualAudit["colorPattern"] {
  return value === "helsvart" || value === "tofarget_rodbrun_sort" || value === "uklar";
}

async function auditAntVisuals(imageBase64List: string[]): Promise<AntVisualAudit | null> {
  const raw = await callModel(
    buildAntVisualAuditPrompt(),
    imageBase64List,
    ANT_VISUAL_AUDIT_SCHEMA,
    imageBase64List.length === 1
      ? "Beskriv bare synlig fargemønster hos maurene i bildet."
      : `Beskriv bare synlig fargemønster hos maurene i disse ${imageBase64List.length} bildene av samme funn.`,
  );
  const parsed = parseModelJson(raw) as { colorPattern?: unknown; redBrownVisible?: unknown };
  if (!isAntColorPattern(parsed.colorPattern) || typeof parsed.redBrownVisible !== "boolean") {
    return null;
  }
  return { colorPattern: parsed.colorPattern, redBrownVisible: parsed.redBrownVisible };
}

export function applyAntVisualGuard(
  result: VisionResult,
  audit: AntVisualAudit | null,
): VisionResult {
  const top = result.treff[0];
  if (!top || top.id !== "stokkmaur" || audit === null) return result;
  if (audit.colorPattern !== "helsvart" || audit.redBrownVisible) return result;

  const preferred = result.treff.filter((treff) => BLACK_ANT_ALTERNATIVE_IDS.includes(treff.id));
  const loweredStokkmaur = { ...top, konfidens: Math.min(top.konfidens, 0.25) };
  if (preferred.length === 0) {
    return { ...result, status: "usikker", treff: [loweredStokkmaur, ...result.treff.slice(1)] };
  }

  const adjustedPreferred = preferred.map((treff, index) => ({
    ...treff,
    konfidens: Math.max(treff.konfidens, Math.max(0.3, 0.55 - index * 0.1)),
  }));
  const remaining = result.treff.filter(
    (treff) =>
      treff.id !== top.id && !adjustedPreferred.some((preferredTreff) => preferredTreff.id === treff.id),
  );

  return {
    status: "usikker",
    treff: [...adjustedPreferred, ...remaining, loweredStokkmaur],
  };
}

export function normalizeVisionResult(result: VisionResult, candidates: Candidate[]): VisionResult {
  return {
    ...result,
    treff: result.treff.map((treff) => {
      const canonical = candidates.find(
        (candidate) =>
          candidate.id === treff.id ||
          candidate.navnNo === treff.navnNo ||
          candidate.navnLatin === treff.navnLatin,
      );
      return canonical ? { ...canonical, konfidens: treff.konfidens } : treff;
    }),
  };
}

async function applyVisualGuards(
  imageBase64List: string[],
  result: VisionResult,
): Promise<VisionResult> {
  if (result.treff[0]?.id !== "stokkmaur") return result;
  try {
    const audit = await auditAntVisuals(imageBase64List);
    return applyAntVisualGuard(result, audit);
  } catch (err) {
    console.warn("maur-fargeaudit-feil:", err);
    return result;
  }
}

/** Trinn 1: velg kategori fra bildet. Returnerer kategorinavn eller null. */
async function identifyCategory(
  imageBase64List: string[],
  candidates: Candidate[],
): Promise<string | null> {
  const categories = [...new Set(candidates.map((c) => c.kategori))];
  const prompt = buildCategoryPrompt(categories);
  const raw = await callModel(prompt, imageBase64List, CATEGORY_SCHEMA);
  const parsed = parseModelJson(raw) as { status: string; kategori: string };
  if (parsed.status === "ikke_skadedyr" || !parsed.kategori) return null;
  // Valider at kategorien faktisk finnes i lista
  return categories.includes(parsed.kategori) ? parsed.kategori : null;
}

/** Trinn 2: velg art blant innsnevrede kandidater. */
async function identifySpecies(
  imageBase64List: string[],
  candidates: Candidate[],
): Promise<VisionResult> {
  const prompt = buildSpeciesPrompt(candidates);
  const raw = await callModel(prompt, imageBase64List, SPECIES_SCHEMA);
  const result = parseModelJson(raw) as VisionResult;
  if (!result || !Array.isArray(result.treff)) {
    throw new Error("Uventet svarformat fra modellen");
  }
  return normalizeVisionResult(result, candidates);
}

export async function identifyPest(
  imageBase64List: string[],
  candidates: Candidate[],
): Promise<VisionResult> {
  // Trinn 1: finn kategori
  const kategori = await identifyCategory(imageBase64List, candidates);

  if (kategori === null) {
    return { status: "ikke_skadedyr", treff: [] };
  }

  // Trinn 2: finn art blant kandidater i den kategorien
  const narrowed = candidates.filter((c) => c.kategori === kategori);
  // Sikkerhetsnett: fallback til alle hvis kategorien er tom
  const finalCandidates = narrowed.length > 0 ? narrowed : candidates;

  const result = await applyVisualGuards(
    imageBase64List,
    await identifySpecies(imageBase64List, finalCandidates),
  );

  // Sikkerhetsnett: degrader "treff" til "usikker" hvis konfidens er for lav
  if (result.status === "treff") {
    const top = result.treff[0]?.konfidens ?? 0;
    const second = result.treff[1]?.konfidens ?? 0;
    if (top < CONFIDENCE_THRESHOLD || top - second < CONFIDENCE_MARGIN_THRESHOLD) {
      return { ...result, status: "usikker" };
    }
  }
  return result;
}
