"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthDialog } from "@/components/AuthDialog";
import { ElevatorCard } from "@/components/ElevatorCard";
import { ReportDialog } from "@/components/ReportDialog";
import { computeStats, useEmailSubscription, useLiveData, useNow, useSession } from "@/lib/hooks";
import { formatDuration, useI18n } from "@/lib/i18n";
import { elevatorLabel, supabase, supabaseConfigured, type Elevator, type Report, type Status } from "@/lib/supabase";

export default function Home() {
  const { t, lang, setLang } = useI18n();
  const session = useSession();
  const now = useNow();
  const emailSub = useEmailSubscription(session);
  const [notify, setNotify] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotify(localStorage.getItem("notify") === "1" && Notification.permission === "granted");
  }, []);

  const onStatusChange = useCallback(
    (e: Elevator) => {
      if (!notify) return;
      new Notification(`${elevatorLabel(e, t("elevator"))}: ${e.status === "broken" ? t("notifyBrokenTitle") : t("notifyWorkingTitle")}`);
    },
    [notify, t],
  );

  const { elevators, reports, loading, connected } = useLiveData(onStatusChange);
  const [report, setReport] = useState<{ id: number; kind: Status } | null>(null);
  const [auth, setAuth] = useState(false);

  function startReport(id: number, kind: Status) {
    if (!session) setAuth(true);
    else setReport({ id, kind });
  }

  async function toggleNotify() {
    if (notify) {
      localStorage.setItem("notify", "0");
      setNotify(false);
      return;
    }
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      localStorage.setItem("notify", "1");
      setNotify(true);
    }
  }

  const allOk = elevators.length > 0 && elevators.every((e) => e.status === "working");
  const noneOk = elevators.length > 0 && elevators.every((e) => e.status === "broken");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`dot ${connected ? "dot-live" : ""}`} title={t("live")} />
          <span className="text-lg font-black tracking-tight">10th Lift</span>
        </div>
        <div className="flex items-center gap-2">
          {supabaseConfigured && (
            <button
              onClick={() => (session ? emailSub.toggle() : setAuth(true))}
              className={`chip ${emailSub.subscribed ? "chip-on" : ""}`}
              title={emailSub.subscribed ? t("emailOff") : t("emailOn")}
              aria-pressed={emailSub.subscribed}
            >
              ✉️
            </button>
          )}
          <button onClick={toggleNotify} className={`chip ${notify ? "chip-on" : ""}`} title={notify ? t("notifyOff") : t("notifyOn")} aria-pressed={notify}>
            🔔
          </button>
          <button onClick={() => setLang(lang === "uk" ? "en" : "uk")} className="chip" aria-label="Language">
            {lang === "uk" ? "EN" : "UA"}
          </button>
          {session ? (
            <button onClick={() => supabase.auth.signOut()} className="chip">
              {t("signOut")}
            </button>
          ) : (
            supabaseConfigured && (
              <button onClick={() => setAuth(true)} className="chip chip-on">
                {t("signIn")}
              </button>
            )
          )}
        </div>
      </header>

      <div className="mb-8">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
          {t("title")}
          {allOk && " ✅"}
          {noneOk && " 🚨"}
        </h1>
        <p className="mt-3 max-w-xl text-[var(--muted)]">{t("subtitle")}</p>
      </div>

      {!supabaseConfigured && <p className="mb-6 rounded-2xl bg-[var(--bad-bg)] p-4 text-[var(--bad)]">{t("setup")}</p>}

      <div className="grid gap-5 sm:grid-cols-2">
        {loading && supabaseConfigured
          ? [1, 2].map((i) => <div key={i} className="card skeleton h-60" />)
          : elevators.map((e) => (
              <ElevatorCard
                key={e.id}
                elevator={e}
                now={now}
                stats={computeStats(e.id, reports, now)}
                onReport={(k) => startReport(e.id, k)}
              />
            ))}
      </div>

      <h2 className="mb-4 mt-12 text-2xl font-bold">{t("feed")}</h2>
      {reports.length === 0 ? (
        <p className="text-[var(--muted)]">{t("noReports")}</p>
      ) : (
        <ul className="space-y-2">
          {reports.slice(0, 30).map((r) => (
            <FeedItem key={r.id} r={r} now={now} elevators={elevators} />
          ))}
        </ul>
      )}

      {report && <ReportDialog elevatorId={report.id} elevatorName={elevatorLabel(elevators.find((e) => e.id === report.id), t("elevator"), report.id)} kind={report.kind} onClose={() => setReport(null)} />}
      {auth && !session && <AuthDialog onClose={() => setAuth(false)} />}
    </div>
  );
}

function FeedItem({ r, now, elevators }: { r: Report; now: number; elevators: Elevator[] }) {
  const { t } = useI18n();
  const broken = r.kind === "broken";
  const verb = r.changed
    ? broken ? t("markedBroken") : t("markedWorking")
    : broken ? t("confirmedBroken") : t("confirmedWorking");
  const ago = formatDuration(now - +new Date(r.created_at), t);
  return (
    <li className="feed-item">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${broken ? "bg-[var(--bad)]" : "bg-[var(--ok)]"}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <b>{r.user_name}</b> · {elevatorLabel(elevators.find((e) => e.id === r.elevator_id), t("elevator"), r.elevator_id)} — {verb}
        </p>
        {r.comment && <p className="mt-1 break-words text-sm text-[var(--muted)]">«{r.comment}»</p>}
      </div>
      <span className="shrink-0 text-xs text-[var(--muted)]">{ago ? `${ago} ${t("ago")}` : t("justNow")}</span>
    </li>
  );
}
