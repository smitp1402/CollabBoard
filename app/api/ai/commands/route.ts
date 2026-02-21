import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { runAgentCommand } from "@/lib/ai/agentRunner";
import {
  buildCommandId,
  createRunningCommand,
  finalizeCommand,
  getPersistedCommand,
} from "@/lib/ai/commandStore";
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

export async function POST(request: Request) {
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
  const db = getAdminFirestore();
  const boardRef = db.doc(`boards/${boardId}`);
  const boardSnap = await boardRef.get();
  if (!boardSnap.exists) {
    return NextResponse.json(
      { error: { message: "Board not found or access denied.", code: "FORBIDDEN" } },
      { status: 403 }
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
