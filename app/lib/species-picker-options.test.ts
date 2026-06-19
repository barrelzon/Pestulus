import assert from 'node:assert/strict';
import test from 'node:test';

import { getSpeciesPickerOptions } from './species-picker-options';
import type { Species } from './api';

function species(id: string, navnNo: string, kategori = 'Maur'): Species {
  return {
    id,
    navnNo,
    navnLatin: `${navnNo} latin`,
    kategori,
    kategoriId: kategori,
    kjennetegn: '',
    beskrivelse: '',
    helsemessigBetydning: '',
    tiltak: '',
    bildeUrl: '',
    region: 'Norge',
  };
}

test('includes every species in the category except the app result', () => {
  const options = getSpeciesPickerOptions(
    [
      species('stokkmaur', 'Stokkmaur'),
      species('sauemaur', 'Sauemaur'),
      species('svart-jordmaur', 'Svart jordmaur'),
      species('brunrotte', 'Brunrotte', 'Gnagere'),
    ],
    'Maur',
    'stokkmaur',
    'no',
  );

  assert.deepEqual(
    options.map((item) => item.id),
    ['sauemaur', 'svart-jordmaur'],
  );
});

test('matches localized category names and canonical category ids', () => {
  const options = getSpeciesPickerOptions(
    [
      { ...species('stokkmaur', 'Hushästmyra', 'Myror'), kategoriId: 'Maur' },
      { ...species('sauemaur', 'Svart slavmyra', 'Myror'), kategoriId: 'Maur' },
    ],
    'Myror',
    'stokkmaur',
    'sv',
  );

  assert.deepEqual(
    options.map((item) => item.id),
    ['sauemaur'],
  );
});
