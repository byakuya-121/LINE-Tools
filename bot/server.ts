import { handleApiRequest } from "./web_portal.ts";

const PORT = Number(Deno.env.get("PORT")) || 8080;

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // APIリクエストのルーティング (/api/status や /api/sync-token)
  if (url.pathname.startsWith("/api/")) {
    return await handleApiRequest(req);
  }

  // 静的ファイル (フロントエンド index.html など) の配信
  try {
    let filePath = `./Token-Web${url.pathname}`;
    if (url.pathname === "/" || url.pathname === "") {
      filePath = "./Token-Web/index.html";
    }

    const file = await Deno.readFile(filePath);
    let contentType = "text/html; charset=utf-8";
    if (filePath.endsWith(".js")) contentType = "application/javascript";
    if (filePath.endsWith(".css")) contentType = "text/css";
    if (filePath.endsWith(".gif")) contentType = "image/gif";
    if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) contentType = "image/jpeg";
    if (filePath.endsWith(".png")) contentType = "image/png";
    if (filePath.endsWith(".ico")) contentType = "image/x-icon";

    return new Response(file, {
      headers: { "Content-Type": contentType }
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

console.log(`Server running on http://localhost:${PORT}`);
Deno.serve({ port: PORT }, handler);