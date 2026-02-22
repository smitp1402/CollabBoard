import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
  type Firestore,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import { DEFAULT_BOARD_ID } from "@/constants/board";

export type BoardMeta = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Timestamp;
  /** User IDs who starred this board. */
  starredBy?: string[];
};

const DEFAULT_BOARD_NAME = "Default board";

/** Create or overwrite board metadata document at boards/{boardId}. */
export async function createBoardMeta(
  db: Firestore,
  boardId: string,
  name: string,
  createdBy: string
): Promise<void> {
  const ref = doc(db, "boards", boardId);
  await setDoc(ref, {
    name,
    createdBy,
    createdAt: Timestamp.now(),
  });
}

/** Map Firestore QuerySnapshot of boards collection to BoardMeta[]. */
export function snapshotToBoardMetaList(snapshot: QuerySnapshot<DocumentData>): BoardMeta[] {
  const list: BoardMeta[] = [];
  snapshot.forEach((d) => {
    const data = d.data();
    const createdAt = data.createdAt;
    const starredBy = data.starredBy;
    list.push({
      id: d.id,
      name: typeof data.name === "string" ? data.name : "",
      createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
      createdAt: createdAt && typeof (createdAt as { toMillis?: () => number }).toMillis === "function"
        ? (createdAt as unknown as Timestamp)
        : Timestamp.now(),
      starredBy: Array.isArray(starredBy) ? (starredBy as string[]) : undefined,
    });
  });
  return list;
}

/** List all board metadata documents. */
export async function listBoards(db: Firestore): Promise<BoardMeta[]> {
  const snapshot = await getDocs(collection(db, "boards"));
  return snapshotToBoardMetaList(snapshot);
}

/** Ensure boards/default document exists so the default board appears in the list. */
export async function ensureDefaultBoard(db: Firestore): Promise<void> {
  const ref = doc(db, "boards", DEFAULT_BOARD_ID);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    name: DEFAULT_BOARD_NAME,
    createdBy: "",
    createdAt: Timestamp.now(),
  });
}

/** Toggle star for a board for the given user. Updates Firestore. */
export async function updateBoardStar(
  db: Firestore,
  boardId: string,
  userId: string,
  starred: boolean
): Promise<void> {
  const ref = doc(db, "boards", boardId);
  if (starred) {
    await updateDoc(ref, { starredBy: arrayUnion(userId) });
  } else {
    await updateDoc(ref, { starredBy: arrayRemove(userId) });
  }
}
