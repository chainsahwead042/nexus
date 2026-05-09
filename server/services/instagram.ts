import axios from "axios";
import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { categorizeMessage } from "./aiAgent.js";

const GRAPH_API = "https://graph.facebook.com/v19.0";

export async function handleInstagramWebhook(body: any, userId: string) {
  try {
    const entry = body.entry?.[0];
    const messaging = entry?.messaging;
    if (!messaging?.length) return;

    for (const event of messaging) {
      if (!event.message?.text) continue;
      const content = event.message.text;
      const senderId = event.sender?.id;
      const aiResult = await categorizeMessage(content);

      await addDoc(collection(db, "users", userId, "messages"), {
        content,
        senderName: senderId || "Instagram User",
        platform: "instagram",
        category: aiResult.category,
        isNewClient: aiResult.isNewClient,
        summary: aiResult.summary,
        userId,
        timestamp: serverTimestamp(),
        processedByAI: true,
        rawData: { senderId, messageId: event.message.mid }
      });
    }
  } catch (err) {
    console.error("Instagram webhook error:", err);
  }
}

export async function fetchInstagramMessages(
  accessToken: string,
  userId: string
): Promise<number> {
  let count = 0;
  try {
    const meRes = await axios.get(`${GRAPH_API}/me`, {
      params: { access_token: accessToken, fields: "id,name" }
    });
    const igUserId = meRes.data.id;

    const convsRes = await axios.get(`${GRAPH_API}/${igUserId}/conversations`, {
      params: {
        access_token: accessToken,
        fields: "id,messages{message,from,created_time}",
        platform: "instagram",
        limit: 10
      }
    });

    const conversations = convsRes.data?.data || [];
    for (const conv of conversations) {
      const messages = conv.messages?.data || [];
      for (const msg of messages.slice(0, 5)) {
        if (!msg.message) continue;
        const content = msg.message;
        const senderName = msg.from?.name || "Instagram User";
        const aiResult = await categorizeMessage(content);

        await addDoc(collection(db, "users", userId, "messages"), {
          content,
          senderName,
          platform: "instagram",
          category: aiResult.category,
          isNewClient: aiResult.isNewClient,
          summary: aiResult.summary,
          userId,
          timestamp: serverTimestamp(),
          processedByAI: true,
          rawData: { from: msg.from, createdTime: msg.created_time, convId: conv.id }
        });
        count++;
      }
    }
  } catch (err: any) {
    console.error("Instagram fetch error:", err.message);
    throw err;
  }
  return count;
}
