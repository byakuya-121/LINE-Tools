import { loginWithPassword } from "jsr:@evex/linejs@^3.4.2";
import { FileStorage } from "jsr:@evex/linejs@^3.4.2/storage";

let state = {
  status: "IDLE",
  message: "メールアドレスとパスワードを入力して「Token 取得開始」を押してください。",
  pincode: "",
  token: "",
};

async function saveToken(token: string) {
  try {
    await Deno.writeTextFile("./token.txt", token);
    
    let envContent = await Deno.readTextFile("./.env").catch(() => "");
    const newLine = `LINE_AUTH_TOKEN="${token}"`;
    if (/^LINE_AUTH_TOKEN=.*$/m.test(envContent)) {
      envContent = envContent.replace(/^LINE_AUTH_TOKEN=.*$/m, newLine);
    } else {
      envContent = envContent.trim() ? `${envContent.trim()}\n${newLine}\n` : `${newLine}\n`;
    }
    await Deno.writeTextFile("./.env", envContent);
    console.log("[+] AuthToken を ./token.txt および ./.env に自動保存しました。");
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
          console.log(`📍 PINコード発行: ${pin}`);
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
      state.message = "🎉 認証成功！「トークンをコピー」ボタンを押して公式アカウントへ送信してください。";
    }
  } catch (err: any) {
    console.error("[-] 認証エラー:", err);
    state.status = "ERROR";
    const reason = err?.data?.reason || err?.message || String(err);
    state.message = `❌ 認証エラー: ${reason}`;
  }
}

export async function handlePortalLogin(req: Request): Promise<Response> {
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

export function getPortalStatus(): Response {
  return new Response(JSON.stringify(state), {
    headers: { "Content-Type": "application/json" },
  });
}

export function getPortalHtml(): string {
  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LINE AuthToken 発行ポータル</title>
      <style>
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; }
        .card { background: white; width: 100%; max-width: 480px; padding: 32px; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); text-align: center; }
        h2 { margin-top: 0; color: #111; font-size: 22px; }
        p.desc { color: #666; font-size: 14px; margin-bottom: 24px; }
        .field { text-align: left; margin-bottom: 16px; }
        label { display: block; font-size: 13px; font-weight: 600; color: #444; margin-bottom: 6px; }
        input { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 15px; outline: none; transition: border 0.2s; }
        input:focus { border-color: #06C755; }
        .btn-primary { width: 100%; background: #06C755; color: white; border: none; padding: 14px; font-size: 16px; font-weight: bold; border-radius: 8px; cursor: pointer; margin-top: 8px; transition: background 0.2s; }
        .btn-primary:hover { background: #05b24c; }
        .btn-primary:disabled { background: #ccc; cursor: not-allowed; }
        .btn-copy { width: 100%; background: #111; color: white; border: none; padding: 12px; font-size: 15px; font-weight: bold; border-radius: 8px; cursor: pointer; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-copy:hover { background: #333; }
        .status-box { margin-top: 20px; padding: 16px; border-radius: 8px; background: #f8f9fa; border: 1px solid #e9ecef; font-size: 14px; color: #333; line-height: 1.5; word-break: break-all; }
        .pincode-box { display: none; margin-top: 20px; background: #eefdf2; border: 2px dashed #06C755; border-radius: 12px; padding: 16px; }
        .pincode-val { font-size: 40px; font-weight: 800; color: #06C755; letter-spacing: 8px; margin: 8px 0; }
        .token-box { display: none; margin-top: 20px; text-align: left; }
        .token-val { background: #1e1e1e; color: #00ff66; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 11px; word-break: break-all; max-height: 100px; overflow-y: auto; margin-bottom: 10px; }
        .guide { margin-top: 15px; font-size: 13px; color: #555; background: #fff8e6; padding: 10px; border-radius: 6px; border-left: 4px solid #ffc107; text-align: left; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>🔑 AuthToken 発行ポータル</h2>
        <p class="desc">LINE のログイン情報を入力して AuthToken を発行します</p>

        <div class="field">
          <label>メールアドレス</label>
          <input type="email" id="email" placeholder="example@gmail.com">
        </div>

        <div class="field">
          <label>パスワード</label>
          <input type="password" id="password" placeholder="••••••••">
        </div>

        <button class="btn-primary" id="submit-btn" onclick="startLogin()">Token 取得開始</button>

        <div class="status-box" id="msg-text">メールアドレスとパスワードを入力して「Token 取得開始」を押してください。</div>

        <div class="pincode-box" id="pin-area">
          <div style="font-size: 13px; font-weight: bold; color: #222;">スマホの LINE アプリに入力してください</div>
          <div class="pincode-val" id="pin-code">----</div>
        </div>

        <div class="token-box" id="token-area">
          <label style="font-weight:bold; font-size:13px;">発行された AuthToken:</label>
          <div class="token-val" id="token-text"></div>
          
          <button class="btn-copy" onclick="copyToken()">📋 トークンをコピーする</button>

          <div class="guide">
            <strong>次の手順:</strong><br>
            コピーしたトークンを使って、公式アカウント宛に以下を送信してください：<br>
            <code style="background:#eee; padding:2px 6px; border-radius:4px; font-weight:bold;">!login [コピーしたトークン]</code>
          </div>
        </div>
      </div>

      <script>
        let isPolling = false;

        async function startLogin() {
          const email = document.getElementById('email').value.trim();
          const password = document.getElementById('password').value.trim();

          if (!email || !password) {
            alert('メールアドレスとパスワードを入力してください。');
            return;
          }

          document.getElementById('submit-btn').disabled = true;

          try {
            await fetch('/api/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });

            if (!isPolling) {
              isPolling = true;
              pollStatus();
            }
          } catch (e) {
            alert('通信エラーが発生しました。');
            document.getElementById('submit-btn').disabled = false;
          }
        }

        async function pollStatus() {
          try {
            const res = await fetch('/api/status');
            const data = await res.json();

            document.getElementById('msg-text').innerText = data.message;

            if (data.status === 'PIN_REQUIRED' && data.pincode) {
              document.getElementById('pin-area').style.display = 'block';
              document.getElementById('pin-code').innerText = data.pincode;
            }

            if (data.status === 'SUCCESS' && data.token) {
              document.getElementById('pin-area').style.display = 'none';
              document.getElementById('token-area').style.display = 'block';
              document.getElementById('token-text').innerText = data.token;
              document.getElementById('submit-btn').disabled = false;
              isPolling = false;
              return;
            }

            if (data.status === 'ERROR') {
              document.getElementById('submit-btn').disabled = false;
              isPolling = false;
              return;
            }
          } catch (_) {}

          if (isPolling) {
            setTimeout(pollStatus, 1500);
          }
        }

        function copyToken() {
          const token = document.getElementById('token-text').innerText;
          navigator.clipboard.writeText(token).then(() => {
            alert('✅ AuthToken をクリップボードにコピーしました！\n公式アカウントのチャット宛に送信してください。');
          }).catch(() => {
            alert('コピーに失敗しました。直接手動で選択してコピーしてください。');
          });
        }
      </script>
    </body>
    </html>
  `;
}
