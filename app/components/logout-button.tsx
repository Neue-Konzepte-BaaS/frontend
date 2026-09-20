import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { logout } from "~/lib/auth";

const DEFAULT_CLASS =
  "rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800";

/**
 * Sign out: expire the auth cookies on the server (they're HttpOnly, so the
 * browser can't clear them), then go to /login.
 */
export function LogoutButton({ className = DEFAULT_CLASS }: { className?: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  return (
    <button
      type="button"
      onClick={async () => {
        await logout();
        navigate("/login", { replace: true });
      }}
      className={className}
    >
      {t("logOut")}
    </button>
  );
}
