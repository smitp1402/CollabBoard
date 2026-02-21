import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { runAgentCommand } from "@/lib/ai/agentRunner";
import {
  buildCommandId,
  createRunningCommand,
  finalizeCommand,
  getPersistedCommand,
  type FirestoreLike,
} from "@/lib/ai/commandStore";
import {
  checkRateLimit,
  getPerUserLimit,
  getPerBoardLimit,
  rateLimitKey,
} from "@/lib/rateLimit";
import {
  aiCommandRequestSchema,
  type AICommandResponse,
  lifecycleToApiStatus,
} from "@/types/ai-types";

function getBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

/** Structured log for observability: commandId, boardId, actor, latencyMs, status, failureReason */
function logCommand(params: {
  commandId: string;
  boardId: string;
  actor: string;
  latencyMs: number;
  status: "completed" | "failed";
  failureReason?: string;
}) {
  const payload = {
    event: "ai_command",
    commandId: params.commandId,
    boardId: params.boardId,
    actor: params.actor,
    latencyMs: params.latencyMs,
    status: params.status,
    ...(params.failureReason && { failureReason: params.failureReason }),
  };
  console.info(JSON.stringify(payload));
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    return await handlePost(request, startedAt);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    console.error("[POST /api/ai/commands] unhandled error:", message, error instanceof Error ? error.stack : "");
    return NextResponse.json(
      { error: { message, code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}

async function handlePost(request: Request, startedAt: number): Promise<NextResponse> {
  if (process.env.AI_AGENT_ENABLED === "false" || process.env.AI_AGENT_ENABLED === "0") {
    return NextResponse.json(
      {
        error: {
          message: "AI commands are temporarily disabled.",
          code: "FEATURE_DISABLED",
        },
      },
      { status: 503 }
    );
  }

  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: { message: "Missing or invalid Authorization header.", code: "UNAUTHORIZED" } },
      { status: 401 }
    );
  }

  let uid: string;
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid or expired token.", code: "UNAUTHORIZED" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body.", code: "BAD_REQUEST" } },
      { status: 400 }
    );
  }

  const parsed = aiCommandRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.flatten().formErrors[0] ?? "Validation failed.";
    return NextResponse.json(
      { error: { message, code: "BAD_REQUEST" } },
      { status: 400 }
    );
  }

  const { boardId, prompt, clientRequestId } = parsed.data;
  const idempotencyKey = parsed.data.idempotencyKey ?? clientRequestId;
  const adminDb = getAdminFirestore();
  const db = adminDb as unknown as FirestoreLike;
  const boardRef = adminDb.doc(`boards/${boardId}`);
  const boardSnap = await boardRef.get();
  if (!boardSnap.exists) {
    return NextResponse.json(
      { error: { message: "Board not found or access denied.", code: "FORBIDDEN" } },
      { status: 403 }
    );
  }

  const userLimit = checkRateLimit(rateLimitKey("user", uid), {
    windowMs: 60_000,
    maxRequests: getPerUserLimit(),
  });
  if (!userLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          message: "Too many AI commands. Please try again later.",
          code: "RATE_LIMITED",
        },
      },
      { status: 429, headers: { "Retry-After": String(userLimit.retryAfterSeconds) } }
    );
  }
  const boardLimit = checkRateLimit(rateLimitKey("board", boardId), {
    windowMs: 60_000,
    maxRequests: getPerBoardLimit(),
  });
  if (!boardLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          message: "Too many AI commands on this board. Please try again later.",
          code: "RATE_LIMITED",
        },
      },
      { status: 429, headers: { "Retry-After": String(boardLimit.retryAfterSeconds) } }
    );
  }

  const commandId = buildCommandId({
    boardId,
    actor: uid,
    clientRequestId,
    idempotencyKey,
  });
  const existing = await getPersistedCommand(db, boardId, commandId);
  if (existing) {
    logCommand({
      commandId,
      boardId,
      actor: uid,
      latencyMs: Date.now() - startedAt,
      status: existing.status === "completed" ? "completed" : "failed",
      ...(existing.status === "failed" && existing.error && { failureReason: existing.error }),
    });
    return NextResponse.json(
      {
        data: {
          commandId,
          status: lifecycleToApiStatus(existing.status),
          summary: existing.summary,
        },
      } satisfies AICommandResponse,
      { status: 200 }
    );
  }

  await createRunningCommand(db, {
    boardId,
    commandId,
    prompt,
    actor: uid,
    clientRequestId,
    idempotencyKey,
  });

  try {
    const result = await runAgentCommand({
      boardId,
      prompt,
    });
    if (result.status === "failed") {
      await finalizeCommand(db, {
        boardId,
        commandId,
        status: "failed",
        summary: result.summary,
        error: result.error,
      });
      logCommand({
        commandId,
        boardId,
        actor: uid,
        latencyMs: Date.now() - startedAt,
        status: "failed",
        failureReason: result.error,
      });
      return NextResponse.json(
        {
          data: {
            commandId,
            status: "error",
            summary: result.summary,
          },
          ...(result.error
            ? { error: { message: result.error, code: "RUNNER_ERROR" } }
            : {}),
        } satisfies AICommandResponse,
        { status: 200 }
      );
    }

    await finalizeCommand(db, {
      boardId,
      commandId,
      status: "completed",
      summary: result.summary,
    });
    logCommand({
      commandId,
      boardId,
      actor: uid,
      latencyMs: Date.now() - startedAt,
      status: "completed",
    });
    return NextResponse.json(
      {
        data: {
          commandId,
          status: "success",
          summary: result.summary,
        },
      } satisfies AICommandResponse,
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    await finalizeCommand(db, {
      boardId,
      commandId,
      status: "failed",
      summary: "Failed to execute AI command.",
      error: message,
    });
    logCommand({
      commandId,
      boardId,
      actor: uid,
      latencyMs: Date.now() - startedAt,
      status: "failed",
      failureReason: message,
    });
    return NextResponse.json(
      {
        error: { message, code: "INTERNAL_ERROR" },
        data: {
          commandId,
          status: "error",
          summary: "Failed to execute AI command.",
        },
      } satisfies AICommandResponse,
      { status: 500 }
    );
  }
}
