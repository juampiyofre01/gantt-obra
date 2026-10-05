import { describe, expect, it } from 'vitest';
import { dependencyPath, type RouteBar } from '../dependencyRoute';

const ROW = 30;
const STUB = 14;

function points(path: string): { x: number; y: number }[] {
  const n = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  const pts = [];
  for (let i = 0; i < n.length; i += 2) pts.push({ x: n[i], y: n[i + 1] });
  return pts;
}

/** Sentido horizontal del primer y del último tramo (+1 derecha, -1 izquierda). */
function directions(path: string) {
  const p = points(path);
  const first = Math.sign(p[1].x - p[0].x);
  const last = Math.sign(p[p.length - 1].x - p[p.length - 2].x);
  return { first, last, count: p.length };
}

const pred: RouteBar = { x: 0, width: 100, y: 0 };

describe('dependencyPath — la flecha siempre entra hacia la barra', () => {
  it('FS con lugar de sobra: 3 tramos, entra hacia la derecha', () => {
    const d = directions(dependencyPath('FS', pred, { x: 200, width: 50, y: ROW }, ROW, STUB));
    expect(d).toEqual({ first: 1, last: 1, count: 4 });
  });

  it('FS donde la sucesora arranca justo al terminar la predecesora: rodea y entra hacia la derecha', () => {
    const d = directions(dependencyPath('FS', pred, { x: 100, width: 50, y: ROW }, ROW, STUB));
    expect(d).toEqual({ first: 1, last: 1, count: 6 });
  });

  it('FS donde la sucesora arranca antes de que termine la predecesora: entra hacia la derecha', () => {
    const d = directions(dependencyPath('FS', pred, { x: 40, width: 50, y: ROW }, ROW, STUB));
    expect(d.last).toBe(1);
  });

  it('FS hacia una sucesora que está arriba: baja/sube por el límite entre filas', () => {
    const above: RouteBar = { x: 100, width: 50, y: -ROW };
    const p = points(dependencyPath('FS', { ...pred, y: ROW }, above, ROW, STUB));
    const ty = above.y + ROW / 2;
    expect(p[2].y).toBe(ty + ROW / 2); // límite inferior de la fila de la sucesora
    expect(Math.sign(p[p.length - 1].x - p[p.length - 2].x)).toBe(1);
  });

  it('SS: sale y entra por la izquierda, entrando hacia la derecha', () => {
    const d = directions(dependencyPath('SS', { x: 100, width: 50, y: 0 }, { x: 150, width: 50, y: ROW }, ROW, STUB));
    expect(d).toEqual({ first: -1, last: 1, count: 4 });
  });

  it('SS con la sucesora mucho antes: sigue entrando hacia la derecha', () => {
    const d = directions(dependencyPath('SS', { x: 300, width: 50, y: 0 }, { x: 100, width: 50, y: ROW }, ROW, STUB));
    expect(d.last).toBe(1);
  });

  it('FF: sale por la derecha y entra hacia la izquierda por el borde derecho', () => {
    const d = directions(dependencyPath('FF', pred, { x: 20, width: 40, y: ROW }, ROW, STUB));
    expect(d).toEqual({ first: 1, last: -1, count: 4 });
  });

  it('FF con la sucesora terminando mucho después: sigue entrando hacia la izquierda', () => {
    const d = directions(dependencyPath('FF', pred, { x: 300, width: 100, y: ROW }, ROW, STUB));
    expect(d.last).toBe(-1);
  });

  it('SF con lugar: sale por la izquierda y entra hacia la izquierda', () => {
    const d = directions(dependencyPath('SF', { x: 300, width: 50, y: 0 }, { x: 0, width: 100, y: ROW }, ROW, STUB));
    expect(d).toEqual({ first: -1, last: -1, count: 4 });
  });

  it('SF sin lugar: rodea y entra hacia la izquierda', () => {
    const d = directions(dependencyPath('SF', { x: 100, width: 50, y: 0 }, { x: 0, width: 100, y: ROW }, ROW, STUB));
    expect(d).toEqual({ first: -1, last: -1, count: 6 });
  });
});
