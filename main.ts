import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";
import { Client } from "https://jsr.io/@evex/linejs/3.4.2/mod.ts";

const PORT = Number(Deno.env.get("PORT")) || 10000;
const startedAt = new Date().toISOString();

const activeSessions = new Map<string, { userId?: string; startedAt: string; client?: any }>();

Deno.serve({
  port: PORT,
  onListen({ hostname, port }) {
    console.log(`🚀 BYAKUYA Engine Server running on http://${hostname}:${port}`);
  }
}, async (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname === "/api/status" && req.method === "GET") {
    const uptimeSeconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const sessionsList = Array.from(activeSessions.values()).map(s => ({
      userId: s.userId || "REGISTERED_ACCOUNT",
      startedAt: s.startedAt
    }));

    return new Response(JSON.stringify({
      status: "ONLINE",
      uptimeSeconds,
      sessionCount: activeSessions.size,
      startedAt,
      serverTime: new Date().toISOString(),
      message: "正常稼働中",
      sessions: sessionsList
    }), {
      headers: { 
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*" 
      }
    });
  }

  if (url.pathname === "/api/sync-token" && req.method === "POST") {
    try {
      const body = await req.json();
      const { email, password } = body;

      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Eメールとパスワードを入力してください" }), {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }

      const client = new Client();

      const loginPromise = new Promise<{ authToken?: string; pincode?: string }>((resolve, reject) => {
        client.on("pincode", (pin: string) => {
          resolve({ pincode: pin });
        });

        client.on("ready", () => {
          const token = client.authToken;
          if (token) {
            const sessionKey = `user_${Date.now()}`;
            activeSessions.set(sessionKey, {
              userId: client.user?.displayName || "LINE User",
              startedAt: new Date().toISOString(),
              client
            });
            resolve({ authToken: token });
          }
        });

        client.on("error", (err: any) => {
          reject(err);
        });
      });

      client.login({ email, password }).catch((err: any) => {
        console.error("LINEJS Login Error:", err);
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("認証リクエストがタイムアウトしました")), 15000)
      );

      const result = await Promise.race([loginPromise, timeoutPromise]) as any;

      if (result.pincode) {
        return new Response(JSON.stringify({ pincode: result.pincode }), {
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }

      if (result.authToken) {
        const jwtToken = "ey" + btoa(result.authToken).replace(/=/g, "");
        return new Response(JSON.stringify({ authToken: result.authToken, jwtToken }), {
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }

      return new Response(JSON.stringify({ error: "認証処理に失敗しました" }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });

    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || "認証処理中にエラーが発生しました" }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }
  }

  if (url.pathname === "/api/verify-token" && req.method === "POST") {
    try {
      const body = await req.json();
      const { authToken } = body;

      if (!authToken) {
        return new Response(JSON.stringify({ valid: false, error: "AuthTokenが送信されていません" }), {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }

      const verifyClient = new Client();

      const verifyPromise = new Promise<{ valid: boolean; displayName?: string; error?: string }>((resolve) => {
        verifyClient.on("ready", () => {
          const name = verifyClient.user?.displayName || "LINE User";
          resolve({ valid: true, displayName: name });
        });

        verifyClient.on("error", (err: any) => {
          resolve({ valid: false, error: err.message || "無効なトークンです" });
        });
      });

      verifyClient.login({ authToken }).catch(() => {
      });

      const timeoutPromise = new Promise<{ valid: boolean; error: string }>((resolve) =>
        setTimeout(() => resolve({ valid: false, error: "検証タイムアウト（無効または応答なし）" }), 7000)
      );

      const result = await Promise.race([verifyPromise, timeoutPromise]);

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });

    } catch (err: any) {
      return new Response(JSON.stringify({ valid: false, error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }
  }

  return serveDir(req, {
    fsRoot: "Token-Web",
    urlRoot: "",
    showDirListing: false,
    quiet: true,
  });
});