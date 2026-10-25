import { handleCommand } from "./commands.ts";
import { handlePortalLogin, getPortalStatus } from "./web_portal.ts";

const PORT = Number(Deno.env.get("PORT")) || 8000;

console.log("==================================================");
console.log("🚀 BYAKUYATOOLS V2 統合サーバーを起動しました");
console.log(` 🌐 統合 URL: http://127.0.0.1:${PORT}`);
console.log("==================================================");

Deno.serve({ port: PORT }, async (req: Request) => {
  const url = new URL(req.url);

  // A. LINE Webhook (/webhook)
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
                  Authorization: `Bearer ${accessToken}`,
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

  // B. Web API: ログイン
  if (req.method === "POST" && url.pathname === "/api/login") {
    return await handlePortalLogin(req);
  }

  // C. Web API: ステータス取得
  if (req.method === "GET" && url.pathname === "/api/status") {
    return getPortalStatus();
  }

  // D. 静的コンテンツ配信 (Token-Web/)
  if (req.method === "GET") {
    try {
      const pathname = decodeURIComponent(url.pathname);
      const relativePath = pathname === "/" ? "/index.html" : pathname;
      const fileUrl = new URL(`./Token-Web${relativePath}`, import.meta.url);
      const file = await Deno.readFile(fileUrl);

      const ext = relativePath.split(".").pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        html: "text/html; charset=utf-8",
        css: "text/css",
        js: "application/javascript",
        svg: "image/svg+xml",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        ico: "image/x-icon",
      };

      return new Response(file, {
        headers: {
          "Content-Type": mimeTypes[ext || ""] || "application/octet-stream",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (_) {
      return new Response("Not Found", { status: 404 });
    }
  }

  return new Response("Not Found", { status: 404 });
});
