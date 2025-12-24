# Vision Journal

Cloud-only MVP for a vision + habits + journal app built with Expo (React Native), expo-router, and Supabase.

## Requirements

- Node.js 20+ and npm
- Expo Go app on your phone (or an iOS/Android simulator)

## Setup

1) Install dependencies

```bash
cd apps/mobile
npm install
```

2) Configure environment

```bash
cd apps/mobile
cp .env.example .env
```

Set values in `.env`:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

You can find these in the Supabase dashboard under Project Settings → API.

3) Run the app

```bash
npm run start
```

If you just updated `.env`, restart Metro with:

```bash
npm run start -- --clear
```

Scan the QR code with Expo Go.

## Supabase (optional)

If you want to apply migrations to your Supabase project:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Note: the latest migration drops and recreates tables; run it only on a fresh project.

## Auth

- Email/password sign-in and sign-up using Supabase Auth.
- Magic links via Supabase OTP email.
- Auth state is hydrated on launch and gates access to tabs.

## Project layout

- `apps/mobile/app`: expo-router routes (auth + tabs)
- `apps/mobile/src/components`: reusable UI
- `apps/mobile/src/features`: feature folders (habits, journal, vision, insights)
- `apps/mobile/src/lib`: Supabase client and helpers
- `apps/mobile/src/state`: auth state management
- `apps/mobile/src/types`: domain types
- `supabase/`: schema, migrations, and seed data
- `docs/`: project docs

## Notes

- Insights are computed client-side in the app (no SQL views in MVP).
- The `supabase/` folder is for schema and policies; deploy via Supabase dashboard or CLI.
