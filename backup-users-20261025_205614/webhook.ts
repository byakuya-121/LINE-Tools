import { handleCommand } from "./commands.ts";

const secret = Deno.env.get("LINE_CHANNEL_SECRET") ?? "";
const accessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") ?? "";

console.log(
  "[Config] LINE_CHANNEL_SECRET:",
  secret ? "SET" : "MISSING",
);
console.log(
  "[Config] LINE_CHANNEL_ACCESS_TOKEN:",
  accessToken ? "SET" : "MISSING",
);

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

  let difference = 0;
  for (let i = 0; i < a.length; i++) {
    difference |= a[i] ^ b[i];
  }

  return difference === 0;
}

async function reply(
  replyToken: string,
  text: string,
): Promise<void> {
  if (!accessToken) {
    console.error("[Reply] Access token is missing.");
    return;
  }

  try {
    const response = await fetch(
      "https://api.line.me/v2/bot/message/reply",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
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
      return;
    }

    console.log("[Reply] SUCCESS");
  } catch (error) {
    console.error("[Reply] Network error:", error);
  }
}

type LineEvent = {
  type?: string;
  message?: {
    type?: string;
    text?: string;
  };
  replyToken?: string;
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

  if (req.method !== "POST" || url.pathname !== "/webhook") {
    return new Response("Not Found", { status: 404 });
  }

  console.log("[Webhook] POST received");

  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  try {
    const valid = await verifySignature(body, signature);

    if (!valid) {
      console.error("[Webhook] Signature verification failed");
      return new Response("Invalid signature", { status: 401 });
    }
  } catch (error) {
    console.error("[Webhook] Signature verification error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }

  let events: LineEvent[];

  try {
    const payload = JSON.parse(body) as {
      events?: LineEvent[];
    };
    events = payload.events ?? [];
  } catch {
    console.error("[Webhook] Invalid JSON");
    return new Response("Invalid JSON", { status: 400 });
  }

  console.log("[Webhook] Signature valid; events:", events.length);

  for (const event of events) {
    if (
      event.type !== "message" ||
      event.message?.type !== "text" ||
      typeof event.message.text !== "string" ||
      typeof event.replyToken !== "string"
    ) {
      continue;
    }

    console.log("[Command] Text message received");

    try {
      const result = await handleCommand(event.message.text);
      if (result) {
        await reply(event.replyToken, result);
      }
    } catch (error) {
      console.error("[Command] Error:", error);
    }
  }

  return new Response("OK");
}