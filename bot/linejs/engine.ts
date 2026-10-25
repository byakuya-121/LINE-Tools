const PREFIX = "$<";

export async function handleSelfBotCommand(msg: any, client: any, ownerUserId: string): Promise<void> {
  try {
    const text = msg.content || msg.text || msg.raw?.message?.text || msg.raw?.text || "";
    
    if (text) {
      console.log(`[OC_DEBUG] メッセージ受信: "${text}"`);
    }

    if (!text.startsWith(PREFIX)) return;

    const senderMid = msg.author?.mid || msg.senderMemberMid || msg.raw?.message?.from || "不明";
    const args = text.slice(PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase() || "";

    console.log(`[OC_CMD] コマンド検知: ${commandName} (送信者: ${senderMid})`);

    switch (commandName) {
      case "test": {
        await msg.reply("👍 オープンチャットセルフBotの応答テスト正常です！");
        console.log("[OC_CMD] test コマンドに返信しました。");
        break;
      }
      case "myid": {
        await msg.reply(`👤 あなたの MID:\n${senderMid}`);
        break;
      }
      case "status": {
        await msg.reply(`🟢 セルフBot稼働中\nSender: ${senderMid}`);
        break;
      }
      case "ping": {
        const start = Date.now();
        await msg.reply(`🏓 pong!\n応答速度: ${Date.now() - start}ms`);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[OC_ENGINE_ERROR] 処理エラー:", err);
  }
}

export async function getLineJsStatusText(userId: string): Promise<string> {
  return `🟢 セルフBotステータス: 稼働中 (Target User: ${userId})`;
}
