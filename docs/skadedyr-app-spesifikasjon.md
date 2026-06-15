# App-spesifikasjon: Skadedyr- og artsgjenkjenning fra bilde (Pestulus)

> Versjon 1. Identifiserer skadedyr/insekter i Norge fra et kamerabilde.
> iOS + web bygget med Expo (React Native + react-native-web). Sky-basert AI.

---

## 1. Mål
App som identifiserer skadedyr og insekter fra et kamerabilde. Versjon 1 dekker
arter i Norge, med arkitektur forberedt på senere utvidelse til flere
verdensdeler (ikke lås datamodellen til Norge). Brukervendt språk: norsk
(bokmål), strukturert for senere lokalisering.

## 2. Plattformer og teknologi
Én Expo-kodebase bygger begge klientene:

- **iOS-app:** Expo / React Native. (Android kommer nærmest gratis senere.)
- **Web-app:** samme kode via react-native-web; eksporteres statisk og
  deployes til Vercel. Installerbar PWA.
- Kamera via `expo-camera`, lokal History via AsyncStorage, glass-effekt via
  `expo-blur`. Navigasjon via Expo Router.

Del datamodell, API-kontrakt, kategorier, tekster og designtokens på tvers.
(Merk: ekte iOS Liquid Glass i SwiftUI er valgt bort til fordel for Expo; glass-
uttrykket etterlignes med blur + gjennomskinnelige lag.)

## 3. Arkitektur (hosting: Render + Vercel)
```
[Expo-klient (iOS/web)]  ──>  [Backend på Render]  ──>  [Vision-LLM (sky)]
   tar bilde                  holder API-nøkkel          identifiserer art
   viser resultat       <──   parser JSON-svar     <──  svarer som JSON
```
- Backend serverer artsdata, tar imot bilde, skalerer ned, kaller vision-LLM med
  kandidatlista innbakt (se `vision-system-prompt.md`), parser JSON, returnerer treff.
- KRITISK: AI-nøkkelen ligger KUN på Render. Klienten snakker bare med vår backend.
- History lagres lokalt på enheten (AsyncStorage) i v1. Åpent for server-synk senere.

## 4. Valg av AI-tjeneste
Generell multimodal vision-LLM (ikke spesialisert biologi-API), fordi appen
matcher mot en kjent, kuratert liste. Send kandidatlista i prompten → modellen
returnerer dine navn/kategorier direkte som JSON.
- Start på en rimelig "Flash"-tier vision-modell (lav latens/kostnad).
- Eskalér til premium-modell ved lav konfidens (best kr/treff).
- Abstraher leverandøren bak ett grensesnitt (`src/lib/vision.ts`).

## 5. Gjenkjenningsflyt
- Klient: ta bilde → vis lastetilstand → POST `/scan` med base64-bilde.
- Backend: skaler ned → kall vision-LLM → returner `status` + topp-3 treff.
- Statuser i UI: `treff`, `usikker` (lav konfidens), `ikke_skadedyr` (tom liste),
  pluss nettfeil/tidsavbrudd → "prøv igjen".
- Personvern: brukerbilder sendes til tredjeparts AI. Vis samtykke-/personverntekst.
- Kostnad: skaler bilder ned (~1024 px) før opplasting.

## 6. De tre sidene

### 6.1 Scan (startfane)
Fullskjerm kamera-preview, én sentrert utløserknapp, minimalt overlegg (utløser,
blits, bytt kamera). Etter trykk: resultatkort glir opp som glass-panel med bilde,
art (norsk + latinsk), kategori, konfidens, knapp til detaljside. Håndter avslått
kameratilgang pent. Lagre vellykkede søk i History.

Ved treff: Like/Dislike-knapper for å gi tilbakemelding på gjenkjenningen, slik at
brukere kan bidra til å trene vision-intelligensen. Dislike åpner et lite vindu med
de øvrige artene i samme kategori, der brukeren kan velge riktig art. Tilbakemeldingen
sendes til backend (`POST /feedback`) og lagres for senere forbedring av
kandidatlista/prompten.

