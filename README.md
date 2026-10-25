# LINE-Tools

Deno + TypeScript + LINE Messaging API + LINEJS 3.4.2

## 初期設定

1. `.env.example` を `.env` にコピーします。
2. `.env` にMessaging APIのチャネルシークレットとアクセストークンを設定します。
3. `deno task start` でWebhookサーバーを起動します。

## エンドポイント

- `GET /health` : 稼働確認
- `POST /webhook` : LINE Messaging API Webhook

## コマンド

- `!help`
- `!status`
- `!login-status`

## 注意

LINEJSログイン機能はまだ未実装です。
`bot/linejs/login.ts` はプレースホルダーです。
Webhookを外部から受信するにはHTTPSで公開されたURLが必要です。
認証情報やセッションファイルを公開しないでください。



.\cloudflared tunnel --url http://127.0.0.1:8000