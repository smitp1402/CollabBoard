/**
 * Ambient declaration for firebase-admin when the package is not yet installed.
 * Run `npm install` to use the real package and its types.
 */
declare module "firebase-admin" {
  export namespace app {
    export interface App {
      auth(): auth.Auth;
      firestore(): firestore.Firestore;
    }
  }

  export interface App extends app.App {}

  export namespace auth {
    interface Auth {
      verifyIdToken(token: string): Promise<{ uid: string }>;
    }
  }

  export namespace firestore {
    interface Firestore {
      doc(path: string): firestore.DocumentReference;
      collection(path: string): firestore.CollectionReference;
      batch(): firestore.WriteBatch;
    }
    interface DocumentReference {
      get(): Promise<{ exists: boolean }>;
      collection(path: string): firestore.CollectionReference;
    }
    interface CollectionReference {
      doc(path: string): firestore.DocumentReference;
      get(): Promise<{
        docs: Array<{
          id: string;
          data(): Record<string, unknown>;
        }>;
      }>;
    }
    interface WriteBatch {
      set(ref: firestore.DocumentReference, data: Record<string, unknown>): WriteBatch;
      update(ref: firestore.DocumentReference, data: Record<string, unknown>): WriteBatch;
      commit(): Promise<unknown>;
    }
  }

  export namespace credential {
    function cert(serviceAccount: {
      projectId: string;
      clientEmail: string;
      privateKey: string;
    }): unknown;
  }

  export function initializeApp(options: {
    credential: unknown;
    projectId?: string;
    storageBucket?: string;
  }): app.App;

  export function app(name?: string): app.App;
  export const apps: app.App[];

  export function auth(): auth.Auth;
  export function firestore(): firestore.Firestore;
}
