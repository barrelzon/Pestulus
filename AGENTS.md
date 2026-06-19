# Pestulus — Skadedyr- og artsgjenkjenning

Følg alltid `docs/skadedyr-app-spesifikasjon.md` som kilde til sannhet.
System-prompten for vision-modellen ligger i `docs/vision-system-prompt.md`.

## Hva dette er
App som identifiserer norske skadedyr/insekter fra et kamerabilde. To klienter
(iOS + web) bygget med **Expo** (React Native + react-native-web) fra én
kodebase, og en felles backend. Versjon 1 dekker arter i Norge.

## Struktur
- `app/`      — Expo-app (iOS + web), TypeScript, Expo Router  (genereres, se README)
- `backend/`  — Node + Express + TypeScript (deploy: Render)
- `docs/`     — spesifikasjon + vision system-prompt

## Kommandoer
Backend:
- `cd backend && npm install`
- `npm run dev`    — start API lokalt (port 8787)
- `npm run build`  — kompiler TypeScript til `dist/`
- `npm start`      — kjør kompilert build (brukes på Render)

Expo-app (etter at den er generert):
- `cd app && npm install`
- `npx expo start`         — utvikling (iOS via Expo Go / simulator)
- `npx expo start --web`   — web-prototype i nettleser
- `npx expo export -p web` — statisk web-build (deploy til Vercel)

## Arkitektur
- Klient tar bilde → POST til backend `/scan` → backend kaller vision-LLM med
  system-prompten i `docs/vision-system-prompt.md` (kandidatliste innbakt) →
  returnerer `status` + topp-3 treff som JSON.
- AI-nøkkelen ligger KUN i backend (Render env vars). Klienten snakker bare med
  vår egen backend, aldri direkte med vision-leverandøren.
- History lagres lokalt på enheten (AsyncStorage) i v1 — ingen pålogging.
- 3 skjermer: Scan (startfane), Oversikt, History. Bunn-tabs, Scan i midten.

## Konvensjoner
- TypeScript strict, ingen `any`.
- Mørkt tema som standard. Liquid Glass etterlignes med `expo-blur` +
  gjennomskinnelige lag. Dempet, sofistikert palett, én rolig aksentfarge.
- All brukervendt tekst på norsk (bokmål). Forbered for i18n.
- Del designtokens (farger, radius, blur, typografi) i én modul brukt av hele appen.
- Bruk FHIs norske navn og kategori ORDRETT (må matche artsdatabasen).

## Ikke gjør
- IKKE legg API-nøkler eller hemmeligheter i klientkoden eller i git — bruk env.
- IKKE kall vision-leverandøren direkte fra klienten — alltid via backend.
- IKKE finn opp arter utenfor kandidatlista i gjenkjenningssvar.
- IKKE bruk neon eller skrikende gradienter; hold designet stilrent.
- IKKE hardkod `env(safe-area-inset-bottom)` i tabbar/web-PWA; React Navigation
  håndterer safe-area selv, og Safari hjemskjerm får ellers tom bunnpadding.
- IKKE skjul stack-header på en tab-skjerm uten å gi første scroll/liste eksplisitt
  `useSafeAreaInsets().top`; Dynamic Island spiser første kort.
- IKKE vis scan-resultatkort med bare brukerens opplastede bilde når arten har
  `bildeUrl`; artsbildet skal være hovedbilde, brukerbildene thumbnails.
- IKKE la scan-resultatarket strekke seg i full widescreen på desktop; begrens
  selve resultatpanelet med maks-bredde og hold det sentrert.
- IKKE filtrer bort alternative kandidater i «Feil art»-dialogen; vis alle arter
  i kategorien bortsett fra appens opprinnelige toppsvar, og tilby «Vet ikke».
- IKKE bruk emoji-flagg som eneste flaggvisning på web; desktop-fonter kan vise
  dem som NO/SE/DK i stedet for flagg.
- IKKE forenkle artskjennetegn slik at gruppearter får én feil farge/variant;
  skill vanlige arter fra sjeldne varianter når FHI gjør det.
- IKKE la sjeldne varianter dominere artsgjenkjenning; for helsvart maur skal
  modellen ikke bruke stokkmaur som standard bildetreff. Vurder svart jordmaur,
  sauemaur eller svart tremaur først.
- IKKE behold stokkmaur som toppresultat uten positiv tofargeaudit på selve
  maurkroppen; uklar audit eller svarte maur-alternativer i topp-5 skal gi
  usikkert resultat.
- IKKE stol på modellens fritekst for navn/kategori når id finnes; normaliser
  alltid treff mot artsdatabasen før logging og visning.
- IKKE hardkod vision-leverandørens API-form fra hukommelsen — les leverandørens
  gjeldende docs og verifiser request/response før du fullfører `src/lib/vision.ts`.
- IKKE stol på skjulte/ugjettbare URL-er som admin-sikkerhet — bruk backend-auth
  med hemmelighet fra env.
- IKKE lagre admin-søk/feedback i Render sin ephemeral deploy-mappe; bruk
  persistent storage (`ADMIN_DATA_DIR`) eller database.

## Byggerekkefølge
1. Backend: fullfør `/scan` (vision), `/species`, `/categories`, og bygg ut
   FHI-databasen (erstatt `src/data/species.sample.json`).
2. Web-prototype i Expo (raskest å teste i nettleser).
3. iOS-finpuss: kamera, tillatelser, glass-UI, navigasjon.

## Tips
Hver gang du retter en feil jeg gjør, legg til en kort regel i «Ikke gjør» over,
så feilen ikke gjentas.
