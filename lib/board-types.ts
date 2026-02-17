/** Board object types for canvas and future Firestore sync */
export type BoardObject =
  | {
      id: string;
      type: "sticky";
      x: number;
      y: number;
      width: number;
      height: number;
      text: string;
      color?: string;
    }
  | {
      id: string;
      type: "rectangle";
      x: number;
      y: number;
      width: number;
      height: number;
      color?: string;
    };

export function isSticky(obj: BoardObject): obj is Extract<BoardObject, { type: "sticky" }> {
  return obj.type === "sticky";
}

export function isRectangle(obj: BoardObject): obj is Extract<BoardObject, { type: "rectangle" }> {
  return obj.type === "rectangle";
}
