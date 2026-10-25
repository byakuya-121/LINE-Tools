import { loginWithAuthToken, loginWithPassword, Client } from "jsr:@evex/linejs@^3.4.2";
import { FileStorage } from "jsr:@evex/linejs@^3.4.2/storage";
import { saveUser } from "../users/database.ts";
import { handleSelfBotCommand } from "./engine.ts";

const STORAGE_PATH = "./Storage/linejs-storage.json";

export interface ActiveSession {
  userId: string;
  client: any;
  token?: string;
  startedAt: Date;
}

const activeSessions = new Map<string, ActiveSession>();

/**
 * 取得した AuthToken を .env および token.txt に自動保存
 */
async function saveTokenToEnv(token: string) {
  try {
    const envPath = "./.env";
    let content = "";
    try {
      content = await Deno.readTextFile(envPath);
    } catch {
      // ファイルが存在しない場合は新規作成
    }

    const key = "LINE_AUTH_TOKEN";
    const newLine = `${key}="${token}"`;
    const regex = new RegExp(`^${key}=.*$`, "m");

    if (regex.test(content)) {
      content = content.replace(regex, newLine);
    } else {
      content = content.trim() ? `${content.trim()}\n${newLine}\n` : `${newLine}\n`;
    }

    await Deno.writeTextFile(envPath, content);
    await Deno.writeTextFile("./token.txt", token).catch(() => {});
    console.log("[+] .env および token.txt に最新の AuthToken を自動保存しました。");
  } catch (err) {
    console.error("[-] トークン保存失敗:", err);
  }
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
 * AuthToken によるセッション起動
 */
export async function startUserSession(
  userId: string,
  token: string
): Promise<boolean> {
  const normalizedToken = token.trim().replace(/^["']|["']$/g, "");
  if (!userId.trim() || !normalizedToken) return false;

  if (activeSessions.has(userId)) {
    await stopUserSession(userId);
  }

  try {
    await Deno.mkdir("./Storage", { recursive: true });
    const storage = new FileStorage(STORAGE_PATH);

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

    client.listen({ talk: true, square: true });

    activeSessions.set(userId, {
      userId,
      client,
      token: normalizedToken,
      startedAt: new Date(),
    });

    await saveTokenToEnv(normalizedToken);
    await saveUser({
      userId,
      authToken: normalizedToken,
      linkedAt: new Date().toISOString(),
      status: "ACTIVE",
    });

    return true;
  } catch (err) {
    console.error(`[SESSION_ERROR] AuthToken 起動失敗:`, err);
    return false;
  }
}

/**
 * Eメール + パスワード -> PINコード認証ログイン (ByakuyaTools 方式)
 */
export async function startUserSessionWithEmail(
  userId: string,
  email: string,
  pass: string,
  onPincode: (pincode: string) => Promise<void>
): Promise<boolean> {
  const cleanEmail = email.trim();
  const cleanPass = pass.trim();

  if (!userId.trim() || !cleanEmail || !cleanPass) return false;

  if (activeSessions.has(userId)) {
    await stopUserSession(userId);
  }

  try {
    await Deno.mkdir("./Storage", { recursive: true });
    const storage = new FileStorage(STORAGE_PATH);

    console.log(`[SESSION] Eメールログイン要求送信: ${cleanEmail}`);

    const client = await loginWithPassword(
      {
        email: cleanEmail,
        password: cleanPass,
        onPincodeRequest: async (pin: string) => {
          console.log(`📍 PINコード発行成功: 【 ${pin} 】`);
          await onPincode(pin);
        },
      },
      {
        device: "DESKTOPMAC",
        storage,
      }
    );

    const authToken = client.authToken;
    if (authToken) {
      await saveTokenToEnv(authToken);
      await saveUser({
        userId,
        authToken,
        linkedAt: new Date().toISOString(),
        status: "ACTIVE",
      });
    }

    client.on("message", async (msg: any) => {
      await handleSelfBotCommand(msg, client, userId);
    });

    client.on("square:message", async (msg: any) => {
      await handleSelfBotCommand(msg, client, userId);
    });

    client.listen({ talk: true, square: true });

    activeSessions.set(userId, {
      userId,
      client,
      token: authToken,
      startedAt: new Date(),
    });

    return true;
  } catch (err: any) {
    console.error(`[SESSION_ERROR] ログイン認証失敗:`, err);
    return false;
  }
}

export function getSession(userId: string): ActiveSession | undefined {
  return activeSessions.get(userId);
}

export function getAllSessions(): Map<string, ActiveSession> {
  return activeSessions;
}
