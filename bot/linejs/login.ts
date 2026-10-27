import { Client } from "@evex/linejs";
import { FileStorage } from "@evex/linejs/storage";

const STORAGE_PATH = "./storage.json";

/**
 * Eメールとパスワードを使用してLINEJSログインを行い、AuthTokenを取得する関数
 */
export function loginWithEmail(email: string, password: string): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const storage = new FileStorage(STORAGE_PATH);
            // LINEJS Client の型チェックエラーを回避して安全に初期化
            const client = new Client() as any;

            const timeout = setTimeout(() => {
                reject(new Error("ログイン処理がタイムアウトしました。"));
            }, 60000);

            if (typeof client.on === "function") {
                client.on("pincode", (pin: string) => {
                    console.log(`[LINEJS] PIN Code: ${pin}`);
                });

                client.on("ready", () => {
                    clearTimeout(timeout);
                    if (client.authToken) {
                        resolve(client.authToken);
                    } else {
                        reject(new Error("AuthTokenの取得に失敗しました。"));
                    }
                });

                client.on("error", (err: unknown) => {
                    clearTimeout(timeout);
                    reject(err instanceof Error ? err : new Error(String(err)));
                });
            }

            if (typeof client.login === "function") {
                client.login({ email, password, storage }).catch((err: any) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            } else if (typeof client.loginWithAuthCredential === "function") {
                client.loginWithAuthCredential({ email, password }).catch((err: any) => {
                    clearTimeout(timeout);
                    reject(err);
                });
            } else {
                clearTimeout(timeout);
                reject(new Error("LINEJS Client のログイン機能の呼び出しに失敗しました。"));
            }
        } catch (err) {
            reject(err);
        }
    });
}

function getAuthToken(): string {
    const token = Deno.env.get("LINE_AUTH_TOKEN")?.trim();
    if (!token) {
        throw new Error("LINE_AUTH_TOKEN が設定されていません。.env の設定を確認してください。");
    }
    return token;
}

function main(): void {
    console.log("====================================");
    console.log(" LINEJS セッション確認");
    console.log("====================================");

    try {
        const authToken = getAuthToken();
        const storage = new FileStorage(STORAGE_PATH);
        console.log("認証情報を読み込みました。");
        console.log(`ストレージ: ${STORAGE_PATH}`);
        console.log(`トークン設定: ${authToken.length > 0 ? "あり" : "なし"}`);
        void storage;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("処理に失敗しました:", message);
        Deno.exitCode = 1;
    }
}

if (import.meta.main) {
    main();
}