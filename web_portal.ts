import { Client } from "jsr:@evex/linejs@3.4.2";
import { FileStorage } from "jsr:@evex/linejs@3.4.2/storage";
import { dirname, join } from "https://deno.land/std/path/mod.ts";

const STORAGE_PATH = "./storage.json";

let currentStatus: {
  status: "IDLE" | "PIN_REQUIRED" | "SUCCESS" | "ERROR";
  message: string;
  pincode: string;
  token: string;
} = {
  status: "IDLE",
  message: "メールアドレスとパスワードを入力して GENERATE TOKEN を押してください。",
  pincode: "",
  token: "",
};

async function saveTokenToEnv(token: string): Promise<void> {
  try {
    const envPath = join(Deno.cwd(), "Token", ".env");
    const dirPath = dirname(envPath);
    await Deno.mkdir(dirPath, { recursive: true });

    let content = "";
    try { content = await Deno.readTextFile(envPath); } catch {}

    const key = "LINE_AUTH_TOKEN";
    const newLine = `${key}="${token}"`;
    const regex = new RegExp(`^${key}=.*$`, "m");

    if (regex.test(content)) {
      content = content.replace(regex, newLine);
    } else {
      content = content.trim() ? `${content.trim()}\n${newLine}\n` : `${newLine}\n`;
    }

    await Deno.writeTextFile(envPath, content);
    console.log("[+] Token/.env に最新トークンを自動保存しました。");
  } catch (err) {
    console.error(`[Error] Token/.env 保存失敗:`, err instanceof Error ? err.message : String(err));
  }
}

export function getPortalStatus(): Response {
  return new Response(JSON.stringify(currentStatus), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function handlePortalLogin(req: Request): Promise<Response> {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "メールアドレスとパスワードが必要です。" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`\n==================================================`);
    console.log(`[LINEJS_AUTH] ログイン接続開始...`);
    console.log(` EMAIL : ${email}`);
    console.log(`==================================================`);

    currentStatus = {
      status: "IDLE",
      message: "LINE サーバーへ接続中...",
      pincode: "",
      token: "",
    };

    (async () => {
      try {
        const client = new Client({
          storage: new FileStorage(STORAGE_PATH),
        });

        // PINコード発生イベント
        client.on("pincode", (pin: string) => {
          console.log(`\n🔥 [REAL_PIN_CODE] 発行されたPINコード: ${pin}`);
          currentStatus = {
            status: "PIN_REQUIRED",
            message: "スマホのLINEアプリを開き、表示されているPINコードを入力してください。",
            pincode: pin,
            token: "",
          };
        });

        // ログイン完了イベント
        client.on("ready", async () => {
          const authToken = (client as any).authToken || (client as any).token || "";
          console.log(`\n✅ [AUTH_SUCCESS] 認証完了! Token: ${authToken}`);
          
          if (authToken) {
            await saveTokenToEnv(authToken);
          }

          currentStatus = {
            status: "SUCCESS",
            message: "AuthToken の取得および Token/.env への保存に成功しました！",
            pincode: "",
            token: authToken,
          };
        });

        // loginWithPassword メソッドで実行
        await client.loginWithPassword({
          email: email,
          password: password,
        });

      } catch (err: any) {
        console.error(`❌ [LINE_LOGIN_ERROR]`, err);
        currentStatus = {
          status: "ERROR",
          message: err?.message || String(err) || "LINEログインに失敗しました。",
          pincode: "",
          token: "",
        };
      }
    })();

    return new Response(
      JSON.stringify({ success: true, message: "LINE 認証リクエストを開始しました。" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error(`[AUTH_FATAL_ERROR]`, err);
    currentStatus = {
      status: "ERROR",
      message: err?.message || "サーバー内部エラーが発生しました。",
      pincode: "",
      token: "",
    };
    return new Response(
      JSON.stringify({ error: err?.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}