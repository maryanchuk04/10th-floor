# 10th Lift — elevator status

Next.js + Supabase (Postgres, Auth, Realtime), deployed on Vercel. All free tiers.

## Setup
1. Create a project at https://supabase.com. In **SQL Editor** run `supabase/schema.sql`.
2. **Authentication → Providers**: email is on by default; optionally enable Google.
   **Authentication → URL Configuration**: set Site URL to your Vercel URL and add `http://localhost:3000` to Redirect URLs.
3. Copy `.env.example` to `.env.local`, fill in URL and anon key (Project Settings → API).
4. `npm run dev` → http://localhost:3000

## Deploy (Vercel)
Push to GitHub, import the repo in Vercel, add the same env vars, deploy.

## Telegram notifications (optional)
Create a bot with @BotFather, add it to your group, set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
