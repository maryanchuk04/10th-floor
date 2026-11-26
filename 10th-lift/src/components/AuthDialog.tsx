"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { Modal } from "./Modal";

export function AuthDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;

  async function magic(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <Modal title={t("signInTitle")} onClose={onClose}>
      <p className="mb-5 text-sm text-[var(--muted)]">{t("signInText")}</p>
      {sent ? (
        <p className="rounded-xl bg-[var(--ok-bg)] p-3 text-sm text-[var(--ok)]">{t("linkSent")}</p>
      ) : (
        <form onSubmit={magic} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPh")}
            className="input"
          />
          <button disabled={busy} className="btn btn-primary w-full">
            {t("sendLink")}
          </button>
          {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
        </form>
      )}
    </Modal>
  );
}
