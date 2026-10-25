import { getUser, saveUser, deleteUser } from "./users/database.ts";

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") || "";

interface NonceData {
  userId: string;
  createdAt: number;
}

const nonceMap = new Map<string, NonceData>();

export async function createLinkToken(userId: string): Promise<string | null> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) return null;

  try {
    const res = await fetch(`https://api.line.me/v2/bot/user/${encodeURIComponent(userId)}/linkToken`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.linkToken || null;
  } catch (err) {
    console.error("[ACCOUNT_LINK_ERROR]", err);
    return null;
  }
}

export function generateNonce(userId: string): string {
  const nonce = crypto.randomUUID();
  nonceMap.set(nonce, { userId, createdAt: Date.now() });
  return nonce;
}

export function verifyNonce(nonce: string): string | null {
  const data = nonceMap.get(nonce);
  if (!data) return null;

  if (Date.now() - data.createdAt > 15 * 60 * 1000) {
    nonceMap.delete(nonce);
    return null;
  }

  nonceMap.delete(nonce);
  return data.userId;
}

export async function completeAccountLink(nonce: string, result: string = "ok"): Promise<{ success: boolean; userId: string | null }> {
  const userId = verifyNonce(nonce);
  if (!userId) {
    return { success: false, userId: null };
  }

  if (result !== "ok") {
    return { success: false, userId };
  }

  const existing = await getUser(userId);
  await saveUser({
    userId,
    authToken: existing?.authToken || "",
    linkedAt: new Date().toISOString(),
    status: "ACTIVE",
  });

  return { success: true, userId };
}

export async function getAccountLinkStatus(userId: string) {
  const user = await getUser(userId);
  if (!user) {
    return { isLinked: false, status: "UNLINKED" };
  }
  return {
    isLinked: user.status === "ACTIVE",
    linkedAt: user.linkedAt,
    status: user.status,
  };
}

export async function getPendingLinkUrl(userId: string): Promise<string | null> {
  const linkToken = await createLinkToken(userId);
  if (!linkToken) return null;
  const nonce = generateNonce(userId);
  return `https://access.line.me/dialog/bot/accountLink?linkToken=${encodeURIComponent(linkToken)}&nonce=${encodeURIComponent(nonce)}`;
}

export async function startAccountLink(userId: string): Promise<string | null> {
  return await getPendingLinkUrl(userId);
}

export async function unlinkAccount(userId: string): Promise<boolean> {
  return await deleteUser(userId);
}