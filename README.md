# CivicCapture — Setup Guide

## What you have
- `schema.sql` — creates your 3 database tables (citizen, file, deletion_request)
- `index.html`, `style.css`, `app.js` — the app itself (a web page)

## Step 1: Create a free Supabase project
1. Go to supabase.com -> Sign up (free) -> New project
2. Pick any project name and database password (save the password somewhere)
3. Wait ~2 minutes for it to finish setting up

## Step 2: Run the schema
1. In your Supabase project, open the left sidebar -> "SQL Editor"
2. Click "New query"
3. Open `schema.sql` from this folder, copy all of it, paste it in
4. Click "Run"
5. Go to "Table Editor" in the sidebar — you should see 3 tables: citizen, file, deletion_request

## Step 3: Create a storage bucket (for the actual photos)
1. Sidebar -> "Storage" -> "New bucket"
2. Name it exactly: `captures`
3. Toggle it to "Public" (so the photo URLs work in step 5) — fine for a course demo,
   not what you'd do for a real production app

## Step 4: Connect the app to your project
1. Sidebar -> "Project Settings" -> "API"
2. Copy the "Project URL" and the "anon public" key
3. Open `app.js`, paste them into `SUPABASE_URL` and `SUPABASE_ANON_KEY` at the top

## Step 5: Run it
You can't just double-click `index.html` — the camera won't work without a local server.
Easiest way, if you have Python installed:

```
cd civiccapture
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser. Allow camera access when prompted.

## What to demo in your review
1. Enter your name -> shows it's writing to the `citizen` table
2. Open Camera -> Capture Photo -> a File ID appears instantly
3. Open Supabase's Table Editor live, refresh the `file` table -> show the new row
4. Run the example join query from the bottom of `schema.sql` in the SQL Editor

## Not built yet (good "future work" slide material)
- Deletion requests (the `deletion_request` table exists, but no UI writes to it yet)
- A separate government-side view/dashboard
- Real authentication (right now, "login" is just typing a name)
