import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { PlotWithCrops } from "~/lib/fields";
import type { FarmRental } from "~/lib/rentals";
import type { PlotStatus } from "~/lib/plots";
import { createRipenessNotice } from "~/lib/ripeness";
import { createAnnouncement } from "~/lib/announcements";
import { ApiError } from "~/lib/api-client";
import { formatArea, formatRentalPeriod } from "~/components/plot-card";
import { FormError, FormSuccess, inputClass, submitClass, secondaryButtonClass } from "~/components/form";

export type SelectedPlot = {
  plot: PlotWithCrops;
  number: number;
  status: PlotStatus;
  rental: FarmRental | null;
};

const BADGE_CLASS: Record<PlotStatus, string> = {
  rented: "bg-rose-100 text-rose-900",
  requested: "bg-lime-100 text-lime-900",
  free: "bg-cream text-wood",
};

const STATUS_LABEL_KEY = {
  rented: "common:plotStatusRented",
  requested: "common:plotStatusRequested",
  free: "common:plotStatusFree",
} as const;

type PlotDetailPanelProps = {
  fieldId: string;
  selection: SelectedPlot[];
  /** Crop id → name, for the "planted" row (a rental only carries the crop id). */
  cropNames: ReadonlyMap<string, string>;
  /** The crop-offering editor, owned by the page since it saves across plots. */
  cropEditor: ReactNode;
};

