import type { admin as en } from "~/i18n/locales/en/admin";

type Shape = { [K in keyof typeof en]: string };

export const admin: Shape = {
  dashboardTitle: "Admin-Dashboard",
  signedInAs: "Angemeldet als {{id}} (Admin).",
  statisticsTitle: "Statistiken",
  statisticsBody: "Plattformstatistiken werden hier angezeigt.",
  temporaryScreenLead: "Temporärer Bildschirm.",
  temporaryScreenBody:
    "Dieses Dashboard ist ein Platzhalter, um Registrierung, Anmeldung und rollenbasiertes Routing zu überprüfen (Issue #8). Ersetze es durch das echte Dashboard.",
};
