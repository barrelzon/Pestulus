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
  navnNo: string;
  navnLatin: string;
  kategori: string;
  kjennetegn?: string;
  forveksling?: string;
};
export type Treff = Candidate & { konfidens: number };
export type VisionStatus = "treff" | "usikker" | "ikke_skadedyr";
export type VisionResult = { status: VisionStatus; treff: Treff[] };

const CONFIDENCE_THRESHOLD = Number(process.env.CONFIDENCE_THRESHOLD ?? 0.7);
const CONFIDENCE_MARGIN_THRESHOLD = Number(process.env.CONFIDENCE_MARGIN_THRESHOLD ?? 0.15);

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
        },
        required: ["navnNo", "navnLatin", "kategori", "konfidens"],
      },
    },
  },
  required: ["status", "treff"],
};

function buildCategoryPrompt(categories: string[]): string {
  return `Du er en ekspert på skadedyr og insekter i Norge. Du får ett bilde.
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

function buildSpeciesPrompt(candidates: Candidate[]): string {
  const liste = candidates
    .map((c) => {
      const kj = c.kjennetegn ? ` | ${c.kjennetegn}` : "";
      const forv = c.forveksling ? `\n  NB forveksling: ${c.forveksling}` : "";
      return `${c.navnNo} | ${c.navnLatin}${kj}${forv}`;
    })
    .join("\n");

  return `Du er en ekspert på skadedyr og insekter i Norge. Du får ett bilde og en liste over mulige arter i kategorien. Oppgaven din er å avgjøre hvilken art på lista bildet mest sannsynlig viser.

REGLER:
- Velg KUN blant artene i kandidatlista under. Ikke finn på arter utenfor lista.
- Bruk navnNo og navnLatin NØYAKTIG slik de står i lista. Bruk kategori fra lista.
- Returner ALLTID de 5 mest sannsynlige artene (med mindre bildet ikke viser noe skadedyr i det hele tatt), sortert med høyest konfidens først.
- Vær realistisk og forsiktig med konfidens. Sett høy konfidens (over ca. 0.8) KUN når kjennetegnene i bildet er tydelige og entydige for én art. Fordel ellers sannsynligheten mer jevnt.
- Hvis du er usikker, sett "status": "usikker".
- Hvis bildet ikke viser et dyr/skadedyr, sett "status": "ikke_skadedyr" og "treff": [].
- Ellers sett "status": "treff".
- Svar KUN med gyldig JSON.

SVARFORMAT:
{"status":"treff"|"usikker"|"ikke_skadedyr","treff":[{"navnNo":"string","navnLatin":"string","kategori":"string","konfidens":0.0}]}

KANDIDATLISTE (navnNo | navnLatin | kjennetegn):
${liste}`;
}

function parseModelJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

async function callModel(
  systemPrompt: string,
  imageBase64: string,
  responseSchema: unknown,
): Promise<string> {
  const apiKey = process.env.VISION_API_KEY;
  const apiUrl = process.env.VISION_API_URL;
  const model = process.env.VISION_MODEL;

  if (!apiKey || !apiUrl || !model) {
    throw new Error("VISION_API_KEY / VISION_API_URL / VISION_MODEL mangler i .env");
  }

  const url = `${apiUrl.replace(/\/+$/, "")}/${model}:generateContent`;

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
            { text: "Hvilken art viser dette bildet?" },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      },
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

/** Trinn 1: velg kategori fra bildet. Returnerer kategorinavn eller null. */
async function identifyCategory(
  imageBase64: string,
  candidates: Candidate[],
): Promise<string | null> {
  const categories = [...new Set(candidates.map((c) => c.kategori))];
  const prompt = buildCategoryPrompt(categories);
  const raw = await callModel(prompt, imageBase64, CATEGORY_SCHEMA);
  const parsed = parseModelJson(raw) as { status: string; kategori: string };
  if (parsed.status === "ikke_skadedyr" || !parsed.kategori) return null;
  // Valider at kategorien faktisk finnes i lista
  return categories.includes(parsed.kategori) ? parsed.kategori : null;
}

/** Trinn 2: velg art blant innsnevrede kandidater. */
async function identifySpecies(
  imageBase64: string,
  candidates: Candidate[],
): Promise<VisionResult> {
  const prompt = buildSpeciesPrompt(candidates);
  const raw = await callModel(prompt, imageBase64, SPECIES_SCHEMA);
  const result = parseModelJson(raw) as VisionResult;
  if (!result || !Array.isArray(result.treff)) {
    throw new Error("Uventet svarformat fra modellen");
  }
  return result;
}

export async function identifyPest(
  imageBase64: string,
  candidates: Candidate[],
): Promise<VisionResult> {
  // Trinn 1: finn kategori
  const kategori = await identifyCategory(imageBase64, candidates);

  if (kategori === null) {
    return { status: "ikke_skadedyr", treff: [] };
  }

  // Trinn 2: finn art blant kandidater i den kategorien
  const narrowed = candidates.filter((c) => c.kategori === kategori);
  // Sikkerhetsnett: fallback til alle hvis kategorien er tom
  const finalCandidates = narrowed.length > 0 ? narrowed : candidates;

  const result = await identifySpecies(imageBase64, finalCandidates);

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
