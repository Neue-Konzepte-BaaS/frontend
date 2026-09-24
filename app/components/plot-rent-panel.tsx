import { useTranslation } from "react-i18next";
import type { Account } from "~/lib/auth";
import type { Crop, NearbyPlot, Rental } from "~/lib/rentals";
import { formatArea } from "~/components/plot-card";
import { PlotCropsAndRent } from "~/components/plot-crops-and-rent";
import { FormSuccess } from "~/components/form";

type PlotRentPanelProps = {
  selected: { plot: NearbyPlot; number: number } | null;
  /** The viewer already requested (or rents) this plot. */
  alreadyRequested: boolean;
  farmName: string;
  account: Account | null;
  loginRedirectTo: string;
  onRented: (rental: Rental, crop: Crop) => void;
};

/** The customer's side panel on a farm page: the selected plot and how to rent it. */
export function PlotRentPanel({ selected, alreadyRequested, farmName, account, loginRedirectTo, onRented }: PlotRentPanelProps) {
  const { t, i18n } = useTranslation(["search", "common"]);
  const locale = i18n.language.startsWith("de") ? "de-DE" : "en-GB";

  if (!selected) {
    return (
      <div className="rounded-xl border border-beige bg-ivory p-5">
        <p className="text-sm text-wood">{t("search:rentPanelHint")}</p>
      </div>
    );
  }

  const { plot, number } = selected;
  return (
    <div className="rounded-xl border border-beige bg-ivory p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold text-forest">{t("search:plotNumber", { number })}</h2>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            alreadyRequested ? "bg-lime-100 text-lime-900" : "bg-cream text-wood"
          }`}
        >
          {alreadyRequested ? t("common:plotStatusRequested") : t("common:plotStatusFree")}
        </span>
      </div>
      <p className="mt-1 text-sm text-warm-olive">
        {plot.name} · {formatArea(plot.areaSquareMeters, locale)}
      </p>

      <div className="mt-5">
        {alreadyRequested ? (
          <FormSuccess message={t("search:requestSentBody")} />
        ) : (
          <PlotCropsAndRent
            key={plot.id}
            plotId={plot.id}
            plotName={plot.name}
            farmName={farmName}
            crops={plot.crops}
            account={account}
            loginRedirectTo={loginRedirectTo}
            onRented={onRented}
          />
        )}
      </div>
    </div>
  );
}
