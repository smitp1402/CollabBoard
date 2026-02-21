/**
 * @jest-environment node
 */
import { getBoardState } from "./getBoardState";

const mockGet = jest.fn();
const mockObjectsCollection = { get: mockGet };
const mockBoardDoc = { collection: jest.fn(() => mockObjectsCollection) };
const mockDb = { doc: jest.fn(() => mockBoardDoc) };

jest.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => mockDb,
}));

describe("getBoardState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns parsed board objects from Firestore docs", async () => {
    mockGet.mockResolvedValueOnce({
      docs: [
        {
          id: "sticky-1",
          data: () => ({
            type: "sticky",
            x: 100,
            y: 120,
            width: 120,
            height: 80,
            text: "hello",
            color: "#ff0",
          }),
        },
      ],
    });

    const result = await getBoardState("board-1");

    expect(result).toEqual([
      {
        id: "sticky-1",
        type: "sticky",
        x: 100,
        y: 120,
        width: 120,
        height: 80,
        text: "hello",
        color: "#ff0",
      },
    ]);
  });

  it("skips invalid documents that cannot be parsed", async () => {
    mockGet.mockResolvedValueOnce({
      docs: [
        {
          id: "ok",
          data: () => ({
            type: "frame",
            x: 0,
            y: 0,
            width: 300,
            height: 200,
            title: "Sprint",
          }),
        },
        {
          id: "bad",
          data: () => ({
            type: "connector",
            fromId: "a",
          }),
        },
      ],
    });

    const result = await getBoardState("board-1");

    expect(result).toEqual([
      {
        id: "ok",
        type: "frame",
        x: 0,
        y: 0,
        width: 300,
        height: 200,
        title: "Sprint",
      },
    ]);
  });

  it("reads from boards/{boardId}/objects", async () => {
    mockGet.mockResolvedValueOnce({ docs: [] });

    await getBoardState("my-board");

    expect(mockDb.doc).toHaveBeenCalledWith("boards/my-board");
    expect(mockBoardDoc.collection).toHaveBeenCalledWith("objects");
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
