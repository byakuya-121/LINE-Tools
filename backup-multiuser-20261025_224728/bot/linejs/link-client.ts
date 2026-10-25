import { loginWithAuthToken } from "@evex/linejs";
import { FileStorage } from "@evex/linejs/storage";

const TOKEN_PATH = "./token.txt";
const STORAGE_PATH = "./storage.json";
const CLIENT_TOKEN_PATH = "./data/linejs-link-token.txt";

function ask(message: string): string {
  return (prompt(message) ?? "").trim();
}

async function main(): Promise<void> {
  let authToken = "";

  try {
    authToken = (await Deno.readTextFile(TOKEN_PATH)).trim();
  } catch {
    throw new Error(
      "token.txt がありません。先に deno task login を実行してください。",
    );
  }

  if (!authToken) {
    throw new Error("token.txt が空です。先にLINEJS認証を完了してください。");
  }

  const urlInput =
    Deno.env.get("LINE_TOOLS_PUBLIC_URL") ||
    ask("現在のLINE-Tools HTTPS URLを入力してください:");

  const baseUrl = urlInput.trim().replace(/\/+$/, "");
  const parsedUrl = new URL(baseUrl);

  if (parsedUrl.protocol !== "https:" || parsedUrl.pathname !== "") {
    throw new Error(
      "HTTPSのベースURLを入力してください。末尾に /webhook は付けません。",
    );
  }

  console.log("[LINEJS] 保存済みの認証トークンで接続します。");

  const client = await loginWithAuthToken(authToken, {
    device: "DESKTOPMAC",
    storage: new FileStorage(STORAGE_PATH),
  });

  const profile = await client.getMyProfile();
  const displayName = String(profile.displayName ?? "未取得")
    .replace(/[\r\n]/g, " ")
    .slice(0, 80);

  console.log("[LINEJS] 認証成功。表示名:", displayName);

  const pairingCode = ask(
    "公式アカウントから発行した !linejs-link のコードを貼り付けてください:",
  );

  if (!pairingCode) {
    throw new Error("連携コードが入力されていません。");
  }

  // 使い捨てコードをサーバーで引き換える
  const claimResponse = await fetch(
    `${baseUrl}/api/linejs/claim`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: pairingCode,
        displayName,
      }),
    },
  );

  if (!claimResponse.ok) {
    throw new Error(
      `連携コードを受け付けてもらえませんでした (HTTP ${claimResponse.status})。` +
      "コードの期限を確認し、公式アカウントで新しいコードを発行してください。",
    );
  }

  const result = await claimResponse.json() as {
    clientToken?: string;
  };

  if (!result.clientToken) {
    throw new Error("サーバーから連携トークンを取得できませんでした。");
  }

  // サーバー発行のクライアントトークンはローカルにだけ保存する
  await Deno.writeTextFile(CLIENT_TOKEN_PATH, result.clientToken);
  console.log("[LINEJS] ユーザー連携が完了しました。");
  console.log("[LINEJS] このプロセスを起動中は接続確認を送信します。");
  console.log("[LINEJS] 終了するには Ctrl+C を押してください。");

  let lastProfileCheck = 0;

  while (true) {
    try {
      // 定期的に実際のLINEJS APIへアクセスして認証状態を確認
      if (Date.now() - lastProfileCheck >= 60_000) {
        await client.getMyProfile();
        lastProfileCheck = Date.now();
      }

      const linkToken = (
        await Deno.readTextFile(CLIENT_TOKEN_PATH)
      ).trim();

      const heartbeatResponse = await fetch(
        `${baseUrl}/api/linejs/heartbeat`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${linkToken}`,
          },
        },
      );

      if (heartbeatResponse.status === 401) {
        throw new Error(
          "連携トークンが無効です。終了して、新しい連携コードからやり直してください。",
        );
      }

      if (!heartbeatResponse.ok && heartbeatResponse.status !== 204) {
        throw new Error(
          `接続確認に失敗しました (HTTP ${heartbeatResponse.status})`,
        );
      }

      console.log("[LINEJS] 接続確認成功");
    } catch (error) {
      console.error(
        "[LINEJS] 接続確認エラー:",
        error instanceof Error ? error.message : String(error),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 30_000));
  }
}

try {
  await main();
} catch (error) {
  console.error(
    "[LINEJS] 連携失敗:",
    error instanceof Error ? error.message : String(error),
  );
  Deno.exitCode = 1;
}