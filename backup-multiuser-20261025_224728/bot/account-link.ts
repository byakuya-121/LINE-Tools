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