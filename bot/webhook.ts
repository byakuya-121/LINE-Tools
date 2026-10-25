import { handleCommand } from "./commands.ts";

const CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN") || "";

async function replyMessage(replyToken: string, text: string) {
  const trimmedText = text?.trim();
  if (!trimmedText || !CHANNEL_ACCESS_TOKEN) return;

  try {
    await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text: trimmedText }],
      }),
    });
  } catch (err) {
    console.error("[WEBHOOK_REPLY_ERROR]", err);
  }
}

export async function handleRequest(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("OK", { status: 200 });
  }

  try {
    const body = await req.json();
    const events = body.events || [];

    for (const event of events) {
      if (event.type === "message" && event.message?.type === "text") {
        const replyText = await handleCommand(event);
        if (replyText) {
          await replyMessage(event.replyToken, replyText);
        }
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("[WEBHOOK_ERROR]", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export const handleWebhookRequest = handleRequest;
