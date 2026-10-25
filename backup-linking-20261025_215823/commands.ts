import {
  startAccountLink,
  getPendingLinkUrl,
  getAccountLinkStatus,
} from "./account-link.ts";

export async function handleCommand(
  text: string,
  userId?: string,
  sourceType?: string,
): Promise<string | null> {
  const command = text.trim();

  if (command === "!help") {
    return [
      "LINE-Tools コマンド一覧",
      "",
      "!setup - 公式アカウントの本人確認を開始",
      "!on-redy - 連携URLを再表示",
      "!linejs-status - 連携確認状態",
      "!status - Webhookの状態",
    ].join("\n");
  }

  if (command === "!status") {
    return "LINE-Tools Webhook: 稼働中";
  }

  if (command === "!setup") {
    if (sourceType !== "user" || !userId) {
      return "セキュリティのため、公式アカウントとの1対1トークで実行してください。";
    }

    try {
      const url = await startAccountLink(userId);
      return [
        "公式アカウントの本人確認を開始します。",
        "",
        "次のURLを開いて、LINE側の確認を完了してください。",
        url,
        "",
        "このリンクは約10分間有効で、1回だけ使用できます。",
        "この確認で個人LINEJSにログインするわけではありません。",
      ].join("\n");
    } catch (error) {
      console.error("[Command] setup error:", error);
      return error instanceof Error
        ? error.message
        : "連携を開始できませんでした。";
    }
  }

  if (
    command === "!on-redy" ||
    command.startsWith("!on-redy:")
  ) {
    if (sourceType !== "user" || !userId) {
      return "公式アカウントとの1対1トークで実行してください。";
    }

    const url = getPendingLinkUrl(userId);

    if (!url) {
      return "有効な連携URLがありません。!setup を送信してください。";
    }

    return [
      "未完了の連携URLです。",
      url,
      "",
      "URLを開いて本人確認を完了してください。",
    ].join("\n");
  }

  if (command === "!linejs-status") {
    if (sourceType !== "user" || !userId) {
      return "公式アカウントとの1対1トークで実行してください。";
    }

    return [
      "アカウント連携状態",
      "━━━━━━━━━━━━━━",
      getAccountLinkStatus(userId),
      "",
      "これは公式アカウントの本人確認状態です。",
      "LINEJSのログイン状態や認証トークンを示すものではありません。",
    ].join("\n");
  }

  return null;
}