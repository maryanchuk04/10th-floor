"use client";

import { useState } from "react";
import { supabase, type Status } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { Modal } from "./Modal";

export function ReportDialog({
  elevatorId,
  elevatorName,
  kind,
  onClose,
}: {
  elevatorId: number;
  elevatorName: string;
  kind: Status;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { data, error } = await supabase
      .from("reports")
      .insert({ elevator_id: elevatorId, kind, comment: comment.trim() || null })
      .select("id")
      .single();
    if (error || !data) {
      setBusy(false);
      setError(error?.message.includes("rate_limited") ? t("errRate") : t("errGeneric"));
      return;
    }
    // fire-and-forget Telegram notification (no-op if not configured)
    const { data: s } = await supabase.auth.getSession();
    fetch("/api/notify", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token}` },
      body: JSON.stringify({ reportId: data.id }),
    }).catch(() => {});
    onClose();
  }

  const title = `${elevatorName}: ${kind === "broken" ? t("reportTitleBroken") : t("reportTitleWorking")}`;

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <textarea
          autoFocus
          maxLength={280}
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("commentPh")}
          className="input resize-none"
        />
        {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
            {t("cancel")}
          </button>
          <button disabled={busy} className={`btn flex-1 ${kind === "broken" ? "btn-bad" : "btn-ok"}`}>
            {t("send")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
