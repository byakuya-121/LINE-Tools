import { loginWithPassword } from "jsr:@evex/linejs@3.4.2";
import { FileStorage } from "jsr:@evex/linejs@3.4.2/storage";
import { dirname, join } from "https://deno.land/std/path/mod.ts";

const STORAGE_PATH = "./storage.json";

/* =========================================================
   Token/.env 保存処理
========================================================= */
async function saveTokenToEnv(token: string): Promise<void> {
    try {
        const envPath = join(Deno.cwd(), "Token", ".env");
        const dirPath = dirname(envPath);

        await Deno.mkdir(dirPath, { recursive: true });

        let content = "";
        try {
            content = await Deno.readTextFile(envPath);
        } catch {
            // ファイルが存在しない場合は空文字のまま継続
        }

        const key = "LINE_AUTH_TOKEN";
        const newLine = `${key}="${token}"`;
        const regex = new RegExp(`^${key}=.*$`, "m");

        if (regex.test(content)) {
            content = content.replace(regex, newLine);
        } else {
            content = content.trim()
                ? `${content.trim()}\n${newLine}\n`
                : `${newLine}\n`;
        }

        await Deno.writeTextFile(envPath, content);
        console.log(`\n✅ [Success] Token/.env に最新トークンを自動保存しました。`);
    } catch (err) {
        console.error(`❌ [Error] Token/.env 保存失敗:`, err instanceof Error ? err.message : String(err));
    }
}

/* =========================================================
   メイン ログイン処理
========================================================= */
async function main() {
    console.log("==========================================");
    console.log(" 🚀 LINE 認証 & AuthToken 取得スクリプト");
    console.log("==========================================\n");

    // コンソールからメールアドレスとパスワードを取得
    const email = prompt("📧 メールアドレスを入力してください:")?.trim();
    const password = prompt("🔑 パスワードを入力してください:")?.trim();

    if (!email || !password) {
        console.error("❌ メールアドレスとパスワードの両方を入力してください。");
        Deno.exit(1);
    }

    console.log("\n🔄 LINE サーバーへ接続試行中...");

    try {
        const storage = new FileStorage(STORAGE_PATH);

        // loginWithPassword を使用してログインを実行
        const client = await loginWithPassword({
            email,
            password,
            storage,
            onPincode: (pin: string) => {
                console.log("\n==========================================");
                console.log("🔥 スマホのLINEアプリを開き、以下のPINコードを入力してください");
                console.log(`👉  [ PIN CODE ]:  ${pin}`);
                console.log("==========================================\n");
            },
        });

        // ログイン完了後の Token 取得
        const authToken = (client as any).authToken || (client as any).token || "";

        console.log("\n==========================================");
        console.log("🎉 ログインに成功しました！");
        console.log(`🔑 AuthToken: ${authToken}`);
        console.log("==========================================");

        if (authToken) {
            await saveTokenToEnv(authToken);
        } else {
            console.warn("⚠️ Tokenの取得に失敗したか、プロパティが存在しません。");
        }

        // ログインユーザーの基本情報を取得・表示
        if (typeof (client as any).getProfile === "function") {
            const profile = await (client as any).getProfile();
            console.log(`👤 ログインユーザー: ${profile?.displayName || "不明"}`);
        }

    } catch (err) {
        console.error("\n❌ ログイン中にエラーが発生しました:");
        console.error(err instanceof Error ? err.message : String(err));
    }
}

// 実行
if (import.meta.main) {
    await main();
}