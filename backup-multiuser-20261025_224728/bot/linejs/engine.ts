import { loginWithAuthToken } from "@evex/linejs";
import { FileStorage } from "@evex/linejs/storage";

const TOKEN_PATH = "./token.txt";
const STORAGE_PATH = "./storage.json";

type EngineState =
  | "not-configured"
  | "starting"
  | "connected"
  | "error";

let state: EngineState = "not-configured";
let displayName = "未取得";
let tokenSaved = false;

export function getLineJsStatusText(): string {
  const statusText: Record<EngineState, string> = {
    "not-configured": "未認証",
    "starting": "ログイン処理中",
    "connected": "接続済み",
    "error": "接続エラー",
  };

  return [
    "LINEJS 接続情報",
    "━━━━━━━━━━━━━━",
    `状態: ${statusText[state]}`,
    `ユーザー名: ${displayName}`,
    "デバイス: DESKTOPMAC",
    `認証トークン: ${tokenSaved ? "保存済み（値は非表示）" : "未確認"}`,
    `セッション: ${STORAGE_PATH}`,
  ].join("\n");
}

export async function startLineJsEngine(): Promise<void> {
  state = "starting";

  let token: string;

  try {
    token = (await Deno.readTextFile(TOKEN_PATH)).trim();
  } catch {
    state = "not-configured";
    console.log("[LINEJS] token.txt がありません。先に初回ログインを完了してください。");
    return;
  }

  if (!token) {
    state = "not-configured";
    console.log("[LINEJS] token.txt が空です。");
    return;
  }

  tokenSaved = true;

  try {
    console.log("[LINEJS] 保存済みトークンで認証を開始します。");

    const client = await loginWithAuthToken(token, {
      device: "DESKTOPMAC",
      storage: new FileStorage(STORAGE_PATH),
    });

    const profile = await client.getMyProfile();

    // 表示名だけを保持し、トークンやプロフィール全体はログに出さない
    displayName = String(profile.displayName || "取得できませんでした")
      .replace(/[\r\n]/g, " ")
      .slice(0, 80);

    state = "connected";
    console.log("[LINEJS] 個人LINEの認証に成功しました。");
    console.log("[LINEJS] 表示名:", displayName);

    client.on("square:message", (_msg: unknown) => {
      console.log("[LINEJS] OpenChatイベントを受信しました。");
    });

    await client.listen();
  } catch (error) {
    state = "error";
    console.error(
      "[LINEJS] 起動エラー:",
      error instanceof Error ? error.message : "不明なエラー",
    );
  }
}