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

  registerSuccessTitle: "Überprüfe deine E-Mails",
  registerSuccessSubtitle: "Wir haben einen Bestätigungslink an {{email}} gesendet. Klicke darauf, um dein Konto zu erstellen.",

  verifyEmailMetaTitle: "E-Mail bestätigen · BaaS",
  verifyingTitle: "E-Mail wird bestätigt…",
  verifyingMessage: "Einen Moment, wir prüfen deinen Bestätigungslink.",
  verifySuccessTitle: "E-Mail bestätigt",
  verifySuccessMessage: "Dein Konto ist bereit. Du wirst weitergeleitet…",
  verifyErrorInvalidTitle: "Ungültiger oder abgelaufener Link",
  verifyErrorInvalidMessage: "Dieser Bestätigungslink ist ungültig oder abgelaufen. Bitte melde dich erneut an, um einen neuen Link zu erhalten.",
  verifyErrorAlreadyRegisteredTitle: "E-Mail bereits registriert",
  verifyErrorAlreadyRegisteredMessage: "Diese E-Mail-Adresse ist bereits registriert. Bitte melde dich stattdessen an.",
  verifyErrorMissingToken: "Diesem Bestätigungslink fehlt das Token. Bitte verwende den Link aus deiner E-Mail.",
  backToRegister: "Zurück zur Registrierung",
};
