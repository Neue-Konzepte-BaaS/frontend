import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createRipenessNotice } from "~/lib/ripeness";
import { ApiError } from "~/lib/api-client";
import { getCropName, type FieldWithPlots } from "~/lib/fields";
import type { FarmRental } from "~/lib/rentals";
import { FormError, FormSuccess, inputClass, submitClass } from "~/components/form";

type RipenessSectionProps = {
  fields: FieldWithPlots[];
  activeByPlot: Map<string, FarmRental>;
};

/** Every currently-rented plot, labeled with its field, plot name and tenant. */
function rentedPlots(fields: FieldWithPlots[], activeByPlot: Map<string, FarmRental>) {
  return fields.flatMap((field) =>
    field.plots
      .filter((plot) => activeByPlot.has(plot.id))
      .map((plot) => {
        const rental = activeByPlot.get(plot.id)!;
        return {
          id: plot.id,
          label: `${field.name} – ${plot.name} (${rental.customer.firstName} ${rental.customer.lastName})`,
          cropId: rental.cropId,
          crop: plot.crops.find((c) => c.id === rental.cropId) ?? null,
        };
      })
  );
}

/**
 * Ready-to-harvest notice compose form (issue #39 / backend issue #33): pick
 * a currently rented plot, mail its tenant that the crop they are growing is
 * ready to pick. The crop is not a choice — a plot's active rental pins
 * exactly one, and that is the only crop the audience query can ever match.
 * No history list here — unlike announcements, a ripeness notice has no
 * read-back endpoint of its own (see lib/ripeness.ts).
 */
export function RipenessSection({ fields, activeByPlot }: RipenessSectionProps) {
  const { t, i18n } = useTranslation("farmer");
  const plots = rentedPlots(fields, activeByPlot);
  const [plotId, setPlotId] = useState(plots[0]?.id ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const plot = plots.find((p) => p.id === plotId) ?? plots[0];
  const cropName = plot?.crop ? getCropName(plot.crop, i18n.language) : "";

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!plot) return;
    setError(null);
    setSuccess(null);
    setSending(true);
    try {
      await createRipenessNotice(plot.id, plot.cropId);
      setSuccess(t("ripenessSuccess"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  const hasPlots = plots.length > 0;

  return (
    <div id="ripeness" className="scroll-mt-4 rounded-xl border border-beige bg-paper-contrast p-5">
      <h2 className="text-lg font-semibold text-forest">{t("ripenessSectionTitle")}</h2>

      {!hasPlots ? (
        <p className="mt-1 text-sm text-warm-olive">{t("ripenessNoPlotsYet")}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-warm-olive">{t("ripenessSectionBody")}</p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            {error && <FormError message={error} />}
            {success && <FormSuccess message={success} />}

            <div className="flex flex-col gap-3">
              <select
                aria-label={t("ripenessChoosePlot")}
                value={plotId}
                onChange={(e) => setPlotId(e.target.value)}
                disabled={sending}
                className={`${inputClass} w-full py-2 bg-paper`}
              >
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>

              {cropName && <p className="text-sm text-warm-olive">{t("ripenessCropLabel", { crop: cropName })}</p>}

              <button type="submit" disabled={sending || !plot} className={`${submitClass} w-full py-2 text-sm`}>
                {sending ? t("ripenessSending") : t("ripenessSend")}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
