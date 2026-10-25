import { Client } from "jsr:@evex/linejs@^3.4.2";
import { saveUser } from "../users/database.ts";

export interface ActiveSession {
  userId: string;
  client: any;
  token: string;
  startedAt: Date;
}

const activeSessions = new Map<string, ActiveSession>();

export async function startUserSession(userId: string, token: string): Promise<boolean> {
  if (activeSessions.has(userId)) {
    await stopUserSession(userId);
  }

  try {
    console.log(`[SESSION] ユーザー (${userId}) の LINEJS クライアントを起動中...`);
    const client = new Client({ authToken: token });

    activeSessions.set(userId, {
      userId,
      client,
      token,
      startedAt: new Date(),
    });

    await saveUser({
      userId,
      authToken: token,
      linkedAt: new Date().toISOString(),
      status: "ACTIVE",
    });

    return true;
  } catch (err) {
    console.error(`[SESSION_ERROR] ユーザー (${userId}) の起動失敗:`, err);
    return false;
  }
}

export async function stopUserSession(userId: string): Promise<boolean> {
  const session = activeSessions.get(userId);
  if (session) {
    try {
      await session.client?.logout?.();
    } catch (_) {}
    activeSessions.delete(userId);
    console.log(`[SESSION] ユーザー (${userId}) のセッションを停止しました。`);
    return true;
  }
  return false;
}

export function getSession(userId: string): ActiveSession | undefined {
  return activeSessions.get(userId);
}

export function getAllSessions(): Map<string, ActiveSession> {
  return activeSessions;
}