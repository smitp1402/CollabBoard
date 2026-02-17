# Host ColabBoard on Firebase App Hosting

Follow these steps to deploy ColabBoard using **Firebase App Hosting** (Option A). Environment variables are set in **`apphosting.yaml`** in the repo; the rest is configured in the Firebase Console.

---

## Prerequisites

1. **Code on GitHub**  
   Push ColabBoard to a GitHub repository (e.g. `smitp1402/CollabBoard`).

2. **Firebase project**  
   Use the same project where you already have Auth, Firestore, and Realtime Database enabled.

3. **App Hosting available**  
   In [Firebase Console](https://console.firebase.google.com) → your project → left sidebar, under **Build**, you should see **App Hosting**. If you don’t, you may need to enable it or use another region/plan.

---

## Step 1: Open App Hosting

1. Go to [Firebase Console](https://console.firebase.google.com).
2. Select your ColabBoard Firebase project.
3. In the left sidebar, click **Build** → **App Hosting**.
4. Click **Get started** (or **Create backend** if you’ve used it before).

---

## Step 2: Connect your GitHub repo

1. When asked for the source, choose **GitHub**.
2. Authorize Firebase to access your GitHub account if prompted.
3. Select:
   - **Repository:** the one containing ColabBoard (e.g. `smitp1402/CollabBoard`).
   - **Branch:** e.g. `main` or `master`.
4. Continue to the next step.

---

## Step 3: Build settings

1. **Framework:** Firebase should detect **Next.js** automatically.
2. **Build command:** Use `npm run build` (or leave default if it’s already set).
3. **Output / root:** Leave as suggested for Next.js (often no need to change).
4. **Node version:** Use a supported version (e.g. 18 or 20) if the wizard asks.

Save or proceed.

---

## Step 4: Environment variables

App Hosting reads environment variables from **`apphosting.yaml`** in your repo root (not from the Console).

1. **Open `apphosting.yaml`** in the project root. It already lists the 7 required variables with placeholders.
2. **Replace every placeholder** with your real values. Copy them from Firebase Console → Project settings → Your apps, and from Realtime Database → URL. Or copy from your local **`.env.local`** (same variable names).
3. **Save the file** and commit/push to your branch. The next App Hosting build will use these values.

| Variable | Where to get it |
|------|------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Project settings → Your apps → Web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Same (e.g. `your-project.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Same |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Realtime Database → Create database / use existing → copy URL |

Without these, the app will show “Firestore not configured” or similar errors.

---

## Step 5: Deploy

1. Start or trigger the first deployment (e.g. **Deploy** or **Save and deploy**).
2. Wait for the build to finish (Cloud Build runs in the background).
3. When it’s done, you’ll get a URL like:
   - `https://<backend-id>-<hash>.apphosting.run`  
   or a custom domain if you’ve set one.

---

## Step 6: Authorized domains for Auth

1. In Firebase Console go to **Authentication** → **Settings** → **Authorized domains**.
2. Add the App Hosting domain (e.g. `*.apphosting.run` or the exact hostname from your deploy URL).
3. Save.

Without this, Google (and other) sign-in will be blocked in production.

---

## Step 7: Verify

1. Open the App Hosting URL in a browser.
2. Sign in with Google (or email).
3. Open `/board` and confirm the whiteboard loads, objects sync, and presence/cursors work.
4. Optional: open the same URL in another browser or incognito, sign in with a second account, and check realtime sync and “Online” (Phase 8 checklist).

---

## Troubleshooting

- **Build fails in Cloud Build**  
  Check the build logs in App Hosting. Ensure `package.json` has `"build": "next build"` and that all dependencies are in `dependencies` (not only dev) if the build runs without `NODE_ENV=development`.

- **“Firestore not configured” or blank board**  
  Re-check every `NEXT_PUBLIC_FIREBASE_*` and `NEXT_PUBLIC_FIREBASE_DATABASE_URL` in the App Hosting environment variables. Redeploy after changing env vars.

- **Sign-in blocked or “unauthorized domain”**  
  Add the App Hosting domain to **Authentication → Settings → Authorized domains**.

- **Cursors/presence not showing**  
  Confirm Realtime Database is created, rules allow read/write for the paths in use, and `NEXT_PUBLIC_FIREBASE_DATABASE_URL` is set in App Hosting. See `docs/Realtime-Database-Rules.md`.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Open Firebase Console → Build → App Hosting |
| 2 | Connect GitHub repo and branch |
| 3 | Confirm Next.js build (e.g. `npm run build`) |
| 4 | Add all 7 `NEXT_PUBLIC_FIREBASE_*` env vars |
| 5 | Deploy and copy the live URL |
| 6 | Add that URL’s domain to Auth → Authorized domains |
| 7 | Test login and board at the live URL |

No changes are required in the ColabBoard repo for this flow; the wizard uses your existing Next.js app as-is.
