import { loginWithAuthToken, loginWithPassword } from "jsr:@evex/linejs@^3.4.2";
import { FileStorage } from "jsr:@evex/linejs@^3.4.2/storage";
import { saveUser } from "../users/database.ts";
import { handleSelfBotCommand } from "./engine.ts";

export interface ActiveSession {
  userId: string;
  client: any;
  token?: string;
  startedAt: Date;
}

const activeSessions = new Map<string, ActiveSession>();

function getSafeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]A/g, "_");
}

export async function stopUserSession(userId: string): Promise<boolean> {
  const session = activeSessions.get(userId);
  if (session) {
    try {
      if (typeof session.client?.logout === "function") {
        await session.client.logout().catch(() => {});
      }
    } catch (_) {}
    activeSessions.delete(userId);
    console.log(`[SESSION] ユーザー (${userId}) のセッションを停止しました。`);
    return true;
  }
  return false;
}

/**
 * 1. AuthToken ログイン
 */
export async function startUserSession(
  userId: string,
  token: string
): Promise<boolean> {
  const normalizedToken = token.trim().replace(/^["']|["']$/g, "");
  if (!userId.trim() || !normalizedToken) {
    console.error(`[SESSION_ERROR] userId または AuthToken が空です。`);
    return false;
  }

  if (activeSessions.has(userId)) {
    await stopUserSession(userId);
  }

  await Deno.mkdir("./data", { recursive: true });

  const safeUserId = getSafeUserId(userId);
  const storagePath = `./data/storage_${safeUserId}.json`;

  try {
    console.log(`[SESSION] ユーザー (${safeUserId}) の loginWithAuthToken を起動中...`);
    const storage = new FileStorage(storagePath);

    const client = await loginWithAuthToken(normalizedToken, {
      device: "DESKTOPMAC",
      storage,
    });

    client.on("message", async (msg: any) => {
      await handleSelfBotCommand(msg, client, userId);
    });

    client.on("square:message", async (msg: any) => {
      await handleSelfBotCommand(msg, client, userId);
    });

    client.listen({
      talk: true,
      square: true,
    });

    console.log(`[SESSION_SUCCESS] ユーザー (${safeUserId}) の LINEJS ポーリング受信を開始しました！`);

    activeSessions.set(userId, {
      userId,
      client,
      token: normalizedToken,
      startedAt: new Date(),
    });

    await saveUser({
      userId,
      authToken: normalizedToken,
      linkedAt: new Date().toISOString(),
      status: "ACTIVE",
    });

    return true;
  } catch (err: any) {
    const errorMsg = String(err?.message || err);
    if (
      errorMsg.includes("V3_TOKEN_CLIENT_LOGGED_OUT") ||
      errorMsg.includes("NOT_AUTHORIZED_DEVICE")
    ) {
      console.error(
        `[SESSION_ERROR] ユーザー (${userId}) の AuthToken は失効・ログアウトされています。`
      );
      await saveUser({
        userId,
        authToken: normalizedToken,
        linkedAt: new Date().toISOString(),
        status: "DISABLED",
      });
    } else {
      console.error(`[SESSION_ERROR] ユーザー (${userId}) の起動失敗:`, err);
    }
    return false;
  }
}

/**
 * 2. メール・パスワード + PINコード ログイン (loginWithPassword を利用)
 */
export async function startUserSessionWithEmail(
  userId: string,
  email: string,
  pass: string,
  onPincode: (pincode: string) => Promise<void>
): Promise<boolean> {
  if (!userId.trim() || !email.trim() || !pass.trim()) {
    return false;
  }

  if (activeSessions.has(userId)) {
    await stopUserSession(userId);
  }

  await Deno.mkdir("./data", { recursive: true });

  const safeUserId = getSafeUserId(userId);
  const storagePath = `./data/storage_${safeUserId}.json`;

  try {
    console.log(`[SESSION] ユーザー (${safeUserId}) の loginWithPassword を起動中...`);
    const storage = new FileStorage(storagePath);

    // loginWithPassword で PIN コード受信用コールバックを指定
    const client = await loginWithPassword(
      {
        email: email.trim(),
        password: pass.trim(),
        onPincodeRequest: async (pin: string) => {
          console.log(`[SESSION_PIN] ユーザー (${userId}) 用PINコード発行: ${pin}`);
          await onPincode(pin);
        },
      },
      {
        device: "DESKTOPMAC",
        storage,
      }
    );

    client.on("message", async (msg: any) => {
      await handleSelfBotCommand(msg, client, userId);
    });

    client.on("square:message", async (msg: any) => {
      await handleSelfBotCommand(msg, client, userId);
    });

    client.listen({
      talk: true,
      square: true,
    });

    console.log(`[SESSION_SUCCESS] ユーザー (${safeUserId}) の LINEJS ポーリング受信を開始しました！`);

    activeSessions.set(userId, {
      userId,
      client,
      startedAt: new Date(),
    });

    return true;
  } catch (err: any) {
    console.error(`[SESSION_ERROR] ユーザー (${userId}) の起動失敗:`, err);
    return false;
  }
}

export function getSession(userId: string): ActiveSession | undefined {
  return activeSessions.get(userId);
}

export function getAllSessions(): Map<string, ActiveSession> {
  return activeSessions;
}
