import { useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/new-field";
import { requireRole } from "~/lib/guards";
import { createField } from "~/lib/fields";
import { geocodePostalCode, FIELD_DRAW_ZOOM } from "~/lib/geocode";
import { ApiError } from "~/lib/api-client";
import { FieldMap, type MapShape } from "~/components/map/field-map";
import { Field as FormField, FormError, inputClass, secondaryButtonClass, submitClass } from "~/components/form";
import { isDegenerate, toBbox, type PolygonGeometry } from "~/lib/geo";

export function meta() {
  return [{ title: "Draw a field · BaaS" }];
}

/**
 * requireRole is already enforced by the parent farmer layout, but this route
 * also needs the account's postal code to centre the map — a cheap extra
 * me() call (React Router runs sibling/child loaders in parallel with the
 * layout's, so this doesn't add a serial round trip).
 */
export async function clientLoader() {
  const account = await requireRole("farmer");
  const center = await geocodePostalCode(account.postalCode);
  return { center };
}

type Step = "draw-field" | "name-field";

export default function NewField({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const center = loaderData.center;

  const [step, setStep] = useState<Step>("draw-field");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [fieldPolygon, setFieldPolygon] = useState<PolygonGeometry | null>(null);
  const [fieldName, setFieldName] = useState("");

  function handleFieldRectangle(polygon: PolygonGeometry) {
    setError(null);
    if (isDegenerate(toBbox(polygon))) {
      setError("That rectangle is too small — try drawing a larger one.");
      return;
    }
    setFieldPolygon(polygon);
    setStep("name-field");
  }

  /**
   * Discard the drawn-but-not-yet-saved field rectangle and go back to
   * drawing. Nothing was persisted at this step (createField hasn't been
   * called yet), so this only needs to reset local state — no network call,
   * no backend DELETE needed. The 3-click angled-rectangle interaction is
   * easy to get slightly wrong (fat-fingering the rotation on the 2nd
   * click), so this needs to be a cheap, obvious way to just try again.
   */
  function handleRedrawField() {
    setError(null);
    setFieldPolygon(null);
    setFieldName("");
    setStep("draw-field");
  }

  async function handleSaveField(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fieldPolygon) return;

    setError(null);
    setSubmitting(true);
    try {
      const field = await createField({ name: fieldName.trim(), coordinates: fieldPolygon });
      // Plots are no longer drawn here — the field's own detail page (its
      // "digital twin") is where a rows x cols plot grid gets generated.
      navigate(`/farmer/fields/${field.id}`);
    } catch (err) {
      // Backend strings ("field must be a rectangle", "name is required", …)
      // are already user-readable — surface them directly.
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const mapShapes: MapShape[] = fieldPolygon
    ? [{ id: "draft-field", polygon: fieldPolygon, variant: "field" as const }]
    : [];

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Draw a new field</h1>

      <StepInstructions step={step} />

      {error && (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        <FieldMap
          center={center}
          zoom={FIELD_DRAW_ZOOM}
          shapes={mapShapes}
          drawMode={step === "draw-field" ? "field" : null}
          onRectangleDrawn={handleFieldRectangle}
        />
      </div>

      {step === "name-field" && fieldPolygon && (
        <form onSubmit={handleSaveField} className="mt-4 max-w-sm space-y-4">
          <FormField label="Field name" htmlFor="field_name">
            <input
              id="field_name"
              required
              autoFocus
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              className={inputClass}
            />
          </FormField>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className={submitClass}>
              {submitting ? "Saving…" : "Save field"}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleRedrawField}
              className={secondaryButtonClass}
            >
              Redraw
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

function StepInstructions({ step }: { step: Step }) {
  const text =
    step === "draw-field"
      ? "Draw a rectangle around your whole field: click one corner, click a second corner to set the angle, then click again to finish. It can be rotated to match your field exactly."
      : "Give your field a name, then save it — or redraw it if the shape isn't right. You'll set up its plots next.";

  return <p className="mt-1 text-gray-600 dark:text-gray-300">{text}</p>;
}
