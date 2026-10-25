import { load } from "jsr:@std/dotenv@^0.225.2";
import { handleRequest } from "./webhook.ts";

await load({ export: true });

const PORT = Number(Deno.env.get("PORT")) || 8000;
const HOST = "127.0.0.1";

console.log(`🚀 LINE-Tools Webhook Server を起動中...`);
console.log(`🌐 http://${HOST}:${PORT} でリクエストを待機します`);

Deno.serve({
  port: PORT,
  hostname: HOST,
}, handleRequest);
