import type { admin as en } from "~/i18n/locales/en/admin";

type Shape = { [K in keyof typeof en]: string };

export const admin: Shape = {
  roleBadge: "Systemadmin",

  // Plattform-Übersicht
  overviewMetaTitle: "Plattform-Übersicht · BaaS",
  overviewTitle: "Plattform-Übersicht",
  scopePlatform: "Bereich · Plattform",
  scopeFarm: "Bereich · Hof",
  generatedAt: "Generiert am {{time}}",
  statFarms: "Höfe",
  statFields: "Felder",
  statFieldsDetail: "{{perFarm}} pro Hof · {{area}} m²",
  statPlots: "Parzellen",
  statPlotsDetail: "{{rented}} vermietet · {{occupancy}} %",
  statRentals: "Mietverträge",
  statRentalsDetail: "{{active}} aktiv · {{last30}} in 30 T.",
  statAccounts: "Konten",
  statAccountsDetail: "{{farmers}} Landwirte · {{customers}} Pächter · +{{registered}} in 30 T.",
  systemTitle: "System",

  // Platzhalterseiten — die Navigation steht, der Backend-Endpunkt dahinter noch nicht
  farmsMetaTitle: "Höfe · BaaS",
  farmsTitle: "Höfe",
  accountsMetaTitle: "Konten · BaaS",
  accountsTitle: "Konten",
  rentalsMetaTitle: "Mietverträge · BaaS",
  rentalsTitle: "Mietverträge",

  // Broadcast-Benachrichtigung
  broadcastMetaTitle: "Rundnachricht · BaaS",
  notificationsTitle: "Broadcast-Benachrichtigung",
  notificationsBody: "Sende eine E-Mail an alle Landwirte und Kunden der Plattform.",
  notifSubjectLabel: "Betreff",
  notifBodyLabel: "Nachricht",
  notifSubjectPlaceholder: "Wartungsarbeiten am Sonntag",
  notifBodyPlaceholder: "Am Sonntag von 8 bis 12 Uhr ist die Plattform nicht erreichbar.",
  notifSending: "Wird gesendet…",
  notifSend: "An alle Nutzer senden",
  notifConfirmPrompt: "Das sendet eine E-Mail an alle Landwirte und Kunden der Plattform.",
  notifConfirmSend: "Ja, senden",
  notifCancel: "Abbrechen",
  notifSuccess: "Für {{recipients}} Empfänger in die Warteschlange gestellt.",

  // Pflanzenkatalog-Verwaltung
  cropsMetaTitle: "Pflanzenkatalog · BaaS",
  cropsTitle: "Pflanzenkatalog",
  cropsBody: "Diese Pflanzen stehen Landwirten zur Zuweisung an ihre Parzellen zur Verfügung.",
  cropNameLabel: "Pflanzenname",
  cropDurationLabel: "Mietdauer (Monate)",
  cropNamePlaceholder: "Tomaten",
  cropDurationInvalid: "Die Mietdauer muss eine ganze Zahl von mindestens 1 Monat sein.",
  cropAdding: "Wird hinzugefügt…",
  cropAdd: "Pflanze hinzufügen",
  cropAddedSuccess: "\"{{name}}\" zum Katalog hinzugefügt.",
  cropDuration: "{{name}} · {{months}} Monate",
  cropDelete: "Löschen",
  cropDeleteConfirm: "Wirklich löschen?",
  cropDeleteCancel: "Behalten",
  cropDeleting: "Wird gelöscht…",
  cropDeletedSuccess: "\"{{name}}\" aus dem Katalog entfernt.",
  cropDeleteConflict: "\"{{name}}\" kann nicht gelöscht werden, da es noch von einem Mietvertrag verwendet wird.",
};
