export type PaperSize = 'A4' | 'A3' | 'A2' | 'A1' | 'A0';

export const PAGE_SIZES_MM: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 297, height: 210 },
  A3: { width: 420, height: 297 },
  A2: { width: 594, height: 420 },
  A1: { width: 841, height: 594 },
  A0: { width: 1189, height: 841 },
};
