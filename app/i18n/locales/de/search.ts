import type { search as en } from "~/i18n/locales/en/search";

type Shape = { [K in keyof typeof en]: string };

export const search: Shape = {
  searchMetaTitle: "Parzelle in deiner Nähe finden · BaaS",
  searchTitle: "Parzelle in deiner Nähe finden",
  searchSubtitle: "Suche nach einer deutschen Postleitzahl oder Stadt, um verfügbare Selbsternte-Parzellen in der Nähe zu sehen.",

  customerMetaTitle: "Home · BaaS",
  customerTitle: "Home",
  myRentals: "Meine Mieten",
  noRentalsYet: "Du hast noch keine Parzelle gemietet.",
  booked: "Gebucht",

  postalCodeOrCity: "Postleitzahl oder Stadt",
  postalCodeOrCityPlaceholder: "z. B. 76133 oder Karlsruhe",
  searching: "Suche läuft…",
  searchButton: "Suchen",
  enterPostalCodeOrCity: "Gib eine Postleitzahl oder eine Stadt ein.",
  postalCodeOrCityNotFound: "Wir konnten diese Postleitzahl oder Stadt nicht finden — versuche eine andere.",
  searchAboveHint: "Suche oben, um Höfe mit verfügbaren Parzellen in deiner Nähe zu sehen.",
  noPlotsFoundNearby: "Momentan wurden keine verfügbaren Parzellen in der Nähe gefunden.",
  browseHint: "Klicke auf einen Hof, um seine verfügbaren Parzellen zu sehen.",
  farmDistance: "{{distance}} entfernt",
  nearbyPlotCount_one: "{{count}} Parzelle verfügbar",
  nearbyPlotCount_other: "{{count}} Parzellen verfügbar",
  availableCrops: "Was du hier anbauen kannst",
  cropWithDuration: "{{name}} ({{months}} Monate Mietdauer)",
  renting: "Wird gemietet…",
  rentButton: "Mieten",
  rentConflict: "Diese Parzelle wurde gerade vermietet — versuche eine andere.",
  cropNotOffered: "Diese Parzelle bietet diese Pflanze nicht an — versuche eine andere.",
  chooseCrop: "Pflanze wählen",
  noCropsOffered: "Noch nicht verfügbar — keine Pflanzen angeboten.",
  loginToRent: "Zum Mieten anmelden",
  cannotRentWrongRole: "Du bist als {{role}} angemeldet — nur Kunden-Konten können mieten.",

  farmMetaTitle: "Hof · BaaS",
  backToSearch: "Zurück zur Suche",
  rented: "Gemietet ✓",
  aboutFarm: "Über diesen Hof",
  noFarmDescriptionYet: "Dieser Hof hat noch keine Beschreibung hinzugefügt.",
  foundedLabel: "Gegründet",
  totalAreaLabel: "Gesamte Anbaufläche",
  availablePlots: "Verfügbare Parzellen",
  farmNeedsSearchContext: "Suche nach einer Postleitzahl oder Stadt, um die verfügbaren Parzellen dieses Hofs zu sehen.",
  farmHasNoPlotsNearby: "Momentan keine verfügbaren Parzellen dieses Hofs in der Nähe deiner Suche.",

  boardMetaTitle: "Pinnwand · BaaS",
  boardTitle: "Pinnwand",
  inboxMetaTitle: "Posteingang · BaaS",
  inboxTitle: "Posteingang",
};
