import { loginWithEmail } from "./linejs/login.ts";

export async function handleApiRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // ステータス確認 API
  if (url.pathname === "/api/status" && req.method === "GET") {
    return new Response(
      JSON.stringify({
        status: "ONLINE",
        uptimeSeconds: Math.floor(performance.now() / 1000),
        sessionCount: 1,
        startedAt: new Date().toISOString(),
        serverTime: new Date().toISOString(),
        message: "BYAKUYA Control Engine Running"
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // 🔑 Token Auto Sync 認証・自動書き込み API
  if (url.pathname === "/api/sync-token" && req.method === "POST") {
    try {
      const body = await req.json();
      const { email, password } = body;

      if (!email || !password) {
        return new Response(
          JSON.stringify({ success: false, message: "Eメールとパスワードを入力してください。" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // LINEJS ログイン処理の実行
      const authToken = await loginWithEmail(email, password);

      // Token/.env への書き込み処理
      try {
        const envPath = "Token/.env";
        let envContent = "";
        try {
          envContent = await Deno.readTextFile(envPath);
        } catch {
          // ファイル未存在時は新規作成
        }

        const newEnvLine = `LINE_AUTH_TOKEN=${authToken}`;
        const updatedEnv = envContent.includes("LINE_AUTH_TOKEN=")
          ? envContent.replace(/LINE_AUTH_TOKEN=.*/, newEnvLine)
          : (envContent ? `${envContent.trim()}\n${newEnvLine}\n` : `${newEnvLine}\n`);

        await Deno.writeTextFile(envPath, updatedEnv);
      } catch (fileErr) {
        console.warn("Failed to update Token/.env file:", fileErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          authToken: authToken,
          message: "AuthToken acquired and saved to Token/.env"
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          success: false,
          message: error.message || "LINEアカウントの認証に失敗しました。"
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return new Response("Not Found", { status: 404 });
}