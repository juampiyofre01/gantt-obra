import { useState } from 'react';
import { formatNumberAR, parseNumberAR } from '../../utils/numberFormat';

interface QuantityCellProps {
  quantity: number | undefined;
  onChange: (quantity: number | undefined) => void;
}

/** Campo de cantidad con formato argentino (punto de miles, coma decimal) mientras no está en
 * foco; al editar muestra el valor crudo para que sea fácil de tipear. */
export function QuantityCell({ quantity, onChange }: QuantityCellProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const formatted = formatNumberAR(quantity);

  function commit() {
    if (draft === null) return;
    onChange(parseNumberAR(draft));
    setDraft(null);
  }

  return (
    <input
      className="grid-input grid-input--num"
      type="text"
      inputMode="decimal"
      value={draft ?? formatted}
      onFocus={() => setDraft(quantity !== undefined ? String(quantity).replace('.', ',') : '')}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(null);
      }}
    />
  );
}
