import { useEffect, useRef } from "react";
import { Map as MapLibreMap, setWorkerUrl, type LngLatLike, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre 6 is ESM-only and locates its worker via `import.meta.url`, which
// Vite rewrites to the hashed chunk URL at build time — that request 404s in
// the production build (dev serves node_modules directly, so it works there
// by accident). `?worker&url` routes the worker through Vite's own worker
// pipeline so it's emitted as a real, self-contained asset in both modes.
// The failure is silent: MapLibre swallows the failed worker load, so tiles
// still decode via the raster path, but anything that depends on the worker
// (Terra Draw's live draw-feedback layers) never paints and logs nothing.
// See https://maplibre.org/maplibre-gl-js/docs/guides/v5-to-v6-migration-guide/
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { TerraDraw, TerraDrawAngledRectangleMode, TerraDrawRenderMode } from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { useTranslation } from "react-i18next";
import { MAP_STYLE_URL } from "~/lib/constants";
import {
  normalizeRotatedRectangle,
  toBbox,
  bboxToLngLatBounds,
  type Bbox,
  type PolygonGeometry,
} from "~/lib/geo";
import type { LatLon } from "~/lib/geocode";

/**
 * The single reusable map for the field/plot feature. Owns the MapLibre +
 * Terra Draw instance lifecycle; knows nothing about fields vs plots beyond
 * the `shapes` it is handed — the create flow (planner.tsx) decides what
 * "field" vs "plot" means.
 *
 * SSR note: `ssr: false` still prerenders the root route at build time. This
 * file has a static `import "maplibre-gl"`, which is safe because the Map
 * instance itself is only ever constructed inside useEffect (never during
 * prerender). If that ever changes and the build chokes on this import, the
 * escape hatch is `const { Map } = await import("maplibre-gl")` inside the
 * effect instead of the static import above.
 */

export type DrawKind = "field" | "plot" | null;

export type MapShape = {
  id: string;
  polygon: PolygonGeometry;
  variant: "field" | "plot";
  /** Text label rendered at the shape's centroid, e.g. a plot's number. */
  label?: string;
  /** Rendered with a highlighted outline/fill, e.g. the plot(s) currently picked. */
  selected?: boolean;
};

export type FieldMapProps = {
  center: LatLon;
  zoom?: number;
  /** Rectangles rendered read-only (existing fields/plots, or already-placed ones). */
  shapes: MapShape[];
  /** null disables drawing entirely. */
  drawMode: DrawKind;
  /** Fires once per finished rectangle, already normalized to a true envelope. */
  onRectangleDrawn?: (polygon: PolygonGeometry) => void;
  /** Fires with a shape's id when a read-only shape is clicked. */
  onShapeClick?: (id: string) => void;
  /** Bbox to fit the viewport to (e.g. on mount, or when shapes change). */
  fitTo?: Bbox | null;
  className?: string;
};

setWorkerUrl(workerUrl);

const SHAPES_SOURCE_ID = "field-map-shapes";
const FIELD_FILL_COLOR = "#059669"; // emerald-600
const PLOT_FILL_COLOR = "#6ee7b7"; // emerald-300
const SELECTED_COLOR = "#f59e0b"; // amber-500

/**
 * Terra Draw only knows the mode names actually registered with it below
 * ("angled-rectangle" and our own "static" render mode) — it has no idea
 * what "field" or "plot" mean. Both draw the same way (a rectangle at any
 * orientation); the caller's DrawKind only distinguishes *why* we're
 * drawing, for validation/labeling.
 */
function terraDrawModeFor(drawMode: DrawKind): string {
  return drawMode === null ? "static" : "angled-rectangle";
}

function applyShapesData(map: MapLibreMap, shapes: MapShape[]) {
  const source = map.getSource<GeoJSONSource>(SHAPES_SOURCE_ID);
  if (!source) return;
  source.setData({
    type: "FeatureCollection",
    features: shapes.map((shape) => ({
      type: "Feature",
      properties: {
        id: shape.id,
        variant: shape.variant,
        label: shape.label ?? "",
        selected: shape.selected ?? false,
      },
      geometry: shape.polygon,
    })),
  });
}

export function FieldMap({
  center,
  zoom = 12,
  shapes,
  drawMode,
  onRectangleDrawn,
  onShapeClick,
  fitTo,
  className,
}: FieldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  // True once our own shapes source/layers have been added inside the map's
  // "load" handler. mapRef is set synchronously at mount (before "load"),
  // and map.isStyleLoaded() reports the *base* style, not our custom source
  // — neither is a reliable signal that SHAPES_SOURCE_ID actually exists yet.
  const sourceReadyRef = useRef(false);
  const onRectangleDrawnRef = useRef(onRectangleDrawn);
  onRectangleDrawnRef.current = onRectangleDrawn;
  // Same async-"load"-closure problem as onRectangleDrawnRef above.
  const onShapeClickRef = useRef(onShapeClick);
  onShapeClickRef.current = onShapeClick;
  // Latest shapes, readable from the async "load" handler below so the very
  // first paint (once the source exists) reflects whatever shapes were
  // passed in by then, not a stale empty array captured at mount.
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;
  // The mount effect below creates TerraDraw asynchronously (after the map's
  // "load" event), so it can't close over the `drawMode` prop directly — by
  // the time "load" fires, a stale value would be captured. Read the latest
  // value through this ref instead.
  const drawModeRef = useRef(drawMode);
  drawModeRef.current = drawMode;

  // Create the map + Terra Draw instance once per mount. center/zoom are only
  // used as the *initial* view — see the separate fitTo effect for recentring.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new MapLibreMap({
      container,
      style: MAP_STYLE_URL,
      center: [center.lon, center.lat] as LngLatLike,
      zoom,
      // A rotated map makes a lon/lat-aligned rectangle *look* rotated on
      // screen, which is confusing — and it's a fiddly touch gesture for
      // non-technical users besides. Keep north always up.
      dragRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    map.on("load", () => {
      map.addSource(SHAPES_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: `${SHAPES_SOURCE_ID}-fill`,
        type: "fill",
        source: SHAPES_SOURCE_ID,
        paint: {
          "fill-color": [
            "case",
            ["get", "selected"],
            SELECTED_COLOR,
            ["==", ["get", "variant"], "field"],
            FIELD_FILL_COLOR,
            PLOT_FILL_COLOR,
          ],
          "fill-opacity": ["case", ["get", "selected"], 0.45, 0.25],
        },
      });
      map.addLayer({
        id: `${SHAPES_SOURCE_ID}-line`,
        type: "line",
        source: SHAPES_SOURCE_ID,
        paint: {
          "line-color": [
            "case",
            ["get", "selected"],
            SELECTED_COLOR,
            ["==", ["get", "variant"], "field"],
            FIELD_FILL_COLOR,
            PLOT_FILL_COLOR,
          ],
          "line-width": ["case", ["get", "selected"], 3, 2],
        },
      });
      map.addLayer({
        id: `${SHAPES_SOURCE_ID}-label`,
        type: "symbol",
        source: SHAPES_SOURCE_ID,
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 14,
        },
        paint: {
          "text-color": "#111827",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.5,
        },
      });

      map.on("click", `${SHAPES_SOURCE_ID}-fill`, (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (typeof id === "string") onShapeClickRef.current?.(id);
      });
      map.on("mouseenter", `${SHAPES_SOURCE_ID}-fill`, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", `${SHAPES_SOURCE_ID}-fill`, () => {
        map.getCanvas().style.cursor = "";
      });

      sourceReadyRef.current = true;
      // Paint whatever shapes are current right now — shapesRef.current may
      // already be non-empty if the caller passed shapes in before "load"
      // fired (e.g. the fields list, which loads its data in clientLoader
      // before the map ever mounts).
      applyShapesData(map, shapesRef.current);

      const draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map }),
        modes: [
          // 3-click interaction: click 1 sets the first corner, click 2 sets
          // the second corner (establishing the rectangle's edge AND its
          // rotation), click 3 sets the perpendicular extent and finishes —
          // this is what lets a farmer match a field's real, often-rotated
          // boundary instead of only drawing lon/lat-aligned boxes.
          new TerraDrawAngledRectangleMode(),
          // A named render mode with no drawing behaviour, used whenever
          // drawMode is null (read-only display). Terra Draw has no built-in
          // "off" state — every mode is either a draw mode or a render mode.
          new TerraDrawRenderMode({ modeName: "static", styles: {} }),
        ],
      });
      draw.start();
      // Apply whatever drawMode is current *now* — the separate [drawMode]
      // effect below only re-fires on a later prop change, and this mount
      // effect (necessarily async, since it waits for "load") would
      // otherwise miss the mode the caller asked for from the start.
      draw.setMode(terraDrawModeFor(drawModeRef.current));
      drawRef.current = draw;

      draw.on("finish", (id, context) => {
        if (context.action !== "draw") return;

        const feature = draw.getSnapshotFeature(id);
        // Clear immediately: our own React state (the `shapes` prop) is the
        // single source of truth for what's drawn. If we left the rectangle
        // in Terra Draw's store too, the same shape would exist in both
        // places and they could drift.
        draw.clear();

        if (!feature || feature.geometry.type !== "Polygon") return;
        const normalized = normalizeRotatedRectangle(feature.geometry as PolygonGeometry);
        onRectangleDrawnRef.current?.(normalized);
      });
    });

    return () => {
      // MapLibre's remove() does full teardown including releasing the WebGL
      // context. Skipping this leaks a context per navigation, and browsers
      // cap how many a page can hold open (~16) — a real bug, not a nicety.
      sourceReadyRef.current = false;
      drawRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally mount-once; center/zoom are only the initial view.
  }, []);

  // Toggle draw mode without recreating the map.
  useEffect(() => {
    const draw = drawRef.current;
    if (!draw) return;
    draw.setMode(terraDrawModeFor(drawMode));
  }, [drawMode]);

  // Keep the read-only shapes layer in sync. If the source isn't ready yet
  // (map "load" hasn't fired), the mount effect's own applyShapesData call
  // will pick up shapesRef.current once it does — see there.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sourceReadyRef.current) return;
    applyShapesData(map, shapes);
  }, [shapes]);

  // Fit the viewport to a given bbox on demand (e.g. after the field is drawn,
  // or when a new search returns a different set of plots).
  //
  // Depends on the bbox's *values*, not the object's identity: callers
  // routinely build this inline (`unionBbox(results.map(toBbox))`), which
  // returns a fresh object on every render. Keying the effect on the object
  // would re-fire fitBounds on every unrelated re-render — measured at 12
  // redundant calls for a single search — and keying it on a memo the caller
  // has to remember to write would be a trap. Serializing the four numbers
  // keeps it correct regardless of how the caller produces the bbox.
  const fitKey = fitTo
    ? `${fitTo.minLon},${fitTo.minLat},${fitTo.maxLon},${fitTo.maxLat}`
    : null;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitKey) return;

    const [minLon, minLat, maxLon, maxLat] = fitKey.split(",").map(Number);
    const bounds = bboxToLngLatBounds({ minLon, minLat, maxLon, maxLat });

    // Readiness is tracked via sourceReadyRef (set in the "load" handler), NOT
    // map.loaded(): that also reports false whenever tiles are still streaming
    // in, which is the common case right after a search moves the viewport. A
    // `map.loaded()` check here silently dropped every fit after the first —
    // it took the "defer until load" path for an event that had already fired
    // and would never fire again, leaving the camera stuck on the first
    // search's bounds while the results list updated underneath it.
    if (sourceReadyRef.current) {
      map.fitBounds(bounds, { padding: 48, duration: 0 });
    } else {
      map.once("load", () => map.fitBounds(bounds, { padding: 48, duration: 0 }));
    }
  }, [fitKey]);

  const { t } = useTranslation("farmer");

  return (
    <div
      ref={containerRef}
      className={className ?? "h-[60vh] w-full rounded-lg"}
      role="application"
      aria-label={t("mapAriaLabel")}
    />
  );
}

/** Convenience for callers that already have a polygon and want its bbox for fitTo. */
export function fitToPolygon(polygon: PolygonGeometry): Bbox {
  return toBbox(polygon);
}
