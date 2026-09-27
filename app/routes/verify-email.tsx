import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { verifyEmail } from "~/lib/auth";
import { ApiError } from "~/lib/api-client";
import { postAuthDestination, safeRedirectTarget } from "~/lib/guards";
import { FormError } from "~/components/form";
import { LanguageSwitcher } from "~/components/language-switcher";
import i18n from "~/i18n";

export function meta() {
  return [{ title: i18n.t("auth:verifyEmailMetaTitle") }];
}

type Status =
  | { step: "verifying" }
  | { step: "success" }
  | { step: "error"; kind: "missingToken" | "invalid" | "alreadyRegistered" | "generic"; message?: string };

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation(["auth", "common", "home"]);
  const [status, setStatus] = useState<Status>({ step: "verifying" });
  // Effects can re-run (e.g. React StrictMode's dev double-invoke); a token is
  // single-use server-side, so guard against firing the request twice.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setStatus({ step: "error", kind: "missingToken" });
      return;
    }

    verifyEmail(token)
      .then((account) => {
        setStatus({ step: "success" });
        const redirectTo = safeRedirectTarget(searchParams.get("redirect"));
        navigate(postAuthDestination(account, redirectTo, searchParams.get("intent")), { replace: true });
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 400) {
          setStatus({ step: "error", kind: "invalid" });
        } else if (err instanceof ApiError && err.status === 409) {
          setStatus({ step: "error", kind: "alreadyRegistered" });
        } else {
          setStatus({ step: "error", kind: "generic", message: err instanceof ApiError ? err.message : undefined });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-cream">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <Link to="/" className="flex items-center gap-3">
            <img src="/farmlandlogo.png" alt="Farmland" className="h-10 w-10 rounded-full" />
              <span className="-translate-y-1 text-2xl font-bold text-forest" style={{fontFamily: "'Playfair Display', serif"}}>Farmland</span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link to="/login" className="min-w-[80px] text-center text-base font-semibold text-forest hover:text-moss">{t("common:signIn")}</Link>
            <Link to="/register" className="min-w-[130px] rounded-full bg-deep-olive px-6 py-2.5 text-center text-sm font-semibold text-ivory hover:bg-moss">{t("home:getStarted")}</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-md flex-col justify-center px-6 py-16">
        {status.step === "verifying" && (
          <>
            <h1 className="font-serif text-3xl font-bold text-forest">{t("auth:verifyingTitle")}</h1>
            <p className="mt-2 text-wood">{t("auth:verifyingMessage")}</p>
          </>
        )}

        {status.step === "success" && (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-moss/15">
              <Check className="h-9 w-9 text-moss" strokeWidth={2.5} />
            </div>
            <h1 className="mt-8 font-serif text-3xl font-bold text-forest">{t("auth:verifySuccessTitle")}</h1>
            <p className="mt-2 text-wood">{t("auth:verifySuccessMessage")}</p>
          </>
        )}

        {status.step === "error" && (
          <>
            <h1 className="font-serif text-3xl font-bold text-forest">
              {status.kind === "alreadyRegistered" ? t("auth:verifyErrorAlreadyRegisteredTitle") : t("auth:verifyErrorInvalidTitle")}
            </h1>

            <div className="mt-6">
              <FormError
                message={
                  status.kind === "missingToken"
                    ? t("auth:verifyErrorMissingToken")
                    : status.kind === "alreadyRegistered"
                      ? t("auth:verifyErrorAlreadyRegisteredMessage")
                      : status.kind === "invalid"
                        ? t("auth:verifyErrorInvalidMessage")
                        : (status.message ?? t("common:genericError"))
                }
              />
            </div>

            <p className="mt-6 text-sm text-wood">
              {status.kind === "alreadyRegistered" ? (
                <Link to="/login" className="font-medium text-moss underline hover:text-olive">
                  {t("common:signIn")}
                </Link>
              ) : (
                <Link to="/register" className="font-medium text-moss underline hover:text-olive">
                  {t("auth:backToRegister")}
                </Link>
              )}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
