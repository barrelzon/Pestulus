# Codex – Oppgaveliste for Pestulus

Les CODEX_README.md og docs/skadedyr-app-spesifikasjon.md før du begynner.

---

## KRITISK: Fiks tab-bar på Safari PWA (iPhone)

Dette er hovedproblemet og skal løses FØRST.

**Symptom:** Når appen kjøres som PWA i Safari på iPhone (lagt til på hjemskjerm),
vises et mørkt felt UNDER tab-baren (Oversikt / Scan / Historikk). Tab-baren skal
ligge helt i bunnen av skjermen uten noe felt under seg.

**Kontekst:**
- Appen bruker `viewport-fit=cover` i `app/app/+html.tsx` — innholdet strekker
  seg under hjemindikatoren på iPhone
- React Navigation / Expo Router sin tab-bar på web håndterer ikke
  `env(safe-area-inset-bottom)` automatisk
- Feltet er safe-area-sonen som ikke absorberes av tab-baren
- Tidligere forsøk på å fikse dette har ikke løst problemet

**Krav til løsningen:**
- Tab-baren skal ligge helt i bunnen — ingen gap, ingen felt, ingen luft under
- Safe-area-sonen (hjemindikator på iPhone) skal absorberes AV tab-baren, ikke
  vises under den
- Ikonene i tab-baren skal ikke havne bak hjemindikatoren
- Løsningen må fungere i Safari PWA på iPhone (web, ikke native)
- Løsningen må ikke brekke layout på desktop web (Chrome/Firefox på PC)

**Relevante filer:**
- `app/app/(tabs)/_layout.tsx` — tab-layout og tabBarStyle
- `app/app/+html.tsx` — HTML-shell, viewport-meta, CSS
- `app/constants/theme.ts` — fargevariabler (Colors.background = #15171A)

**Teknisk tilnærming som sannsynligvis vil virke:**
Safari PWA på iPhone eksponerer safe-area via CSS-variabelen
`env(safe-area-inset-bottom)`. For React Navigation sin tab-bar på web må dette
settes via CSS, ikke via React Native styles (som ikke støtter `env()`-verdier
pålitelig på web). Løsningsforslag:
1. I `app/app/+html.tsx`: legg til en global CSS-regel som finner tab-barens
   wrapper-div (typisk `[data-testid="tab-bar"]` eller det React Navigation
   rendrer på web) og setter `padding-bottom: env(safe-area-inset-bottom)` og
   tilsvarende `height`-kompensasjon.
2. Alternativt: bruk et custom `tabBarComponent` som wrapper tab-baren i en
   `View` med riktig CSS-klasse og inline style som bruker `env()`.
3. Inspiser DOM-strukturen som React Navigation / Expo Router faktisk rendrer
   på web (kjør appen, åpne DevTools i Chrome, finn tab-bar-elementet) og sett
   CSS direkte på det elementet.

Ikke bruk `useSafeAreaInsets()` for denne fiksen — det er React Native sin
løsning og fungerer ikke pålitelig for web/PWA. Bruk CSS `env()` direkte.

Test løsningen:
- Primært: Safari PWA på iPhone (viewport-fit=cover, hjemindikator synlig)
- Sekundært: Chrome på PC (ingen safe-area, skal se uendret ut)
Bekreft at feltet under tab-baren er borte og at ikonene er godt synlige.

---

## Øvrige oppgaver (lavere prioritet)

### Brunskogmaur → Brun tremaur
I `backend/src/data/species.json` finnes en oppføring med `"navnNo":
"Brunskogmaur"` og `"navnLatin": "Lasius brunneus"`. "Brunskogmaur" er et
oppdiktet navn — det korrekte norske navnet er "Brun tremaur". Endre:
- `"id"`: "brunskogmaur" → "brun-tremaur"
- `"navnNo"`: "Brunskogmaur" → "Brun tremaur"
Behold alt annet uendret. Søk gjennom hele kodebasen etter "brunskogmaur" og
oppdater alle referanser.

### Verifiser bilde-kobling
Bekreft at `bildeUrl` er satt for alle arter som har en tilsvarende `.png`-fil
i `backend/public/images/`, og at backend serverer mappen statisk på `/images/`.
Test at et bilde med æ/ø/å i navnet (f.eks. "Blå spyfluer.png") laster korrekt.
