import { Client } from "@evex/linejs";
import { FileStorage } from "@evex/linejs/storage";

export async function runStandaloneLogin() {
  const client = new Client({
    storage: new FileStorage("./storage.json"),
  });

  client.on("pincode", (pin: string) => {
    console.log(`[PIN CODE]: ${pin}`);
  });

  client.on("ready", () => {
    console.log("LINEJS Client Ready!");
  });
}
