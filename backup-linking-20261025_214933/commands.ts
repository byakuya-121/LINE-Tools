import {
  createPairingCode,
  getLineJsLink,
  getUser,
  registerUser,
} from "./users/database.ts";

const accessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") ?? "";

async function fetchDisplayName(userId: string): Promise<string> {
  if (!accessToken) return "未取得";

  try {
    const response = await fetch(
      `https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!response.ok) return "未取得";

    const profile = await response.json() as { displayName?: string };
    return String(profile.displayName ?? "未取得").slice(0, 80);
  } catch {
    return "未取得";
  }
}

function formatDate(value: number): string {
  return new Date(value).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
  });
}

export async function handleCommand(
  text: string,
  userId?: string,
  sourceType?: string,
): Promise<string | null> {
  const command = text.trim();

  switch (command) {
    case "!help":
      return [
        "LINE-Tools コマンド一覧",
        "",
        "!setup - ユーザー登録",
        "!myaccount - 自分の登録情報",
        "!linejs-link - 自分のLINEJSを連携",
        "!linejs-status - 自分の連携状態",
        "!status - サーバー状態",
      ].join("\n");

    case "!status":
      return "LINE-Tools Webhook: 稼働中";

    case "!setup": {
      if (!userId) return "ユーザーIDを取得できませんでした。";

      const displayName = await fetchDisplayName(userId);
      const user = registerUser(userId, displayName);

      return [
        "ユーザー登録が完了しました。",
        `表示名: ${user.display_name}`,
        `登録日時: ${user.registered_at}`,
        "次は !linejs-link で個人LINEJSの連携を開始できます。",
      ].join("\n");
    }

    case "!myaccount": {
      if (!userId) return "ユーザーIDを取得できませんでした。";

      const user = getUser(userId);
      if (!user) return "未登録です。先に !setup を送信してください。";

      const link = getLineJsLink(userId);

      return [
        "あなたの登録情報",
        `公式アカウント表示名: ${user.display_name}`,
        `登録日時: ${user.registered_at}`,
        `LINEJS連携: ${link ? (link.online ? "接続中" : "連携済み・オフライン") : "未連携"}`,
      ].join("\n");
    }

    case "!linejs-link": {
      if (!userId) return "ユーザーIDを取得できませんでした。";

      if (sourceType !== "user") {
        return "セキュリティのため、公式アカウントとの1対1トークで実行してください。";
      }

      if (!getUser(userId)) {
        return "先に !setup を送信してユーザー登録してください。";
      }

      const code = await createPairingCode(userId);
      if (!code) return "連携コードを発行できませんでした。";

      return [
        "LINEJS連携コードを発行しました。",
        "",
        code,
        "",
        "このコードは5分で失効し、一度だけ使えます。",
        "自分のPCでLINEJSログインを完了し、コードを入力してください。",
        "パスワードやLINEJSの認証トークンをトークに送らないでください。",
        "他人にこのコードを見せないでください。",
      ].join("\n");
    }

    case "!linejs-status": {
      if (!userId) return "ユーザーIDを取得できませんでした。";

      if (!getUser(userId)) {
        return "未登録です。先に !setup を送信してください。";
      }

      const link = getLineJsLink(userId);

      if (!link) {
        return [
          "LINEJS連携状態: 未連携",
          "公式アカウントとの1対1トークで !linejs-link を送信してください。",
        ].join("\n");
      }

      return [
        "あなたのLINEJS連携状態",
        "━━━━━━━━━━━━━━",
        `表示名: ${link.displayName}`,
        `状態: ${link.online ? "接続中" : "連携済み・オフライン"}`,
        `連携日時: ${formatDate(link.linkedAt)}`,
        `最終確認: ${formatDate(link.lastSeen)}`,
        "",
        "認証トークンは表示していません。",
      ].join("\n");
    }

    default:
      return null;
  }
}