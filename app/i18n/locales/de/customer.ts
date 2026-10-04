import type { customer as en } from "~/i18n/locales/en/customer";

type Shape = { [K in keyof typeof en]: string };

export const customer: Shape = {
  meMetaTitle: "Ich · Farmland",

  myPlotsHeading: "Meine Parzelle(n)",
  noRentedPlots: "Du hast noch keine Parzelle gemietet.",
  findAPlot: "Parzelle finden",

  dashboardGreeting: "Hallo, {{name}}",
  ripeTodayLabel: "Heute reif",
  ripeFrom: "von {{sender}} · {{time}}",
  boardNewFromFarm_one: "{{count}} neuer Beitrag vom Hof diese Woche",
  boardNewFromFarm_other: "{{count}} neue Beiträge vom Hof diese Woche",
  plotMapExpand: "Größere Karte anzeigen",
  plotMapCollapse: "Kleinere Karte anzeigen",
  boardNoNewPosts: "Diese Woche nichts Neues vom Hof",

  simpleModeHeading: "Einfacher Modus",
  simpleModeDescription: "Große Schrift, hoher Kontrast",

  notificationsHeading: "Wie der Hof mich erreicht",
  emailNotification: "E-Mail",

  inboxMetaTitle: "Posteingang · Farmland",
  inboxHeading: "Benachrichtigungen",
  inboxEmpty: "Noch keine Benachrichtigungen.",
  inboxFilterAll: "Alle",
  inboxFilterRipeness: "Reife",
  inboxFilterCare: "Pflege",
  inboxFilterFarm: "Hof",
  inboxGroupToday: "Heute",
  inboxGroupThisWeek: "Diese Woche",
  inboxGroupOlder: "Älter",
  inboxKindRipeness: "Reife",
  inboxKindCare: "Pflege",
  inboxKindFarm: "Direktnachricht",
  inboxKindAnnouncement: "Pinnwand",

  inboxRipenessSubject: "{{crop}} ist reif",
  inboxRipenessBody: "{{crop}} auf {{plot}} ist bereit zur Ernte.",

  plotMetaTitle: "Meine Parzelle · Farmland",
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
};
