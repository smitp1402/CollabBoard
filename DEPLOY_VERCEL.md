# Deploy ColabBoard on Vercel

Use Vercel to host the Next.js app instead of Firebase App Hosting. Firebase (Auth, Firestore, Realtime Database) continues to run as backend services; only the **hosting** moves to Vercel.

## 1. Connect your repo

- Go to [vercel.com](https://vercel.com) and sign in (GitHub recommended).
- **Add New Project** → Import your ColabBoard Git repository.
- Vercel will detect Next.js; keep the default **Build Command** `npm run build` and **Output Directory** (auto).

## 2. Set environment variables

In the Vercel project: **Settings → Environment Variables**. Add these for **Production** (and Preview if you want):

### Public (exposed to the browser)

| Name | Description |
|------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | From Firebase Console → Project settings → Your apps |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | e.g. `your-project.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | From Firebase Console |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | From Firebase Console |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Realtime Database URL (e.g. `https://your-project-default-rtdb.firebaseio.com/`) |

### Server-only (secrets)

| Name | Description |
|------|-------------|
| `FIREBASE_CLIENT_EMAIL` | From Firebase service account JSON (`client_email`) |
| `FIREBASE_PRIVATE_KEY` | From service account JSON (`private_key`). Paste the full key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`. If you copy from JSON, the `\n` characters are fine; the app converts them. |
| `OPENAI_API_KEY` | Your OpenAI API key (for AI commands) |
| `OPENAI_MODEL` | Optional; default `gpt-4o-mini` |
| `AI_AGENT_ENABLED` | Optional; `true` or `false` |

You can copy the **public** values from your Firebase Console or from `apphosting.yaml`. For **FIREBASE_PRIVATE_KEY**, use the same value you use in `.env.local` (from the service account JSON).

## 3. Deploy

- Click **Deploy**. Vercel will run `npm run build` and deploy.
- After the first deploy, every push to your connected branch will trigger a new deployment.

## 4. Optional: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

Use **Environment Variables** in the dashboard (or `vercel env add`) so you don’t commit secrets.

## Notes

- **Firebase stays**: Auth, Firestore, and Realtime Database still run on Firebase; only the Next.js app is hosted on Vercel.
- **Private key**: If you get Firebase Admin errors, ensure `FIREBASE_PRIVATE_KEY` is the full key with newlines (or literal `\n`); `lib/firebase/admin.ts` already replaces `\\n` with real newlines.
- **Firebase App Hosting**: You can stop using Firebase App Hosting; `apphosting.yaml` is only for that and is ignored by Vercel.
