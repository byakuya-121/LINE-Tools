import { handleCommand } from "./commands.ts";
import { handlePortalLogin, getPortalStatus } from "./web_portal.ts";

const PORT = Number(Deno.env.get("PORT")) || 8000;
const serverStartTime = Date.now();
let requestCount = 0;

console.log("==================================================");
console.log("🚀 BYAKUYATOOLS V2 統合サーバーを起動しました");
console.log( 🌐 統合 URL (ポータル & Webhook) : http://127.0.0.1:);
console.log("==================================================");

Deno.serve({ port: PORT }, async (req: Request) => {
  requestCount++;
  const url = new URL(req.url);

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
                  Authorization: Bearer ,
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

  if (req.method === "POST" && url.pathname === "/api/login") {
    console.log("[AUTH_TRY] ログインリクエストを受信しました...");
    return await handlePortalLogin(req);
  }

  if (req.method === "GET" && url.pathname === "/api/status") {
    return getPortalStatus();
  }

  if (req.method === "GET" && url.pathname === "/api/metrics") {
    const uptimeSec = Math.floor((Date.now() - serverStartTime) / 1000);
    const mem = Deno.memoryUsage();
    return new Response(
      JSON.stringify({
        uptime: uptimeSec,
        heapUsedMb: (mem.heapUsed / (1024 * 1024)).toFixed(1),
        heapTotalMb: (mem.heapTotal / (1024 * 1024)).toFixed(1),
        rssMb: (mem.rss / (1024 * 1024)).toFixed(1),
        requests: requestCount,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  if (req.method === "GET") {
    try {
      const pathname = decodeURIComponent(url.pathname);
      const relativePath = pathname === "/" ? "/index.html" : pathname;

      let fileUrl = new URL(./Token-Web, import.meta.url);
      let fileData: Uint8Array | null = null;

      try {
        fileData = await Deno.readFile(fileUrl);
      } catch (_) {
        if (relativePath.startsWith("/assets/")) {
          const fileName = relativePath.replace("/assets/", "").toLowerCase();
          const assetsDir = new URL("./Token-Web/assets/", import.meta.url);
          try {
            for await (const entry of Deno.readDir(assetsDir)) {
              if (entry.isFile && entry.name.toLowerCase() === fileName) {
                const matchedUrl = new URL(./Token-Web/assets/, import.meta.url);
                fileData = await Deno.readFile(matchedUrl);
                break;
              }
            }
          } catch (_) {}
        }
      }

      if (!fileData) {
        return new Response("Not Found", { status: 404 });
      }

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

      return new Response(fileData, {
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