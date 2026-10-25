import { Client } from "https://esm.sh/linejs";

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
    console.log(`[LINEJS_AUTH] LINE サーバーへ接続試行中...`);
    console.log(` 📧 EMAIL : ${email}`);
    console.log(`==================================================`);

    currentStatus = {
      status: "IDLE",
      message: "LINE サーバーへ接続中...",
      pincode: "",
      token: "",
    };

    const client = new Client();

    // PINコード受信イベント（LINEアプリ側へ通知）
    client.on("pincode", (pin: string) => {
      console.log(`\n🔥 [REAL_PIN_CODE] LINEアプリに認証コードが送信されました: ${pin}`);
      currentStatus = {
        status: "PIN_REQUIRED",
        message: "スマホのLINEアプリを開き、表示されているPINコードを入力してください。",
        pincode: pin,
        token: "",
      };
    });

    // ログイン成功イベント
    client.on("ready", () => {
      const authToken = (client as any).authToken || "";
      console.log(`\n✅ [AUTH_SUCCESS] 認証成功! Token: ${authToken}`);
      currentStatus = {
        status: "SUCCESS",
        message: "AuthToken の取得に成功しました！",
        pincode: "",
        token: authToken,
      };
    });

    // ログイン実行
    client.login({
      email: email,
      password: password,
    }).catch((err: any) => {
      console.error(`❌ [LINE_LOGIN_ERROR]`, err);
      currentStatus = {
        status: "ERROR",
        message: err.message || "LINEログインに失敗しました（パスワード不一致またはIPブロック）。",
        pincode: "",
        token: "",
      };
    });

    return new Response(
      JSON.stringify({ success: true, message: "LINE 認証リクエストを開始しました。" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error(`[AUTH_FATAL_ERROR]`, err);
    currentStatus = {
      status: "ERROR",
      message: err.message || "サーバー内部エラーが発生しました。",
      pincode: "",
      token: "",
    };
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
