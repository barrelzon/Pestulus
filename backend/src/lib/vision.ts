/**
 * Vision-adapter — Google Gemini.
 *
 * Bygger system-prompten (kandidatliste + JSON-kontrakt, jf.
 * docs/vision-system-prompt.md) og kaller Gemini sin generateContent-endpoint
 * med bilde + tekst (REST API, x-goog-api-key header).
 *
 * Hvis du senere bytter leverandør: bare denne filen (callModel + ev. parsing
 * av svarstruktur) trenger å endres. Resten av appen er leverandøruavhengig.
 */

export type Candidate = { navnNo: string; navnLatin: string; kategori: string };
export type Treff = Candidate & { konfidens: number };
export type VisionStatus = "treff" | "usikker" | "ikke_skadedyr";
export type VisionResult = { status: VisionStatus; treff: Treff[] };

// Krav til toppkandidatens konfidens for status "treff" - under dette degraderes til "usikker".
const CONFIDENCE_THRESHOLD = Number(process.env.CONFIDENCE_THRESHOLD ?? 0.7);
// Krav til avstand mellom nr. 1 og nr. 2 for status "treff" - for liten avstand
// betyr at de to beste kandidatene er for like til å skille sikkert.
const CONFIDENCE_MARGIN_THRESHOLD = Number(process.env.CONFIDENCE_MARGIN_THRESHOLD ?? 0.15);

// Tvinger Gemini til å svare med ETT JSON-objekt på formen i SVARFORMAT (ikke en
// liste). Uten dette har gemini-3.1-pro-preview observert å pakke svaret i en
// array (f.eks. [{"status":...,"treff":[]}]), som parseModelJson ikke takler.
const RESPONSE_SCHEMA = {
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

function buildSystemPrompt(candidates: Candidate[]): string {
  const liste = candidates
    .map((c) => `${c.navnNo} | ${c.navnLatin} | ${c.kategori}`)
    .join("\n");

  return `Du er en ekspert på skadedyr og insekter i Norge. Du får ett bilde og en liste over kjente arter. Oppgaven din er å avgjøre hvilken art på lista bildet mest sannsynlig viser.

REGLER:
- Velg KUN blant artene i kandidatlista under. Ikke finn på arter utenfor lista.
- Bruk navnNo, navnLatin og kategori NØYAKTIG slik de står i lista.
- Returner ALLTID de 5 mest sannsynlige artene fra lista (med mindre bildet ikke viser noe skadedyr i det hele tatt), sortert med høyest konfidens først. Konfidens er et tall mellom 0 og 1.
- Vær realistisk og forsiktig med konfidens. Sett høy konfidens (over ca. 0.8) KUN når kjennetegnene i bildet er tydelige og entydige for én art. Hvis flere arter på lista har lignende form, størrelse eller fargetegning, og bildet ikke gir grunnlag for å skille dem sikkert, FORDEL sannsynligheten mer jevnt mellom de mest sannsynlige kandidatene (f.eks. 0.4 / 0.3 / 0.2) i stedet for å gi én art en urealistisk høy konfidens.
- Hvis du er usikker på hvilken art det er - enten fordi flere arter er like sannsynlige, eller fordi ingen art på lista passer godt - sett "status": "usikker", selv om bildet tydelig viser et insekt/skadedyr.
- Hvis bildet ikke viser et dyr/skadedyr i det hele tatt, sett "status": "ikke_skadedyr" og la "treff" være [].
- Ellers, når én art klart er mest sannsynlig og kjennetegnene er tydelige, sett "status": "treff".
- Svar KUN med gyldig JSON. Ingen forklaring, ingen markdown, ingen kodeblokk.

SVARFORMAT:
{"status":"treff"|"usikker"|"ikke_skadedyr","treff":[{"navnNo":"string","navnLatin":"string","kategori":"string","konfidens":0.0}]}

KANDIDATLISTE (navnNo | navnLatin | kategori):
${liste}`;
}

/** Robust parsing: fjern ev. kodeblokk-fences og parse JSON. */
function parseModelJson(text: string): VisionResult {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned) as VisionResult;
  if (!parsed || !Array.isArray(parsed.treff)) {
    throw new Error("Uventet svarformat fra modellen");
  }
  return parsed;
}

/**
 * Kaller Gemini sin generateContent-endpoint med system-prompt (som
 * systemInstruction) + bilde som inline_data (base64) + en kort tekstdel.
 * VISION_API_URL skal være basis-URL uten modellnavn/metode, f.eks.:
 *   https://generativelanguage.googleapis.com/v1beta/models
 * Full URL bygges som: {VISION_API_URL}/{VISION_MODEL}:generateContent
 */
async function callModel(systemPrompt: string, imageBase64: string): Promise<string> {
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
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Vision-API (Gemini) svarte ${response.status}: ${body}`);
  }

  const data: any = await response.json();
  // Gemini-svar: candidates[0].content.parts[0].text
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Fant ikke tekst i Gemini-svaret");
  }
  return text;
}

export async function identifyPest(
  imageBase64: string,
  candidates: Candidate[],
): Promise<VisionResult> {
  const systemPrompt = buildSystemPrompt(candidates);
  const raw = await callModel(systemPrompt, imageBase64);
  const result = parseModelJson(raw);

  // Sikkerhetsnett: degrader "treff" til "usikker" hvis toppkandidaten ikke er
  // sikker nok på egen hånd, eller hvis nr. 1 og nr. 2 ligger for nær hverandre
  // (modellen kan være overdrevent selvsikker selv når den er bedt om å fordele
  // sannsynligheten realistisk).
  if (result.status === "treff") {
    const top = result.treff[0]?.konfidens ?? 0;
    const second = result.treff[1]?.konfidens ?? 0;
    if (top < CONFIDENCE_THRESHOLD || top - second < CONFIDENCE_MARGIN_THRESHOLD) {
      return { ...result, status: "usikker" };
    }
  }
  return result;
}
