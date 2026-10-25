import { Client } from "@evex/linejs";
import { BaseClient } from "@evex/linejs/base";
import { FileStorage } from "@evex/linejs/storage";

const TOKEN_PATH = "./token.txt";
const STORAGE_PATH = "./storage.json";
const TOKEN_KEY = "userAuthToken";

const email = Deno.env.get("EMAIL") ?? "";
const password = Deno.env.get("PASSWORD") ?? "";

const storage = new FileStorage(STORAGE_PATH);
const base = new BaseClient({
  device: "DESKTOPMAC",
  storage,
});

let pendingSave: Promise<void> = Promise.resolve();

base.on("update:authtoken", (token: string) => {
  base.authToken = token;

  pendingSave = pendingSave
    .then(async () => {
      await storage.set(TOKEN_KEY, token);
      await Deno.writeTextFile(TOKEN_PATH, token);
    })
    .catch((error) => {
      console.error(
        "[LINEJS] 認証情報の保存に失敗しました。",
        error instanceof Error ? error.message : "不明なエラー",
      );
    });
});

base.on("pincall", (pin: string) => {
  console.log("");
  console.log("[LINEJS] LINEアプリでPIN認証を行ってください。");
  console.log("[LINEJS] PIN:", pin);
  console.log("");
});

async function readSavedToken(): Promise<string> {
  try {
    return (await Deno.readTextFile(TOKEN_PATH)).trim();
  } catch {
    return "";
  }
}

async function main(): Promise<void> {
  const savedToken = await readSavedToken();

  if (savedToken) {
    console.log("[LINEJS] 保存済みトークンでログインします。");

    // 保存済みトークンで失敗しても、パスワード認証を自動連打しない
    await base.loginProcess.login({
      authToken: savedToken,
    });
  } else {
    if (!email || !password) {
      throw new Error(
        "初回ログインには EMAIL と PASSWORD が必要です。PowerShellから入力してください。",
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

  console.log("");
  console.log("[LINEJS] ログイン成功！");
  console.log("[LINEJS] 表示名:", profile.displayName ?? "未取得");
  console.log("[LINEJS] MID:", profile.mid ?? "未取得");
  console.log("[LINEJS] セッション保存先:", STORAGE_PATH);
  console.log("[LINEJS] 認証トークンは表示していません。");
}

try {
  await main();
} catch (error) {
  console.error(
    "[LINEJS] ログインに失敗しました。",
    error instanceof Error ? error.message : "不明なエラー",
  );
  Deno.exitCode = 1;
}