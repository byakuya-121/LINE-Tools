import { startUserSession } from "./linejs/session.ts";

const OWNER_USER_ID = Deno.env.get("OWNER_USER_ID") || "";
const CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") || "";
const PORTAL_URL = Deno.env.get("PORTAL_URL") || "http://localhost:8000";

function normalizeInput(str: string): string {
  return str
    .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/ /g, " ")
    .trim();
}

async function sendPushMessage(to: string, text: string) {
  const trimmedText = text?.trim();
  if (!trimmedText || !CHANNEL_ACCESS_TOKEN) return;

  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to,
        messages: [{ type: "text", text: trimmedText }],
      }),
    });
  } catch (err) {
    console.error("[COMMAND_PUSH_ERROR]", err);
  }
}

export async function handleCommand(event: any): Promise<string | null> {
  const userId = event.source?.userId;
  const rawText = event.message?.text || "";
  const text = normalizeInput(rawText);

  if (!text || !userId) return null;

  if (OWNER_USER_ID && userId !== OWNER_USER_ID) {
    console.warn(`[SECURITY] 未許可ユーザーによるコマンド実行試行: ${userId}`);
    return null;
  }

  const args = text.split(/\s+/);
  const command = args[0].toLowerCase();

  if (command === "!help") {
    return [
      "📜 【コマンド一覧】",
      "────────────────",
      "🔹 !help : このヘルプを表示します",
      "🔹 !hello : ボットからのご挨拶",
      "🔹 !ping : サーバーの応答確認",
      "🔹 !setup : 現在の環境設定と接続確認",
      "🔹 !token : AuthToken 発行ポータルの案内",
      "🔹 !login [Token] : 取得した AuthToken でセッション起動",
      "────────────────"
    ].join("\n");
  }

  if (command === "!hello") {
    return [
      "＼(≧∇≦)/ やぁやぁ！こんにちは～✨",
      "LINE-Tools Bot が元気に稼働中だよ！",
      "何かお手伝いできることがあったら、いつでも言ってね～っ！💖"
    ].join("\n");
  }

  if (command === "!ping") {
    return "pong! 🏓 (サーバーは正常に稼働中だよ！)";
  }

  if (command === "!setup") {
    let storageExists = false;
    try {
      const stat = await Deno.stat("./Storage/linejs-storage.json");
      storageExists = stat.isFile;
    } catch (_) {}

    return [
      "⚙️ 【システムセットアップ状況】",
      "────────────────",
      `👤 Owner User ID: ${OWNER_USER_ID ? "✅ 設定済み" : "⚠️ 未設定"}`,
      `🌐 Portal URL: ${PORTAL_URL}`,
      `🔑 Channel Access Token: ${CHANNEL_ACCESS_TOKEN ? "✅ 設定済み" : "❌ 未設定"}`,
      `📁 Storage File: ${storageExists ? "✅ 存在します" : "ℹ️ 認証後に生成されます"}`,
      "────────────────",
      "準備 OK！AuthToken 発行は !token を送信してね！"
    ].join("\n");
  }

  if (command === "!token" || (command === "!login" && args.length === 1)) {
    return [
      "🔗 【AuthToken 発行ポータル】",
      "",
      "以下のリンクを開き、メールアドレスとパスワードを入力して PIN コード認証を行ってください。",
      "",
      `👉 ${PORTAL_URL}`,
      "",
      "発行完了後に表示される「📋 トークンをコピー」を押した後、このチャットに以下のように送信してください：",
      "👉 !login [コピーしたトークン]"
    ].join("\n");
  }

  if (command === "!login" && args.length >= 2) {
    const token = args[1]?.trim();
    if (!token) return "❌ AuthToken が空です。";

    startUserSession(userId, token).then((success: boolean) => {
      if (success) {
        sendPushMessage(userId, "✅ AuthToken 認証に成功し、オープンチャット受信用セッションを開始しました！");
      } else {
        sendPushMessage(userId, "❌ ログインに失敗しました。トークンが正しいか確認してください。");
      }
    });

    return "🔑 送信された AuthToken でログイン処理を開始します...";
  }

  return null;
}
