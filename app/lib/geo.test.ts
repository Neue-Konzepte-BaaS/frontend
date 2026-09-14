import { describe, expect, it } from "vitest";
import {
  bboxToLngLatBounds,
  cornersToPolygon,
  isDegenerate,
  lonLatToMercator,
  mercatorToLonLat,
  normalizeRotatedRectangle,
  pointInPolygon,
  polygonWithin,
  ringToCorners,
  subdivideIntoGrid,
  toBbox,
  unionBbox,
  type PolygonGeometry,
  type RectangleCorners,
} from "./geo";

/** A simple axis-aligned square, side `size` degrees, corner at [x, y]. */
function square(x: number, y: number, size: number): PolygonGeometry {
  return {
    type: "Polygon",
    coordinates: [
      [
        [x, y],
        [x + size, y],
        [x + size, y + size],
        [x, y + size],
        [x, y],
      ],
    ],
  };
}

describe("toBbox", () => {
  it("collapses a polygon's ring to its envelope", () => {
    expect(toBbox(square(1, 2, 10))).toEqual({ minLon: 1, minLat: 2, maxLon: 11, maxLat: 12 });
  });

  it("throws on an empty exterior ring", () => {
    expect(() => toBbox({ type: "Polygon", coordinates: [[]] })).toThrow(/empty exterior ring/);
  });
});

describe("isDegenerate", () => {
  it("is false for a normal-sized bbox", () => {
    expect(isDegenerate(toBbox(square(0, 0, 1)))).toBe(false);
  });

  it("is true for a near-zero-width bbox (a tap, not a drag)", () => {
    expect(isDegenerate(toBbox(square(0, 0, 1e-9)))).toBe(true);
  });
});

describe("bboxToLngLatBounds", () => {
  it("returns the [[minLon,minLat],[maxLon,maxLat]] pair maplibre expects", () => {
    expect(bboxToLngLatBounds({ minLon: 1, minLat: 2, maxLon: 3, maxLat: 4 })).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });
});

describe("unionBbox", () => {
  it("returns null for an empty list", () => {
    expect(unionBbox([])).toBeNull();
  });

  it("unions the extremes of every box", () => {
    const a = toBbox(square(0, 0, 1));
    const b = toBbox(square(5, -2, 1));
    expect(unionBbox([a, b])).toEqual({ minLon: 0, minLat: -2, maxLon: 6, maxLat: 1 });
  });
});

describe("ringToCorners", () => {
  const corners: RectangleCorners = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
  ];

  it("strips the closing point from a closed 5-position ring", () => {
    expect(ringToCorners(cornersToPolygon(corners))).toEqual(corners);
  });

  it("accepts an already-open 4-position ring", () => {
    expect(ringToCorners({ type: "Polygon", coordinates: [corners] })).toEqual(corners);
  });

  it("throws when the ring isn't a rectangle's 4 corners", () => {
    expect(() =>
      ringToCorners({
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
          ],
        ],
      }),
    ).toThrow(/expected 4 corners, got 3/);
  });
});

describe("normalizeRotatedRectangle", () => {
  it("re-derives the 4th corner via parallelogram completion, ignoring a wrong one", () => {
    // A, B, C correct; D is deliberately wrong and should be recomputed as
    // A + C - B = (0,10).
    const drawn = cornersToPolygon([
      [0, 0],
      [10, 0],
      [10, 10],
      [999, 999],
    ]);
    expect(ringToCorners(normalizeRotatedRectangle(drawn))).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]);
  });
});

describe("pointInPolygon", () => {
  const poly = square(0, 0, 10);

  it("is true for a point in the interior", () => {
    expect(pointInPolygon([5, 5], poly)).toBe(true);
  });

  it("is false for a point outside", () => {
    expect(pointInPolygon([20, 20], poly)).toBe(false);
  });

  it("is true for a point exactly on a corner/edge (boundary counts as within)", () => {
    expect(pointInPolygon([0, 0], poly)).toBe(true);
    expect(pointInPolygon([5, 0], poly)).toBe(true);
  });
});

describe("polygonWithin", () => {
  it("is true when every corner of the inner shape lies inside the outer one", () => {
    const outer = square(0, 0, 10);
    const inner = square(2, 2, 3);
    expect(polygonWithin(inner, outer)).toBe(true);
  });

  it("is false when the inner shape pokes outside the outer one", () => {
    const outer = square(0, 0, 10);
    const inner = square(8, 8, 5);
    expect(polygonWithin(inner, outer)).toBe(false);
  });
});

describe("lonLatToMercator / mercatorToLonLat", () => {
  it("maps the origin to itself", () => {
    const [x, y] = lonLatToMercator([0, 0]);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0, 6);
  });

  it("round-trips a real-world point", () => {
    const original: [number, number] = [8.4037, 49.0069]; // Karlsruhe
    const [lon, lat] = mercatorToLonLat(lonLatToMercator(original));
    expect(lon).toBeCloseTo(original[0], 9);
    expect(lat).toBeCloseTo(original[1], 9);
  });
});

describe("subdivideIntoGrid", () => {
  const field: RectangleCorners = [
    [8.4, 49.0],
    [8.401, 49.0],
    [8.401, 49.001],
    [8.4, 49.001],
  ];

  it("rejects non-positive or non-integer rows/cols", () => {
    expect(() => subdivideIntoGrid(field, 0, 1)).toThrow(/positive integers/);
    expect(() => subdivideIntoGrid(field, 1.5, 1)).toThrow(/positive integers/);
  });

  it("produces rows*cols cells, each a closed polygon", () => {
    const cells = subdivideIntoGrid(field, 2, 3);
    expect(cells).toHaveLength(6);
    for (const cell of cells) {
      const ring = cell.coordinates[0];
      expect(ring).toHaveLength(5);
      expect(ring[0]).toEqual(ring[4]); // closed
    }
  });

  it("returns cells in row-major order spanning the field corner to corner", () => {
    const cells = subdivideIntoGrid(field, 2, 2);
    const [a] = ringToCorners(cells[0]); // row 0, col 0 — starts at field corner A
    const [, , c] = ringToCorners(cells[3]); // row 1, col 1 — its far corner is field corner C
    expect(a[0]).toBeCloseTo(field[0][0], 3);
    expect(a[1]).toBeCloseTo(field[0][1], 3);
    expect(c[0]).toBeCloseTo(field[2][0], 3);
    expect(c[1]).toBeCloseTo(field[2][1], 3);
  });

  it("insets every cell strictly inside the field (never touches the field's own edge)", () => {
    const [cell] = subdivideIntoGrid(field, 1, 1);
    const [a] = ringToCorners(cell);
    // The single 1x1 cell spans the whole field, so its inset corner must sit
    // a hair inside field corner A, not exactly on it.
    expect(a[0]).toBeGreaterThan(field[0][0]);
    expect(a[1]).toBeGreaterThan(field[0][1]);
  });
});
