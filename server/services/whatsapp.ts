import axios from "axios";
import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { categorizeMessage } from "./aiAgent.js";

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

export async function handleWhatsAppWebhook(body: any, userId: string) {
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    const messages = changes?.messages;
    if (!messages?.length) return;

    for (const msg of messages) {
      const content = msg.text?.body || msg.caption || `[${msg.type} message]`;
      const contactInfo = changes.contacts?.find((c: any) => c.wa_id === msg.from);
      const senderName = contactInfo?.profile?.name || msg.from || "WhatsApp User";

      const aiResult = await categorizeMessage(content);

      await addDoc(collection(db, "users", userId, "messages"), {
        content,
        senderName,
        platform: "whatsapp",
        category: aiResult.category,
        isNewClient: aiResult.isNewClient,
        summary: aiResult.summary,
        userId,
        timestamp: serverTimestamp(),
        processedByAI: true,
        rawData: {
          messageId: msg.id,
          from: msg.from,
          type: msg.type,
          timestamp: msg.timestamp
        }
      });
    }
  } catch (err) {
    console.error("WhatsApp webhook handler error:", err);
  }
}

export async function sendWhatsAppMessage(
  phoneNumberId: string,
  token: string,
  to: string,
  message: string
) {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;
  await axios.post(url, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: message }
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
}

export async function fetchRecentWhatsAppMessages(
  phoneNumberId: string,
  token: string,
  userId: string
): Promise<number> {
  try {
    const res = await axios.get(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 20 }
    });
    const messages = res.data?.data || [];
    let count = 0;

    for (const msg of messages) {
      if (msg.type !== "text") continue;
      const content = msg.text?.body || "";
      const senderName = msg.from || "WhatsApp User";
      const aiResult = await categorizeMessage(content);

      await addDoc(collection(db, "users", userId, "messages"), {
        content,
        senderName,
        platform: "whatsapp",
        category: aiResult.category,
        isNewClient: aiResult.isNewClient,
        summary: aiResult.summary,
        userId,
        timestamp: serverTimestamp(),
        processedByAI: true,
        rawData: { messageId: msg.id, from: msg.from }
      });
      count++;
    }
    return count;
  } catch (err: any) {
    console.error("WhatsApp fetch error:", err.message);
    throw err;
  }
}
