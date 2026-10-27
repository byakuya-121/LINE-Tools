import { loginWithEmail } from "./linejs/login.ts";

export function getPortalStatus() {
  return {
    status: "ONLINE",
    uptimeSeconds: Math.floor(performance.now() / 1000),
    sessionCount: 1,
    startedAt: new Date().toISOString(),
    serverTime: new Date().toISOString(),
    message: "BYAKUYA Control Engine Running"
  };
}

export async function handlePortalLogin(email: string, password: string): Promise<string> {
  if (!email || !password) {
    throw new Error("Eメールとパスワードを入力してください。");
  }
  const authToken = await loginWithEmail(email, password);

  try {
    const envPath = "Token/.env";
    let envContent = "";
    try {
      envContent = await Deno.readTextFile(envPath);
    } catch {
      // File not found
    }

    const newEnvLine = `LINE_AUTH_TOKEN=${authToken}`;
    const updatedEnv = envContent.includes("LINE_AUTH_TOKEN=")
      ? envContent.replace(/LINE_AUTH_TOKEN=.*/, newEnvLine)
      : (envContent ? `${envContent.trim()}\n${newEnvLine}\n` : `${newEnvLine}\n`);

    await Deno.writeTextFile(envPath, updatedEnv);
  } catch (fileErr) {
    console.warn("Failed to update Token/.env file:", fileErr);
  }

  return authToken;
}

export async function handleApiRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (url.pathname === "/api/status" && req.method === "GET") {
    return new Response(
      JSON.stringify(getPortalStatus()),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  if (url.pathname === "/api/sync-token" && req.method === "POST") {
    try {
      const body = await req.json();
      const { email, password } = body;
      const authToken = await handlePortalLogin(email, password);

      return new Response(
        JSON.stringify({
          success: true,
          authToken: authToken,
          message: "AuthToken acquired and saved to Token/.env"
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          success: false,
          message: error.message || "LINEアカウントの認証に失敗しました。"
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return new Response("Not Found", { status: 404 });
}