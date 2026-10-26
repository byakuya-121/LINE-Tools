import { Client } from "npm:@evex/linejs";
import { FileStorage } from "npm:@evex/linejs/storage";

export async function runStandaloneLogin(email?: string, password?: string) {
  const client = new Client({
    storage: new FileStorage("./storage.json"),
  });

  client.on("pincode", (pin: string) => {
    console.log(🔥 [REAL_PIN_CODE]: \);
  });

  client.on("ready", () => {
    console.log("✅ LINEJS Client Ready!");
    console.log("AuthToken:", (client as any).authToken);
  });

  if (email && password) {
    await client.login({
      email: email,
      password: password,
    });
  }
}