### 6.2 Oversikt (kategorier og arter)
Topp-nivå: kategorier basert på FHIs håndbok-grupper: Biller; Sommerfugler og
møll; Fluer og mygg; Maur; Veps, bier & humler; Veggedyr og andre teger; Lus;
Smådyr; Kakerlakker; Edderkopper, midd og flått; Gnagere; Fugler; Pattedyr;
Krypdyr / Reptiler. "Lus" omfatter kun ekte, blodsugende lus (Flatlus,
Hodelus, Kroppslus). "Smådyr" er FHIs samlekategori "Smådyr, annet" - en bred
samling av lopper, støvlus og andre småkryp uten egen kategori (bl.a.
Gulløyne, Hussiriss, Saksedyr, Skjeggkre, Skolopendere, Skrukketroll,
Spretthaler, Svømmekløe, Sølvkre, Taglormer, Trips, Tusenbein,
Børstetusenbein). Kategori → artsliste → detaljside (bilde, norsk + latinsk
navn, kategori, beskrivelse, helsemessig betydning, tiltak). Søkefelt for
fritekst på tvers av alle arter.

### 6.3 History (siste søk)
Kronologisk liste (nyeste øverst): miniatyrbilde, art, dato/tid, konfidens.
Trykk → detaljside med brukerens faktiske bilde. Slett enkeltoppføringer.
Tom tilstand peker mot Scan.

## 7. Datamodell
```
Species   { id, navnNo, navnLatin, kategori, beskrivelse,
            helsemessigBetydning, tiltak, bildeUrl, region (default: "Norge") }
Category  { navn, antall }
ScanRecord{ id, tidspunkt, brukerBildeRef, treffSpeciesId, konfidens,
            alternativeTreff[] }   // lagres lokalt i v1
```

### Artsbilder
Bildefiler legges i `backend/public/images/`, navngitt nøyaktig som artens
`navnNo` (f.eks. `Veggedyr.jpg`), filendelse `.jpg`/`.jpeg`/`.png`/`.webp`.
Backend (`src/lib/images.ts`) leser mappen ved oppstart og fyller `bildeUrl`
automatisk for arter som har et matchende bilde - `species.json` skal IKKE
redigeres manuelt for dette. `bildeUrl` returneres som relativ sti
(`/images/...`) og serveres statisk fra backend; klienten gjør den om til
full URL via `resolveImageUrl()` i `app/lib/api.ts`.

## 8. Datakilde og ansvar
- Kilde: FHIs Skadedyrhåndbok – https://www.fhi.no/sk/skadedyrhandboka/
  (grupper per seksjon, f.eks. /biller/, /fluer-og-mygg/, /gnagere/).
- `backend/src/data/species.sample.json` er kun et utdrag — erstatt med full data.
- Respekter FHIs bruksvilkår og vis kildehenvisning i appen.
- Ansvarsfraskrivelse: innholdet er veiledende; ved helserisiko/bekjempelse henvis
  til FHI / profesjonell skadedyrbekjemper.

## 9. Design
- Mørkt tema som standard. Stilrent, minimalistisk, moderne.
- Liquid Glass-uttrykk via expo-blur: gjennomskinnelige, lett uskarpe lag, mykt
  avrundede hjørner, subtile skygger.
- Dempet, sofistikert palett (mørk koksgrå + én rolig aksentfarge). IKKE neon.
- God whitespace, tydelig typografi-hierarki, ett aksentnivå.
- Bunn-tabs med 3 faner; Scan i midten og som startfane. Glass på tabs, kort, modaler.
- Felles designtokens (farger, radius, blur, typografi) i én modul.

## 10. Tilgjengelighet
God kontrast tross glass; støtte for skjermleser og forstørret tekst.

## 11. Senere
Flere verdensdeler/regioner; pålogging + server-synk av History; geotagging og kart.
