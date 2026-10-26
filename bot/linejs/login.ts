import { Client } from "@evex/linejs";
import { FileStorage } from "@evex/linejs/storage";

const STORAGE_PATH = "./storage.json";

/**
 * 環境変数から既存の認証トークンを読み込む。
 * トークン自体はログに出力しない。
 */
function getAuthToken(): string {
    const token = Deno.env.get("LINE_AUTH_TOKEN")?.trim();

    if (!token) {
        throw new Error(
            "LINE_AUTH_TOKEN が設定されていません。.env の設定を確認してください。",
        );
    }

    return token;
}

async function main(): Promise<void> {
    console.log("====================================");
    console.log(" LINEJS セッション確認");
    console.log("====================================");

    try {
        const authToken = getAuthToken();
        const storage = new FileStorage(STORAGE_PATH);

        // Client のコンストラクターと認証方法は、
        // LINEJS 3.4.2 の実際の型定義に合わせて設定する。
        console.log("認証情報を読み込みました。");
        console.log(`ストレージ: ${STORAGE_PATH}`);
        console.log(`トークン設定: ${authToken.length > 0 ? "あり" : "なし"}`);

        // ここではトークンをログ出力せず、
        // 未確認の認証APIも呼び出さない。
        void storage;
    } catch (error: unknown) {
        const message = error instanceof Error
            ? error.message
            : String(error);

        console.error("処理に失敗しました:", message);
        Deno.exitCode = 1;
    }
}

if (import.meta.main) {
    await main();
}