/**
 * LINEJSクライアントの共有管理用モジュール。
 * 認証APIの接続は login.ts で実装します。
 */
export type LineJsClientState = {
  authenticated: boolean;
};

let state: LineJsClientState = {
  authenticated: false,
};

export function getClientState(): LineJsClientState {
  return { ...state };
}

export function setAuthenticated(value: boolean): void {
  state.authenticated = value;
}
