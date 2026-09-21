import type { auth as en } from "~/i18n/locales/en/auth";

type Shape = { [K in keyof typeof en]: string };

export const auth: Shape = {
  loginMetaTitle: "Anmelden · BaaS",
  loginTitle: "Anmelden",
  loginSubtitle: "Willkommen zurück. Melde dich bei deinem Konto an.",
  emailLabel: "E-Mail",
  passwordLabel: "Passwort",
  signingIn: "Anmeldung läuft…",
  noAccountYet: "Noch kein Konto?",
  createOne: "Jetzt erstellen",

  registerMetaTitle: "Konto erstellen · BaaS",
  registerTitle: "Konto erstellen",
  registerSubtitle: "Wähle, wie du die Plattform nutzen möchtest.",
  accountType: "Kontotyp",
  roleCustomer: "Kunde",
  roleFarmer: "Landwirt",
  roleAdmin: "Admin",
  wrongAccountTypeNotice: "Diese Seite ist für {{role}}-Konten — du wurdest stattdessen zu deinem eigenen Dashboard weitergeleitet.",
  firstNameLabel: "Vorname",
  lastNameLabel: "Nachname",
  farmNameLabel: "Hofname",
  addressLabel: "Hofadresse",
  descriptionLabel: "Hofbeschreibung (optional)",
  postalCodeLabel: "Postleitzahl",
  invalidPostalCode: "Bitte gib eine gültige Postleitzahl ein.",
  creatingAccount: "Konto wird erstellt…",
  alreadyHaveAccount: "Du hast bereits ein Konto?",
};
