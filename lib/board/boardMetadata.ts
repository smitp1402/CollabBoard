import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  Timestamp,
  type Firestore,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import { DEFAULT_BOARD_ID } from "@/lib/board-constants";

export type BoardMeta = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Timestamp;
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
    list.push({
      id: d.id,
      name: typeof data.name === "string" ? data.name : "",
      createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
      createdAt: createdAt && typeof (createdAt as { toMillis?: () => number }).toMillis === "function"
        ? (createdAt as unknown as Timestamp)
        : Timestamp.now(),
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
