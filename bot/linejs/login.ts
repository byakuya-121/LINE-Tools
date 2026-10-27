// deno-lint-ignore-file no-explicit-any no-import-prefix
import { loginWithPassword } from "jsr:@evex/linejs@3.4.2";
import { FileStorage } from "jsr:@evex/linejs@3.4.2/storage";

const STORAGE_PATH = "./storage.json";

export interface LoginResult {
    authToken?: string;
    pincode?: string;
}

export async function loginWithEmail(email: string, password: string): Promise<LoginResult> {
    try {
        const storage = new FileStorage(STORAGE_PATH);

        console.log("ログイン処理を開始します...");

        // すべての設定を1つのオブジェクトにまとめて渡すのが正解です
        const client: any = await loginWithPassword({
            email,
            password,
            device: "IOSIPAD",
            storage: storage,
            fetch: globalThis.fetch.bind(globalThis),
            onPincodeRequest: (pin: string) => {
                console.log(`\n=================================================`);
                console.log(`📱 【重要】スマホのLINEアプリを開いてください！`);
                console.log(`本人確認画面が表示されたら、以下のPINコードを入力してください:`);
                console.log(`👉  [ ${pin} ]  👈`);
                console.log(`※入力が終わるまで、このプログラムは待機します...`);
                console.log(`=================================================\n`);
            }
        } as any);

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
    console.log("LINEJS Session Engine loaded with jsr:@evex/linejs@3.4.2");
}

if (import.meta.main) {
    main();
}