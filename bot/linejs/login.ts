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

        console.log("ログイン処理を開始します...");

        // loginWithPassword はスマホでPINが入力されるまで自動で待機してくれます
        await loginWithPassword(client, {
            email,
            password,
            fetch: globalThis.fetch.bind(globalThis),
            onPincode: (pin: string) => {
                console.log(`\n=================================================`);
                console.log(`📱 【重要】スマホのLINEアプリを開いてください！`);
                console.log(`本人確認画面が表示されたら、以下のPINコードを入力してください:`);
                console.log(`👉  [ ${pin} ]  👈`);
                console.log(`※入力が終わるまで、このプログラムは待機します...`);
                console.log(`=================================================\n`);
            }
        });

        // スマホで正しくPINが入力されると、待機が解除されてここに進みます
        console.log("✅ スマホでの認証が確認できました！連携処理を完了します...");

        const token = (client as any).authToken || (client as any).token || (client as any).base?.authToken;
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
    console.log("LINEJS Session Engine loaded with jsr:@evex/linejs@3.4.2");
}

if (import.meta.main) {
    main();
}