// src/config/i18n.js
import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';

import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import hi from '../locales/hi.json';
//import other languages here

const i18n = new I18n({
  en,
  es,
  fr,
  de,
  hi,
});

// The `Localization.locale` property is deprecated and removed in recent SDKs.
// We should use `getLocales()` which returns an array.
const locales = Localization.getLocales();
if (locales && locales.length > 0) {
  // Use the first locale's language tag (e.g., "en-US")
  i18n.locale = locales[0].languageTag;
}
i18n.enableFallback = true;

export default i18n;