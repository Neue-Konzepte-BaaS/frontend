import type { farmInfo as en } from "~/i18n/locales/en/for-farmers";

type Shape = { [K in keyof typeof en]: string };

export const farmInfo: Shape = {
  metaTitle: "Deinen Hof betreiben · Farmland",
  metaDescription: "So funktioniert Farmland für Höfe: eine monatliche Gebühr, 10% pro Transaktion, deine eigene Marke.",
  heroHeadline1: "Dein Hof.",
  heroHeadline2: "Deine Regeln.",
  heroHeadline3: "Unsere Tools.",
  heroSubtitle: "Vermiete Selbsternte-Parzellen und verwalte deinen Hof ohne Excel und WhatsApp.",
  introTitle: "So funktioniert's",
  introBody:
    "Liste deine Parzellen, behalte den Überblick, wer was mietet, und verschicke Pflegetipps und Reifebenachrichtigungen — alles mit einem Tool, gemacht für kleine Höfe.",
  subscriptionTitle: "Ein einfaches Monatsabo",
  subscriptionBody:
    "Wähle ein Paket passend zur Größe deines Hofs. Keine Einrichtungsgebühr, keine lange Vertragsbindung — nur ein monatlicher Preis für vollen Zugang zur Plattform.",
  subscriptionCta: "Abo-Pakete ansehen",
  commissionTitle: "10% pro Transaktion",
  commissionBody:
    "Wir verdienen nur, wenn du verdienst: Farmland behält 10% jeder Mietzahlung, die über die Plattform läuft. Keine versteckten Zusatzkosten.",
  brandTitle: "Dein Hof, deine Marke",
  brandBody: "Dein Hof behält seinen eigenen Namen und seine eigenen Kunden. Wir stellen nur die Werkzeuge im Hintergrund bereit.",
  ctaTitle: "Bereit, deinen Hof mit Farmland zu betreiben?",
  ctaBody: "Erstelle dein Hofkonto und richte deine erste Parzelle in wenigen Minuten ein.",
  signUpCta: "Als Hof registrieren",
};
