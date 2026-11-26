"use client";

import { formatDuration, useI18n } from "@/lib/i18n";
import { elevatorLabel, type Elevator, type Status } from "@/lib/supabase";

export function ElevatorCard({
  elevator,
  now,
  stats,
  onReport,
}: {
  elevator: Elevator;
  now: number;
  stats: { breakdowns: number; downtime: number };
  onReport: (kind: Status) => void;
}) {
  const { t } = useI18n();
  const ok = elevator.status === "working";
  const dur = formatDuration(now - +new Date(elevator.status_changed_at), t);

  return (
    <section
      className={`card relative overflow-hidden ${ok ? "card-ok" : "card-bad"}`}
      aria-live="polite"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-[var(--muted)]">
            {elevatorLabel(elevator, t("elevator"))}
          </p>
          <p className={`mt-2 text-4xl font-extrabold sm:text-5xl ${ok ? "text-[var(--ok)]" : "text-[var(--bad)]"}`}>
            {ok ? t("working") : t("broken")}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {t("since")} {dur ?? t("justNow")}
          </p>
        </div>
        <ElevatorIcon ok={ok} />
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        {ok ? (
          <button onClick={() => onReport("broken")} className="btn btn-bad flex-1">
            ⚠️ {t("reportBroken")}
          </button>
        ) : (
          <button onClick={() => onReport("working")} className="btn btn-ok flex-1">
            ✅ {t("reportWorking")}
          </button>
        )}
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">
        {t("stats")}: <b className="text-[var(--fg)]">{stats.breakdowns}</b> {t("breakdowns")}
        {stats.downtime > 0 && (
          <>
            {" · "}
            <b className="text-[var(--fg)]">{formatDuration(stats.downtime, t) ?? "<1 " + t("min")}</b> {t("downtime")}
          </>
        )}
      </p>
    </section>
  );
}

function ElevatorIcon({ ok }: { ok: boolean }) {
  const c = ok ? "var(--ok)" : "var(--bad)";
  return (
    <div className="relative">
      {!ok && <span className="ping absolute inset-0 rounded-2xl" />}
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden>
        <rect x="10" y="6" width="44" height="52" rx="8" stroke={c} strokeWidth="3" />
        <line x1="32" y1="6" x2="32" y2="58" stroke={c} strokeWidth="2" opacity=".5" />
        {ok ? (
          <path d="M20 30l5-6 5 6M38 34l5 6 5-6" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" transform="translate(-3 0)" />
        ) : (
          <path d="M22 22l20 20M42 22L22 42" stroke={c} strokeWidth="4" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
}
