# i18n translation review

Status: Swedish and Danish support is implemented for app UI, categories, scan results, and species names. Canonical Norwegian ids and categories remain the internal source of truth.

## Must Review Before Production

These entries use English names because no verified Swedish/Danish common name was found. Replace with a verified local name if one exists. If not, keep the English fallback.

### Swedish

| Norwegian name | Scientific name | Current Swedish value | Source/status |
| --- | --- | --- | --- |
| Blågrønn skinkebille | Korynetes caeruleus | Blue-green ham beetle | GBIF; English fallback |
| Sankthansoldenborre | Amphimallon solstitialis | summer chafer | manual English fallback |
| Sebraklanner | Trogoderma angustum | Skin beetle | GBIF; English fallback |
| Skinkebiller | Necrobia spp. | Ham beetles | GBIF; English fallback |
| Splintvedbiller | Lyctinae | powderpost beetles | manual English fallback |
| Vepsebolklanner | Reesa vespula | wasp nest dermestid | GBIF; English fallback |

### Danish

| Norwegian name | Scientific name | Current Danish value | Source/status |
| --- | --- | --- | --- |
| Brunhodereirmøll | Niditinea fuscella | brown house moth | manual English fallback |
| Broket kjukemøll | Nemapogon variatella | pale-backed clothes moth | manual English fallback |
| Råtesnutebille | Euophryum confine | New Zealand weevil | GBIF; English fallback |
| Sankthansoldenborre | Amphimallon solstitialis | summer chafer | manual English fallback |
| Skinkebiller | Necrobia spp. | Ham beetles | GBIF; English fallback |
| Splintvedbiller | Lyctinae | powderpost beetles | manual English fallback |

## Full Species Text

The long-form species fields are not translated yet:

- `kjennetegn`
- `forveksling`
- `beskrivelse`
- `helsemessigBetydning`
- `tiltak`

The backend returns `textStatus: "untranslated"` for Swedish and Danish until these fields are translated and reviewed. Do not mark them as verified until the terminology has been checked against reliable Swedish/Danish pest-control or public-health sources.

## Suggested Review Workflow

1. Verify the English fallbacks above first.
2. Translate full species text in batches by category.
3. Keep `nameStatus` and `textStatus` explicit in `backend/src/data/species-localizations.json`.
4. Add source notes in `nameSource` for any manual corrections.
