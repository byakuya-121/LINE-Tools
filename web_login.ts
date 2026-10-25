import { BaseClient } from "jsr:@evex/linejs@^3.4.2/base";
import { FileStorage } from "jsr:@evex/linejs@^3.4.2/storage";

let currentStatus = "待機中... 「ログイン開始」を押してください。";
let qrUrl = "";
let pinCode = "";
let authTokenResult = "";

async function startLoginProcess() {
  currentStatus = "ログイン処理を開始中...";
  qrUrl = "";
  pinCode = "";
  authTokenResult = "";

  await Deno.mkdir("./Storage", { recursive: true });
  const storage = new FileStorage("./Storage/linejs-storage.json");

  const baseClient = new BaseClient({
    device: "DESKTOPMAC",
    storage,
  });

  (baseClient as any).on("qrcode", (url: string) => {
    qrUrl = url;
    currentStatus = "📱 下記のQRコードURLを開くか、スマホで読み取ってください。";
  });

  (baseClient as any).on("pincode", (pin: string) => {
    pinCode = pin;
    currentStatus = `🔑 スマホのLINEアプリに PIN コード 【 ${pin} 】 を入力してください。`;
  });

  (baseClient as any).on("update:authtoken", async (token: string) => {
    authTokenResult = token;
    currentStatus = "🎉 AuthToken の取得に成功しました！";
    await Deno.writeTextFile("./token.txt", token).catch(() => {});
    
    // .env にも自動保存
    try {
      let envContent = await Deno.readTextFile("./.env").catch(() => "");
      const newLine = `LINE_AUTH_TOKEN="${token}"`;
      if (/^LINE_AUTH_TOKEN=.*$/m.test(envContent)) {
        envContent = envContent.replace(/^LINE_AUTH_TOKEN=.*$/m, newLine);
      } else {
        envContent = envContent.trim() ? `${envContent.trim()}\n${newLine}\n` : `${newLine}\n`;
      }
      await Deno.writeTextFile("./.env", envContent);
    } catch (_) {}
  });

  try {
    await baseClient.loginProcess.login({ qrcode: true });
  } catch (err: any) {
    currentStatus = `❌ エラーが発生しました: ${err?.message || err}`;
  }
}

Deno.serve({ port: 3000 }, async (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname === "/start") {
    startLoginProcess();
    return new Response(JSON.stringify({ status: "started" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/status") {
    return new Response(
      JSON.stringify({
        status: currentStatus,
        qrUrl,
        pinCode,
        token: authTokenResult,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  const html = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>LINE AuthToken 取得ポータル</title>
      <style>
        body { font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; background: #f7f7f7; }
        .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        button { background: #06C755; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 6px; cursor: pointer; font-weight: bold; }
        button:hover { background: #05b34c; }
        .pin { font-size: 32px; font-weight: bold; color: #06C755; letter-spacing: 4px; margin: 20px 0; }
        .token { word-break: break-all; background: #eee; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 12px; text-align: left; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>🛠️ LINE AuthToken 取得ポータル</h2>
        <p id="status-text">${currentStatus}</p>
        <button onclick="startLogin()">🚀 ログイン開始 (GO)</button>
        
        <div id="pin-area" style="display:none;">
          <p>スマホのLINEアプリに入力してください：</p>
          <div class="pin" id="pin-code">----</div>
        </div>

        <div id="qr-area" style="display:none; margin-top:20px;">
          <a id="qr-link" href="#" target="_blank" style="color:#06C755; font-weight:bold;">📱 ここをクリックしてQRコードを表示</a>
        </div>

        <div id="token-area" style="display:none; margin-top:20px;">
          <h3>取得した AuthToken</h3>
          <div class="token" id="token-text"></div>
        </div>
      </div>

      <script>
        async function startLogin() {
          await fetch('/start');
          checkStatus();
        }

        async function checkStatus() {
          const res = await fetch('/status');
          const data = await res.json();
          document.getElementById('status-text').innerText = data.status;

          if (data.pinCode) {
            document.getElementById('pin-area').style.display = 'block';
            document.getElementById('pin-code').innerText = data.pinCode;
          }

          if (data.qrUrl) {
            document.getElementById('qr-area').style.display = 'block';
            document.getElementById('qr-link').href = data.qrUrl;
          }

          if (data.token) {
            document.getElementById('token-area').style.display = 'block';
            document.getElementById('token-text').innerText = data.token;
          } else {
            setTimeout(checkStatus, 2000);
          }
        }
      </script>
    </body>
    </html>
  `;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
});
