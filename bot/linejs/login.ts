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
        const client = new Client({ storage });
        let detectedPin: string | null = null;

        // 第1引数に client インスタンス、第2引数にオプションを指定
        await loginWithPassword(client, {
            email,
            password,
            fetch: globalThis.fetch.bind(globalThis), // fetchエラー対策
            onPincode: (pin: string) => {
                console.log(`[LINEJS] PIN Code Generated: ${pin}`);
                detectedPin = pin;
            }
        }).catch((err: any) => {
            // 内部でPINコード入力待ち状態になった際に投げられる例外をキャッチ
            if (err?.pincode) {
                detectedPin = String(err.pincode);
                return;
            }
            throw err;
        });

        // コールバックまたは例外からPINを検知した場合
        if (detectedPin) {
            return { pincode: detectedPin };
        }

        // 認証成功時、トークンを取得
        const token = (client as any).authToken || (client as any).token || (client as any).base?.authToken;
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