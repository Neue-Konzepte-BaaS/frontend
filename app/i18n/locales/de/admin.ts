import type { admin as en } from "~/i18n/locales/en/admin";

type Shape = { [K in keyof typeof en]: string };

export const admin: Shape = {
  dashboardTitle: "Admin-Dashboard",
  signedInAs: "Angemeldet als {{id}} (Admin).",

  // Statistiken
  statisticsTitle: "Plattform-Statistiken",
  generatedAt: "Generiert am {{time}}",
  statFields: "Felder",
  statPlots: "Parzellen",
  statRentals: "Mietverträge",
  statAccounts: "Konten",
  statTotal: "Gesamt",
  statRented: "Vermietet",
  statAvailable: "Verfügbar",
  statOccupancy: "Belegung",
  statActive: "Aktiv",
  statLast30Days: "Letzte 30 Tage",
  statArea: "Fläche (m²)",
  statFarmers: "Landwirte",
  statCustomers: "Kunden",
  statRegisteredLast30: "Registriert (letzte 30 T)",

  // Broadcast-Benachrichtigung
  notificationsTitle: "Broadcast-Benachrichtigung",
  notificationsBody: "Sende eine E-Mail an alle Landwirte und Kunden der Plattform.",
  notifSubjectLabel: "Betreff",
  notifBodyLabel: "Nachricht",
  notifSubjectPlaceholder: "Wartungsarbeiten am Sonntag",
  notifBodyPlaceholder: "Am Sonntag von 8 bis 12 Uhr ist die Plattform nicht erreichbar.",
  notifSending: "Wird gesendet…",
  notifSend: "An alle Nutzer senden",
  notifSuccess: "Für {{recipients}} Empfänger in die Warteschlange gestellt.",

  // Pflanzenkatalog-Verwaltung
  cropsTitle: "Pflanzenkatalog",
  cropsBody: "Diese Pflanzen stehen Landwirten zur Zuweisung an ihre Parzellen zur Verfügung.",
  cropNameLabel: "Pflanzenname",
  cropDurationLabel: "Mietdauer (Monate)",
  cropNamePlaceholder: "Tomaten",
  cropAdding: "Wird hinzugefügt…",
  cropAdd: "Pflanze hinzufügen",
  cropAddedSuccess: "\"{{name}}\" zum Katalog hinzugefügt.",
  cropDuration: "{{name}} · {{months}} Monate",
  cropDelete: "Löschen",
  cropDeleting: "Wird gelöscht…",
  cropDeletedSuccess: "\"{{name}}\" aus dem Katalog entfernt.",
  cropDeleteConflict: "\"{{name}}\" kann nicht gelöscht werden, da es noch von einem Mietvertrag verwendet wird.",
};
