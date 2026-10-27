// deno-lint-ignore-file no-explicit-any
// jsr: プレフィックスを削除し、deno.json のエイリアスを使用
import { loginWithPassword } from "@evex/linejs";
import { FileStorage } from "@evex/linejs/storage";

const STORAGE_PATH = "./storage.json";

export interface LoginResult {
    authToken?: string;
    pincode?: string;
}

export async function loginWithEmail(email: string, password: string): Promise<LoginResult> {
    try {
        const storage = new FileStorage(STORAGE_PATH);

        console.log("ログイン処理を開始します...");

        // 第1引数: ログイン情報 (email, password, onPincodeRequest)
        // 第2引数: 初期化オプション (storage, device, fetch)
        const client: any = await loginWithPassword(
            {
                email,
                password,
                onPincodeRequest: (pin: string) => {
                    console.log(`\n=================================================`);
                    console.log(`📱 【重要】スマホのLINEアプリを開いてください！`);
                    console.log(`本人確認画面が表示されたら、以下のPINコードを入力してください:`);
                    console.log(`👉  [ ${pin} ]  👈`);
                    console.log(`※入力が終わるまで、このプログラムは待機します...`);
                    console.log(`=================================================\n`);
                }
            },
            {
                storage,
                device: "IOSIPAD",
                fetch: globalThis.fetch.bind(globalThis)
            }
        );

        console.log("✅ スマホでの認証が確認できました！連携処理を完了します...");

        const token = client?.authToken || client?.token || client?.base?.authToken;
        if (token) {
            console.log("🎉 AuthTokenの取得に成功しました！");
            return { authToken: token };
        }

        throw new Error("認証は通過しましたが、AuthTokenの取得に失敗しました。");
    } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`LINE認証エラー: ${msg}`);
    }
}

function main(): void {
    console.log("LINEJS Session Engine loaded");
}

if (import.meta.main) {
    main();
}