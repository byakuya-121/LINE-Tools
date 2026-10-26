import { handleCommand } from "./commands.ts";
import { handlePortalLogin, getPortalStatus } from "./web_portal.ts";

const PORT = Number(Deno.env.get("PORT")) || 8000;
const WEB_ROOT = `${Deno.cwd()}/Token-Web`;

console.log("==================================================");
console.log("LINE-Tools 統合サーバーを起動しています");
console.log(`ポータル: http://127.0.0.1:${PORT}/`);
console.log(`Webhook:  http://127.0.0.1:${PORT}/webhook`);
console.log("==================================================");

Deno.serve({ port: PORT }, async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  // A. LINE Webhook
  if (req.method === "POST" && url.pathname === "/webhook") {
    try {
      const body = await req.json();
      const events = Array.isArray(body.events) ? body.events : [];

      for (const event of events) {
        if (
          event.type !== "message" ||
          event.message?.type !== "text"
        ) {
          continue;
        }

        const replyText = await handleCommand(event);
        if (!replyText) continue;

        const replyToken = event.replyToken;
        const accessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");

        if (!replyToken || !accessToken) {
          console.warn(
            "[WEBHOOK] replyToken または Channel Access Token がありません。",
          );
          continue;
        }

        const response = await fetch(
          "https://api.line.me/v2/bot/message/reply",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              replyToken,
              messages: [{ type: "text", text: replyText }],
            }),
          },
        );

        if (!response.ok) {
          console.error(
            `[LINE_REPLY_ERROR] HTTP ${response.status}:`,
            await response.text(),
          );
        }
      }

      return new Response("OK", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    } catch (error: unknown) {
      console.error("[WEBHOOK_ERROR]", error);

      return new Response("Webhook processing failed", {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  }

  // B. ポータルAPI: ステータス取得
  if (req.method === "GET" && url.pathname === "/api/status") {
    return getPortalStatus();
  }

  // C. ポータルAPI: ログイン処理
  if (req.method === "POST" && url.pathname === "/api/login") {
    return await handlePortalLogin(req);
  }

  // D. ポータル画面
  if (
    req.method === "GET" &&
    (url.pathname === "/" || url.pathname === "/index.html")
  ) {
    try {
      const html = await Deno.readTextFile(`${WEB_ROOT}/index.html`);

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    } catch (error: unknown) {
      console.error("[HTML_READ_ERROR]", error);

      return new Response(
        "ポータル画面を読み込めません。Token-Web/index.html の存在を確認してください。",
        {
          status: 500,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        },
      );
    }
  }

  // E. CSS・JavaScript・画像などの静的ファイル
  if (
    req.method === "GET" &&
    url.pathname.startsWith("/assets/")
  ) {
    const relativePath = url.pathname.slice("/assets/".length);

    // ディレクトリ外へのアクセスを防ぐ
    if (
      !relativePath ||
      relativePath.includes("..") ||
      relativePath.includes("\\")
    ) {
      return new Response("Bad Request", { status: 400 });
    }

    const filePath = `${WEB_ROOT}/assets/${relativePath}`;

    try {
      const file = await Deno.readFile(filePath);
      const extension = relativePath.split(".").pop()?.toLowerCase();

      const contentTypes: Record<string, string> = {
        css: "text/css; charset=utf-8",
        js: "text/javascript; charset=utf-8",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        svg: "image/svg+xml",
        ico: "image/x-icon",
        woff: "font/woff",
        woff2: "font/woff2",
      };

      return new Response(file, {
        status: 200,
        headers: {
          "Content-Type": contentTypes[extension ?? ""] ??
            "application/octet-stream",
          "Cache-Control": "no-cache",
        },
      });
    } catch {
      return new Response("Asset Not Found", { status: 404 });
    }
  }

  return new Response("Not Found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
});