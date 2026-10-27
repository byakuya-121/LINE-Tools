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
  // .env への保管は行わず AuthToken のみ取得して返す
  return await loginWithEmail(email, password);
}

export async function handleApiRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // ステータス確認
  if (url.pathname === "/api/status" && req.method === "GET") {
    return new Response(
      JSON.stringify(getPortalStatus()),
      { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );
  }

  // AuthToken 取得 API (.env書き込みなし)
  if (url.pathname === "/api/sync-token" && req.method === "POST") {
    try {
      const body = await req.json();
      const { email, password } = body;
      const authToken = await handlePortalLogin(email, password);

      return new Response(
        JSON.stringify({
          success: true,
          authToken: authToken,
          message: "AuthToken acquired successfully"
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