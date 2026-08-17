import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { englishMessages, type TranslationKey } from "./messages";

export type AppLocale = "en" | "vi";
export type TranslationParams = Record<string, number | string>;

const STORAGE_KEY = "@im-okay/display-locale";
const localeTags: Record<AppLocale, string> = {
  en: "en-US",
  vi: "vi-VN",
};

let activeLocale: AppLocale = "vi";

export const detectDeviceLocale = (): AppLocale => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    return locale.startsWith("en") ? "en" : "vi";
  } catch {
    return "vi";
  }
};

export const getLocaleTag = (locale: AppLocale = activeLocale) =>
  localeTags[locale];

export const translate = (
  key: TranslationKey,
  fallback: string,
  params: TranslationParams = {},
  locale: AppLocale = activeLocale,
) => {
  const template = locale === "en" ? englishMessages[key] : fallback;
  return Object.entries(params).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    template,
  );
};

type I18nContextValue = {
  locale: AppLocale;
  localeTag: string;
  setLocale: (locale: AppLocale) => Promise<void>;
  t: (
    key: TranslationKey,
    fallback: string,
    params?: TranslationParams,
  ) => string;
};

const defaultValue: I18nContextValue = {
  locale: "vi",
  localeTag: localeTags.vi,
  setLocale: async () => undefined,
  t: (key, fallback, params) => translate(key, fallback, params, "vi"),
};

const I18nContext = createContext<I18nContextValue>(defaultValue);

export const I18nProvider = ({ children }: PropsWithChildren) => {
  const [locale, setLocaleState] = useState<AppLocale>("vi");

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((storedLocale) => {
      if (!mounted) return;
      const nextLocale =
        storedLocale === "en" || storedLocale === "vi"
          ? storedLocale
          : detectDeviceLocale();
      activeLocale = nextLocale;
      setLocaleState(nextLocale);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setLocale = useCallback(async (nextLocale: AppLocale) => {
    activeLocale = nextLocale;
    setLocaleState(nextLocale);
    await AsyncStorage.setItem(STORAGE_KEY, nextLocale);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      localeTag: localeTags[locale],
      setLocale,
      t: (key, fallback, params) => translate(key, fallback, params, locale),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
