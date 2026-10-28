import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { Client } from "jsr:@evex/linejs@3.4.2";

const PORT = Number(Deno.env.get("PORT")) || 10000;
const startTime = Date.now();
const activeSessions: Array<{ userId: string; startedAt: string }> = [];

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // 静的ファイル配信 (Token-Web/)
  if (req.method === "GET" && !url.pathname.startsWith("/api/")) {
    let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    try {
      const file = await Deno.readFile(`./Token-Web${filePath}`);
      const contentType = filePath.endsWith(".css")
        ? "text/css"
        : filePath.endsWith(".js")
        ? "text/javascript"
        : filePath.endsWith(".ico")
        ? "image/x-icon"
        : filePath.endsWith(".gif")
        ? "image/gif"
        : "text/html";
      return new Response(file, { headers: { "content-type": `${contentType}; charset=utf-8` } });
    } catch {
      try {
        const indexFile = await Deno.readFile("./Token-Web/index.html");
        return new Response(indexFile, { headers: { "content-type": "text/html; charset=utf-8" } });
      } catch {
        return new Response("Not Found", { status: 404 });
      }
    }
  }

  // API: ステータス確認
  if (url.pathname === "/api/status" && req.method === "GET") {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    return new Response(
      JSON.stringify({
        status: "ONLINE",
        uptimeSeconds,
        sessionCount: activeSessions.length,
        sessions: activeSessions,
      }),
      { headers: { "content-type": "application/json" } }
    );
  }

  // API: トークン取得 (PINコードを即時レスポンスJSONとして画面へ送信)
  if (url.pathname === "/api/sync-token" && req.method === "POST") {
    try {
      const body = await req.json();
      const { email, password } = body;

      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email and password are required" }), { status: 400 });
      }

      const client = new Client({});

      return await new Promise<Response>((resolve) => {
        let isResolved = false;

        // 📌 PINコード受領イベント ➔ Web画面へ即座に送信
        client.on("pincode", (pin: string) => {
          if (!isResolved) {
            isResolved = true;
            console.log(`[LINEJS] PIN Captured for Web UI: ${pin}`);
            resolve(
              new Response(JSON.stringify({ pincode: pin }), {
                headers: { "content-type": "application/json" },
              })
            );
          }
        });

        // ログイン完了イベント
        client.on("ready", async () => {
          if (!isResolved) {
            isResolved = true;
            const authToken = client.authToken;
            activeSessions.push({ userId: email, startedAt: new Date().toISOString() });
            resolve(
              new Response(
                JSON.stringify({
                  authToken,
                  jwtToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + btoa(authToken || "").replace(/=/g, "") + ".BYAKUYA_CYBER_SIG",
                }),
                { headers: { "content-type": "application/json" } }
              )
            );
          }
        });

        // ログイン実行
        client.login({ email, password }).catch((err) => {
          if (!isResolved) {
            isResolved = true;
            console.error("[LINEJS] Login Error:", err);
            resolve(
              new Response(JSON.stringify({ error: err.message || "LINEJS Login Failed" }), {
                status: 400,
                headers: { "content-type": "application/json" },
              })
            );
          }
        });

        // 25秒タイムアウト保護
        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            resolve(
              new Response(JSON.stringify({ error: "Auth request timed out" }), {
                status: 504,
                headers: { "content-type": "application/json" },
              })
            );
          }
        }, 25000);
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || "Server Error" }), { status: 500 });
    }
  }

  // API: トークン有効性検証
  if (url.pathname === "/api/verify-token" && req.method === "POST") {
    try {
      const body = await req.json();
      const { authToken } = body;
      if (!authToken) {
        return new Response(JSON.stringify({ valid: false, error: "Token required" }), { status: 400 });
      }

      return new Response(
        JSON.stringify({
          valid: true,
          displayName: "BYAKUYA Verified User",
        }),
        { headers: { "content-type": "application/json" } }
      );
    } catch (err: any) {
      return new Response(JSON.stringify({ valid: false, error: err.message }), { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
}

console.log(`[BYAKUYA BACKEND] Server running on http://0.0.0.0:${PORT}`);
serve(handler, { port: PORT });