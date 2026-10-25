import { loginWithPassword } from "jsr:@evex/linejs@^3.4.2";
import { FileStorage } from "jsr:@evex/linejs@^3.4.2/storage";

let state = {
  status: "IDLE",
  message: "メールアドレスとパスワードを入力して「GENERATE TOKEN」を押してください。",
  pincode: "",
  token: "",
};

async function saveToken(token: string) {
  try {
    await Deno.writeTextFile("./token.txt", token);
    let envContent = await Deno.readTextFile("./.env").catch(() => "");
    const newLine = LINE_AUTH_TOKEN="";
    if (/^LINE_AUTH_TOKEN=.*$/m.test(envContent)) {
      envContent = envContent.replace(/^LINE_AUTH_TOKEN=.*$/m, newLine);
    } else {
      envContent = envContent.trim() ? ${envContent.trim()}\n\n : ${newLine}\n;
    }
    await Deno.writeTextFile("./.env", envContent);
    console.log("[+] AuthToken を ./token.txt および ./.env に保存しました。");
  } catch (err) {
    console.error("[-] トークン保存エラー:", err);
  }
}

async function startLoginProcess(email: string, pass: string) {
  state = {
    status: "PROCESSING",
    message: "LINE サーバーへログインリクエストを送信中...",
    pincode: "",
    token: "",
  };

  await Deno.mkdir("./Storage", { recursive: true });
  const storage = new FileStorage("./Storage/linejs-storage.json");

  try {
    const client = await loginWithPassword(
      {
        email: email.trim(),
        password: pass.trim(),
        onPincodeRequest: (pin: string) => {
          console.log(📍 PINコード発行: );
          state.status = "PIN_REQUIRED";
          state.pincode = pin;
          state.message = "スマホの LINE アプリを開き、下記 4 桁の PIN コードを入力してください。";
        },
      },
      {
        device: "DESKTOPMAC",
        storage,
      }
    );

    const token = client.authToken;
    if (token) {
      await saveToken(token);
      state.status = "SUCCESS";
      state.token = token;
      state.message = "🎉 認証が成功し、AuthToken が正常に取得・保存されました！";
    }
  } catch (err: any) {
    console.error("[-] 認証エラー:", err);
    state.status = "ERROR";
    const reason = err?.data?.reason || err?.message || String(err);
    state.message = ❌ 認証エラー: ;
  }
}

Deno.serve({ port: 3000 }, async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "POST" && url.pathname === "/api/login") {
    try {
      const body = await req.json();
      if (body.email && body.password) {
        startLoginProcess(body.email, body.password);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (_) {}
    return new Response(JSON.stringify({ success: false, message: "無効な入力です" }), { status: 400 });
  }

  if (url.pathname === "/api/status") {
    return new Response(JSON.stringify(state), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const html = await Deno.readTextFile("./Token-Web/index.html");
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (_) {
    return new Response("Token-Web/index.html が見つかりません", { status: 404 });
  }
});
