import { handleRequest } from "./webhook.ts";

const port = Number(Deno.env.get("PORT") ?? "8000");

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORTの設定が不正です。");
}

console.log("[LINE-Tools] Webhookサーバーを起動します。");
console.log(`[LINE-Tools] http://localhost:${port}`);

Deno.serve({ port }, handleRequest);