export const SCAN_RESULT_DESKTOP_BREAKPOINT = 1180;
export const SCAN_RESULT_DESKTOP_MAX_WIDTH = 760;

export type ScanResultPanelStyle = {
  width: '100%';
  maxWidth: number;
  alignSelf: 'center';
};

export function getScanResultPanelStyle(viewportWidth: number): ScanResultPanelStyle | null {
  if (viewportWidth < SCAN_RESULT_DESKTOP_BREAKPOINT) return null;

  return {
    width: '100%',
    maxWidth: SCAN_RESULT_DESKTOP_MAX_WIDTH,
    alignSelf: 'center',
  };
}
