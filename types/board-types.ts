/** Board object types for canvas and Firestore sync. Rotation in degrees (0-360). */
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
      rotation?: number;
    }
  | {
      id: string;
      type: "rectangle";
      x: number;
      y: number;
      width: number;
      height: number;
      color?: string;
      rotation?: number;
    }
  | {
      id: string;
      type: "text";
      x: number;
      y: number;
      width?: number;
      height?: number;
      text: string;
      fontSize?: number;
      color?: string;
      rotation?: number;
    }
  | {
      id: string;
      type: "frame";
      x: number;
      y: number;
      width: number;
      height: number;
      title?: string;
      rotation?: number;
    }
  | {
      id: string;
      type: "circle";
      x: number;
      y: number;
      width: number;
      height: number;
      color?: string;
      rotation?: number;
    }
  | {
      id: string;
      type: "line";
      x: number;
      y: number;
      width: number;
      height: number;
      color?: string;
      rotation?: number;
    }
  | {
      id: string;
      type: "connector";
      fromId: string;
      toId: string;
      style?: "line" | "arrow";
    };
