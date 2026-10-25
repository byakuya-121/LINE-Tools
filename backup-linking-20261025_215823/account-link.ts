const accessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") ?? "";

type PendingLink = {
  userId: string;
  url: string;
  nonce: string;
  expiresAt: number;
};

type LinkStatus = {
  verified: boolean;
  updatedAt: number;
  message: string;
};

const pendingByUser = new Map<string, PendingLink>();
const pendingByNonce = new Map<string, PendingLink>();
const statuses = new Map<string, LinkStatus>();

function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function cleanExpired(): void {
  const now = Date.now();

  for (const [nonce, item] of pendingByNonce) {
    if (item.expiresAt <= now) {
      pendingByNonce.delete(nonce);
      if (pendingByUser.get(item.userId)?.nonce === nonce) {
        pendingByUser.delete(item.userId);
      }
    }
  }
}

export async function startAccountLink(
  userId: string,
): Promise<string> {
  if (!accessToken) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN が未設定です。");
  }

  cleanExpired();

  const response = await fetch(
    `https://api.line.me/v2/bot/user/${encodeURIComponent(userId)}/linkToken`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    console.error("[AccountLink] Token issuance failed:", response.status);
    throw new Error(`連携トークンの発行に失敗しました（HTTP ${response.status}）。`);
  }

  const data = await response.json() as { linkToken?: string };

  if (!data.linkToken) {
    throw new Error("LINEから連携トークンを取得できませんでした。");
  }

  // 連携URLを発行したユーザーとnonceを一時的に紐づける
  const nonce = randomNonce();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  const url = new URL("https://access.line.me/dialog/bot/accountLink");
  url.searchParams.set("linkToken", data.linkToken);
  url.searchParams.set("nonce", nonce);

  const pending: PendingLink = {
    userId,
    url: url.toString(),
    nonce,
    expiresAt,
  };

  const old = pendingByUser.get(userId);
  if (old) pendingByNonce.delete(old.nonce);

  pendingByUser.set(userId, pending);
  pendingByNonce.set(nonce, pending);

  statuses.set(userId, {
    verified: false,
    updatedAt: Date.now(),
    message: "連携確認待ち",
  });

  return pending.url;
}

export function getPendingLinkUrl(userId: string): string | null {
  cleanExpired();
  return pendingByUser.get(userId)?.url ?? null;
}

export function getAccountLinkStatus(userId: string): string {
  cleanExpired();

  const pending = pendingByUser.get(userId);
  if (pending) {
    return "連携確認待ちです。トークに届いたURLを開いてください。";
  }

  const status = statuses.get(userId);

  if (!status) {
    return "未確認です。まず !setup を送信してください。";
  }

  if (status.verified) {
    return `公式アカウントの本人確認済み（${new Date(status.updatedAt).toLocaleString("ja-JP")}）`;
  }

  return status.message;
}

export function completeAccountLink(
  userId: string | undefined,
  nonce: string,
  result: string,
): { accepted: boolean; userId?: string; message: string } {
  cleanExpired();

  const pending = pendingByNonce.get(nonce);

  if (!pending || pending.expiresAt <= Date.now()) {
    return { accepted: false, message: "期限切れまたは未登録の連携イベントです。" };
  }

  // 発行対象のユーザーとイベント送信元が一致するか検証
  if (!userId || userId !== pending.userId) {
    return { accepted: false, message: "連携ユーザーが一致しません。" };
  }

  pendingByNonce.delete(nonce);
  pendingByUser.delete(pending.userId);

  const verified = result === "ok";

  statuses.set(pending.userId, {
    verified,
    updatedAt: Date.now(),
    message: verified ? "本人確認済み" : "連携に失敗しました。再度 !setup を実行してください。",
  });

  return {
    accepted: true,
    userId: pending.userId,
    message: verified ? "公式アカウントの本人確認が完了しました。" : "本人確認に失敗しました。",
  };
}