import type { home as en } from "~/i18n/locales/en/home";

type Shape = { [K in keyof typeof en]: string };

export const home: Shape = {
  metaTitle: "Bauer as a Service — Selbsternte-Parzellen, ohne Excel-Tabellen",
  metaDescription:
    "Die Software hinter Selbsternte-Höfen: Parzellen verwalten, Mieter informieren, wenn die Ernte reif ist, und alle auf einmal erreichen.",
  heroTitle: "Selbsternte-Parzellen, ohne Excel-Tabellen.",
  heroHeadline1: "Dein Hof.",
  heroHeadline2: "Deine Kunden.",
  heroHeadline3: "Weniger Papierkram.",
  heroSubtitle: "Parzellen, Ernten und Mieter verwalten — ohne Tabellen.",
  heroBody1:
    "Kleine Höfe vermieten Selbsternte-Parzellen und verwalten sie mit Excel, Papier und WhatsApp. Bauer as a Service ist die Software hinter dem Hof: wer welche Parzelle mietet, für wie lange, was angepflanzt ist und wann es reif ist.",
  heroBody2: "Der Hof behält seine eigene Marke und seine eigenen Kunden. Wir stellen nur die Werkzeuge bereit.",
  getStarted: "Jetzt starten",
  navHome: "Startseite",
  navForFarmers: "Für Höfe",
  navForCustomers: "Für Kunden",
  findPlotCta: "Parzelle in deiner Nähe finden",
  runFarmCta: "Deinen Hof betreiben",
  builtTitle1: "Gemacht für",
  builtTitle2: "kleine Höfe.",
  builtBody:
    "Dein Hof behält seinen Namen, deine Kunden und deine Arbeitsweise. Wir geben dir die Werkzeuge, um Selbsternte und Hofverwaltung einfach zu machen — damit du dich auf das Wesentliche konzentrieren kannst: gesundes Essen und zufriedene Besucher.",
  featuresTitle: "Alles, was dein Hof braucht.",
  featurePlotPlannerTitle: "Parzellenplaner",
  featurePlotPlannerBody: "Jede Parzelle, jeden Mieter und jede Ernte auf einen Blick.",
  featureRipenessTitle: "Reifebenachrichtigungen",
  featureRipenessBody: "Informiere Mieter, wenn es Zeit zum Ernten ist.",
  featureBulletinTitle: "Hofpinnwand",
  featureBulletinBody: "Eine Nachricht für alle — von deinem Hof.",
  harvestTitle: "Von der Parzelle zur Ernte.",
  harvestBody:
    "Mehr als Software — ein Ort, wo Höfe, Menschen und gutes Essen zusammenkommen.",
  howItWorks: "So funktioniert's",
  lookingForPlotTitle: "Auf der Suche nach einer Parzelle?",
  lookingForPlotBody: "Finde ein Stück echten Hof in deiner Nähe.",
  searchPlaceholder: "Postleitzahl oder Stadt",
  searchPlotsCta: "Parzellen suchen",
  searchTagline: "Frisches Gemüse. Lokale Höfe. Deine Parzelle.",
  comingSoon: "Diese Seite ist bald verfügbar.",
};
