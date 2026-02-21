import { getAdminFirestore } from "@/lib/firebase/admin";
import { boardObjectFromDoc } from "@/lib/board/boardObjectFromDoc";
import type { BoardObject } from "@/types/board-types";

export async function getBoardState(boardId: string): Promise<BoardObject[]> {
  const db = getAdminFirestore();
  const snapshot = await db.doc(`boards/${boardId}`).collection("objects").get();
  const objects: BoardObject[] = [];

  snapshot.docs.forEach((doc: { id: string; data(): Record<string, unknown> }) => {
    const parsed = boardObjectFromDoc(doc.id, doc.data());
    if (parsed) objects.push(parsed);
  });

  return objects;
}
