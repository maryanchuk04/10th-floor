import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

// Called after a report is created. If the report actually changed an elevator's status:
//  - sends a Telegram message (optional: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)
//  - emails all subscribers when the elevator broke (optional: SMTP_* + SUPABASE_SERVICE_ROLE_KEY)
const seen = new Set<string>();

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const { reportId } = (await req.json().catch(() => ({}))) as { reportId?: string };
  if (!auth.startsWith("Bearer ") || !reportId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const sb = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: user } = await sb.auth.getUser(auth.slice(7));
  if (!user.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { data: r } = await sb.from("reports").select("*").eq("id", reportId).single();
  if (!r || !r.changed || seen.has(r.id) || Date.now() - +new Date(r.created_at) > 5 * 60_000) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  seen.add(r.id);

  const { data: el } = await sb.from("elevators").select("name").eq("id", r.elevator_id).single();
  const label = el?.name?.trim() || `Ліфт ${r.elevator_id} / Elevator ${r.elevator_id}`;
  const broken = r.kind === "broken";
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const comment = r.comment ? String(r.comment).slice(0, 280) : "";

  const [tg, mail] = await Promise.allSettled([telegram(), emailSubscribers()]);
  for (const [name, res] of [["telegram", tg], ["email", mail]] as const) {
    if (res.status === "rejected") console.error(`notify ${name} failed:`, res.reason);
  }
  return NextResponse.json({
    ok: true,
    telegram: tg.status,
    email: mail.status === "rejected" ? `failed: ${String(mail.reason?.message ?? mail.reason)}` : "ok",
  });

  async function telegram() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chat = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chat) return;
    const text =
      `${broken ? "🔴" : "🟢"} ${label}: ${broken ? "НЕ ПРАЦЮЄ / OUT OF ORDER" : "знову працює / works again"}` +
      (comment ? `\n«${comment}»` : "") +
      (site ? `\n${site}` : "");
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text }),
    });
  }

  async function emailSubscribers() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("SMTP_* or SUPABASE_SERVICE_ROLE_KEY env vars are missing");
    }

    // service key is required to read all subscribers (RLS only lets users see their own row)
    const admin = createClient(url, SUPABASE_SERVICE_ROLE_KEY);
    const { data: subs, error: subsError } = await admin.from("subscriptions").select("email");
    if (subsError) throw new Error(`reading subscriptions: ${subsError.message}`);
    const emails = (subs ?? []).map((s) => s.email as string).filter(Boolean);
    if (emails.length === 0) {
      console.warn("notify: no subscribers");
      return;
    }

    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 587),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    const from = MAIL_FROM || SMTP_USER;
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

    const headline = broken
      ? `🔴 ${label}: не працює / out of order`
      : `🟢 ${label}: знову працює / works again`;

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:480px">
        <h2 style="color:${broken ? "#dc2626" : "#059669"}">${esc(headline)}</h2>
        ${comment ? `<p><i>«${esc(comment)}»</i></p>` : ""}
        <p>Повідомив(-ла) / reported by: <b>${esc(r.user_name)}</b></p>
        ${site ? `<p><a href="${site}">${esc(site)}</a></p>` : ""}
        <p style="color:#64748b;font-size:12px">Ви отримали цей лист, бо підписані на сповіщення. Відписатися можна на сайті (кнопка ✉️).<br>
        You received this because you subscribed. Unsubscribe on the site (✉️ button).</p>
      </div>`;

    for (let i = 0; i < emails.length; i += 50) {
      await transport.sendMail({
        from,
        to: from, // recipients go in BCC so addresses stay private
        bcc: emails.slice(i, i + 50),
        subject: headline,
        text: `${headline}${comment ? `\n«${comment}»` : ""}${site ? `\n${site}` : ""}`,
        html,
      });
    }
  }
}
