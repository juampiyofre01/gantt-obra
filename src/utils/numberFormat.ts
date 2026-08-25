/** Formatea un número con la convención argentina: punto para miles, coma para decimales. */
export function formatNumberAR(n: number | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '';
  return n.toLocaleString('es-AR', { maximumFractionDigits: 3 });
}

/** Interpreta un texto en formato argentino (ej. "12.500,75") como número. */
export function parseNumberAR(text: string): number | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.replace(/\./g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}
