import { Router, Request, Response } from "express";
import { extractUserId, AuthRequest } from "../middleware/auth.js";
import { db } from "../services/firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { startTelegramPolling, stopTelegramPolling } from "../services/telegram.js";
import { fetchEmails } from "../services/email.js";
import { handleWhatsAppWebhook, fetchRecentWhatsAppMessages } from "../services/whatsapp.js";
import { handleInstagramWebhook, fetchInstagramMessages } from "../services/instagram.js";

const router = Router();

router.post("/settings", extractUserId, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const {
    githubToken,
    telegramBotToken,
    whatsappPhoneId, whatsappToken,
    instaToken,
    emailUser, emailPass, imapHost
  } = req.body;

  try {
    const update: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (githubToken !== undefined) update.githubToken = githubToken;
    if (telegramBotToken !== undefined) update.telegramBotToken = telegramBotToken;
    if (whatsappPhoneId !== undefined) update.whatsappPhoneId = whatsappPhoneId;
    if (whatsappToken !== undefined) update.whatsappToken = whatsappToken;
    if (instaToken !== undefined) update.instaToken = instaToken;
    if (emailUser !== undefined) update.emailUser = emailUser;
    if (emailPass !== undefined) update.emailPass = emailPass;
    if (imapHost !== undefined) update.imapHost = imapHost;

    await setDoc(doc(db, "users", userId), update, { merge: true });

    if (telegramBotToken) {
      startTelegramPolling(userId, telegramBotToken).catch(err =>
        console.error("Telegram start error:", err.message)
      );
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/settings", extractUserId, async (req: AuthRequest, res) => {
  try {
    const snap = await getDoc(doc(db, "users", req.userId!));
    if (!snap.exists()) return res.json({});
    const data = snap.data();
    const safe = {
      hasGithub: !!data.githubToken,
      hasTelegram: !!data.telegramBotToken,
      hasWhatsapp: !!(data.whatsappPhoneId && data.whatsappToken),
      hasInstagram: !!data.instaToken,
      hasEmail: !!(data.emailUser && data.emailPass),
      emailUser: data.emailUser || "",
      imapHost: data.imapHost || "imap.gmail.com",
      whatsappPhoneId: data.whatsappPhoneId || ""
    };
    res.json(safe);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/sync/email", extractUserId, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  try {
    const snap = await getDoc(doc(db, "users", userId));
    const data = snap.data() || {};
    if (!data.emailUser || !data.emailPass) {
      return res.status(400).json({ error: "Email not configured" });
    }
    const count = await fetchEmails(userId, data.emailUser, data.emailPass, data.imapHost);
    res.json({ success: true, fetched: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/sync/whatsapp", extractUserId, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  try {
    const snap = await getDoc(doc(db, "users", userId));
    const data = snap.data() || {};
    if (!data.whatsappPhoneId || !data.whatsappToken) {
      return res.status(400).json({ error: "WhatsApp not configured" });
    }
    const count = await fetchRecentWhatsAppMessages(data.whatsappPhoneId, data.whatsappToken, userId);
    res.json({ success: true, fetched: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/sync/instagram", extractUserId, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  try {
    const snap = await getDoc(doc(db, "users", userId));
    const data = snap.data() || {};
    if (!data.instaToken) {
      return res.status(400).json({ error: "Instagram not configured" });
    }
    const count = await fetchInstagramMessages(data.instaToken, userId);
    res.json({ success: true, fetched: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// WhatsApp webhook verification
router.get("/webhook/whatsapp", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "nexus_ai_webhook";
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// WhatsApp webhook events - needs userId mapping via phoneNumberId
router.post("/webhook/whatsapp", async (req: Request, res: Response) => {
  res.sendStatus(200);
  const userId = req.query.userId as string;
  if (userId) {
    handleWhatsAppWebhook(req.body, userId).catch(console.error);
  }
});

router.post("/webhook/instagram", async (req: Request, res: Response) => {
  res.sendStatus(200);
  const userId = req.query.userId as string;
  if (userId) {
    handleInstagramWebhook(req.body, userId).catch(console.error);
  }
});

export default router;
