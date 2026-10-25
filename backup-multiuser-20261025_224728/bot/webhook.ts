import { handleCommand } from "./commands.ts";
import { completeAccountLink } from "./account-link.ts";

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
    console.error("[Reply] LINE_CHANNEL_ACCESS_TOKEN is missing.");
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

async function pushText(
  userId: string,
  text: string,
): Promise<void> {
  if (!accessToken) return;

  const response = await fetch(
    "https://api.line.me/v2/bot/message/push",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: "text", text }],
      }),
    },
  );

  if (!response.ok) {
    console.error("[AccountLink] Push error:", response.status);
  } else {
    console.log("[AccountLink] Confirmation notice sent.");
  }
}

type LineEvent = {
  type?: string;
  message?: { type?: string; text?: string };
  replyToken?: string;
  source?: { userId?: string; type?: string };
  link?: { result?: string; nonce?: string };
};

export async function handleRequest(req: Request): Promise<Response> {
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

  const body = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  try {
    if (!(await verifySignature(body, signature))) {
      console.error("[Webhook] Signature verification failed.");
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
    if (event.type === "accountLink") {
      const nonce = event.link?.nonce;
      const result = event.link?.result ?? "failed";

      if (!nonce) {
        console.warn("[AccountLink] Nonce missing.");
        continue;
      }

      const completion = completeAccountLink(
        event.source?.userId,
        nonce,
        result,
      );

      if (completion.accepted && completion.userId) {
        await pushText(completion.userId, completion.message);
        console.log("[AccountLink] Result processed:", result);
      } else {
        console.warn("[AccountLink] Event rejected:", completion.message);
      }

      continue;
    }

    if (
      event.type !== "message" ||
      event.message?.type !== "text" ||
      typeof event.message.text !== "string" ||
      typeof event.replyToken !== "string"
    ) {
      continue;
    }

    try {
      const response = await handleCommand(
        event.message.text,
        event.source?.userId,
        event.source?.type,
      );

      if (response) {
        await reply(event.replyToken, response);
      }
    } catch (error) {
      console.error("[Command] Processing error:", error);
      await reply(
        event.replyToken,
        "処理中にエラーが発生しました。",
      );
    }
  }

  return new Response("OK");
}