export async function handleCommand(event: any): Promise<string | null> {
  const text = event.message?.text || "";
  if (text === "!ping") return "pong!";
  if (text === "!status") return "ByakuyaTools V2 Engine: ONLINE";
  return null;
}
