import * as admin from "firebase-admin";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

function getAdminApp(): ReturnType<typeof admin.app> {
  if (admin.apps.length > 0) {
    return admin.app();
  }
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin: set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (and NEXT_PUBLIC_FIREBASE_PROJECT_ID). See .env.example for service account keys."
    );
  }
  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    projectId,
    storageBucket: storageBucket ?? undefined,
  });
}

/** Use only in server-side code (API routes, server actions). Verifies Firebase ID tokens. */
export function getAdminAuth(): admin.auth.Auth {
  getAdminApp();
  return admin.auth();
}

/** Firestore instance for server-side board access checks and writes. */
export function getAdminFirestore(): admin.firestore.Firestore {
  getAdminApp();
  return admin.firestore();
}
