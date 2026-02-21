/**
 * @jest-environment node
 */
import { POST } from "@/app/api/ai/commands/route";

const mockVerifyIdToken = jest.fn();
const mockDocGet = jest.fn();
const mockBuildCommandId = jest.fn();
const mockGetPersistedCommand = jest.fn();
const mockCreateRunningCommand = jest.fn();
const mockFinalizeCommand = jest.fn();
const mockRunAgentCommand = jest.fn();

jest.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({ verifyIdToken: mockVerifyIdToken }),
  getAdminFirestore: () => ({
    doc: (path: string) => {
      void path;
      return {
      get: mockDocGet,
      };
    },
  }),
}));

jest.mock("@/lib/ai/commandStore", () => ({
  buildCommandId: (...args: unknown[]) => mockBuildCommandId(...args),
  getPersistedCommand: (...args: unknown[]) => mockGetPersistedCommand(...args),
  createRunningCommand: (...args: unknown[]) => mockCreateRunningCommand(...args),
  finalizeCommand: (...args: unknown[]) => mockFinalizeCommand(...args),
}));

jest.mock("@/lib/ai/agentRunner", () => ({
  runAgentCommand: (...args: unknown[]) => mockRunAgentCommand(...args),
}));

const mockCheckRateLimit = jest.fn();
const mockGetPerUserLimit = jest.fn();
const mockGetPerBoardLimit = jest.fn();
jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getPerUserLimit: () => mockGetPerUserLimit(),
  getPerBoardLimit: () => mockGetPerBoardLimit(),
  rateLimitKey: (type: string, id: string) => `ai:${type}:${id}`,
}));

function jsonResponse(body: unknown) {
  return new Request("http://localhost/api/ai/commands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authRequest(body: unknown, token: string) {
  return new Request("http://localhost/api/ai/commands", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  boardId: "board-1",
  prompt: "Add a sticky",
  clientRequestId: "req-1",
};

const originalEnv = process.env;

describe("POST /api/ai/commands", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockVerifyIdToken.mockResolvedValue({ uid: "test-uid" });
    mockDocGet.mockResolvedValue({ exists: true });
    mockBuildCommandId.mockReturnValue("cmd-1");
    mockGetPersistedCommand.mockResolvedValue(null);
    mockCreateRunningCommand.mockResolvedValue(undefined);
    mockFinalizeCommand.mockResolvedValue(undefined);
    mockRunAgentCommand.mockResolvedValue({
      status: "completed",
      summary: "Executed 1 tool call(s).",
      executed: 1,
    });
    mockCheckRateLimit.mockReturnValue({ allowed: true });
    mockGetPerUserLimit.mockReturnValue(30);
    mockGetPerBoardLimit.mockReturnValue(60);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await POST(jsonResponse(validBody));
    expect(res.status).toBe(401);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("returns 401 when Authorization is not Bearer", async () => {
    const req = new Request("http://localhost/api/ai/commands", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic x" },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("returns 401 when token is invalid", async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error("Invalid token"));
    const res = await POST(authRequest(validBody, "bad-token"));
    expect(res.status).toBe(401);
    expect(mockVerifyIdToken).toHaveBeenCalledWith("bad-token");
  });

  it("returns 403 when board document does not exist", async () => {
    mockDocGet.mockResolvedValueOnce({ exists: false });
    const res = await POST(authRequest(validBody, "valid-token"));
    expect(res.status).toBe(403);
    expect(mockDocGet).toHaveBeenCalled();
  });

  it("returns 400 when body is invalid (missing prompt)", async () => {
    const body = { boardId: "board-1", clientRequestId: "req-1" };
    const res = await POST(authRequest(body, "valid-token"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error?.message ?? data.message).toBeDefined();
  });

  it("returns 400 when body is invalid (missing boardId)", async () => {
    const body = { prompt: "Hi", clientRequestId: "req-1" };
    const res = await POST(authRequest(body, "valid-token"));
    expect(res.status).toBe(400);
  });

  it("returns 200 with commandId, status, summary when auth and board exist and body valid", async () => {
    const res = await POST(authRequest(validBody, "valid-token"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toBeDefined();
    expect(data.data.commandId).toBeDefined();
    expect(typeof data.data.commandId).toBe("string");
    expect(data.data.status).toBeDefined();
    expect(["pending", "success", "error"]).toContain(data.data.status);
    expect(data.data.summary).toBeDefined();
  });

  it("creates running command and finalizes completed status", async () => {
    const res = await POST(authRequest(validBody, "valid-token"));
    expect(res.status).toBe(200);

    expect(mockCreateRunningCommand).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        boardId: "board-1",
        commandId: "cmd-1",
        prompt: "Add a sticky",
        actor: "test-uid",
        clientRequestId: "req-1",
      })
    );
    expect(mockRunAgentCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        boardId: "board-1",
        prompt: "Add a sticky",
      })
    );
    expect(mockFinalizeCommand).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        boardId: "board-1",
        commandId: "cmd-1",
        status: "completed",
      })
    );
  });

  it("returns existing command for duplicate idempotent request", async () => {
    mockGetPersistedCommand.mockResolvedValueOnce({
      prompt: "Add a sticky",
      actor: "test-uid",
      status: "completed",
      createdAt: new Date(),
      updatedAt: new Date(),
      summary: "Already done.",
      idempotencyKey: "idem-1",
      clientRequestId: "req-1",
    });
    const res = await POST(authRequest(validBody, "valid-token"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.commandId).toBe("cmd-1");
    expect(data.data.status).toBe("success");
    expect(data.data.summary).toBe("Already done.");
    expect(mockCreateRunningCommand).not.toHaveBeenCalled();
    expect(mockRunAgentCommand).not.toHaveBeenCalled();
  });

  it("finalizes failed lifecycle and returns error status when runner fails", async () => {
    mockRunAgentCommand.mockResolvedValueOnce({
      status: "failed",
      summary: "Failed to execute AI command.",
      executed: 0,
      error: "Unknown tool",
    });
    const res = await POST(authRequest(validBody, "valid-token"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.status).toBe("error");
    expect(mockFinalizeCommand).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        commandId: "cmd-1",
        status: "failed",
        error: "Unknown tool",
      })
    );
  });

  it("returns 503 when AI_AGENT_ENABLED is false", async () => {
    process.env.AI_AGENT_ENABLED = "false";
    const res = await POST(authRequest(validBody, "valid-token"));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error?.code).toBe("FEATURE_DISABLED");
    expect(data.error?.message).toMatch(/disabled/i);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("returns 503 when AI_AGENT_ENABLED is 0", async () => {
    process.env.AI_AGENT_ENABLED = "0";
    const res = await POST(authRequest(validBody, "valid-token"));
    expect(res.status).toBe(503);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After when per-user rate limit exceeded", async () => {
    mockCheckRateLimit.mockReturnValueOnce({ allowed: false, retryAfterSeconds: 45 });
    const res = await POST(authRequest(validBody, "valid-token"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("45");
    const data = await res.json();
    expect(data.error?.code).toBe("RATE_LIMITED");
    expect(mockCreateRunningCommand).not.toHaveBeenCalled();
  });

  it("returns 429 when per-board rate limit exceeded", async () => {
    mockCheckRateLimit.mockReturnValueOnce({ allowed: true });
    mockCheckRateLimit.mockReturnValueOnce({ allowed: false, retryAfterSeconds: 30 });
    const res = await POST(authRequest(validBody, "valid-token"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(mockCreateRunningCommand).not.toHaveBeenCalled();
  });
});
