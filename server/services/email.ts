import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { categorizeMessage } from "./aiAgent.js";

export async function fetchEmails(
  userId: string,
  emailUser: string,
  emailPass: string,
  imapHost: string = "imap.gmail.com",
  imapPort: number = 993
): Promise<number> {
  const config = {
    imap: {
      user: emailUser,
      password: emailPass,
      host: imapHost,
      port: imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000
    }
  };

  let connection: imaps.ImapSimple | null = null;
  let count = 0;

  try {
    connection = await imaps.connect(config);
    await connection.openBox("INBOX");

    const searchCriteria = ["UNSEEN"];
    const fetchOptions = {
      bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT", ""],
      markSeen: false
    };

    const messages = await connection.search(searchCriteria, fetchOptions);

    for (const msg of messages.slice(0, 20)) {
      try {
        const allParts = msg.parts.find((p: any) => p.which === "");
        if (!allParts) continue;

        const parsed = await simpleParser(allParts.body);
        const htmlText = typeof parsed.html === "string" ? parsed.html.replace(/<[^>]+>/g, " ") : "";
        const content = parsed.text || htmlText || "[empty email]";
        const fromAddr = parsed.from?.text || "Unknown";
        const subject = parsed.subject || "(no subject)";

        const fullContent = `Subject: ${subject}\n\n${content}`.slice(0, 2000);
        const aiResult = await categorizeMessage(fullContent);

        const q = query(
          collection(db, "users", userId, "messages"),
          where("platform", "==", "email"),
          where("rawData.messageId", "==", String(msg.attributes.uid))
        );
        const existing = await getDocs(q);
        if (!existing.empty) continue;

        await addDoc(collection(db, "users", userId, "messages"), {
          content: fullContent,
          senderName: fromAddr,
          platform: "email",
          category: aiResult.category,
          isNewClient: aiResult.isNewClient,
          summary: aiResult.summary,
          userId,
          timestamp: serverTimestamp(),
          processedByAI: true,
          rawData: {
            messageId: String(msg.attributes.uid),
            subject,
            from: fromAddr,
            date: parsed.date
          }
        });
        count++;
      } catch (parseErr) {
        console.error("Email parse error:", parseErr);
      }
    }
  } catch (err) {
    console.error("IMAP connection error:", err);
    throw err;
  } finally {
    if (connection) connection.end();
  }

  return count;
}
