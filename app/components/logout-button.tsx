import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { logout } from "~/lib/auth";

const DEFAULT_CLASS =
  "rounded-lg border border-beige px-4 py-2 text-sm font-medium text-wood transition-colors hover:border-moss hover:bg-moss/10 hover:text-moss";

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
