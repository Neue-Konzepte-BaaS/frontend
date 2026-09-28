import type { home as en } from "~/i18n/locales/en/home";

type Shape = { [K in keyof typeof en]: string };

export const home: Shape = {
  metaTitle: "Farmland",
  metaDescription:
    "Miete eine Selbsternte-Parzelle in deiner Nähe — oder verwalte deinen Hof ohne Excel und WhatsApp.",
  heroTitle: "Selbsternte-Parzellen, ohne Excel-Tabellen.",
  heroHeadline1: "Selbst anbauen.",
  heroHeadline2: "Den Hof leiten.",
  heroHeadline3: "Einfach.",
  heroSubtitle: "Finde eine Parzelle zum Mieten — oder verwalte deinen Hof ohne Papierkram.",
  heroBody1:
    "Kleine Höfe vermieten Selbsternte-Parzellen und verwalten sie mit Excel, Papier und WhatsApp. Farmland ist die Software hinter dem Hof: wer welche Parzelle mietet, für wie lange, was angepflanzt ist und wann es reif ist.",
  heroBody2: "Der Hof behält seine eigene Marke und seine eigenen Kunden. Wir stellen nur die Werkzeuge bereit.",
  getStarted: "Jetzt starten",
  findPlotCta: "Parzelle in deiner Nähe finden",
  runFarmCta: "Deinen Hof betreiben",
  builtTitle1: "Für Höfe.",
  builtTitle2: "Für Pächter.",
  builtBody:
    "Hofbetreiber ersetzen Excel und WhatsApp durch ein einziges Tool. Pächter bekommen eine Parzelle, wöchentliche Pflegetipps und eine Benachrichtigung, sobald ihre Ernte bereit ist. Eine Plattform für alle.",
  featuresTitle: "Alles, was du brauchst.",
  featurePlotPlannerTitle: "Parzellenplaner",
  featurePlotPlannerBody: "Hofbetreiber sehen jede Parzelle, jeden Mieter und jede Ernte auf einen Blick.",
  featureRipenessTitle: "Reifebenachrichtigungen",
  featureRipenessBody: "Erfahre genau, wann deine Ernte bereit ist — dein Hofbetreiber benachrichtigt dich direkt.",
  featureBulletinTitle: "Hofpinnwand",
  featureBulletinBody: "Bleib über Neuigkeiten von deinem Hof informiert — Erntetage, Veranstaltungen und mehr.",
  featureCareTipsTitle: "Wöchentliche Pflegetipps",
  featureCareTipsBody: "Erhalte jede Woche eine neue Pflegeaufgabe, damit deine Parzelle die ganze Saison gesund bleibt.",
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
