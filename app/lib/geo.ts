/**
 * Pure coordinate math for the field/plot map. No network, no browser APIs —
 * this module is deliberately dependency-free so it is trivially reasoned
 * about (and the natural place to add unit tests if a test runner ever
 * lands, see architecture.md).
 *
 * The backend (see backend/openapi.yml, backend/sql/migrations) stores field
 * and plot coordinates as PostGIS GEOMETRY(Polygon, 4326) and enforces two
 * CHECK/trigger constraints server-side:
 *   - a field/plot must be a rectangle, at ANY orientation (not just
 *     axis-aligned) — checked via ST_OrientedEnvelope with a tolerance, see
 *     the rectangle_any_orientation migration
 *   - a plot must lie fully within its parent field: ST_Within(plot, field)
 * Everything here exists to (a) always emit geometry that satisfies the
 * first constraint regardless of rotation, and (b) give instant client-side
 * feedback on the second, without waiting for a round trip.
 *
 * Two parallel families of helpers live here:
 *   - Bbox (axis-aligned) — used only where axis-alignment is legitimately
 *     what's wanted: fitting the map viewport to a shape (the viewport
 *     itself is never rotated — map rotation is disabled in field-map.tsx),
 *     and the coarse "is this drawing too small" degenerate check.
 *   - RectangleCorners (any orientation) — used for the actual stored
 *     geometry and the plot-within-field containment check, since a rotated
 *     shape's bounding box is not the shape itself.
 * Do not use Bbox-based containment (bboxWithin) to decide whether one
 * rotated shape is inside another — see polygonWithin.
 */

/** A single [lon, lat] pair — GeoJSON/EPSG:4326 axis order (NOT lat/lon). */
export type Position = [number, number];

/** GeoJSON Polygon geometry, exactly as the backend sends/accepts it. */
export type PolygonGeometry = {
  type: "Polygon";
  coordinates: Position[][];
};

/** Axis-aligned bounding box in lon/lat. */
export type Bbox = {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
};

/** Collapse a polygon's exterior ring (possibly drifted/unclosed) to its envelope. */
export function toBbox(polygon: PolygonGeometry): Bbox {
  const ring = polygon.coordinates[0] ?? [];
  if (ring.length === 0) {
    throw new Error("toBbox: polygon has an empty exterior ring");
  }

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  }

  return { minLon, minLat, maxLon, maxLat };
}

/** A zero-width/height (or near enough) rectangle is a tap, not a drawing. */
export function isDegenerate(bbox: Bbox, epsilon = 1e-7): boolean {
  return bbox.maxLon - bbox.minLon < epsilon || bbox.maxLat - bbox.minLat < epsilon;
}

/** For maplibre's map.fitBounds(): [[minLon,minLat],[maxLon,maxLat]]. */
export function bboxToLngLatBounds(bbox: Bbox): [[number, number], [number, number]] {
  return [
    [bbox.minLon, bbox.minLat],
    [bbox.maxLon, bbox.maxLat],
  ];
}

/** Union of multiple bboxes — used to fit the map to every field at once. */
export function unionBbox(boxes: Bbox[]): Bbox | null {
  if (boxes.length === 0) return null;
  return boxes.reduce((acc, b) => ({
    minLon: Math.min(acc.minLon, b.minLon),
    minLat: Math.min(acc.minLat, b.minLat),
    maxLon: Math.max(acc.maxLon, b.maxLon),
    maxLat: Math.max(acc.maxLat, b.maxLat),
  }));
}

// --- Rotation-aware rectangle helpers -------------------------------------
//
// A rotated rectangle's bounding box is NOT the shape — the Bbox helpers
// above must not be used to reason about containment or shape identity for
// anything that might be rotated. These operate on the actual 4 corners.

/** A rectangle's 4 distinct corners, in ring order, NOT closed (no repeated first point). */
export type RectangleCorners = [Position, Position, Position, Position];

/**
 * Extract the 4 distinct corners from a polygon's exterior ring. Accepts
 * either a closed ring (5 positions, first === last, as stored/sent) or an
 * already-open one (exactly 4), so it can be used on both wire geometry and
 * a freshly-drawn Terra Draw feature.
 */
export function ringToCorners(polygon: PolygonGeometry): RectangleCorners {
  const ring = polygon.coordinates[0] ?? [];
  const open =
    ring.length >= 2 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;

  if (open.length !== 4) {
    throw new Error(`ringToCorners: expected 4 corners, got ${open.length}`);
  }
  return open as RectangleCorners;
}

