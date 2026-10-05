import type { LinkType } from '../../types/task';

export interface RouteBar {
  x: number;
  width: number;
  y: number;
}

/**
 * Trazado ortogonal de una flecha de dependencia, compartido por el Gantt en pantalla y el PDF.
 *
 * La flecha siempre entra a la barra sucesora desde afuera y avanzando hacia ella (hacia la derecha en
 * un borde izquierdo, hacia la izquierda en un borde derecho), así la punta apunta a la barra. Si no hay
 * lugar para un trazado directo (p. ej. una tarea que arranca justo donde termina su predecesora), la
 * flecha baja por el espacio entre filas y rodea el borde de entrada en lugar de volver sobre la barra.
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

  const gapY = ty > sy ? ty - rowHeight / 2 : ty + rowHeight / 2; // límite entre la fila de la sucesora y la anterior
  return `M ${sx} ${sy} L ${afterExit} ${sy} L ${afterExit} ${gapY} L ${beforeEntry} ${gapY} L ${beforeEntry} ${ty} L ${tx} ${ty}`;
}
