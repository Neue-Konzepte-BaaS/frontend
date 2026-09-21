import type { customer as en } from "~/i18n/locales/en/customer";

type Shape = { [K in keyof typeof en]: string };

export const customer: Shape = {
  meMetaTitle: "Ich · BaaS",

  myPlotsHeading: "Meine Parzelle(n)",
  noRentedPlots: "Du hast noch keine Parzelle gemietet.",
  findAPlot: "Parzelle finden",

  simpleModeHeading: "Einfacher Modus",
  simpleModeDescription: "Große Schrift, hoher Kontrast, weniger Schritte",

  notificationsHeading: "Wie der Hof mich erreicht",
  pushNotification: "Push-Benachrichtigung",
  emailNotification: "E-Mail",
  weeklyDigest: "Wöchentliche Pflege-Übersicht",

  plotMetaTitle: "Meine Parzelle · BaaS",
  openPlot: "Parzelle öffnen",
  backToHome: "Zurück zur Startseite",

  plotTabsLabel: "Bereiche der Parzelle",
  plotTab_care: "Pflege",
  plotTab_crops: "Kulturen",
  plotTab_rental: "Miete",

  careWeek: "Woche {{week}}",
  careWeekOfTotal: "Woche {{week}} von {{total}}",
  careThisWeek: "Diese Woche",
  careUpcoming: "Demnächst",
  careNothingThisWeek: "Diese Woche ist nichts zu tun — genieß die Ruhe.",
  careNothingUpcoming: "Für diese Kultur sind keine weiteren Aufgaben geplant.",
  careNoActiveRental: "Diese Miete läuft gerade nicht, deshalb gibt es keine Pflegewoche zu zeigen.",

  cropStage_upcoming: "Noch nicht gestartet",
  cropStage_growing: "Wächst",
  cropStage_readyToHarvest: "Erntereif",
  cropStage_seasonOver: "Saison beendet",
  cropHarvestWeek: "Voraussichtliche Ernte",
  cropProgress: "Fortschritt",
  calendarWeek: "KW {{week}}",
  cropStateNote: "Der Status richtet sich nach deinem Mietzeitraum. Die Parzelle selbst hat niemand begutachtet — dein Hof meldet sich, wenn die Kultur wirklich reif ist.",

  rentalPeriod: "Mietzeitraum",
  rentalStatus: "Status",
  rentalActive: "Läuft",
  rentalInactive: "Läuft nicht",
  rentalPlotSize: "Parzellengröße",
  rentalField: "Feld",
  handoverHeading: "Übergabeprotokoll",
  handoverUnavailable: "Es gibt noch kein Übergabeprotokoll zum Herunterladen.",
};