/** The right-hand panel of the farmer's plot planner: whatever is selected in the grid or on the map. */
export function PlotDetailPanel({ fieldId, selection, cropNames, cropEditor }: PlotDetailPanelProps) {
  const { t, i18n } = useTranslation(["farmer", "common"]);
  const locale = i18n.language.startsWith("de") ? "de-DE" : "en-GB";

  if (selection.length === 0) {
    return (
      <div className="rounded-xl border border-beige bg-ivory p-5">
        <p className="text-sm text-wood">{t("farmer:plotPanelHint")}</p>
      </div>
    );
  }

  if (selection.length > 1) {
    return (
      <div className="rounded-xl border border-beige bg-ivory p-5">
        <h2 className="font-serif text-lg font-semibold text-forest">
          {t("farmer:plotsSelected", { count: selection.length })}
        </h2>
        <div className="mt-4">{cropEditor}</div>
      </div>
    );
  }

  const { plot, status, rental } = selection[0];
  const customerName = rental ? `${rental.customer.firstName} ${rental.customer.lastName}` : null;
  const plantedName = rental ? (cropNames.get(rental.cropId) ?? "—") : null;

  return (
    <div className="rounded-xl border border-beige bg-ivory p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold text-forest">{plot.name}</h2>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLASS[status]}`}>
          {t(STATUS_LABEL_KEY[status])}
        </span>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        {rental && (
          <>
            <Row label={status === "requested" ? t("farmer:applicantLabel") : t("farmer:tenantLabel")} value={customerName!} />
            <Row label={t("farmer:periodLabel")} value={formatRentalPeriod(rental.startAt, rental.endAt, locale)} />
          </>
        )}
        <Row label={t("farmer:sizeLabel")} value={formatArea(plot.areaSquareMeters, locale)} />
        {rental && <Row label={t("farmer:plantedLabel")} value={plantedName!} />}
        <Row
          label={t("farmer:offeredLabel")}
          value={plot.crops.length > 0 ? plot.crops.map((c) => c.name).join(", ") : t("farmer:noCropsForPlot")}
        />
      </dl>

      {status === "rented" && rental && new Date(rental.startAt).getTime() > Date.now() && (
        // Ripeness notices and plot messages only reach rentals that have
        // already started (backend audience queries), so don't offer them yet.
        <p className="mt-4 text-sm text-warm-olive">
          {t("farmer:rentalNotStartedHint", { date: new Date(rental.startAt).toLocaleDateString(locale) })}
        </p>
      )}

      {status === "rented" && rental && new Date(rental.startAt).getTime() <= Date.now() && (
        <RentedPlotActions
          key={rental.id}
          fieldId={fieldId}
          plotId={plot.id}
          cropId={rental.cropId}
          cropName={plantedName!}
          customerName={customerName!}
        />
      )}

      {status === "requested" && (
        <Link to="/farmer/requests" className={`${secondaryButtonClass} mt-4 block w-full px-4 py-2 text-center text-sm`}>
          {t("farmer:reviewRequest")}
        </Link>
      )}

      {status === "free" && <p className="mt-4 text-sm text-warm-olive">{t("farmer:freePlotHint")}</p>}

      <div className="mt-6 border-t border-beige pt-4">{cropEditor}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-warm-olive">{label}</dt>
      <dd className="text-right font-medium text-forest">{value}</dd>
    </div>
  );
}

type ActionState = { status: "idle" } | { status: "busy" } | { status: "done"; message: string } | { status: "error"; message: string };

function RentedPlotActions({
  fieldId,
  plotId,
  cropId,
  cropName,
  customerName,
}: {
  fieldId: string;
  plotId: string;
  cropId: string;
  cropName: string;
  customerName: string;
}) {
  const { t } = useTranslation(["farmer", "common"]);
  const [state, setState] = useState<ActionState>({ status: "idle" });
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const busy = state.status === "busy";

  function errorMessage(err: unknown) {
    return err instanceof ApiError ? err.message : t("common:genericError");
  }

  async function handleMarkRipe() {
    setState({ status: "busy" });
    try {
      const notice = await createRipenessNotice(fieldId, cropId);
      setState({ status: "done", message: t("farmer:markRipeSuccess", { count: notice.recipients }) });
    } catch (err) {
      setState({ status: "error", message: errorMessage(err) });
    }
  }

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ status: "busy" });
    try {
      await createAnnouncement({ subject: subject.trim(), body: body.trim(), plotId });
      setComposing(false);
      setSubject("");
      setBody("");
      setState({ status: "done", message: t("farmer:messageSent", { name: customerName }) });
    } catch (err) {
      setState({ status: "error", message: errorMessage(err) });
    }
  }

  return (
    <div className="mt-5 space-y-3">
      {state.status === "done" && <FormSuccess message={state.message} />}
      {state.status === "error" && <FormError message={state.message} />}

      {!composing ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={handleMarkRipe} className={`${submitClass} px-3 py-2 text-sm`}>
              {busy ? t("farmer:sending") : t("farmer:markRipe")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setComposing(true);
                setState({ status: "idle" });
              }}
              className={`${secondaryButtonClass} px-3 py-2 text-sm`}
            >
              {t("farmer:messageTenant")}
            </button>
          </div>
          <p className="text-xs text-warm-olive">{t("farmer:markRipeHint", { crop: cropName })}</p>
        </>
      ) : (
        <form onSubmit={handleSendMessage} className="space-y-2">
          <p className="text-sm font-medium text-wood">{t("farmer:messageTo", { name: customerName })}</p>
          <input
            required
            aria-label={t("farmer:announceSubjectLabel")}
            placeholder={t("farmer:announceSubjectLabel")}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={busy}
            className={`${inputClass} text-sm`}
          />
          <textarea
            required
            rows={3}
            aria-label={t("farmer:announceBodyLabel")}
            placeholder={t("farmer:announceBodyLabel")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={busy}
            className={`${inputClass} text-sm`}
          />
          <div className="grid grid-cols-2 gap-2">
            <button type="submit" disabled={busy || !subject.trim() || !body.trim()} className={`${submitClass} px-3 py-2 text-sm`}>
              {busy ? t("farmer:sending") : t("farmer:send")}
            </button>
            <button type="button" disabled={busy} onClick={() => setComposing(false)} className={`${secondaryButtonClass} px-3 py-2 text-sm`}>
              {t("farmer:cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
