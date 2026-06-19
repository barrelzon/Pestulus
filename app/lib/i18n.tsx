import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export const supportedLanguages = ['no', 'sv', 'da'] as const;
export type AppLanguage = (typeof supportedLanguages)[number];

type TranslationParams = Record<string, string | number>;

const STORAGE_KEY = '@pestulus/language';

const strings = {
  no: {
    'language.no': 'Norsk',
    'language.sv': 'Svensk',
    'language.da': 'Dansk',
    'tabs.species': 'Arter',
    'tabs.scan': 'Scan',
    'tabs.history': 'Historikk',
    'common.retry': 'Prøv igjen',
    'common.close': 'Lukk',
    'common.errorTitle': 'Noe gikk feil',
    'common.networkError': 'Klarte ikke å kontakte serveren. Sjekk nettforbindelsen.',
    'common.requestFailed': 'Forespørselen feilet ({status}).',
    'confidence.high': 'Høy sikkerhet',
    'confidence.good': 'God sikkerhet',
    'confidence.moderate': 'Moderat sikkerhet',
    'confidence.low': 'Lav sikkerhet',
    'species.overviewTitle': 'Oversikt',
    'species.searchPlaceholder': 'Søk etter art…',
    'species.noSearchResults': 'Ingen arter samsvarer med søket.',
    'species.emptyCategory': 'Ingen arter i denne kategorien ennå.',
    'species.oneHit': '1 treff',
    'species.hitCount': '{count} treff',
    'species.count': '{count} arter',
    'species.imageComing': 'Bilde kommer',
    'species.characteristics': 'Kjennetegn',
    'species.confusedWith': 'Kan forveksles med',
    'species.description': 'Beskrivelse',
    'species.health': 'Helsemessig betydning',
    'species.measures': 'Tiltak',
    'species.loadError': 'Kunne ikke laste artsdata.',
    'species.loadSpeciesError': 'Kunne ikke laste arten.',
    'species.notFound': 'Fant ikke arten.',
    'species.sourceText':
      'Kilde: FHIs skadedyrhåndbok. Innholdet er veiledende — ved helserisiko eller behov for bekjempelse, kontakt FHI eller en profesjonell skadedyrbekjemper.',
    'scan.title': 'Analyser skadedyr',
    'scan.subtitle': 'Skann med kamera, eller last opp bilder.',
    'scan.cameraBlocked': 'Kamera er blokkert. Gi tilgang fra adressefeltet.',
    'scan.openSettings': 'Åpne innstillinger',
    'scan.startCamera': 'Start kamera',
    'scan.grantCamera': 'Gi kameratilgang',
    'scan.uploadImage': 'Last opp bilde',
    'scan.privacy':
      'Flere bilder av samme funn gir bedre treffsikkerhet. Ikke bland ulike funn i samme analyse. Gode bilder hjelper spesielt ved små skadedyr som insekter og fluer.',
    'scan.localOnly': 'Bildene lagres kun lokalt i historikken.',
    'scan.processImageError': 'Kunne ikke behandle bildet.',
    'scan.genericError': 'Noe gikk feil. Prøv igjen.',
    'scan.pickerError': 'Kunne ikke åpne bildevelgeren. Prøv igjen.',
    'scan.loading': 'Analyserer bilde…',
    'scan.reviewTitle': '{count}/3 bilder valgt',
    'scan.retakeLatest': 'Ta siste på nytt',
    'scan.takePhoto': 'Ta bilde',
    'scan.upload': 'Last opp',
    'scan.analyzeOne': 'Analyser 1 bilde',
    'scan.analyzeMany': 'Analyser {count} bilder',
    'scan.correctSpecies': 'Riktig art',
    'scan.wrongSpecies': 'Feil art',
    'scan.feedbackThanks': 'Takk for tilbakemeldingen!',
    'scan.feedbackThanksCorrection': 'Takk! Vi registrerer at det egentlig var {species}.',
    'scan.hideAlternatives': 'Skjul andre muligheter',
    'scan.otherPossibilities': 'Andre muligheter ({count})',
    'scan.fullDescription': 'Se full artsbeskrivelse →',
    'scan.uncertainResult': 'Usikkert resultat',
    'scan.uncertainBody': 'Bildet er vanskelig å identifisere sikkert.',
    'scan.mostLikely': 'Mest sannsynlig',
    'scan.alsoPossible': 'Kan også være',
    'scan.newPhoto': 'Ta nytt bilde',
    'scan.noPestTitle': 'Ingen skadedyr funnet',
    'scan.noPestBody': 'Vi fant ikke noe skadedyr i bildet. Prøv å ta bildet nærmere eller med bedre lys.',
    'picker.title': 'Velg riktig art',
    'picker.subtitle': 'Hvilken art i kategorien «{category}» var det egentlig?',
    'picker.unknown': 'Vet ikke',
    'picker.loadError': 'Kunne ikke laste arter.',
    'picker.empty': 'Ingen flere arter i denne kategorien.',
    'history.emptyTitle': 'Ingen søk ennå',
    'history.emptyBody': 'Skann et skadedyr i Scan-fanen for å se resultatet her.',
    'history.goToScan': 'Gå til Scan',
    'history.notFound': 'Fant ikke dette søket. Det kan ha blitt slettet.',
    'history.viewSpecies': 'Se artsinformasjon',
    'history.otherCandidates': 'Andre kandidater',
    'history.delete': 'Slett fra historikk',
  },
  sv: {
    'language.no': 'Norska',
    'language.sv': 'Svenska',
    'language.da': 'Danska',
    'tabs.species': 'Arter',
    'tabs.scan': 'Skanna',
    'tabs.history': 'Historik',
    'common.retry': 'Försök igen',
    'common.close': 'Stäng',
    'common.errorTitle': 'Något gick fel',
    'common.networkError': 'Kunde inte kontakta servern. Kontrollera nätanslutningen.',
    'common.requestFailed': 'Förfrågan misslyckades ({status}).',
    'confidence.high': 'Hög säkerhet',
    'confidence.good': 'God säkerhet',
    'confidence.moderate': 'Måttlig säkerhet',
    'confidence.low': 'Låg säkerhet',
    'species.overviewTitle': 'Översikt',
    'species.searchPlaceholder': 'Sök efter art…',
    'species.noSearchResults': 'Inga arter matchar sökningen.',
    'species.emptyCategory': 'Inga arter i den här kategorin ännu.',
    'species.oneHit': '1 träff',
    'species.hitCount': '{count} träffar',
    'species.count': '{count} arter',
    'species.imageComing': 'Bild kommer',
    'species.characteristics': 'Kännetecken',
    'species.confusedWith': 'Kan förväxlas med',
    'species.description': 'Beskrivning',
    'species.health': 'Hälsomässig betydelse',
    'species.measures': 'Åtgärder',
    'species.loadError': 'Kunde inte ladda artdata.',
    'species.loadSpeciesError': 'Kunde inte ladda arten.',
    'species.notFound': 'Hittade inte arten.',
    'species.sourceText':
      'Källa: FHIs skadedjurshandbok. Innehållet är vägledande — vid hälsorisk eller behov av bekämpning, kontakta FHI eller en professionell skadedjursbekämpare.',
    'scan.title': 'Analysera skadedjur',
    'scan.subtitle': 'Skanna med kamera eller ladda upp bilder.',
    'scan.cameraBlocked': 'Kameran är blockerad. Ge åtkomst från adressfältet.',
    'scan.openSettings': 'Öppna inställningar',
    'scan.startCamera': 'Starta kamera',
    'scan.grantCamera': 'Ge kameratillgång',
    'scan.uploadImage': 'Ladda upp bild',
    'scan.privacy':
      'Flera bilder av samma fynd ger bättre träffsäkerhet. Blanda inte olika fynd i samma analys. Bra bilder hjälper särskilt vid små skadedjur som insekter och flugor.',
    'scan.localOnly': 'Bilderna sparas bara lokalt i historiken.',
    'scan.processImageError': 'Kunde inte behandla bilden.',
    'scan.genericError': 'Något gick fel. Försök igen.',
    'scan.pickerError': 'Kunde inte öppna bildväljaren. Försök igen.',
    'scan.loading': 'Analyserar bild…',
    'scan.reviewTitle': '{count}/3 bilder valda',
    'scan.retakeLatest': 'Ta om senaste',
    'scan.takePhoto': 'Ta bild',
    'scan.upload': 'Ladda upp',
    'scan.analyzeOne': 'Analysera 1 bild',
    'scan.analyzeMany': 'Analysera {count} bilder',
    'scan.correctSpecies': 'Rätt art',
    'scan.wrongSpecies': 'Fel art',
    'scan.feedbackThanks': 'Tack för återkopplingen!',
    'scan.feedbackThanksCorrection': 'Tack! Vi registrerar att det egentligen var {species}.',
    'scan.hideAlternatives': 'Dölj andra möjligheter',
    'scan.otherPossibilities': 'Andra möjligheter ({count})',
    'scan.fullDescription': 'Se full artbeskrivning →',
    'scan.uncertainResult': 'Osäkert resultat',
    'scan.uncertainBody': 'Bilden är svår att identifiera säkert.',
    'scan.mostLikely': 'Mest sannolikt',
    'scan.alsoPossible': 'Kan också vara',
    'scan.newPhoto': 'Ta ny bild',
    'scan.noPestTitle': 'Inget skadedjur hittades',
    'scan.noPestBody': 'Vi hittade inget skadedjur i bilden. Försök ta bilden närmare eller med bättre ljus.',
    'picker.title': 'Välj rätt art',
    'picker.subtitle': 'Vilken art i kategorin ”{category}” var det egentligen?',
    'picker.unknown': 'Vet inte',
    'picker.loadError': 'Kunde inte ladda arter.',
    'picker.empty': 'Inga fler arter i den här kategorin.',
    'history.emptyTitle': 'Inga sökningar ännu',
    'history.emptyBody': 'Skanna ett skadedjur i Skanna-fliken för att se resultatet här.',
    'history.goToScan': 'Gå till Skanna',
    'history.notFound': 'Hittade inte den här sökningen. Den kan ha tagits bort.',
    'history.viewSpecies': 'Se artinformation',
    'history.otherCandidates': 'Andra kandidater',
    'history.delete': 'Radera från historik',
  },
  da: {
    'language.no': 'Norsk',
    'language.sv': 'Svensk',
    'language.da': 'Dansk',
    'tabs.species': 'Arter',
    'tabs.scan': 'Scan',
    'tabs.history': 'Historik',
    'common.retry': 'Prøv igen',
    'common.close': 'Luk',
    'common.errorTitle': 'Noget gik galt',
    'common.networkError': 'Kunne ikke kontakte serveren. Tjek netforbindelsen.',
    'common.requestFailed': 'Forespørgslen mislykkedes ({status}).',
    'confidence.high': 'Høj sikkerhed',
    'confidence.good': 'God sikkerhed',
    'confidence.moderate': 'Moderat sikkerhed',
    'confidence.low': 'Lav sikkerhed',
    'species.overviewTitle': 'Oversigt',
    'species.searchPlaceholder': 'Søg efter art…',
    'species.noSearchResults': 'Ingen arter matcher søgningen.',
    'species.emptyCategory': 'Ingen arter i denne kategori endnu.',
    'species.oneHit': '1 hit',
    'species.hitCount': '{count} hits',
    'species.count': '{count} arter',
    'species.imageComing': 'Billede kommer',
    'species.characteristics': 'Kendetegn',
    'species.confusedWith': 'Kan forveksles med',
    'species.description': 'Beskrivelse',
    'species.health': 'Sundhedsmæssig betydning',
    'species.measures': 'Tiltag',
    'species.loadError': 'Kunne ikke indlæse artsdata.',
    'species.loadSpeciesError': 'Kunne ikke indlæse arten.',
    'species.notFound': 'Fandt ikke arten.',
    'species.sourceText':
      'Kilde: FHIs skadedyrshåndbog. Indholdet er vejledende — ved sundhedsrisiko eller behov for bekæmpelse, kontakt FHI eller en professionel skadedyrsbekæmper.',
    'scan.title': 'Analyser skadedyr',
    'scan.subtitle': 'Scan med kamera, eller upload billeder.',
    'scan.cameraBlocked': 'Kameraet er blokeret. Giv adgang fra adresselinjen.',
    'scan.openSettings': 'Åbn indstillinger',
    'scan.startCamera': 'Start kamera',
    'scan.grantCamera': 'Giv kameraadgang',
    'scan.uploadImage': 'Upload billede',
    'scan.privacy':
      'Flere billeder af samme fund giver bedre træfsikkerhed. Bland ikke forskellige fund i samme analyse. Gode billeder hjælper især ved små skadedyr som insekter og fluer.',
    'scan.localOnly': 'Billederne gemmes kun lokalt i historikken.',
    'scan.processImageError': 'Kunne ikke behandle billedet.',
    'scan.genericError': 'Noget gik galt. Prøv igen.',
    'scan.pickerError': 'Kunne ikke åbne billedvælgeren. Prøv igen.',
    'scan.loading': 'Analyserer billede…',
    'scan.reviewTitle': '{count}/3 billeder valgt',
    'scan.retakeLatest': 'Tag seneste om',
    'scan.takePhoto': 'Tag billede',
    'scan.upload': 'Upload',
    'scan.analyzeOne': 'Analyser 1 billede',
    'scan.analyzeMany': 'Analyser {count} billeder',
    'scan.correctSpecies': 'Rigtig art',
    'scan.wrongSpecies': 'Forkert art',
    'scan.feedbackThanks': 'Tak for tilbagemeldingen!',
    'scan.feedbackThanksCorrection': 'Tak! Vi registrerer, at det egentlig var {species}.',
    'scan.hideAlternatives': 'Skjul andre muligheder',
    'scan.otherPossibilities': 'Andre muligheder ({count})',
    'scan.fullDescription': 'Se fuld artsbeskrivelse →',
    'scan.uncertainResult': 'Usikkert resultat',
    'scan.uncertainBody': 'Billedet er vanskeligt at identificere sikkert.',
    'scan.mostLikely': 'Mest sandsynlig',
    'scan.alsoPossible': 'Kan også være',
    'scan.newPhoto': 'Tag nyt billede',
    'scan.noPestTitle': 'Intet skadedyr fundet',
    'scan.noPestBody': 'Vi fandt ikke noget skadedyr i billedet. Prøv at tage billedet tættere på eller med bedre lys.',
    'picker.title': 'Vælg rigtig art',
    'picker.subtitle': 'Hvilken art i kategorien »{category}« var det egentlig?',
    'picker.unknown': 'Ved ikke',
    'picker.loadError': 'Kunne ikke indlæse arter.',
    'picker.empty': 'Ingen flere arter i denne kategori.',
    'history.emptyTitle': 'Ingen søgninger endnu',
    'history.emptyBody': 'Scan et skadedyr i Scan-fanen for at se resultatet her.',
    'history.goToScan': 'Gå til Scan',
    'history.notFound': 'Fandt ikke denne søgning. Den kan være blevet slettet.',
    'history.viewSpecies': 'Se artsinformation',
    'history.otherCandidates': 'Andre kandidater',
    'history.delete': 'Slet fra historik',
  },
} as const;

export type TranslationKey = keyof typeof strings.no;

export function localeForLanguage(language: AppLanguage): string {
  if (language === 'sv') return 'sv-SE';
  if (language === 'da') return 'da-DK';
  return 'nb-NO';
}

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isSupportedLanguage(value: string | null | undefined): value is AppLanguage {
  return value === 'no' || value === 'sv' || value === 'da';
}

function detectLanguage(): AppLanguage {
  const locale = Localization.getLocales()[0]?.languageCode?.toLowerCase();
  return isSupportedLanguage(locale) ? locale : 'no';
}

function interpolate(value: string, params?: TranslationParams): string {
  if (!params) return value;
  return Object.entries(params).reduce(
    (text, [key, param]) => text.replaceAll(`{${key}}`, String(param)),
    value
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => detectLanguage());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (isSupportedLanguage(stored)) setLanguageState(stored);
      })
      .catch(() => {});
  }, []);

  const setLanguage = useCallback((nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    AsyncStorage.setItem(STORAGE_KEY, nextLanguage).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language === 'no' ? 'nb' : language;
    }
  }, [language]);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => interpolate(strings[language][key], params),
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useI18n must be used inside LanguageProvider');
  return context;
}
