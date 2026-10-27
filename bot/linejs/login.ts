// deno-lint-ignore-file no-explicit-any
import { Client } from "@evex/linejs";
import { FileStorage } from "@evex/linejs/storage";

const STORAGE_PATH = "./storage.json";

export interface LoginResult {
    authToken?: string;
    pincode?: string;
}

export function loginWithEmail(email: string, password: string): Promise<LoginResult> {
    return new Promise((resolve, reject) => {
        try {
            const storage = new FileStorage(STORAGE_PATH);
            const client: any = new (Client as any)({ storage });

            let isResolved = false;

            const timeout = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    reject(new Error("LINE認証がタイムアウトしました。"));
                }
            }, 45000);

            // イベントリスナーの設定
            if (typeof client.on === "function") {
                client.on("pincode", (pin: any) => {
                    console.log(`[LINEJS] PIN Code Generated: ${String(pin)}`);
                    if (!isResolved) {
                        isResolved = true;
                        clearTimeout(timeout);
                        resolve({ pincode: String(pin) });
                    }
                });

                client.on("ready", () => {
                    console.log("[LINEJS] Login Ready!");
                    if (!isResolved) {
                        isResolved = true;
                        clearTimeout(timeout);
                        if (client.authToken) {
                            resolve({ authToken: client.authToken });
                        } else {
                            reject(new Error("AuthTokenの取得に失敗しました。"));
                        }
                    }
                });

                client.on("error", (err: any) => {
                    console.error("[LINEJS Error]", err);
                    if (!isResolved) {
                        isResolved = true;
                        clearTimeout(timeout);
                        const msg = err instanceof Error ? err.message : String(err);
                        reject(new Error(`LINE認証エラー: ${msg}`));
                    }
                });
            }

            // 利用可能なログインメソッドを安全に探索して実行
            let loginFn: Function | null = null;
            if (typeof client.login === "function") {
                loginFn = () => client.login({ email, password });
            } else if (typeof client.loginWithEmail === "function") {
                loginFn = () => client.loginWithEmail(email, password);
            } else if (typeof client.loginWithCredential === "function") {
                loginFn = () => client.loginWithCredential({ email, password });
            }

            if (loginFn) {
                loginFn().catch((err: any) => {
                    if (!isResolved) {
                        isResolved = true;
                        clearTimeout(timeout);
                        const msg = err instanceof Error ? err.message : String(err);
                        reject(new Error(`ログイン失敗: ${msg}`));
                    }
                });
            } else {
                clearTimeout(timeout);
                reject(new Error("LINEJS v3.4.2 では Eメール認証関数が提供されていません。『トークン手動確認/コピー』タブから AuthToken を入力・保持してください。"));
            }

        } catch (err: any) {
            const msg = err instanceof Error ? err.message : String(err);
            reject(new Error(`初期化エラー: ${msg}`));
        }
    });
}

function getAuthToken(): string {
    const token = Deno.env.get("LINE_AUTH_TOKEN")?.trim();
    if (!token) {
        throw new Error("LINE_AUTH_TOKEN が設定されていません。");
    }
    return token;
}

function main(): void {
    console.log("LINEJS Session Engine loaded.");
}

if (import.meta.main) {
    main();
}