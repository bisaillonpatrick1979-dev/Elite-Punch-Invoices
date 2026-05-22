import { fr } from "./fr.js";
import { en } from "./en.js";

export const languages = {
  fr,
  en
};

export function getTranslations(language) {
  return languages[language] || languages.fr;
}
