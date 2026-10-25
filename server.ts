import { handleCommand } from "./commands.ts";
import { handlePortalLogin, getPortalStatus } from "./web_portal.ts";

const PORT = Number(Deno.env.get("PORT")) || 8000;

console.log("==================================================");
console.log("🚀 LINE-Tools 統合サーバーを起動しました");
console.log( 🌐 統合 URL (ポータル & Webhook) : http://127.0.0.1:\);
console.log("==================================================");

Deno.serve({ port: PORT }, async (req: Request) => {
  const url = new URL(req.url);

  // A. LINE Webhook エンドポイント (/webhook)
  if (req.method === "POST" && url.pathname === "/webhook") {
    try {
      const body = await req.json();
      const events = body.events || [];

      for (const event of events) {
        if (event.type === "message" && event.message?.type === "text") {
          const replyText = await handleCommand(event);
          if (replyText) {
            const replyToken = event.replyToken;
            const accessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");

            if (replyToken && accessToken) {
              await fetch("https://api.line.me/v2/bot/message/reply", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: Bearer \,
                },
                body: JSON.stringify({
                  replyToken,
                  messages: [{ type: "text", text: replyText }],
                }),
              });
            }
          }
        }
      }
      return new Response("OK", { status: 200 });
    } catch (err) {
      console.error("[WEBHOOK_ERROR]", err);
      return new Response("Error", { status: 500 });
    }
  }

  // B. Webポータル API: ログインリクエスト
  if (req.method === "POST" && url.pathname === "/api/login") {
    return await handlePortalLogin(req);
  }

  // C. Webポータル API: ステータス取得
  if (req.method === "GET" && url.pathname === "/api/status") {
    return getPortalStatus();
  }

  // D. Webポータル 画面表示 (トップページ /)
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    try {
      const html = await Deno.readTextFile("./Token-Web/index.html");
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    } catch (_) {
      return new Response("Token-Web/index.html が見つかりません", { status: 404 });
    }
  }

  return new Response("Not Found", { status: 404 });
});
