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
};
