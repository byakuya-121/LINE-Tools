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
                    reject(new Error("LINE認証がタイムアウトしました。スマホのログイン許可設定を確認してください。"));
                }
            }, 60000);

            // PINコード検知
            if (typeof client.on === "function") {
                client.on("pincode", (pin: any) => {
                    console.log(`[LINEJS] PIN Code Generated: ${String(pin)}`);
                    if (!isResolved) {
                        isResolved = true;
                        clearTimeout(timeout);
                        resolve({ pincode: String(pin) });
                    }
                });

                // ログイン成功
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

                // エラー発生
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

            // LINEJS v3.4.2 ログイン実行
            client.login({ email, password }).catch((err: any) => {
                if (!isResolved) {
                    isResolved = true;
                    clearTimeout(timeout);
                    const msg = err instanceof Error ? err.message : String(err);
                    reject(new Error(`ログイン失敗: ${msg}`));
                }
            });

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