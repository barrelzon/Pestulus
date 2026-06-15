# Artsbilder

Legg bildefiler her, ett bilde per art, navngitt **nøyaktig** som artens
`navnNo` i `backend/src/data/species.json` - inkludert mellomrom, store/små
bokstaver og norske tegn (æøå).

Eksempler:
- `Veggedyr.jpg`
- `Brun støvlus.png`
- `Kornbille.webp`

Tillatte filendelser: `.jpg`, `.jpeg`, `.png`, `.webp`.

Backend leser denne mappen ved oppstart og kobler automatisk bildet til arten
(`bildeUrl` i `/species`-svarene) hvis filnavnet matcher `navnNo`
(uavhengig av store/små bokstaver). Restart `npm run dev` etter å ha lagt til
nye bilder. Arter uten bildefil vises med en plassholder i appen.
