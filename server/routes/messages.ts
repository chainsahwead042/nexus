import { Router } from "express";
import { extractUserId, AuthRequest } from "../middleware/auth.js";
import { db } from "../services/firebase.js";
import {
  collection, query, orderBy, getDocs, addDoc, serverTimestamp,
  doc, updateDoc, deleteDoc
} from "firebase/firestore";

const router = Router();

router.get("/", extractUserId, async (req: AuthRequest, res) => {
  try {
    const q = query(
      collection(db, "users", req.userId!, "messages"),
      orderBy("timestamp", "desc")
    );
    const snap = await getDocs(q);
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", extractUserId, async (req: AuthRequest, res) => {
  try {
    await deleteDoc(doc(db, "users", req.userId!, "messages", req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/results", extractUserId, async (req: AuthRequest, res) => {
  try {
    const q = query(
      collection(db, "users", req.userId!, "results"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/results/:id/read", extractUserId, async (req: AuthRequest, res) => {
  try {
    await updateDoc(doc(db, "users", req.userId!, "results", req.params.id), { read: true });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
