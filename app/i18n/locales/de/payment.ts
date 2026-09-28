import type { payment as en } from "~/i18n/locales/en/payment";

type Shape = { [K in keyof typeof en]: string };

export const payment: Shape = {
  checkoutMetaTitle: "Zahlung · Farmland",
  checkoutTitle: "Bestätigen und bezahlen",
  missingRequest: "Wir haben den Überblick über deine Mietanfrage verloren — bitte starte erneut von der Parzelle aus.",
  startingCheckout: "Zahlung wird vorbereitet…",
  authorizeNotice:
    "Dein Zahlungsmittel wird jetzt belastet. Deine Anfrage wird anschließend an den Hof gesendet. Falls diese abgelehnt wird, erstatten wir Dir Dein Geld zurück und es enstehen keine Kosten.",
  stripeNotConfigured: "Zahlungen sind noch nicht eingerichtet — bitte versuche es später erneut.",
  payNow: "Jetzt bezahlen",
  processingPayment: "Wird verarbeitet…",

  returnMetaTitle: "Zahlung wird bestätigt · Farmland",
  returnTitle: "Deine Zahlung wird bestätigt",
  missingSession: "Wir konnten diese Zahlungssitzung nicht finden.",
  goToMyRentals: "Zu meinen Mieten",
  confirmingPayment: "Zahlung wird bestätigt…",
  stillProcessing: "Das dauert etwas länger als gewöhnlich. Deine Zahlung wird möglicherweise noch verarbeitet.",
  checkAgain: "Erneut prüfen",
  paymentSuccess:
    "Zahlung erhalten — Deine Anfrage wurde an den Hof gesendet. Lehnt er diese ab, wird der Betrag automatisch erstattet. In jedem Fall wirst Du benachrichtigt.",
  continueNow: "Jetzt weiter",
  sessionFailed: "Diese Zahlung konnte nicht abgeschlossen werden. Es wurden keine Kosten berechnet.",
};
