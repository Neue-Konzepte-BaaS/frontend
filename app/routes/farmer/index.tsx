import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { AccountTypeNotice } from "~/components/account-type-notice";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("farmer:dashboardMetaTitle") }];
}

export default function FarmerDashboard() {
  const { t } = useTranslation("farmer");

  return (
    <main className="mx-auto max-w-3xl p-8">
      <AccountTypeNotice />
      <h1 className="text-2xl font-bold text-forest">{t("dashboardTitle")}</h1>
      <p className="mt-2 text-wood">{t("dashboardBody")}</p>

      <Link
        to="/farmer/fields"
        className="mt-6 block rounded-lg border border-beige p-6 hover:bg-cream"
      >
        <h2 className="font-semibold text-forest">{t("yourFieldsTitle")}</h2>
        <p className="mt-1 text-sm text-warm-olive">{t("yourFieldsBody")}</p>
      </Link>
    </main>
  );
}
