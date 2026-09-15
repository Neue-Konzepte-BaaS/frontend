import type { search as en } from "~/i18n/locales/en/search";

type Shape = { [K in keyof typeof en]: string };

export const search: Shape = {
  searchMetaTitle: "Parzelle in deiner Nähe finden · BaaS",
  searchTitle: "Parzelle in deiner Nähe finden",
  searchSubtitle: "Suche nach einer deutschen Postleitzahl oder Stadt, um verfügbare Selbsternte-Parzellen in der Nähe zu sehen.",

  customerMetaTitle: "Meine Parzellen · BaaS",
  customerTitle: "Felder in deiner Nähe finden",
  myRentals: "Meine Mieten",
  noRentalsYet: "Du hast noch keine Parzelle gemietet — suche oben, um eine zu finden.",
  booked: "Gebucht",

  postalCodeOrCity: "Postleitzahl oder Stadt",
  postalCodeOrCityPlaceholder: "z. B. 76133 oder Karlsruhe",
  searching: "Suche läuft…",
  searchButton: "Suchen",
  enterPostalCodeOrCity: "Gib eine Postleitzahl oder eine Stadt ein.",
  postalCodeOrCityNotFound: "Wir konnten diese Postleitzahl oder Stadt nicht finden — versuche eine andere.",
  searchAboveHint: "Suche oben, um verfügbare Parzellen in deiner Nähe zu sehen.",
  noPlotsFoundNearby: "Momentan wurden keine verfügbaren Parzellen in der Nähe gefunden.",
  distanceAway: "{{distance}} entfernt",
  browseHint: "Klicke auf eine Nummer auf der Karte oder ein Ergebnis unten, um zu sehen, was dort angeboten wird.",
  availableCrops: "Was du hier anbauen kannst",
  cropWithDuration: "{{name}} ({{months}} Monate Mietdauer)",
  rented: "Gemietet ✓",
  renting: "Wird gemietet…",
  rentButton: "Mieten",
  rentConflict: "Diese Parzelle wurde gerade vermietet — versuche eine andere.",
  cropNotOffered: "Diese Parzelle bietet diese Pflanze nicht an — versuche eine andere.",
  chooseCrop: "Pflanze wählen",
  noCropsOffered: "Noch nicht verfügbar — keine Pflanzen angeboten.",
  loginToRent: "Zum Mieten anmelden",
  cannotRentWrongRole: "Du bist als {{role}} angemeldet — nur Kunden-Konten können mieten.",
};
