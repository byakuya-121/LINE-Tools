import { Client } from "@evex/linejs";
import { BaseClient } from "@evex/linejs/base";
import { FileStorage } from "@evex/linejs/storage";

const PREFIX = "$<";
const VERSION = "1.0.0";

const TOKEN_PATH = "./token.txt";
const STORAGE_PATH = "./storage.json";
const TOKEN_KEY = "userAuthToken";
const OWNER_PATH = "./data/owner.json";

const storage = new FileStorage(STORAGE_PATH);
const base = new BaseClient({
  device: "DESKTOPMAC",
  storage,
});

let pendingSave: Promise<void> = Promise.resolve();

/**
 * AuthTokenが更新されたときに保存する。
 * 認証情報そのものはコンソールに出力しない。
 */
base.on("update:authtoken", (token: string) => {
  base.authToken = token;

  pendingSave = pendingSave
    .then(async () => {
      await storage.set(TOKEN_KEY, token);
      await Deno.writeTextFile(TOKEN_PATH, token);
    })
    .catch(() => {
      console.error("[LINEJS] 認証情報の保存に失敗しました。");
    });
});

/**
 * PIN認証が必要な場合に、ローカルの起動ターミナルに表示する。
 */
base.on("pincall", (pin: string) => {
  console.log("[LINEJS] PIN認証が必要です。");
  console.log("[LINEJS] 自分のLINEアプリで認証してください。");
  console.log("[LINEJS] PIN:", pin);
});

/**
 * 保存済みAuthTokenを読み込む。
 */
async function readSavedToken(): Promise<string> {
  try {
    const stored = await storage.get(TOKEN_KEY);

    if (typeof stored === "string" && stored.trim()) {
      return stored.trim();
    }
  } catch {
    // token.txtからの読み込みを試す
  }

  try {
    const token = await Deno.readTextFile(TOKEN_PATH);
    return token.trim();
  } catch {
    return "";
  }
}

/**
 * 連携処理で保存されたオーナー情報を読み込む。
 *
 * 想定するdata/owner.jsonの形式:
 * {
 *   "userId": "連携したLINE公式アカウント側のユーザーID",
 *   "linkedAt": 123456789
 * }
 *
 * 注意:
 * userIdとOpenChat送信者のMIDが同じとは限らない。
 */
async function getOwnerId(): Promise<string> {
  try {
    const raw = await Deno.readTextFile(OWNER_PATH);
    const owner = JSON.parse(raw) as {
      userId?: unknown;
      mid?: unknown;
    };

    const ownerId = String(owner.mid ?? owner.userId ?? "").trim();
    return ownerId;
  } catch {
    return "";
  }
}

/**
 * ログに表示する文字列から改行を除去する。
 */
function safeText(value: unknown): string {
  return String(value ?? "")
    .replace(/[\r\n]/g, " ")
    .slice(0, 100);
}

/**
 * ヘルプを生成する。
 */
function getHelp(): string {
  return [
    "【LINE-Tools OpenChat半Bot】",
    `Version: ${VERSION}`,
    "",
    "$<help - コマンド一覧",
    "$<ping - 応答確認",
    "$<v - バージョン確認",
    "$<time - 現在時刻",
    "$<myid - 自分のMID確認",
    "$<status - Bot状態",
    "",
    "※ myid以外のコマンドはオーナー認証が必要です。",
  ].join("\n");
}

/**
 * OpenChatのコマンドを処理する。
 */
