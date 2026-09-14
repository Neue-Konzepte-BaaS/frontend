import type { home as en } from "~/i18n/locales/en/home";

type Shape = { [K in keyof typeof en]: string };

export const home: Shape = {
  metaTitle: "Bauer as a Service — Selbsternte-Parzellen, ohne Excel-Tabellen",
  metaDescription:
    "Die Software hinter Selbsternte-Höfen: Parzellen verwalten, Mieter informieren, wenn die Ernte reif ist, und alle auf einmal erreichen.",
  heroTitle: "Selbsternte-Parzellen, ohne Excel-Tabellen.",
  heroBody1:
    "Kleine Höfe vermieten Selbsternte-Parzellen und verwalten sie mit Excel, Papier und WhatsApp. Bauer as a Service ist die Software hinter dem Hof: wer welche Parzelle mietet, für wie lange, was angepflanzt ist und wann es reif ist.",
  heroBody2: "Der Hof behält seine eigene Marke und seine eigenen Kunden. Wir stellen nur die Werkzeuge bereit.",
  findPlotCta: "Parzelle in deiner Nähe finden",
  runFarmCta: "Hof mit BaaS betreiben",
  featuresTitle: "Das bekommst du",
  featurePlotPlannerTitle: "Parzellenplaner",
  featurePlotPlannerBody:
    "Jede Parzelle auf einen Blick: frei, vermietet, an wen und bis wann. Keine farbcodierte Tabelle mehr.",
  featureRipenessTitle: "Reifebenachrichtigungen",
  featureRipenessBody:
    "Markiere eine Ernte als reif, und alle Mieter dieser Parzelle erfahren es noch am selben Tag, nicht erst am nächsten Wochenende.",
  featureBulletinTitle: "Schwarzes Brett",
  featureBulletinBody:
    "Eine Ankündigung erreicht alle deine Mieter gleichzeitig — statt der Gruppenchat, den niemand liest.",
  lookingForPlotTitle: "Auf der Suche nach einer Parzelle?",
  lookingForPlotBody: "Suche nach Postleitzahl oder Stadt, um verfügbare Selbsternte-Parzellen in deiner Nähe zu sehen.",
  searchPlotsCta: "Parzellen suchen",
};
