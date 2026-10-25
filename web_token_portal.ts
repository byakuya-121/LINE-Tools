import { loginWithPassword } from "jsr:@evex/linejs@^3.4.2";
import { FileStorage } from "jsr:@evex/linejs@^3.4.2/storage";

let state = {
  status: "IDLE",
  message: "メールアドレスとパスワードを入力して「AuthToken を発行」を押してください。",
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
      state.message = "🎉 認証が成功し、AuthToken が正常に取得・保存されました！";
    }
  } catch (err: any) {
    console.error("[-] 認証エラー:", err);
    state.status = "ERROR";
    const reason = err?.data?.reason || err?.message || String(err);
    state.message = `❌ 認証エラー: ${reason}`;
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

  const html = `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>LINE AuthToken 発行ポータル</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        :root {
          --primary: #00B900;
          --primary-hover: #009900;
          --bg-dark: #0f172a;
          --card-bg: rgba(30, 41, 59, 0.7);
          --border: rgba(255, 255, 255, 0.1);
          --text-main: #f8fafc;
          --text-sub: #94a3b8;
        }

        * {
          box-sizing: border-box;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        body {
          background: #0f172a;
          background-image: 
            radial-gradient(at 0% 0%, rgba(0, 185, 0, 0.15) 0px, transparent 50%),
            radial-gradient(at 100% 100%, rgba(14, 165, 233, 0.15) 0px, transparent 50%);
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          padding: 24px;
          color: var(--text-main);
        }

        .card {
          background: var(--card-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          width: 100%;
          max-width: 440px;
          padding: 40px 32px;
          border-radius: 24px;
          border: 1px solid var(--border);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          text-align: center;
          animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .icon-badge {
          width: 56px;
          height: 56px;
          background: rgba(0, 185, 0, 0.15);
          border: 1px solid rgba(0, 185, 0, 0.3);
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-bottom: 20px;
        }

        h2 {
          margin: 0 0 8px 0;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        p.desc {
          color: var(--text-sub);
          font-size: 14px;
          margin: 0 0 32px 0;
          line-height: 1.5;
        }

        .field {
          text-align: left;
          margin-bottom: 20px;
        }

        label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-sub);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }

        input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border);
          border-radius: 12px;
          font-size: 15px;
          color: var(--text-main);
          outline: none;
          transition: all 0.2s ease;
        }

        input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(0, 185, 0, 0.2);
          background: rgba(15, 23, 42, 0.8);
        }

        button {
          width: 100%;
          background: var(--primary);
          color: #ffffff;
          border: none;
          padding: 16px;
          font-size: 15px;
          font-weight: 700;
          border-radius: 12px;
          cursor: pointer;
          margin-top: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(0, 185, 0, 0.3);
        }

        button:hover {
          background: var(--primary-hover);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(0, 185, 0, 0.4);
        }

        button:active {
          transform: translateY(0);
        }

        button:disabled {
          background: #334155;
          color: #64748b;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }

        .status-box {
          margin-top: 28px;
          padding: 16px;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid var(--border);
          font-size: 13px;
          color: var(--text-sub);
          line-height: 1.6;
          word-break: break-all;
        }

        .pincode-box {
          display: none;
          margin-top: 24px;
          background: rgba(0, 185, 0, 0.08);
          border: 1px solid rgba(0, 185, 0, 0.3);
          border-radius: 16px;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }

        .pincode-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .pincode-val {
          font-size: 42px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 10px;
          margin: 12px 0 4px 0;
          text-shadow: 0 0 20px rgba(0, 185, 0, 0.5);
        }

        .token-box {
          display: none;
          margin-top: 24px;
          text-align: left;
          animation: fadeIn 0.3s ease;
        }

        .token-val {
          background: #090d16;
          color: #38edf8;
          padding: 14px;
          border-radius: 12px;
          border: 1px solid var(--border);
          font-family: 'JetBrains Mono', Consolas, monospace;
          font-size: 12px;
          word-break: break-all;
          max-height: 120px;
          overflow-y: auto;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon-badge">🔑</div>
        <h2>LINE AuthToken ポータル</h2>
        <p class="desc">LINE アカウント連携を行い AuthToken を安全に発行します</p>

        <div class="field">
          <label>メールアドレス</label>
          <input type="email" id="email" placeholder="example@gmail.com" autocomplete="off">
        </div>

        <div class="field">
          <label>パスワード</label>
          <input type="password" id="password" placeholder="••••••••">
        </div>

        <button id="submit-btn" onclick="startLogin()">AuthToken を発行</button>

        <div class="status-box" id="msg-text">メールアドレスとパスワードを入力して「AuthToken を発行」を押してください。</div>

        <div class="pincode-box" id="pin-area">
          <div class="pincode-title">LINE アプリで PIN コードを入力してください</div>
          <div class="pincode-val" id="pin-code">----</div>
        </div>

        <div class="token-box" id="token-area">
          <label>発行済み AuthToken</label>
          <div class="token-val" id="token-text"></div>
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
              body: JSON.stringify({ email: email, password: password })
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
      </script>
    </body>
    </html>
  `;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
});