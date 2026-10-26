import { loginWithPassword } from "jsr:@evex/linejs@3.4.2";
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
    try {
      content = await Deno.readTextFile(envPath);
    } catch {
      // ファイル未存在時は新規作成
    }

    const key = "LINE_AUTH_TOKEN";
    const newLine = ${key}="";
    const regex = new RegExp(^=.*$, "m");

    if (regex.test(content)) {
      content = content.replace(regex, newLine);
    } else {
      content = content.trim()
        ? ${content.trim()}\n\n
        : ${newLine}\n;
    }

    await Deno.writeTextFile(envPath, content);
    console.log("[+] Token/.env に最新トークンを自動保存しました。");
  } catch (err) {
    console.error([Error] Token/.env 保存失敗:, err instanceof Error ? err.message : String(err));
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

    console.log(\n==================================================);
    console.log([LINEJS_AUTH] LINE サーバーへログイン接続開始...);
    console.log( 📧 EMAIL : );
    console.log(==================================================);

    currentStatus = {
      status: "IDLE",
      message: "LINE サーバーへ接続中...",
      pincode: "",
      token: "",
    };

    (async () => {
      try {
        const storage = new FileStorage(STORAGE_PATH);

        const client = await loginWithPassword({
          email,
          password,
          storage,
          onPincode: (pin: string) => {
            console.log(\n🔥 [REAL_PIN_CODE] LINEアプリ認証コード: );
            currentStatus = {
              status: "PIN_REQUIRED",
              message: "スマホのLINEアプリを開き、表示されているPINコードを入力してください。",
              pincode: pin,
              token: "",
            };
          },
        });

        const authToken = (client as any).authToken || (client as any).token || "";

        console.log(\n✅ [AUTH_SUCCESS] 認証成功! Token: );
        
        if (authToken) {
          await saveTokenToEnv(authToken);
        }

        currentStatus = {
          status: "SUCCESS",
          message: "AuthToken の取得および Token/.env への保存に成功しました！",
          pincode: "",
          token: authToken,
        };
      } catch (err) {
        console.error(❌ [LINE_LOGIN_ERROR], err);
        currentStatus = {
          status: "ERROR",
          message: err instanceof Error ? err.message : "LINEログインに失敗しました。",
          pincode: "",
          token: "",
        };
      }
    })();

    return new Response(
      JSON.stringify({ success: true, message: "LINE 認証リクエストを開始しました。" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error([AUTH_FATAL_ERROR], error);
    currentStatus = {
      status: "ERROR",
      message: error.message || "サーバー内部エラーが発生しました。",
      pincode: "",
      token: "",
    };
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}