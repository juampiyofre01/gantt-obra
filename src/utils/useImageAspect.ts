import { useEffect, useState } from 'react';

/** Devuelve ancho / alto de una imagen (data URL o URL) una vez cargada; undefined mientras tanto. */
export function useImageAspect(src: string | undefined): number | undefined {
  const [loaded, setLoaded] = useState<{ src: string; aspect: number } | null>(null);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled && img.naturalHeight > 0) setLoaded({ src, aspect: img.naturalWidth / img.naturalHeight });
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return src && loaded?.src === src ? loaded.aspect : undefined;
}
