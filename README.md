# Pestulus

App som identifiserer norske skadedyr og insekter fra et kamerabilde.
iOS + web bygget med Expo, felles Node-backend. Sky-basert AI for gjenkjenning.

Se `docs/skadedyr-app-spesifikasjon.md` for full spesifikasjon.

---

## Kom i gang

### Forutsetninger
- Node.js 18+  (`node --version`)
- Git
- Claude Code  (`npm install -g @anthropic-ai/claude-code`)
- For iOS-bygg: Mac med Xcode, eller Expo Go-appen på en iPhone

### 1. Backend (allerede satt opp)
```bash
cd backend
npm install
cp .env.example .env      # fyll inn VISION_* når du har valgt leverandør
npm run dev               # API på http://localhost:8787
```

### 2. Generer Expo-appen
Fra rotmappen:
```bash
npx create-expo-app@latest app
cd app
npx expo install expo-router expo-camera expo-blur @react-native-async-storage/async-storage
npx expo start            # iOS via Expo Go / simulator
npx expo start --web      # web-prototype
```

### 3. Bygg videre med Claude Code
Fra rotmappen:
```bash
claude
```
Si f.eks.:
> Les CLAUDE.md og docs/. Sett opp Expo-appen med 3 faner (Scan, Oversikt,
> History) i mørkt tema med glass-UI, koblet til backend-ene. Følg
> byggerekkefølgen. Start med å koble Scan-skjermen til POST /scan.

Bruk gjerne **Plan Mode** for større oppgaver, og se gjennom diff-ene før du godtar.

---

## Deploy
- **Backend → Render:** Node-tjeneste. Build: `npm install && npm run build`.
  Start: `npm start`. Legg `VISION_API_KEY` m.m. som env vars i Render (ikke i git).
- **Web → Vercel:** `npx expo export -p web` gir statiske filer i `app/dist`.
  Pek Vercel mot `app/`, build-kommando `npx expo export -p web`, output `dist`.

## Struktur
```
Pestulus/
  CLAUDE.md          # stående instruks for Claude Code
  README.md
  docs/
    skadedyr-app-spesifikasjon.md
    vision-system-prompt.md
  backend/           # Node + Express + TypeScript (Render)
  app/               # Expo-app, iOS + web (genereres i steg 2)
```
