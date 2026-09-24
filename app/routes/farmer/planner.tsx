import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/planner";
import { requireRole } from "~/lib/guards";
import { createField } from "~/lib/fields";
import { geocodePostalCode, FIELD_DRAW_ZOOM } from "~/lib/geocode";
import { ApiError } from "~/lib/api-client";
import { FieldMap, type MapShape } from "~/components/map/field-map";
import { Field as FormField, FormError, inputClass, secondaryButtonClass, submitClass } from "~/components/form";
import { isDegenerate, toBbox, type PolygonGeometry } from "~/lib/geo";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("farmer:newFieldMetaTitle") }];
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
  const { t } = useTranslation(["farmer", "common"]);

  const [step, setStep] = useState<Step>("draw-field");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [fieldPolygon, setFieldPolygon] = useState<PolygonGeometry | null>(null);
  const [fieldName, setFieldName] = useState("");

  function handleFieldRectangle(polygon: PolygonGeometry) {
    setError(null);
    if (isDegenerate(toBbox(polygon))) {
      setError(t("farmer:rectangleTooSmall"));
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
      setError(err instanceof ApiError ? err.message : t("common:genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  const mapShapes: MapShape[] = fieldPolygon
    ? [{ id: "draft-field", polygon: fieldPolygon, variant: "field" as const }]
    : [];

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-bold text-forest">{t("farmer:newFieldTitle")}</h1>

      <StepInstructions step={step} />

      {error && (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-lg border border-beige">
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
          <FormField label={t("farmer:fieldNameLabel")} htmlFor="field_name">
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
              {submitting ? t("farmer:saving") : t("farmer:saveField")}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleRedrawField}
              className={secondaryButtonClass}
            >
              {t("farmer:redraw")}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

function StepInstructions({ step }: { step: Step }) {
  const { t } = useTranslation("farmer");
  const text = step === "draw-field" ? t("drawFieldInstructions") : t("nameFieldInstructions");

  return <p className="mt-1 text-wood">{text}</p>;
}
