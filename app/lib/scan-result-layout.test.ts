import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SCAN_RESULT_DESKTOP_MAX_WIDTH,
  getScanResultPanelStyle,
} from './scan-result-layout';

test('desktop scan result panel is capped instead of stretching widescreen', () => {
  assert.deepEqual(getScanResultPanelStyle(2048), {
    width: '100%',
    maxWidth: SCAN_RESULT_DESKTOP_MAX_WIDTH,
    alignSelf: 'center',
  });
});

test('mobile scan result panel keeps the full bottom-sheet width', () => {
  assert.equal(getScanResultPanelStyle(390), null);
});
