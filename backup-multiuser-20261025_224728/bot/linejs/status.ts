import { getClientState } from "./client.ts";

export async function getLineJsStatus(): Promise<string> {
  const state = getClientState();

  return state.authenticated
    ? "LINEJS: 認証済み"
    : "LINEJS: 未認証（ログイン機能は未実装です）";
}
