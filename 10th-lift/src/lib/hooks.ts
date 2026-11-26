"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured, type Elevator, type Report } from "./supabase";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

export function useEmailSubscription(session: Session | null) {
  const [subscribed, setSubscribed] = useState(false);
  const uid = session?.user.id;

  useEffect(() => {
    if (!uid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubscribed(false);
      return;
    }
    supabase
      .from("subscriptions")
      .select("user_id")
      .eq("user_id", uid)
      .maybeSingle()
      .then(({ data }) => setSubscribed(Boolean(data)));
  }, [uid]);

  async function toggle() {
    if (!uid) return;
    if (subscribed) {
      const { error } = await supabase.from("subscriptions").delete().eq("user_id", uid);
      if (!error) setSubscribed(false);
    } else {
      const { error } = await supabase.from("subscriptions").insert({});
      if (!error) setSubscribed(true);
    }
  }

  return { subscribed, toggle };
}

export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const SINCE_DAYS = 30;

export function useLiveData(onStatusChange?: (e: Elevator) => void) {
  const [elevators, setElevators] = useState<Elevator[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const cb = useRef(onStatusChange);
  useEffect(() => {
    cb.current = onStatusChange;
  });

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;

    async function load() {
      const since = new Date(Date.now() - SINCE_DAYS * 864e5).toISOString();
      const [e, r] = await Promise.all([
        supabase.from("elevators").select("*").order("id"),
        supabase
          .from("reports")
          .select("id,elevator_id,user_name,kind,comment,changed,created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      if (cancelled) return;
      if (e.data) setElevators(e.data as Elevator[]);
      if (r.data) setReports(r.data as Report[]);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("live")
      .on("postgres_changes", { event: "*", schema: "public", table: "elevators" }, (p) => {
        const row = p.new as Elevator;
        setElevators((prev) => {
          const old = prev.find((x) => x.id === row.id);
          if (old && old.status !== row.status) cb.current?.(row);
          return prev.some((x) => x.id === row.id)
            ? prev.map((x) => (x.id === row.id ? row : x))
            : [...prev, row].sort((a, b) => a.id - b.id);
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" }, (p) => {
        const row = p.new as Report;
        setReports((prev) => (prev.some((x) => x.id === row.id) ? prev : [row, ...prev]));
      })
      .subscribe((s) => setConnected(s === "SUBSCRIBED"));

    // refresh on tab focus to recover from sleeping connections
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      supabase.removeChannel(channel);
    };
  }, []);

  return { elevators, reports, loading, connected };
}

/** Downtime stats per elevator for the loaded window. */
export function computeStats(elevatorId: number, reports: Report[], now: number) {
  const changes = reports
    .filter((r) => r.elevator_id === elevatorId && r.changed)
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  let breakdowns = 0;
  let downtime = 0;
  let brokeAt: number | null = null;
  for (const c of changes) {
    const ts = +new Date(c.created_at);
    if (c.kind === "broken") {
      breakdowns++;
      brokeAt = ts;
    } else if (brokeAt !== null) {
      downtime += ts - brokeAt;
      brokeAt = null;
    }
  }
  if (brokeAt !== null) downtime += now - brokeAt;
  return { breakdowns, downtime };
}
