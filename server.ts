import { handlePortalLogin, getPortalStatus } from "./web_portal.ts";

const PORT = Number(Deno.env.get("PORT")) || 8000;

console.log("==================================================");
console.log("🚀 BYAKUYATOOLS Webポータル サーバーを起動しました");
console.log( 🌐 ポータル URL : http://127.0.0.1:);
console.log("==================================================");

Deno.serve({ port: PORT }, async (req: Request) => {
  const url = new URL(req.url);

  // A. Web API: ログイン処理
  if (req.method === "POST" && url.pathname === "/api/login") {
    return await handlePortalLogin(req);
  }

  // B. Web API: ステータス取得 (ポーリング用)
  if (req.method === "GET" && url.pathname === "/api/status") {
    return getPortalStatus();
  }

  // C. 静的Webサイト配信 (Token-Web/index.html)
  if (req.method === "GET") {
    try {
      const pathname = decodeURIComponent(url.pathname);
      const relativePath = pathname === "/" ? "/index.html" : pathname;
      const fileUrl = new URL(./Token-Web, import.meta.url);
      const fileData = await Deno.readFile(fileUrl);

      const ext = relativePath.split(".").pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        html: "text/html; charset=utf-8",
        css: "text/css",
        js: "application/javascript",
        png: "image/png",
        jpg: "image/jpeg",
        ico: "image/x-icon",
      };

      return new Response(fileData, {
        headers: {
          "Content-Type": mimeTypes[ext || ""] || "application/octet-stream",
          "Cache-Control": "no-cache",
        },
      });
    } catch (_) {
      return new Response("Not Found", { status: 404 });
    }
  }

  return new Response("Not Found", { status: 404 });
});