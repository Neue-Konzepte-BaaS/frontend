export const search = {
  searchMetaTitle: "Find a plot near you · BaaS",
  searchTitle: "Find a plot near you",
  searchSubtitle: "Search a German postal code or city to see available self-harvest plots nearby.",

  customerMetaTitle: "Home · BaaS",
  customerTitle: "Home",
  myRentals: "My rentals",
  // Plot search moved to its own /search tab (issue #27) — this page no
  // longer has a search box "above" it, hence no mention of one here.
  noRentalsYet: "You haven't rented a plot yet.",
  booked: "Booked",

  postalCodeOrCity: "Postal code or city",
  postalCodeOrCityPlaceholder: "e.g. 76133 or Karlsruhe",
  searching: "Searching…",
  searchButton: "Search",
  enterPostalCodeOrCity: "Enter a postal code or a city.",
  postalCodeOrCityNotFound: "We couldn't find that postal code or city — try another.",
  searchAboveHint: "Search above to see farms with plots available near you.",
  noPlotsFoundNearby: "No available plots found near there right now.",
  browseHint: "Click a farm below to see its available plots.",
  farmDistance: "{{distance}} away",
  nearbyPlotCount_one: "{{count}} plot available",
  nearbyPlotCount_other: "{{count}} plots available",
  availableCrops: "What you can grow here",
  cropWithDuration: "{{name}} ({{months}}-month rental)",
  renting: "Renting…",
  rentButton: "Rent",
  rentConflict: "Someone just rented this plot — try another.",
  cropNotOffered: "This plot doesn't offer that crop — try another one.",
  chooseCrop: "Choose a crop",
  noCropsOffered: "Not available yet — no crops offered.",
  loginToRent: "Log in to rent",
  cannotRentWrongRole: "You're signed in as a {{role}} — only customer accounts can rent.",

  farmMetaTitle: "Farm · BaaS",
  backToSearch: "Back to search",
  rented: "Rented ✓",
  aboutFarm: "About this farm",
  noFarmDescriptionYet: "This farm hasn't added a description yet.",
  foundedLabel: "Founded",
  totalAreaLabel: "Total growing area",
  availablePlots: "Available plots",
  farmNeedsSearchContext: "Search for a postal code or city to see this farm's available plots.",
  farmHasNoPlotsNearby: "No available plots from this farm near your search right now.",

  // Nav destinations still awaiting a real feature — see issue #27 and coming-soon.tsx.
  // "Me" moved out of coming-soon once issue #34 built it — see i18n/locales/*/customer.ts.
  boardMetaTitle: "Board · BaaS",
  boardTitle: "Board",
  inboxMetaTitle: "Inbox · BaaS",
  inboxTitle: "Inbox",
} as const;
