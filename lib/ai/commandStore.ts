import { createHash } from "node:crypto";
import type { AICommandDocument, AICommandLifecycleStatus } from "@/types/ai-types";

type DocSnapshotLike = {
  exists: boolean;
  data: () => Record<string, unknown> | undefined;
};

type DocRefLike = {
  get: () => Promise<DocSnapshotLike>;
  set: (data: Record<string, unknown>) => Promise<unknown>;
  update: (data: Record<string, unknown>) => Promise<unknown>;
};

type FirestoreLike = {
  doc: (path: string) => DocRefLike;
};

export type CreateRunningCommandInput = {
  boardId: string;
  commandId: string;
  prompt: string;
  actor: string;
  clientRequestId: string;
  idempotencyKey: string;
};

export type FinalizeCommandInput = {
  boardId: string;
  commandId: string;
  status: Extract<AICommandLifecycleStatus, "completed" | "failed">;
  summary: string;
  error?: string;
};

export function commandsCollectionPath(boardId: string): string {
  return `boards/${boardId}/ai_commands`;
}

export function commandDocPath(boardId: string, commandId: string): string {
  return `${commandsCollectionPath(boardId)}/${commandId}`;
}

export function buildCommandId(input: {
  boardId: string;
  actor: string;
  clientRequestId: string;
  idempotencyKey: string;
}): string {
  const digest = createHash("sha256")
    .update(
      [
        input.boardId,
        input.actor,
        input.clientRequestId,
        input.idempotencyKey,
      ].join("|")
    )
    .digest("hex");
  return digest.slice(0, 32);
}

export async function getPersistedCommand(
  db: FirestoreLike,
  boardId: string,
  commandId: string
): Promise<AICommandDocument | null> {
  const snap = await db.doc(commandDocPath(boardId, commandId)).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (!data) return null;
  return {
    prompt: String(data.prompt ?? ""),
    actor: String(data.actor ?? ""),
    status: (data.status as AICommandLifecycleStatus) ?? "failed",
    createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(),
    updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(),
    summary: String(data.summary ?? ""),
    idempotencyKey: String(data.idempotencyKey ?? ""),
    clientRequestId: String(data.clientRequestId ?? ""),
    ...(typeof data.error === "string" ? { error: data.error } : {}),
  };
}

export async function createRunningCommand(
  db: FirestoreLike,
  input: CreateRunningCommandInput
): Promise<void> {
  const now = new Date();
  await db.doc(commandDocPath(input.boardId, input.commandId)).set({
    prompt: input.prompt,
    actor: input.actor,
    status: "running",
    createdAt: now,
    updatedAt: now,
    summary: "Running...",
    idempotencyKey: input.idempotencyKey,
    clientRequestId: input.clientRequestId,
  });
}

export async function finalizeCommand(
  db: FirestoreLike,
  input: FinalizeCommandInput
): Promise<void> {
  await db.doc(commandDocPath(input.boardId, input.commandId)).update({
    status: input.status,
    summary: input.summary,
    updatedAt: new Date(),
    ...(input.status === "failed" && input.error ? { error: input.error } : { error: null }),
  });
}
