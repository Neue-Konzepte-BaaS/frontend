import type { payment as en } from "~/i18n/locales/en/payment";

type Shape = { [K in keyof typeof en]: string };

export const payment: Shape = {
  checkoutMetaTitle: "Zahlung · BaaS",
  checkoutTitle: "Bestätigen und bezahlen",
  missingRequest: "Wir haben den Überblick über deine Mietanfrage verloren — bitte starte erneut von der Parzelle aus.",
  startingCheckout: "Zahlung wird vorbereitet…",
  authorizeNotice:
    "Du wirst jetzt belastet. Deine Anfrage wird anschließend an den Hof gesendet — lehnt er sie ab, wirst du automatisch erstattet und es entstehen keine Kosten.",
  stripeNotConfigured: "Zahlungen sind noch nicht eingerichtet — bitte versuche es später erneut.",
  payNow: "Jetzt bezahlen",
  processingPayment: "Wird verarbeitet…",

  returnMetaTitle: "Zahlung wird bestätigt · BaaS",
  returnTitle: "Deine Zahlung wird bestätigt",
  missingSession: "Wir konnten diese Zahlungssitzung nicht finden.",
  goToMyRentals: "Zu meinen Mieten",
  confirmingPayment: "Zahlung wird bestätigt…",
  stillProcessing: "Das dauert etwas länger als gewöhnlich. Deine Zahlung wird möglicherweise noch verarbeitet.",
  checkAgain: "Erneut prüfen",
  paymentSuccess:
    "Zahlung erhalten — deine Anfrage wurde an den Hof gesendet. Lehnt er sie ab, wirst du automatisch erstattet; in jedem Fall wirst du benachrichtigt.",
  continueNow: "Jetzt weiter",
  sessionFailed: "Diese Zahlung konnte nicht abgeschlossen werden. Es wurden keine Kosten berechnet.",
};
