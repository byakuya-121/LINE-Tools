// deno-lint-ignore-file no-explicit-any
import { Client, loginWithPassword } from "jsr:@evex/linejs@3.4.2";
import { FileStorage } from "jsr:@evex/linejs@3.4.2/storage";

const STORAGE_PATH = "./storage.json";

export interface LoginResult {
    authToken?: string;
    pincode?: string;
}

export async function loginWithEmail(email: string, password: string): Promise<LoginResult> {
    try {
        const storage = new FileStorage(STORAGE_PATH);
        const client: any = new (Client as any)({ storage });
        let detectedPin: string | null = null;

        // 第1引数に Client インスタンス、第2引数にログインオプションを渡して実行
        await loginWithPassword(client, {
            email,
            password,
            onPincode: (pin: string) => {
                console.log(`[LINEJS] PIN Code Generated: ${pin}`);
                detectedPin = pin;
            }
        }).catch((err: any) => {
            if (err?.pincode) {
                detectedPin = String(err.pincode);
                return null;
            }
            throw err;
        });

        if (detectedPin) {
            return { pincode: detectedPin };
        }

        const token = client?.authToken || client?.token || client?.base?.authToken;
        if (token) {
            return { authToken: token };
        }

        throw new Error("AuthTokenの取得に失敗しました。メールアドレスまたはパスワードを確認してください。");
    } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`LINE認証エラー: ${msg}`);
    }
}

function getAuthToken(): string {
    const token = Deno.env.get("LINE_AUTH_TOKEN")?.trim();
    if (!token) {
        throw new Error("LINE_AUTH_TOKEN が設定されていません。");
    }
    return token;
}

function main(): void {
    console.log("LINEJS Session Engine loaded with jsr:@evex/linejs@3.4.2");
}

if (import.meta.main) {
    main();
}