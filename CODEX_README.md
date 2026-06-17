# Pestulus – Codex Onboarding

## Prosjektoversikt
Pestulus er en monorepo-app for identifisering av norske skadedyr fra kamerabilde.
- `backend/` — Node + Express + TypeScript, deployes på Render
- `app/` — Expo (React Native Web), deployes på Vercel
- `docs/` — spesifikasjon og vision-prompt

## Stack
- **Frontend:** Expo SDK 54, Expo Router, React Native Web, TypeScript
- **Backend:** Node 18+, Express, TypeScript, tsx
- **AI:** Google Gemini 3.5 Flash via REST (generateContent)
- **Hosting:** Render (backend), Vercel (web)

## Lokalt oppsett

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fyll inn VISION_API_KEY
npm run dev            # kjører på port 8787
```

### Web-app
```bash
cd app
npm install
cp .env.example .env   # sett EXPO_PUBLIC_API_URL=http://localhost:8787
npx expo start --web
```

## Miljøvariabler

### backend/.env
```
PORT=8787
VISION_API_KEY=<google gemini api key>
VISION_API_URL=https://generativelanguage.googleapis.com/v1beta/models
VISION_MODEL=gemini-3.5-flash
CONFIDENCE_THRESHOLD=0.5
ALLOWED_ORIGIN=*
```

### app/.env
```
EXPO_PUBLIC_API_URL=http://localhost:8787
```

## Viktige filer
- `backend/src/lib/vision.ts` — Gemini-integrasjon, system-prompt, JSON-parsing
- `backend/src/data/species.json` — 152 norske skadedyrarter (kilde: FHI)
- `backend/src/routes/scan.ts` — POST /scan endepunkt
- `backend/src/routes/species.ts` — GET /species, /categories, /species/:id
- `app/app/(tabs)/_layout.tsx` — tab-navigasjon
- `app/app/+html.tsx` — HTML-shell for web/PWA (viewport-fit=cover)
- `app/constants/theme.ts` — alle designtokens (farger, radius, blur, typografi)
- `docs/skadedyr-app-spesifikasjon.md` — full app-spesifikasjon
- `docs/vision-system-prompt.md` — system-prompt for Gemini

## Kjente problemer som MÅ fikses
Se CODEX_PROMPT.md for detaljert oppgaveliste.

## Design
- Mørkt tema, minimalistisk, farger fra `Colors` i `app/constants/theme.ts`
- Liquid Glass-effekter via `expo-blur` (kun der det er eksplisitt implementert)
- Aksentfarge: `#C9A24B` (ravgul/gull)
- Bakgrunn: `#15171A`, Surface: `#1F2226`

## Konvensjoner
- TypeScript strict, ingen `any` med mindre nødvendig
- All brukervendt tekst på norsk (bokmål)
- API-nøkler KUN i backend, aldri i klientkode
- Ikke hardkod localhost — bruk `EXPO_PUBLIC_API_URL`

## Deploy
- **Backend → Render:** root=`backend`, build=`npm install && npm run build`, start=`npm start`
- **Web → Vercel:** root=`app`, build=`npx expo export -p web`, output=`dist`
- Sett env vars i Render/Vercel dashboard — ikke i kode