async function handleCommand(message: any): Promise<void> {
  const text = String(message.text ?? "").trim();

  if (!text.startsWith(PREFIX)) {
    return;
  }

  const senderMid = String(
    message.raw?.message?.from ??
    message.senderMemberMid ??
    "",
  ).trim();

  if (!senderMid) {
    console.warn("[OC] 送信者MIDを取得できませんでした。");
    return;
  }

  const parts = text
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const command = (parts.shift() ?? "").toLowerCase();

  /*
   * MID確認はオーナー認証より先に実行する。
   * これにより、オーナーIDが一致せず認証できない場合でも、
   * OpenChatイベントから取得できたMIDを確認できる。
   */
  if (command === "myid") {
    try {
      await message.reply(`あなたのMID:\n${senderMid}`);
      console.log("[OC] myidコマンドを処理しました。");
    } catch (error) {
      console.error(
        "[OC] myidへの返信に失敗しました:",
        error instanceof Error ? error.message : "不明なエラー",
      );
    }

    return;
  }

  /*
   * myid以外はオーナー認証が必要。
   */
  const ownerId = await getOwnerId();

  if (!ownerId) {
    console.warn("[AUTH] オーナー情報を読み込めません。");
    console.warn("[AUTH] data/owner.jsonを確認してください。");
    return;
  }

  if (senderMid !== ownerId) {
    console.warn("[AUTH] オーナー以外のコマンドを拒否しました。");
    return;
  }

  /*
   * オーナー認証済みコマンド
   */
  try {
    switch (command) {
      case "help": {
        await message.reply(getHelp());
        break;
      }

      case "ping": {
        await message.reply("Pong! 🏓 LINEJSは稼働中です。");
        break;
      }

      case "v": {
        await message.reply(`LINE-Tools OpenChat半Bot v${VERSION}`);
        break;
      }

      case "time": {
        const now = new Date().toLocaleString("ja-JP", {
          timeZone: "Asia/Tokyo",
        });

        await message.reply(`現在時刻: ${now}`);
        break;
      }

      case "status": {
        await message.reply(
          [
            "LINE-Tools OpenChat半Bot",
            `Version: ${VERSION}`,
            "状態: 稼働中",
            "権限: オーナー認証済み",
          ].join("\n"),
        );
        break;
      }

      default: {
        await message.reply(
          "未対応のコマンドです。$<help を確認してください。",
        );
        break;
      }
    }
  } catch (error) {
    console.error(
      "[COMMAND] コマンド実行エラー:",
      error instanceof Error ? error.message : "不明なエラー",
    );
  }
}

/**
 * LINEJSを起動する。
 */
async function main(): Promise<void> {
  console.log("================================");
  console.log(" LINE-Tools OpenChat半Bot");
  console.log(` Version: ${VERSION}`);
  console.log("================================");

  const savedToken = await readSavedToken();

  const email =
    Deno.env.get("EMAIL") ??
    Deno.env.get("LINE_LOGIN_EMAIL") ??
    "";

  const password =
    Deno.env.get("PASSWORD") ??
    Deno.env.get("LINE_LOGIN_PASSWORD") ??
    "";

  const ownerId = await getOwnerId();

  if (!ownerId) {
    console.warn("[AUTH] オーナー情報が見つかりません。");
    console.warn("[AUTH] $<myid は診断用に使用できます。");
    console.warn("[AUTH] その他のコマンドは実行できません。");
  }

  /*
   * 保存済みAuthTokenがあればそれを使用する。
   * なければ.envのログイン情報で初回ログインを試す。
   */
  if (savedToken) {
    console.log("[LINEJS] 保存済みAuthTokenでログインします。");

    await base.loginProcess.login({
      authToken: savedToken,
    });
  } else {
    if (!email || !password) {
      throw new Error(
        "保存済みAuthTokenがありません。初回ログインにはEMAILとPASSWORDが必要です。",
      );
    }

    console.log("[LINEJS] 初回ログインを開始します。");

    await base.loginProcess.login({
      email,
      password,
    });
  }

  await pendingSave;

  const client = new Client(base);

  const profile = await client.getMyProfile();

  console.log("[LINEJS] ログイン成功");
  console.log(
    "[LINEJS] 表示名:",
    safeText(profile.displayName || "未取得"),
  );
  console.log("[LINEJS] AuthTokenの値は出力しません。");
  console.log("[OC BOT] OpenChatイベントを受信する準備ができました。");

  /*
   * OpenChatのメッセージイベントを受信する。
   */
  client.on("square:message", async (message: any) => {
    try {
      await handleCommand(message);
    } catch (error) {
      console.error(
        "[OC EVENT] イベント処理エラー:",
        error instanceof Error ? error.message : "不明なエラー",
      );
    }
  });

  console.log("[OC BOT] イベント受信中です。");
  console.log("[OC BOT] OpenChatで $<myid を送信して確認してください。");

  await client.listen();
}

/**
 * 起動時のエラー処理。
 */
try {
  await main();
} catch (error) {
  console.error(
    "[LINEJS] 起動失敗:",
    error instanceof Error ? error.message : "不明なエラー",
  );

  Deno.exitCode = 1;
}