/** Rebuild the canonical closed 5-position ring from 4 corners, in the order given. */
export function cornersToPolygon(corners: RectangleCorners): PolygonGeometry {
  return {
    type: "Polygon",
    coordinates: [[...corners, corners[0]]],
  };
}

/**
 * "True up" a drawn rectangle: re-close the ring and re-derive the 4th
 * corner from the other 3 (corner4 = corner1 + corner3 - corner2, the
 * parallelogram-completion identity — holds for any rectangle since its
 * diagonals bisect each other). This corrects float drift from the drawing
 * library without collapsing the shape to its axis-aligned bounding box
 * (unlike the old normalizeRectangle, which is gone — nothing wants
 * axis-aligned-only geometry now that rotation is allowed). Every rectangle
 * leaving the map should be passed through this exactly once, as close to
 * the drawing tool as possible, so no call site can forget it.
 */
export function normalizeRotatedRectangle(polygon: PolygonGeometry): PolygonGeometry {
  const [a, b, c] = ringToCorners(polygon);
  const d: Position = [a[0] + c[0] - b[0], a[1] + c[1] - b[1]];
  return cornersToPolygon([a, b, c, d]);
}

/**
 * Point-in-polygon via ray casting, inclusive of the boundary within
 * `epsilon` — mirrors PostGIS's ST_Within treating boundary-touching as
 * "within" when the interiors still intersect (the same boundary-sharing
 * behaviour bboxWithin used to document for the axis-aligned case).
 */
export function pointInPolygon(point: Position, polygon: PolygonGeometry, epsilon = 1e-9): boolean {
  const ring = polygon.coordinates[0] ?? [];
  const [px, py] = point;

  // On-boundary check first: a point sitting on an edge (e.g. a shared
  // corner or edge between field and plot) should count as "within".
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    if (distancePointToSegment(px, py, x1, y1, x2, y2) <= epsilon) {
      return true;
    }
  }

  // Standard ray-casting parity test for strict interior containment.
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length - 1; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function distancePointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  return Math.hypot(px - closestX, py - closestY);
}

/**
 * True when every corner of `inner` lies inside (or on the boundary of)
 * `outer`. Sufficient for two convex polygons — and every rectangle, at any
 * rotation, is convex — because a convex inner shape cannot cross a convex
 * outer boundary without at least one of its own corners also landing
 * outside. This is the pre-submit plot-in-field check (replaces the old
 * bbox-based bboxWithin, which gives wrong answers once either shape can be
 * rotated: a rotated plot's bbox can poke outside a field's bbox while the
 * plot itself stays fully inside the field, and vice versa).
 */
export function polygonWithin(inner: PolygonGeometry, outer: PolygonGeometry): boolean {
  const corners = ringToCorners(inner);
  return corners.every((corner) => pointInPolygon(corner, outer));
}

// --- Grid subdivision (auto-computed plots) -------------------------------
//
// Plots are no longer drawn by hand — a farmer enters rows x cols and the
// system computes an equal-sized grid spanning the field. See the module
// comment's "rotation-aware" note: the same Web Mercator trap that affected
// the rectangle-shape CHECK (backend/sql/migrations/..._rectangle_any_orientation.sql)
// applies here too, and matters MORE, because grid subdivision does its own
// trigonometric-adjacent construction (interpolating along two edge
// vectors) rather than just validating an already-drawn shape.
//
// A field's two edges (as built by TerraDrawAngledRectangleMode, which
// itself works in Web Mercator / screen space — see field-map.tsx) are only
// truly perpendicular in that same projection. Interpolating a grid directly
// on raw lon/lat degrees would produce visibly skewed, non-rectangular cells
// for any rotated field of meaningful size, away from the equator. So every
// point here is projected to Web Mercator meters, subdivided with plain
// affine math, then reprojected back to lon/lat before being sent anywhere.

const EARTH_RADIUS_M = 6378137; // WGS84 semi-major axis, the sphere radius Web Mercator (EPSG:3857) is defined against.

/**
 * lon/lat (degrees, EPSG:4326) -> Web Mercator (meters, EPSG:3857-equivalent).
 * Standard spherical Web Mercator formulas — deliberately NOT using
 * MapLibre's MercatorCoordinate (a different, [0,1]-normalized convention
 * tied to MapLibre's internals), so this module stays dependency-free.
 */
export function lonLatToMercator([lon, lat]: Position): Position {
  const x = (lon * Math.PI * EARTH_RADIUS_M) / 180;
  const y = EARTH_RADIUS_M * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  return [x, y];
}

