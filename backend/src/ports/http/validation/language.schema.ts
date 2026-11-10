import { z } from "zod";
import { LANGUAGES } from "../../../domain/i18n/language.js";
import { COMMUNITY } from "../../../infrastructure/config/community.js";

// The app's current language, for the emails a request triggers. Optional so
// an older cached frontend that doesn't send it keeps working.
export const languageSchema = z.enum(LANGUAGES).default(COMMUNITY.defaultLanguage);
