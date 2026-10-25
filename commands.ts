export async function handleCommand(event: Record<string, unknown>): Promise<string | null> {
  const message = event.message as { text?: string } | undefined;
  const text = message?.text || "";
  if (text === "!ping") return "pong!";
  if (text === "!status") return "ByakuyaTools V2 Engine: ONLINE";
  return null;
}