/** Web Mercator (meters) -> lon/lat (degrees). Inverse of lonLatToMercator. */
export function mercatorToLonLat([x, y]: Position): Position {
  const lon = (x * 180) / (Math.PI * EARTH_RADIUS_M);
  const lat = ((2 * Math.atan(Math.exp(y / EARTH_RADIUS_M)) - Math.PI / 2) * 180) / Math.PI;
  return [lon, lat];
}

/**
 * Cells are inset by this many meters (toward their own center) before
 * being reprojected back to lon/lat. This is NOT a visual/design choice —
 * it exists to defeat a real floating-point precision failure, found by
 * actually generating a grid and sending it to the real backend:
 *
 * A grid point that's supposed to sit exactly on the field's own boundary
 * (e.g. the midpoint of the field's edge A->B) is computed by interpolating
 * in Mercator meters and reprojecting back to lon/lat. That reprojection
 * does NOT land exactly on the straight lon/lat line PostGIS stores as that
 * edge — Mercator's projection is a nonlinear (log/exp) function, so the
 * "same" edge is a straight line in one space and a (very slightly curved)
 * line in the other; they only coincide exactly at the two endpoints. The
 * gap is minuscule (measured: ~1e-9 degrees, a fraction of a millimeter) but
 * ST_Within has no tolerance — a plot corner even a few nanometers outside
 * the field is rejected outright ("plot must be a rectangle within the
 * field's boundaries"), confirmed live against the actual database: a grid
 * generated without this inset failed on its very first cell.
 *
 * Insetting every cell by a fixed real-world margin guarantees each plot is
 * strictly, robustly inside the field regardless of which direction the
 * float noise happens to fall. 1mm is imperceptible at any zoom level a
 * farmer would use and utterly negligible against real field/plot sizes.
 */
const GRID_CELL_INSET_M = 0.001;

/**
 * Subdivide a field's corners into a rows x cols grid of equal-sized
 * rectangular cells. Cells are returned in row-major order (row 0 first,
 * left-to-right within each row) so callers can name them "Plot 1", "Plot
 * 2", … in a predictable reading order.
 *
 * Uses corners[0] (A), corners[1] (B), corners[3] (D) — corners[2] (C) is
 * redundant, same assumption normalizeRotatedRectangle already makes (C is
 * derivable from the other three). u = B-A and v = D-A are the field's two
 * perpendicular edge vectors in Mercator meters; a cell at (row i, col j) is
 * the parallelogram A + u*(j/cols .. (j+1)/cols) + v*(i/rows .. (i+1)/rows)
 * — a true rectangle for every cell, because u and v are shared across all
 * of them and are themselves perpendicular (the field they came from is a
 * rectangle). Every cell is then inset by GRID_CELL_INSET_M — see its
 * comment for why that's load-bearing, not cosmetic.
 */
export function subdivideIntoGrid(fieldCorners: RectangleCorners, rows: number, cols: number): PolygonGeometry[] {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
    throw new Error(`subdivideIntoGrid: rows and cols must be positive integers, got ${rows}x${cols}`);
  }

  const [a, b, , d] = fieldCorners;
  const aM = lonLatToMercator(a);
  const bM = lonLatToMercator(b);
  const dM = lonLatToMercator(d);
  const u: Position = [bM[0] - aM[0], bM[1] - aM[1]];
  const v: Position = [dM[0] - aM[0], dM[1] - aM[1]];

  const gridPointM = (i: number, j: number): Position => [
    aM[0] + (u[0] * j) / cols + (v[0] * i) / rows,
    aM[1] + (u[1] * j) / cols + (v[1] * i) / rows,
  ];

  const cells: PolygonGeometry[] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const rawM: RectangleCorners = [
        gridPointM(i, j),
        gridPointM(i, j + 1),
        gridPointM(i + 1, j + 1),
        gridPointM(i + 1, j),
      ];
      const insetM = insetTowardCenter(rawM, GRID_CELL_INSET_M);
      const corners = insetM.map(mercatorToLonLat) as RectangleCorners;
      cells.push(cornersToPolygon(corners));
    }
  }
  return cells;
}

/** Move each of a (Mercator-meter) rectangle's corners `meters` toward its centroid. */
function insetTowardCenter(corners: RectangleCorners, meters: number): RectangleCorners {
  const cx = corners.reduce((sum, [x]) => sum + x, 0) / corners.length;
  const cy = corners.reduce((sum, [, y]) => sum + y, 0) / corners.length;

  return corners.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy);
    if (len === 0) return [x, y];
    const scale = Math.max(0, (len - meters) / len);
    return [cx + dx * scale, cy + dy * scale];
  }) as RectangleCorners;
}
