import { getAllSessions } from "./linejs/session.ts";

type PortalStatus = "ONLINE" | "DEGRADED" | "OFFLINE";

interface SessionInfo {
  userId: string;
  startedAt: string;
  running: boolean;
}

interface PortalStatusResponse {
  status: PortalStatus;
  message: string;
  uptimeSeconds: number;
  startedAt: string;
  serverTime: string;
  sessionCount: number;
  sessions: SessionInfo[];
}

const serverStartedAt = Date.now();

function jsonResponse(
  data: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * サーバーの稼働状態と実際のセッション一覧を返す。
 *
 * ONLINE は、このモジュールが応答し、
 * セッション情報を取得できたことを示す。
 * LINE側との通信の正常性までは保証しない。
 */
export function getPortalStatus(): Response {
  try {
    const sessions = Array.from(getAllSessions().values());

    const sessionInfo: SessionInfo[] = sessions.map((session) => ({
      userId: session.userId,
      startedAt: session.startedAt.toISOString(),
      running: Boolean(session.client),
    }));

    const response: PortalStatusResponse = {
      status: "ONLINE",
      message: "ポータルAPIは正常に応答しています。",
      uptimeSeconds: Math.floor(
        (Date.now() - serverStartedAt) / 1000,
      ),
      startedAt: new Date(serverStartedAt).toISOString(),
      serverTime: new Date().toISOString(),
      sessionCount: sessionInfo.length,
      sessions: sessionInfo,
    };

    return jsonResponse(response);
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : String(error);

    console.error("[PORTAL_STATUS_ERROR]", message);

    return jsonResponse({
      status: "DEGRADED",
      message: "セッション情報を取得できませんでした。",
      serverTime: new Date().toISOString(),
      sessionCount: 0,
      sessions: [],
    }, 500);
  }
}

/**
 * Webポータルからのパスワード認証は受け付けない。
 *
 * 実際のLINEJS認証処理と連携していない状態で
 * PINやログイン成功を偽装しないための応答。
 */
export async function handlePortalLogin(
  _req: Request,
): Promise<Response> {
  return jsonResponse({
    status: "NOT_CONFIGURED",
    message:
      "Webポータルからのログインは未設定です。実際の認証処理との接続が必要です。",
  }, 501);
}