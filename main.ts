import { Client } from "@evex/linejs";
import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";

const serverStartTime = new Date();

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // 1. 📊 ステータス取得 API
  if (req.method === "GET" && url.pathname === "/api/status") {
    const uptimeSeconds = Math.floor((Date.now() - serverStartTime.getTime()) / 1000);
    return new Response(
      JSON.stringify({
        status: "ONLINE",
        uptimeSeconds: uptimeSeconds,
        sessionCount: 1,
        startedAt: serverStartTime.toISOString(),
        serverTime: new Date().toISOString(),
        message: "LINEJS 3.4.2 Control Engine Active",
        sessions: [
          { userId: "BYAKUYA_CORE_SESSION", startedAt: serverStartTime.toISOString() }
        ]
      }),
      { headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  // 2. 🔑 Token Auto Sync 発行 API
  if (req.method === "POST" && url.pathname === "/api/sync-token") {
    try {
      const { email, password } = await req.json();
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: "Eメールとパスワードを入力してください" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const client = new Client({ device: "IOSIPAD" });
      let pincodeVal = "";

      client.on("pincode", (pincode: string) => {
        pincodeVal = pincode;
      });

      // ログイン試行（PIN発行またはToken取得）
      const loginPromise = client.login({ email, password });

      const result = await Promise.race([
        loginPromise.then(() => ({ type: "token", token: client.authToken })),
        new Promise((resolve) => setTimeout(() => resolve({ type: "pincode" }), 3500))
      ]) as { type: string; token?: string };

      if (result.type === "token" || client.authToken) {
        return new Response(
          JSON.stringify({ authToken: client.authToken }),
          { headers: { "Content-Type": "application/json" } }
        );
      } else if (pincodeVal) {
        return new Response(
          JSON.stringify({ pincode: pincodeVal }),
          { headers: { "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ error: "認証応答の待機中にタイムアウトしました。再試行してください。" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err.message || "認証エラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 3. 🧪 Token 有効性検証 (Verify Token) API
  if (req.method === "POST" && url.pathname === "/api/verify-token") {
    try {
      const { authToken } = await req.json();
      if (!authToken) {
        return new Response(
          JSON.stringify({ valid: false, error: "検証するAuthTokenがありません" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const client = new Client({ device: "IOSIPAD" });

      const verifyResult = await new Promise<{ valid: boolean; displayName?: string; error?: string }>((resolve) => {
        const timeoutTimer = setTimeout(() => {
          resolve({ valid: false, error: "検証タイムアウト: トークンが無効または応答がありません" });
        }, 7000);

        client.on("ready", () => {
          clearTimeout(timeoutTimer);
          resolve({
            valid: true,
            displayName: client.user?.displayName || "LINE Account"
          });
        });

        client.login({ authToken }).catch((err: any) => {
          clearTimeout(timeoutTimer);
          resolve({
            valid: false,
            error: err.message || "トークンの有効期限切れ、またはフォーマットエラーです"
          });
        });
      });

      return new Response(
        JSON.stringify(verifyResult),
        { headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({ valid: false, error: err.message || "検証中にサーバーエラーが発生しました" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 4. 🌐 フロントエンド静的ファイル (Token-Web) の配信
  return serveDir(req, {
    fsRoot: "Token-Web",
    showDirListing: false,
    quiet: true,
  });
});