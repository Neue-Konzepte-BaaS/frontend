import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { common as enCommon } from "~/i18n/locales/en/common";
import { home as enHome } from "~/i18n/locales/en/home";
import { auth as enAuth } from "~/i18n/locales/en/auth";
import { search as enSearch } from "~/i18n/locales/en/search";
import { farmer as enFarmer } from "~/i18n/locales/en/farmer";
import { admin as enAdmin } from "~/i18n/locales/en/admin";
import { customer as enCustomer } from "~/i18n/locales/en/customer";

import { common as deCommon } from "~/i18n/locales/de/common";
import { home as deHome } from "~/i18n/locales/de/home";
import { auth as deAuth } from "~/i18n/locales/de/auth";
import { search as deSearch } from "~/i18n/locales/de/search";
import { farmer as deFarmer } from "~/i18n/locales/de/farmer";
import { admin as deAdmin } from "~/i18n/locales/de/admin";
import { customer as deCustomer } from "~/i18n/locales/de/customer";

export const defaultNS = "common";

export const resources = {
  en: {
    common: enCommon,
    home: enHome,
    auth: enAuth,
    search: enSearch,
    farmer: enFarmer,
    admin: enAdmin,
    customer: enCustomer,
  },
  de: {
    common: deCommon,
    home: deHome,
    auth: deAuth,
    search: deSearch,
    farmer: deFarmer,
    admin: deAdmin,
    customer: deCustomer,
  },
} as const;

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["en", "de"],
    defaultNS,
    ns: Object.keys(resources.en),
    interpolation: {
      // React already escapes rendered output.
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "baas_language",
    },
  });

export default i18next;
