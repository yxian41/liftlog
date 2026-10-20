# LiftLog

A science-based weight lifting tracker (inspired by apps like Built With Science). Plain HTML/CSS/JS, no build step and no dependencies.

## Features
- **Routines by muscle group**: Leg Day, Chest & Triceps, Back & Biceps, Shoulders & Abs and Arm Day come preloaded. You can create, edit and reorder your own.
- **Live workout logging**: weight × reps per set. The "Previous" column shows last session's numbers, and an empty set auto-fills from them when you tick ✓.
- **Progression tips (double progression)**: the app tells you to add a rep, or to add weight once every set reaches the top of the rep range.
- **Rest timer**: starts automatically after each set (adjust ±15s, or change the default or turn it off in Settings).
- **Progress graphs per exercise**: Est. 1RM (Epley), heaviest weight, session volume and best reps, over 1M / 3M / 6M / 1Y / All.
- **Personal records**: detected when you finish a workout.
- **Weekly sets per muscle** against the 10–20 sets/week range that research suggests for growth.
- **Custom exercises**: name, muscle group, equipment and rep range.
- **Ask Coach**: one tap copies a coach-ready summary of your training and opens Claude, so you get coaching on your own Claude plan.
- **Cloud sync (optional)**: sign in to store your data online and use it on your phone and computer.
- kg / lb, light and dark mode, JSON backup export/import, and offline use (PWA).

## Run it on your Mac
```bash
cd ~/Desktop/ai_project/gym && python3 -m http.server 8080
```
Then open http://localhost:8080.

## Use it on your iPhone
Without cloud sync, data is saved **in the browser on each device**. Turn on cloud sync (below) to share it between devices.

- **Quick (same Wi-Fi):** run `python3 -m http.server 8080` on the Mac, then open `http://<your-mac-ip>:8080` in Safari on the phone. Find the IP under System Settings → Wi-Fi → Details.
- **Best (installable, works offline):** host the folder on a free HTTPS static host (GitHub Pages, Netlify or Cloudflare Pages). Open it in Safari → Share → **Add to Home Screen**.

## Store your data online (cloud sync with Supabase)
The app always saves on your device first, so it works with no signal at the gym. When you're signed in, it also syncs to your own free Supabase database. If you log on two devices, the data is merged and nothing is lost.

### 1. Create a free Supabase project (about 3 minutes)
1. Go to **https://supabase.com** → **Start your project** and sign up (GitHub or email).
2. Click **New project**. Name it `liftlog`, set a database password (save it somewhere, though the app never needs it), and pick the region closest to you. Click **Create new project** and wait about a minute while it starts.

### 2. Create the table
1. In the left sidebar open **SQL Editor** → **New query**.
2. Open [`supabase/setup.sql`](supabase/setup.sql) from this folder, copy everything, paste it in, and click **Run**. You should see "Success. No rows returned".

This creates one table, `liftlog_data`, with security rules so each signed-in person can only read and change **their own** data.

### 3. Copy your two keys into `config.js`
1. Click **Connect** at the top of the project, or go to **Project Settings → API Keys / Data API**.
2. Copy the **Project URL** (looks like `https://abcdefghijklmnop.supabase.co`).
3. Copy the **Publishable key** (starts with `sb_publishable_`). On older projects this is the **anon public** key (starts with `eyJ`).
4. Paste both into [`config.js`](config.js):
   ```js
   window.LIFTLOG_CONFIG = {
     supabaseUrl: 'https://abcdefghijklmnop.supabase.co',
     supabaseAnonKey: 'sb_publishable_xxxxxxxxxxxx',
   };
   ```
   Both values are safe to be public. **Never** paste the `service_role` or `secret` key here.

### 4. Point email links at your app (recommended)
In Supabase go to **Authentication → URL Configuration** and set **Site URL** to where you open the app, e.g. `http://localhost:8080` or your hosted address like `https://yourname.github.io/liftlog/`. This makes the "confirm your email" link land back on LiftLog.
*(Optional: to skip email confirmation entirely, go to **Authentication → Sign In / Providers → Email** and turn off **Confirm email**.)*

### 5. Sign in from the app
Open LiftLog → ⚙️ **Settings** → **Cloud sync** → enter your email and a password → **Create account**. Confirm the email, then tap **Sign in**. Anything already on the device is uploaded. Sign in with the same email on your phone and your data appears there too.

The settings card shows the sync status ("✓ Synced just now"). Syncing runs automatically a few seconds after each change, when the app opens, and when you come back online.

## Ask Coach (Claude)
Find it in **Progress → Ask Coach**, in the workout-complete screen, or on any past workout. Pick a topic (workout review, weekly check-in, plateau, new routine, or your own question) and tap **Copy & open Claude**, then paste in Claude and send.

For the best results, make a Claude Project once:
1. On claude.ai go to **Projects → New project** and name it `Gym Coach`.
2. Open **Instructions** (or "Set project instructions"), paste everything from [`coach/claude-project-instructions.md`](coach/claude-project-instructions.md), and save.
3. Copy the project's link from the address bar (`https://claude.ai/project/...`). In LiftLog → Ask Coach → **About you**, paste it into **Claude "Gym Coach" project link**.

From then on, Ask Coach opens straight into that project.

## Files
- `index.html`: app shell and tab bar
- `styles.css`: theme tokens (light/dark) and layout
- `app.js`: data, views, charts and logic (data is stored in `localStorage` under `liftlog.v1`)
- `coach.js`: Ask Coach (training summary + opening Claude)
- `coach/claude-project-instructions.md`: instructions to paste into your Claude Project
- `sync.js`: cloud sync, login and merging between devices
- `config.js`: your Supabase Project URL and publishable key
- `supabase/setup.sql`: creates the database table and security rules
- `sw.js`, `manifest.webmanifest`, `icon.svg`: offline support and home-screen install
