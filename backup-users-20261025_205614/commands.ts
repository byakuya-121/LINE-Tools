import { getLineJsStatusText } from "./linejs/engine.ts";

export function handleCommand(text: string): string {
  switch (text.trim()) {
    case "!help":
      return [
        "LINE-Tools コマンド一覧",
        "",
        "!help - コマンド一覧",
        "!status - Webhookの稼働状態",
        "!linejs-status - LINEJSの接続情報",
      ].join("\n");

    case "!status":
      return "LINE-Tools Webhook: 稼働中";

    case "!linejs-status":
      return getLineJsStatusText();

    default:
      return "未対応のコマンドです。!help と送信してください。";
  }
}