import { handleCommand } from "./commands.ts";
import {
  claimPairingCode,
  updateHeartbeat,
} from "./users/database.ts";

const secret = Deno.env.get("LINE_CHANNEL_SECRET") ?? "";
const accessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") ?? "";

async function verifySignature(
  body: string,
  signature: string,
): Promise<boolean> {
  if (!secret || !signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );

  const expected = btoa(
    String.fromCharCode(...new Uint8Array(digest)),
  );

  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(signature);

  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function reply(
  replyToken: string,
  text: string,
): Promise<void> {
  if (!accessToken) {
    console.error("[Reply] Access token is missing.");
    return;
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
        messages: [{ type: "text", text }],
      }),
    },
  );

  if (!response.ok) {
    console.error(
      "[Reply] LINE API error:",
      response.status,
      await response.text(),
    );
  } else {
    console.log("[Reply] SUCCESS");
  }
}

type LineEvent = {
  type?: string;
  message?: { type?: string; text?: string };
  replyToken?: string;
  source?: { userId?: string; type?: string };
};

export async function handleRequest(
  req: Request,
): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "GET" && url.pathname === "/health") {
    return Response.json({
      status: "ok",
      service: "LINE-Tools",
    });
  }

  // LINEJS連携コード引き換えAPI
  if (
    req.method === "POST" &&
    url.pathname === "/api/linejs/claim"
  ) {
    const body = await req.text();

    if (body.length > 8192) {
      return new Response("Request too large", { status: 413 });
    }

    let data: { code?: unknown; displayName?: unknown };

    try {
      data = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (
      typeof data.code !== "string" ||
      typeof data.displayName !== "string" ||
      data.code.length > 200
    ) {
      return new Response("Invalid request", { status: 400 });
    }

    try {
      const result = await claimPairingCode(
        data.code,
        data.displayName,
      );

      if (!result) {
        return Response.json(
          { error: "Pairing code invalid or expired" },
          { status: 401 },
        );
      }

      // クライアントトークンは一度だけ返却する。
      // DBにはハッシュのみ保存される。
      return Response.json({
        clientToken: result.clientToken,
      });
    } catch (error) {
      console.error("[Claim] Processing error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // LINEJS接続確認API
  if (
    req.method === "POST" &&
    url.pathname === "/api/linejs/heartbeat"
  ) {
    const authorization = req.headers.get("authorization") ?? "";
    const match = /^Bearer ([A-Za-z0-9_-]{20,200})$/.exec(
      authorization,
    );

    if (!match) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const updated = await updateHeartbeat(match[1]);

      if (!updated) {
        return new Response("Unauthorized", { status: 401 });
      }

      return new Response(null, { status: 204 });
    } catch (error) {
      console.error("[Heartbeat] Processing error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // LINE公式アカウントのWebhook
  if (req.method !== "POST" || url.pathname !== "/webhook") {
    return new Response("Not Found", { status: 404 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  try {
    if (!(await verifySignature(body, signature))) {
      console.error("[Webhook] Signature verification failed");
      return new Response("Invalid signature", { status: 401 });
    }
  } catch (error) {
    console.error("[Webhook] Signature verification error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }

  let events: LineEvent[];

  try {
    const payload = JSON.parse(body) as { events?: LineEvent[] };
    events = payload.events ?? [];
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  console.log("[Webhook] Signature valid; events:", events.length);

  for (const event of events) {
    if (
      event.type !== "message" ||
      event.message?.type !== "text" ||
      typeof event.message.text !== "string" ||
      typeof event.replyToken !== "string"
    ) continue;

    try {
      const result = await handleCommand(
        event.message.text,
        event.source?.userId,
        event.source?.type,
      );

      if (result) {
        await reply(event.replyToken, result);
      }
    } catch (error) {
      console.error("[Command] Processing error:", error);
      await reply(event.replyToken, "処理中にエラーが発生しました。");
    }
  }

  return new Response("OK");
}