import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("search:requestSentMetaTitle") }];
}

export default function RequestSent() {
  const { t } = useTranslation("search");
  const [params] = useSearchParams();
  const farmName = params.get("farmName") ?? "";
  const plotName = params.get("plotName") ?? "";

  const steps: string[] = [
    t("requestSentStep1"),
    t("requestSentStep2", { plotName }),
    t("requestSentStep3"),
  ];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-moss/15">
        <Check className="h-9 w-9 text-moss" strokeWidth={2.5} />
      </div>

      <h1 className="mt-8 font-serif text-4xl font-bold leading-tight text-forest">
        {t("requestSentHeading", { farmName })}
      </h1>
      <p className="mt-3 text-base text-warm-olive">
        {t("requestSentSubtitle", { plotName })}
      </p>

      <ol className="mt-8 rounded-2xl border border-beige bg-cream p-6 space-y-5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-4">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                i === 0 ? "bg-moss/20 text-moss" : "bg-beige text-wood"
              }`}
            >
              {i + 1}
            </span>
            <p className={`pt-1 text-sm ${i === 0 ? "font-medium text-forest" : "text-warm-olive"}`}>{step}</p>
          </li>
        ))}
      </ol>

      <Link
        to="/customer"
        className="mt-10 flex w-full items-center justify-center rounded-full bg-deep-olive px-8 py-4 text-base font-semibold text-ivory hover:bg-moss"
      >
        {t("requestSentCta")}
      </Link>
    </main>
  );
}
