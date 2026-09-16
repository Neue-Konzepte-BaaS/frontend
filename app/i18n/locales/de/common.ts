import type { common as en } from "~/i18n/locales/en/common";

type Shape = { [K in keyof typeof en]: string };

export const common: Shape = {
  brand: "Bauer as a Service",
  signIn: "Anmelden",
  createAccount: "Konto erstellen",
  goToDashboard: "Zum Dashboard",
  logOut: "Abmelden",
  genericError: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
  sessionExpired: "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.",
  requestFailed: "Anfrage fehlgeschlagen ({{status}}).",
  language: "Sprache",
  errorOops: "Hoppla!",
  errorUnexpected: "Ein unerwarteter Fehler ist aufgetreten.",
  errorNotFoundTitle: "404",
  errorTitle: "Fehler",
  errorNotFoundBody: "Die angeforderte Seite konnte nicht gefunden werden.",
  backToHome: "Zurück zur Startseite",

  navHome: "Home",
  navSearch: "Suche",
  navBoard: "Pinnwand",
  navInbox: "Posteingang",
  navMe: "Ich",
  navFields: "Felder",
  navPlanner: "Parzellenplaner",
  navTenants: "Pächter",
  navRequests: "Anfragen",
  navCareGuide: "Pflegehinweise",
  navFarmSettings: "Hofeinstellungen",

  comingSoonLead: "Demnächst verfügbar.",
  comingSoonBody: "Dieser Bereich ist noch nicht gebaut — die Navigation dorthin schon.",
};
