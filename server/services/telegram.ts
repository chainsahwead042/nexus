import TelegramBot from "node-telegram-bot-api";
import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { categorizeMessage } from "./aiAgent.js";

const activeBots = new Map<string, TelegramBot>();

export async function startTelegramPolling(userId: string, botToken: string) {
  if (activeBots.has(userId)) {
    activeBots.get(userId)!.stopPolling();
  }

  const bot = new TelegramBot(botToken, { polling: true });
  activeBots.set(userId, bot);

  bot.on("message", async (msg) => {
    try {
      const content = msg.text || msg.caption || "[media message]";
      const senderName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ")
        || msg.from?.username
        || "Unknown";

      const aiResult = await categorizeMessage(content);

      await addDoc(collection(db, "users", userId, "messages"), {
        content,
        senderName,
        platform: "telegram",
        category: aiResult.category,
        isNewClient: aiResult.isNewClient,
        summary: aiResult.summary,
        userId,
        timestamp: serverTimestamp(),
        processedByAI: true,
        rawData: {
          chatId: msg.chat.id,
          messageId: msg.message_id,
          from: msg.from
        }
      });
    } catch (err) {
      console.error("Telegram message handler error:", err);
    }
  });

  bot.on("polling_error", (err) => {
    console.error("Telegram polling error:", err.message);
  });

  return bot;
}

export function stopTelegramPolling(userId: string) {
  if (activeBots.has(userId)) {
    activeBots.get(userId)!.stopPolling();
    activeBots.delete(userId);
  }
}
