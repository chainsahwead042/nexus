import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc } from "firebase/firestore";
import { db, auth } from "../../backend/lib/firebase";
import { useAuth } from "../../backend/lib/AuthContext";
import { categorizeMessage, extractRequirements } from "../../backend/services/aiService";
import { MessageCircle, Mail, Instagram, User, AlertCircle, CheckCircle2, ChevronRight, Bot, Loader2, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import api from "../utils/api";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Message {
  id: string;
  content: string;
  senderName: string;
  category: "client" | "relative" | "undetermined";
  platform: "whatsapp" | "instagram" | "email";
  timestamp: any;
  isNewClient?: boolean;
  taskId?: string;
  userId: string;
}

export function UnifiedInbox() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<"all" | "client" | "relative">("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const [executingMessageId, setExecutingMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const path = `users/${user.uid}/messages`;
    const q = query(
      collection(db, "users", user.uid, "messages"),
      orderBy("timestamp", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  }, [user]);

  const simulateIncoming = async () => {
    if (!user) return;
    setIsProcessing(true);
    const path = `users/${user.uid}/messages`;
    
    try {
      const samples = [
        { name: "John Doe", content: "Hey! I saw your portfolio and want to hire you for a React project. Can we discuss budget?", platform: "email" },
        { name: "Aunty Sarah", content: "Happy birthday dear! Hope you are doing well. Come visit us soon.", platform: "whatsapp" },
        { name: "Tech Startup", content: "We need some changes on our landing page. Specifically the hero section is looking odd on mobile. Here is the repo: octocat/Hello-World", platform: "instagram" },
      ];

      const sample = samples[Math.floor(Math.random() * samples.length)];
      const aiResult = await categorizeMessage(sample.content);

      await addDoc(collection(db, "users", user.uid, "messages"), {
        ...sample,
        ...aiResult,
        userId: user.uid,
        timestamp: serverTimestamp(),
        processedByAI: true
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartTask = async (message: Message) => {
    if (!user) return;
    setExecutingMessageId(message.id);

    try {
      const requirements = await extractRequirements(message.content);
      const tasksPath = `users/${user.uid}/tasks`;

      const taskRef = await addDoc(collection(db, "users", user.uid, "tasks"), {
        requirements,
        status: "analyzing",
        userId: user.uid,
        messageId: message.id,
        executionCount: 0,
        timestamp: serverTimestamp(),
      });

      await updateDoc(doc(db, "users", user.uid, "messages", message.id), {
        taskId: taskRef.id
      });

      await updateDoc(taskRef, { status: "executing", executionCount: 1 });
      
      const repoMatch = message.content.match(/[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+/);
      const repo = repoMatch ? repoMatch[0] : null;

      const userSnap = await getDoc(doc(db, "users", user.uid));
      const githubToken = userSnap.data()?.githubToken;

      if (repo && githubToken) {
        const response = await api.post("/api/github/execute", {
          token: githubToken,
          repo,
          requirements
        });
        
        await updateDoc(taskRef, { 
          status: "completed", 
          githubPrUrl: response.data.prUrl,
          timestamp: serverTimestamp()
        });
      } else {
        setTimeout(async () => {
          await updateDoc(taskRef, { 
            status: "completed", 
            githubPrUrl: "https://github.com/simulated/pull/1",
            timestamp: serverTimestamp()
          });
        }, 3000);
      }

    } catch (error) {
      console.error("Task Start Error:", error);
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setExecutingMessageId(null);
    }
  };

  const filteredMessages = messages.filter(m => filter === "all" || m.category === filter);

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between glass p-2 rounded-[2rem] border-white/5 border-2">
        <div className="flex gap-1">
          {["all", "client", "relative"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
                filter === f ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "text-white/30 hover:text-white/60"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button 
          onClick={simulateIncoming}
          disabled={isProcessing}
          className="flex items-center gap-3 bg-white text-black px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-20"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Bot className="w-4 h-4 text-black" />}
          Receive Signal
        </button>
      </div>

      <div className="grid gap-6">
        <AnimatePresence mode="popLayout">
          {filteredMessages.map((msg) => (
            <motion.div
              layout
              key={msg.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass p-10 rounded-[2.5rem] border-white/10 flex gap-8 items-start card-hover group"
            >
              <div className="p-5 rounded-[1.5rem] bg-white/5 border border-white/10 text-white shadow-xl">
                {msg.platform === 'whatsapp' && <MessageCircle className="w-6 h-6 opacity-40 group-hover:opacity-100 transition-opacity" />}
                {msg.platform === 'instagram' && <Instagram className="w-6 h-6 opacity-40 group-hover:opacity-100 transition-opacity" />}
                {msg.platform === 'email' && <Mail className="w-6 h-6 opacity-40 group-hover:opacity-100 transition-opacity" />}
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-lg tracking-tighter text-white uppercase italic">{msg.senderName}</span>
                      <span className="text-[9px] font-black text-white/20 tracking-widest bg-white/5 px-2 py-0.5 rounded uppercase">{msg.platform}</span>
                    </div>
                    {msg.category === 'client' && (
                      <span className={`inline-block px-3 py-1 rounded-full text-[8px] font-black tracking-[0.3em] uppercase border ${
                        msg.isNewClient ? 'border-white/20 text-white/60 bg-white/10' : 'border-white/5 text-white/30'
                      }`}>
                        {msg.isNewClient ? 'New Acquisition' : 'Existing Client'}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-white/10 italic">
                    {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Receiving...'}
                  </span>
                </div>
                
                <p className="text-white/40 text-sm leading-relaxed mb-8 max-w-2xl group-hover:text-white/60 transition-colors">{msg.content}</p>
                
                {msg.category === 'client' && (
                  <div className={`rounded-3xl p-6 flex items-center justify-between border transition-all duration-700 ${
                    msg.taskId ? 'bg-white/5 border-white/20' : 'bg-black/20 border-white/5'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl border transition-all duration-700 ${msg.taskId ? 'bg-white text-black' : 'bg-white/5 border-white/10 text-white/20'}`}>
                        {msg.taskId ? <CheckCircle2 className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                      </div>
                      <div>
                        <span className="font-black text-[11px] block text-white uppercase tracking-widest">
                          {msg.taskId ? 'In Play' : 'Analysis Pattern Ready'}
                        </span>
                        <span className="text-[10px] text-white/20 font-medium">
                          {msg.taskId ? 'Neural agent is processing requirements' : 'Ready to begin autonomous execution loop'}
                        </span>
                      </div>
                    </div>
                    {!msg.taskId && (
                      <button 
                        onClick={() => handleStartTask(msg)}
                        disabled={executingMessageId === msg.id}
                        className="bg-white text-black p-4 rounded-2xl hover:scale-110 active:scale-90 transition-all disabled:opacity-20 shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
                      >
                        {executingMessageId === msg.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredMessages.length === 0 && (
          <div className="text-center py-32 glass border-dashed border-2 rounded-[4rem]">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10 group hover:scale-105 transition-transform duration-700">
              <MessageSquare className="w-8 h-8 text-white/10 group-hover:text-white/30 transition-colors" />
            </div>
            <p className="text-white/20 text-xs font-black uppercase tracking-[0.4em]">No Signal Detected</p>
          </div>
        )}
      </div>
    </div>
  );
}
