import type { LinkType } from '../../types/task';

export interface RouteBar {
  x: number;
  width: number;
  y: number;
  /** Distancia del centro de la fila al borde superior / inferior de la barra (o al vértice del rombo). */
  halfHeight?: number;
  /** El elemento es un hito: un rombo centrado en `x`, sin ancho propio. */
  diamond?: boolean;
}

/**
 * Trazado ortogonal de una flecha de dependencia, compartido por el Gantt en pantalla y el PDF.
 *
 * Siempre termina apuntando hacia la barra sucesora:
 * - Con lugar de sobra entra por el borde lateral (hacia la derecha en un borde izquierdo, hacia la
 *   izquierda en un borde derecho).
 * - Un fin-comienzo "justo" (la sucesora arranca donde termina la predecesora) sale un poco a la derecha,
 *   baja derecho y apunta hacia abajo sobre el borde superior de la barra (o hacia arriba sobre el
 *   inferior si la sucesora está arriba), como en MS Project. Así no da la vuelta ni se amontona.
 * - Si ni eso es posible (la sucesora termina antes de que termine la predecesora), rodea el borde por el
 *   espacio entre filas.
 *
 * `stub` es el tramo mínimo, en las mismas unidades que las barras, al salir y al entrar.
 */
export function dependencyPath(type: LinkType, pred: RouteBar, succ: RouteBar, rowHeight: number, stub: number): string {
  const exitDir = type === 'FS' || type === 'FF' ? 1 : -1; // FS/FF salen por el borde derecho
  const enterDir = type === 'FS' || type === 'SS' ? 1 : -1; // FS/SS entran por el borde izquierdo

  const sx = exitDir === 1 ? pred.x + pred.width : pred.x;
  const sy = pred.y + rowHeight / 2;
  const tx = enterDir === 1 ? succ.x : succ.x + succ.width;
  const ty = succ.y + rowHeight / 2;

  const afterExit = sx + exitDir * stub; // primer punto fuera de la predecesora
  const beforeEntry = tx - enterDir * stub; // último punto antes de entrar a la sucesora

  let verticalX: number | null;
  switch (type) {
    case 'FS':
      verticalX = beforeEntry >= afterExit ? beforeEntry : null;
      break;
    case 'SF':
      verticalX = beforeEntry <= afterExit ? beforeEntry : null;
      break;
    case 'SS':
      verticalX = Math.min(sx, tx) - stub;
      break;
    case 'FF':
      verticalX = Math.max(sx, tx) + stub;
      break;
  }

  if (verticalX !== null) {
    return `M ${sx} ${sy} L ${verticalX} ${sy} L ${verticalX} ${ty} L ${tx} ${ty}`;
  }

  if (type === 'FS') {
    const half = succ.halfHeight ?? rowHeight / 3;
    const dropX = succ.diamond ? (succ.x >= sx ? succ.x : null) : fsDropX(sx, succ, stub);
    if (dropX !== null) {
      const landY = ty > sy ? ty - half : ty + half;
      return `M ${sx} ${sy} L ${dropX} ${sy} L ${dropX} ${landY}`;
    }
  }

  const gapY = ty > sy ? ty - rowHeight / 2 : ty + rowHeight / 2; // límite entre la fila de la sucesora y la anterior
  return `M ${sx} ${sy} L ${afterExit} ${sy} L ${afterExit} ${gapY} L ${beforeEntry} ${gapY} L ${beforeEntry} ${ty} L ${tx} ${ty}`;
}

/** x donde la flecha baja sobre la barra sucesora: un poco a la derecha del final de la predecesora, siempre dentro de la barra. */
function fsDropX(sx: number, succ: RouteBar, stub: number): number | null {
  const offset = stub / 2;
  const edgeInset = Math.min(offset, succ.width / 3);
  const dropX = Math.min(Math.max(sx, succ.x) + offset, succ.x + succ.width - edgeInset);
  return dropX > sx ? dropX : null; // tiene que salir hacia la derecha de la predecesora
}
