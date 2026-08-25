/**
 * Literal color values mirroring src/styles/tokens.css. svg2pdf.js reads raw SVG presentation
 * attributes — it cannot resolve CSS custom properties or color-mix(), so the print/export path
 * needs its own literal palette instead of the `var(--...)` tokens used on screen.
 */
export const PRINT_COLORS = {
  ink900: '#1a2027',
  ink700: '#3a4552',
  ink500: '#64707d',
  ink300: '#a3aeb8',
  ink100: '#e4e8ec',
  paper: '#ffffff',
  surface: '#f7f8f9',
  line: '#d3d9de',
  lineStrong: '#aeb8c2',
  gridWeekend: '#eef1f3',
  todayMarker: '#d1453b',
  accentCritical: '#b3261e',
  accentPrimary: '#2f5d8a',
};
