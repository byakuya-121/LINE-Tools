import {
  startAccountLink,
  getPendingLinkUrl,
  getAccountLinkStatus,
  unlinkAccount,
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
      "!setup - LINEアカウント連携を開始",
      "!on-redy - 連携URLを再表示",
      "!linejs-status - 連携確認状態",
      "!unlink - このサービスの連携情報を解除",
      "!status - Webhookの稼働状態",
    ].join("\n");
  }

  if (command === "!status") {
    return "LINE-Tools Webhook: 稼働中";
  }

  if (
    command === "!setup" ||
    command.startsWith("!setup ")
  ) {
    if (sourceType !== "user" || !userId) {
      return "安全のため、公式アカウントとの1対1トークで実行してください。";
    }

    try {
      const url = await startAccountLink(userId);

      return [
        "LINEアカウント連携を開始します。",
        "",
        "次のURLを開き、LINE側の確認を完了してください。",
        url,
        "",
        "連携URLは約10分間有効で、1回だけ使用できます。",
        "完了後は !linejs-status で確認できます。",
        "",
        "この操作はLINEJSの個人アカウントへのログインではありません。",
        "いつでも !unlink でこのサービス上の連携情報を解除できます。",
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
      "連携URLはこちらです。",
      url,
      "",
      "URLを開いて確認を完了してください。",
      "トークにトークンを手入力する必要はありません。",
    ].join("\n");
  }

  if (command === "!linejs-status") {
    if (sourceType !== "user" || !userId) {
      return "公式アカウントとの1対1トークで実行してください。";
    }

    return [
      "LINEアカウント連携状態",
      "━━━━━━━━━━━━━━",
      getAccountLinkStatus(userId),
      "",
      "この状態は公式アカウントの連携確認結果を示します。",
      "LINEJSのログイン状態やAuthTokenを示すものではありません。",
    ].join("\n");
  }

  if (command === "!unlink") {
    if (sourceType !== "user" || !userId) {
      return "公式アカウントとの1対1トークで実行してください。";
    }

    const removed = unlinkAccount(userId);

    return removed
      ? "このサービスで管理している連携情報を解除しました。"
      : "解除する連携情報がありませんでした。";
  }

  return null;
}