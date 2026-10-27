import { Client } from "@evex/linejs";
import { FileStorage } from "@evex/linejs/storage";

const STORAGE_PATH = "./storage.json";

interface LineClientInterface {
    on?: (event: string, listener: (...args: unknown[]) => void) => void;
    login?: (opts: unknown) => Promise<unknown>;
    loginWithAuthCredential?: (opts: unknown) => Promise<unknown>;
    authToken?: string;
}

/**
 * Eメールとパスワードを使用してLINEJSログインを行い、AuthTokenを取得する関数
 */
export function loginWithEmail(email: string, password: string): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const storage = new FileStorage(STORAGE_PATH);
            
            // Clientコンストラクタの引数要求とdeno-lintのno-explicit-anyを回避
            const clientCtor = Client as unknown as new (opts: unknown) => unknown;
            const rawClient = new clientCtor({ storage });
            const client = rawClient as LineClientInterface;

            const timeout = setTimeout(() => {
                reject(new Error("ログイン処理がタイムアウトしました。"));
            }, 60000);

            if (typeof client.on === "function") {
                client.on("pincode", (pin: unknown) => {
                    console.log(`[LINEJS] PIN Code: ${String(pin)}`);
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
                client.login({ email, password, storage }).catch((err: unknown) => {
                    clearTimeout(timeout);
                    reject(err instanceof Error ? err : new Error(String(err)));
                });
            } else if (typeof client.loginWithAuthCredential === "function") {
                client.loginWithAuthCredential({ email, password }).catch((err: unknown) => {
                    clearTimeout(timeout);
                    reject(err instanceof Error ? err : new Error(String(err)));
                });
            } else {
                clearTimeout(timeout);
                reject(new Error("LINEJS Client のログイン機能の呼び出しに失敗しました。"));
            }
        } catch (err: unknown) {
            reject(err instanceof Error ? err : new Error(String(err)));
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