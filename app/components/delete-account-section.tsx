import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { deleteAccount, type Role } from "~/lib/auth";
import { ApiError } from "~/lib/api-client";
import { FormError } from "~/components/form";

/**
 * "Delete my account" (backend issue #67), shared between the customer and
 * farmer Me/settings pages — the flow and copy are identical except for
 * which active-rental message a 409 maps to. Mirrors the admin crop list's
 * arm-then-confirm delete pattern (see crop-section.tsx): a first click only
 * arms the button, a second one actually deletes. Inline rather than
 * window.confirm, which is unstyled and can't be translated.
 *
 * On success there is nothing to show — the account's session is already
 * over, so this navigates straight to /login instead of rendering a success
 * banner nobody would see.
 */
export function DeleteAccountSection({ role }: { role: Role }) {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const [armed, setArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      await deleteAccount();
      navigate("/login", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(role === "farmer" ? t("deleteAccountConflictFarmer") : t("deleteAccountConflictCustomer"));
      } else if (err instanceof ApiError && err.status === 403) {
        setError(t("deleteAccountForbidden"));
      } else {
        setError(err instanceof ApiError ? err.message : t("genericError"));
      }
      setArmed(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="mt-8 rounded-lg border border-beige px-4 py-4">
      <h2 className="text-sm font-semibold tracking-wide text-warm-olive uppercase">{t("deleteAccountHeading")}</h2>
      <p className="mt-1 text-sm text-wood">{t("deleteAccountBody")}</p>

      {error && (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      )}

      <div className="mt-3">
        {armed ? (
          <span className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? t("deleteAccountDeleting") : t("deleteAccountConfirm")}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => setArmed(false)}
              className="rounded-lg border border-beige px-4 py-2 text-sm font-medium text-wood hover:bg-cream"
            >
              {t("deleteAccountCancel")}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="rounded-lg border border-beige px-4 py-2 text-sm font-medium text-wood hover:bg-cream"
          >
            {t("deleteAccountButton")}
          </button>
        )}
      </div>
    </section>
  );
}
