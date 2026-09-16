import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { roleLabel, type Role } from "~/lib/auth";
import { FormError } from "~/components/form";

/** How long the notice stays up before dismissing itself. */
const NOTICE_DURATION_MS = 6000;

/**
 * Explains why the viewer landed here instead of wherever they clicked.
 * Several guards set `?wrongAccountType=<role>` when they bounce a visitor
 * to their own dashboard because they're the wrong role for wherever they
 * were headed — postAuthDestination (a login/registration redirect target
 * or the "Log in to rent" flow's intent), and requireRole (visiting a
 * role-specific page directly). Renders nothing without that
 * param; otherwise strips it from the URL right after mount (so refreshing
 * doesn't keep showing it) and dismisses itself after a few seconds (it's a
 * one-time explanation, not a permanent banner).
 */
export function AccountTypeNotice() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Captured once on mount rather than read live: the cleanup effect below
  // strips the param from the URL right after, and re-reading searchParams
  // directly would make the banner vanish the instant that happens — often
  // before the browser has even painted the first frame.
  const [expectedRole, setExpectedRole] = useState(() => searchParams.get("wrongAccountType") as Role | null);
  const { t } = useTranslation("auth");

  useEffect(() => {
    if (!expectedRole) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("wrongAccountType");
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clear once, only for the param present on mount.
  }, []);

  useEffect(() => {
    if (!expectedRole) return;
    const timer = setTimeout(() => setExpectedRole(null), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [expectedRole]);

  if (!expectedRole) return null;

  return (
    <div className="mb-4">
      <FormError message={t("wrongAccountTypeNotice", { role: roleLabel(t, expectedRole) })} />
    </div>
  );
}
