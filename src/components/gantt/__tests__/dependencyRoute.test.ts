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

/** Sentido (-1, 0, +1) de los dos primeros y los dos últimos puntos, y cantidad de puntos. */
function shape(path: string) {
  const p = points(path);
  const a = p[p.length - 2];
  const b = p[p.length - 1];
  return {
    count: p.length,
    firstDx: Math.sign(p[1].x - p[0].x),
    lastDx: Math.sign(b.x - a.x),
    lastDy: Math.sign(b.y - a.y),
    end: b,
  };
}

const pred: RouteBar = { x: 0, width: 100, y: 0 };

describe('dependencyPath — entra con lugar de sobra: la punta apunta a la barra por el costado', () => {
  it('FS con lugar de sobra: 3 tramos, entra hacia la derecha', () => {
    const s = shape(dependencyPath('FS', pred, { x: 200, width: 50, y: ROW }, ROW, STUB));
    expect(s).toMatchObject({ count: 4, firstDx: 1, lastDx: 1, lastDy: 0 });
  });

  it('SS: sale y entra por la izquierda, entrando hacia la derecha', () => {
    const s = shape(dependencyPath('SS', { x: 100, width: 50, y: 0 }, { x: 150, width: 50, y: ROW }, ROW, STUB));
    expect(s).toMatchObject({ count: 4, firstDx: -1, lastDx: 1 });
  });

  it('SS con la sucesora mucho antes: sigue entrando hacia la derecha', () => {
    const s = shape(dependencyPath('SS', { x: 300, width: 50, y: 0 }, { x: 100, width: 50, y: ROW }, ROW, STUB));
    expect(s.lastDx).toBe(1);
  });

  it('FF: sale por la derecha y entra hacia la izquierda por el borde derecho', () => {
    const s = shape(dependencyPath('FF', pred, { x: 20, width: 40, y: ROW }, ROW, STUB));
    expect(s).toMatchObject({ count: 4, firstDx: 1, lastDx: -1 });
  });

  it('FF con la sucesora terminando mucho después: sigue entrando hacia la izquierda', () => {
    const s = shape(dependencyPath('FF', pred, { x: 300, width: 100, y: ROW }, ROW, STUB));
    expect(s.lastDx).toBe(-1);
  });

  it('SF con lugar: sale por la izquierda y entra hacia la izquierda', () => {
    const s = shape(dependencyPath('SF', { x: 300, width: 50, y: 0 }, { x: 0, width: 100, y: ROW }, ROW, STUB));
    expect(s).toMatchObject({ count: 4, firstDx: -1, lastDx: -1 });
  });

  it('SF sin lugar: rodea y entra hacia la izquierda', () => {
    const s = shape(dependencyPath('SF', { x: 100, width: 50, y: 0 }, { x: 0, width: 100, y: ROW }, ROW, STUB));
    expect(s).toMatchObject({ count: 6, firstDx: -1, lastDx: -1 });
  });
});

describe('dependencyPath — FS justo: baja derecho y apunta sobre el borde de la barra', () => {
  const half = 10;

  it('la sucesora arranca donde termina la predecesora: sale a la derecha, baja y apunta hacia abajo', () => {
    const succ: RouteBar = { x: 100, width: 50, y: ROW, halfHeight: half };
    const p = points(dependencyPath('FS', pred, succ, ROW, STUB));
    expect(p).toHaveLength(3);
    expect(p[1].y).toBe(p[0].y); // sale horizontal
    expect(p[2].x).toBe(p[1].x); // y baja derecho
    expect(p[2].x).toBeGreaterThan(100); // un poco a la derecha del final de la predecesora
    expect(p[2].x).toBeLessThan(150); // sobre la barra, no al costado
    expect(p[2].y).toBe(ROW + ROW / 2 - half); // termina en el borde superior de la barra
  });

  it('la sucesora arranca un poco después (menos de dos tramos): baja dentro de la barra', () => {
    const succ: RouteBar = { x: 120, width: 50, y: ROW, halfHeight: half };
    const p = points(dependencyPath('FS', pred, succ, ROW, STUB));
    expect(p).toHaveLength(3);
    expect(p[2].x).toBeGreaterThanOrEqual(120);
    expect(p[2].x).toBeLessThanOrEqual(170);
  });

  it('la sucesora está arriba: apunta hacia arriba sobre el borde inferior', () => {
    const succ: RouteBar = { x: 100, width: 50, y: -ROW, halfHeight: half };
    const s = shape(dependencyPath('FS', { ...pred, y: ROW }, succ, ROW, STUB));
    expect(s.lastDy).toBe(-1);
    expect(s.end.y).toBe(-ROW + ROW / 2 + half);
  });

  it('la sucesora es un hito: baja justo sobre el vértice del rombo', () => {
    const succ: RouteBar = { x: 110, width: 14, y: ROW, halfHeight: 6.4, diamond: true };
    const s = shape(dependencyPath('FS', pred, succ, ROW, STUB));
    expect(s.end.x).toBe(110);
    expect(s.lastDy).toBe(1);
  });

  it('una barra angosta igual recibe la flecha dentro de su ancho', () => {
    const succ: RouteBar = { x: 100, width: 4, y: ROW, halfHeight: half };
    const p = points(dependencyPath('FS', pred, succ, ROW, STUB));
    expect(p[2].x).toBeGreaterThan(100);
    expect(p[2].x).toBeLessThanOrEqual(104);
  });

  it('la sucesora termina antes que la predecesora: rodea y entra hacia la derecha', () => {
    const s = shape(dependencyPath('FS', pred, { x: 40, width: 50, y: ROW }, ROW, STUB));
    expect(s).toMatchObject({ count: 6, lastDx: 1, lastDy: 0 });
  });
});
