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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("dashboardTitle")}</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">{t("dashboardBody")}</p>

      <Link
        to="/farmer/fields"
        className="mt-6 block rounded-lg border border-gray-200 p-6 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
      >
        <h2 className="font-semibold text-gray-900 dark:text-white">{t("yourFieldsTitle")}</h2>
        <p className="mt-1 text-sm text-gray-500">{t("yourFieldsBody")}</p>
      </Link>
    </main>
  );
}
