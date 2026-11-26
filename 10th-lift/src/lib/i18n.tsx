"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "uk" | "en";

const dict = {
  uk: {
    title: "Статус ліфтів",
    subtitle: "Живий статус ліфтів коворкінгу. Бачите проблему — повідомте інших.",
    elevator: "Ліфт",
    working: "Працює",
    broken: "Не працює",
    since: "вже",
    justNow: "щойно",
    ago: "тому",
    reportBroken: "Повідомити: не працює",
    reportWorking: "Знову працює",
    commentPh: "Що сталося? (необов'язково)",
    send: "Надіслати",
    cancel: "Скасувати",
    reportTitleBroken: "Ліфт не працює",
    reportTitleWorking: "Ліфт знову працює",
    signIn: "Увійти",
    signOut: "Вийти",
    signInTitle: "Увійдіть, щоб повідомляти",
    signInText: "Це потрібно лише щоб уникнути спаму. Ваше ім'я показується тільки як ім'я без прізвища.",
    google: "Продовжити з Google",
    or: "або",
    emailPh: "ваш@email.com",
    sendLink: "Надіслати посилання для входу",
    linkSent: "Перевірте пошту — ми надіслали посилання для входу.",
    feed: "Останні повідомлення",
    noReports: "Поки що повідомлень немає. Це добра ознака 🙂",
    stats: "Останні 30 днів",
    breakdowns: "поломок",
    downtime: "простою",
    history: "Історія",
    errRate: "Зачекайте хвилину перед наступним повідомленням.",
    errGeneric: "Не вдалося надіслати. Спробуйте ще раз.",
    setup: "Сайт ще не підключено до бази даних. Заповніть .env.local (див. README).",
    alreadyBroken: "Вже позначено як несправний",
    alreadyWorking: "Вже працює",
    markedBroken: "позначив(-ла) як несправний",
    markedWorking: "повідомив(-ла), що працює",
    confirmedBroken: "підтвердив(-ла), що не працює",
    confirmedWorking: "підтвердив(-ла), що працює",
    emailOn: "Отримувати листи, коли ліфт ламається або знову працює",
    emailOff: "Ви підписані на листи. Натисніть, щоб відписатися",
    notifyOn: "Сповіщення в браузері",
    notifyOff: "Вимкнути сповіщення",
    notifyBrokenTitle: "Ліфт не працює",
    notifyWorkingTitle: "Ліфт знову працює",
    min: "хв",
    h: "год",
    d: "дн",
    live: "наживо",
  },
  en: {
    title: "Elevator status",
    subtitle: "Live status of the coworking elevators. See a problem — let everyone know.",
    elevator: "Elevator",
    working: "Working",
    broken: "Out of order",
    since: "for",
    justNow: "just now",
    ago: "ago",
    reportBroken: "Report: not working",
    reportWorking: "It works again",
    commentPh: "What happened? (optional)",
    send: "Send",
    cancel: "Cancel",
    reportTitleBroken: "Elevator is not working",
    reportTitleWorking: "Elevator works again",
    signIn: "Sign in",
    signOut: "Sign out",
    signInTitle: "Sign in to report",
    signInText: "Only needed to prevent spam. Only your first name is shown to others.",
    google: "Continue with Google",
    or: "or",
    emailPh: "you@email.com",
    sendLink: "Send sign-in link",
    linkSent: "Check your inbox — we sent you a sign-in link.",
    feed: "Latest reports",
    noReports: "No reports yet. That's a good sign 🙂",
    stats: "Last 30 days",
    breakdowns: "breakdowns",
    downtime: "downtime",
    history: "History",
    errRate: "Please wait a minute before reporting again.",
    errGeneric: "Couldn't send. Please try again.",
    setup: "The site isn't connected to a database yet. Fill in .env.local (see README).",
    alreadyBroken: "Already marked as broken",
    alreadyWorking: "Already working",
    markedBroken: "marked it as broken",
    markedWorking: "reported it works",
    confirmedBroken: "confirmed it's not working",
    confirmedWorking: "confirmed it's working",
    emailOn: "Get an email when an elevator breaks or works again",
    emailOff: "You're subscribed to emails. Click to unsubscribe",
    notifyOn: "Browser notifications",
    notifyOff: "Turn off notifications",
    notifyBrokenTitle: "Elevator is out of order",
    notifyWorkingTitle: "Elevator works again",
    min: "min",
    h: "h",
    d: "d",
    live: "live",
  },
} as const;

export type Key = keyof (typeof dict)["uk"];

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string };
const I18nCtx = createContext<Ctx>({ lang: "uk", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("uk");

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    const initial: Lang = saved === "en" || saved === "uk" ? saved : "uk";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLangState(initial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  }, []);

  const t = useCallback((k: Key) => dict[lang][k], [lang]);

  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);

export function formatDuration(ms: number, t: (k: Key) => string) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return null;
  if (m < 60) return `${m} ${t("min")}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${t("h")} ${m % 60} ${t("min")}`;
  const d = Math.floor(h / 24);
  return `${d} ${t("d")} ${h % 24} ${t("h")}`;
}
