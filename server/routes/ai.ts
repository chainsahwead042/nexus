import { Router } from "express";
import { extractUserId, AuthRequest } from "../middleware/auth.js";
import { db } from "../services/firebase.js";
import { categorizeMessage, extractRequirements, runAgentLoop } from "../services/aiAgent.js";
import {
  collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, getDocs, query, orderBy
} from "firebase/firestore";

const router = Router();

router.post("/categorize", extractUserId, async (req: AuthRequest, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "content required" });
    const result = await categorizeMessage(content);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tasks", extractUserId, async (req: AuthRequest, res) => {
  const { messageId, content, repo } = req.body;
  const userId = req.userId!;

  if (!content) return res.status(400).json({ error: "content required" });

  try {
    const requirements = await extractRequirements(content);

    const taskRef = await addDoc(collection(db, "users", userId, "tasks"), {
      requirements,
      status: "analyzing",
      userId,
      messageId: messageId || null,
      executionCount: 0,
      timestamp: serverTimestamp()
    });

    if (messageId) {
      await updateDoc(doc(db, "users", userId, "messages", messageId), {
        taskId: taskRef.id
      });
    }

    const userSnap = await getDoc(doc(db, "users", userId));
    const userData = userSnap.data() || {};
    const githubToken = userData.githubToken || null;

    const repoMatch = repo || content.match(/[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+/)?.[0] || null;

    res.json({ taskId: taskRef.id, requirements });

    runAgentLoop(requirements, taskRef.id, userId, repoMatch, githubToken).catch(err => {
      console.error("Agent loop error:", err);
      updateDoc(taskRef, { status: "failed", error: err.message }).catch(() => {});
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tasks", extractUserId, async (req: AuthRequest, res) => {
  try {
    const q = query(
      collection(db, "users", req.userId!, "tasks"),
      orderBy("timestamp", "desc")
    );
    const snap = await getDocs(q);
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
