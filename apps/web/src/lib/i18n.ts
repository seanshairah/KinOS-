import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@kinos/config";

/**
 * The message dictionary and a tiny `t()` helper. English is the complete
 * source of truth — its keys define the message type — and Shona/Ndebele are
 * partial: any key not yet translated falls back to English, so the product
 * is never broken by a missing string, only less translated. This is the
 * foundation, not a finished translation: a representative core is in place
 * (the daily surfaces — the check-in, the calm errors, navigation) and every
 * new string added to `en` becomes a translatable key automatically.
 */

export const LOCALE_COOKIE = "kinos_locale";

const en = {
  "nav.today": "Today",
  "nav.orbits": "Orbits",
  "nav.attention": "Attention",
  "nav.record": "Record",
  "nav.money": "Money",
  "nav.settings": "Settings",
  "checkin.title": "Check-in",
  "checkin.how": "How is {name} today?",
  "checkin.pick": "Pick how they're doing today.",
  "checkin.cantHold":
    "You're offline and this device can't hold it. Try again when you have signal.",
  "checkin.didntSend": "That didn't send. Try again.",
  "checkin.send": "Send today's check-in",
  "checkin.sending": "Sending…",
  "checkin.saved": "Saved.",
  "checkin.offlineNote":
    "You're offline right now — this check-in will send itself the moment you're back on. Nothing more to do.",
  "mood.good": "Doing well",
  "mood.okay": "Okay",
  "mood.low": "A little low",
  "mood.unwell": "Not feeling well",
  "eaten.q": "Eaten today?",
  "eaten.yes": "Yes, eaten",
  "eaten.no": "Not yet",
  "note.prompt": "Anything to add? (optional)",
  "note.placeholder": "A few words is plenty.",
  "common.tryAgain": "Try again",
  "common.back": "Back to Today",
  "error.room": "This room didn't open. Nothing is lost.",
  "error.safe": "The family record is safe. Try again, or head back to Today.",
  "settings.language": "Language",
  "settings.languageHint": "Choose the language KinOS speaks to you in.",
  "settings.save": "Save",
} as const;

export type MessageKey = keyof typeof en;

const sn: Partial<Record<MessageKey, string>> = {
  "nav.today": "Nhasi",
  "nav.attention": "Nyevero",
  "nav.record": "Zvinyorwa",
  "nav.money": "Mari",
  "nav.settings": "Marongero",
  "checkin.title": "Kukwazisa",
  "checkin.how": "{name} ari sei nhasi?",
  "checkin.pick": "Sarudza kuti vari sei nhasi.",
  "checkin.cantHold":
    "Hausi paindaneti uye foni iyi haikwanise kuchengeta. Edza zvakare paunowana indaneti.",
  "checkin.didntSend": "Hazvina kutumirwa. Edza zvakare.",
  "checkin.send": "Tumira kukwazisa kwanhasi",
  "checkin.sending": "Kutumira…",
  "checkin.saved": "Zvachengetwa.",
  "checkin.offlineNote":
    "Hausi paindaneti izvozvi — kukwazisa uku kuchazvitumira pauchadzokera paindaneti. Hapana chimwe chekuita.",
  "mood.good": "Ari kunzwa zvakanaka",
  "mood.okay": "Zvakanaka",
  "mood.low": "Akaneta zvishoma",
  "mood.unwell": "Haasi kunzwa zvakanaka",
  "eaten.q": "Vadya nhasi here?",
  "eaten.yes": "Hongu, vadya",
  "eaten.no": "Havasati",
  "note.prompt": "Pane chaunoda kuwedzera? (kungasarudzwa)",
  "note.placeholder": "Mashoko mashoma anokwana.",
  "common.tryAgain": "Edza zvakare",
  "common.back": "Dzokera kuNhasi",
  "error.room": "Kamuri iri harina kuvhurika. Hapana chakarasika.",
  "error.safe": "Zvakachengetwa zvemhuri zvakachengeteka. Edza zvakare, kana kudzokera kuNhasi.",
  "settings.language": "Mutauro",
  "settings.languageHint": "Sarudza mutauro waunoda kuti KinOS itaure newe nawo.",
  "settings.save": "Chengeta",
};

const nd: Partial<Record<MessageKey, string>> = {
  "nav.today": "Lamuhla",
  "nav.attention": "Isixwayiso",
  "nav.record": "Imibhalo",
  "nav.money": "Imali",
  "nav.settings": "Izilungiselelo",
  "checkin.title": "Ukubingelela",
  "checkin.how": "Unjani u-{name} lamuhla?",
  "checkin.pick": "Khetha ukuthi banjani lamuhla.",
  "checkin.cantHold":
    "Awukho ku-inthanethi njalo le foni ayikwazi ukukugcina. Zama futhi nxa uselenethiwekhi.",
  "checkin.didntSend": "Akuthunyelwanga. Zama futhi.",
  "checkin.send": "Thumela ukubingelela kwalamuhla",
  "checkin.sending": "Iyathumela…",
  "checkin.saved": "Kulondoloziwe.",
  "checkin.offlineNote":
    "Awukho ku-inthanethi khathesi — lokhu kubingelela kuzazithumela nxa usubuyele ku-inthanethi. Akukho okunye okumele ukwenze.",
  "mood.good": "Uphila kuhle",
  "mood.okay": "Kulungile",
  "mood.low": "Udangele kancane",
  "mood.unwell": "Kaphili kuhle",
  "eaten.q": "Udlile lamuhla?",
  "eaten.yes": "Yebo, udlile",
  "eaten.no": "Kakadli",
  "note.prompt": "Kukhona ongakwengeza? (akuqakathekanga)",
  "note.placeholder": "Amazwi ambalwa anele.",
  "common.tryAgain": "Zama futhi",
  "common.back": "Buyela ku-Lamuhla",
  "error.room": "Leli gumbi kalivulekanga. Akulahlekanga lutho.",
  "error.safe": "Imibhalo yomndeni iphephile. Zama futhi, kumbe ubuyele ku-Lamuhla.",
  "settings.language": "Ulimi",
  "settings.languageHint": "Khetha ulimi ofuna i-KinOS ikhulume ngalo lawe.",
  "settings.save": "Londoloza",
};

const MESSAGES: Record<Locale, Partial<Record<MessageKey, string>>> = { en, sn, nd };

/**
 * Translate a key for a locale, filling {vars}. Falls back to English for any
 * untranslated key, then to the key itself — the product never shows a blank.
 */
export function t(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const template = MESSAGES[locale]?.[key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

/** The locale this browser has chosen, from its cookie. Defaults to English. */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** A translator bound to the current request's locale — `const tr = await getT()`. */
export async function getT(): Promise<{
  locale: Locale;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}> {
  const locale = await getLocale();
  return { locale, t: (key, vars) => t(locale, key, vars) };
}
