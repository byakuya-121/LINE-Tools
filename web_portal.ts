// web_portal.ts - LINE AuthToken ログイン処理モジュール

interface LoginStatus {
  status: "IDLE" | "PIN_REQUIRED" | "SUCCESS" | "ERROR";
  message: string;
  pincode?: string;
  token?: string;
}

let portalState: LoginStatus = {
  status: "IDLE",
  message: "メールアドレスとパスワードを入力してください。",
};

/**
 * Web ポータルからのログインリクエスト処理
 */
export async function handlePortalLogin(req: Request): Promise<Response> {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ status: "ERROR", message: "メールアドレスとパスワードが必要です。" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ログイン処理状態の更新
    portalState = {
      status: "PIN_REQUIRED",
      message: "LINEアプリでPINコードを入力して認証を完了してください。",
      pincode: Math.floor(1000 + Math.random() * 9000).toString(),
    };

    return new Response(
      JSON.stringify({ status: "OK", message: "ログイン認証を開始しました。" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    portalState = {
      status: "ERROR",
      message: "認証処理中にエラーが発生しました。",
    };
    return new Response(
      JSON.stringify({ status: "ERROR", message: "リクエスト形式が不正確です。" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * 認証ステータスの取得処理
 */
export function getPortalStatus(): Response {
  return new Response(JSON.stringify(portalState), {
    headers: { "Content-Type": "application/json" },
  });
}
