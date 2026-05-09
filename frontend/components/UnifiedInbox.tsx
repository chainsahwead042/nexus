import { useState, useEffect, useCallback } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../backend/lib/firebase";
import { useAuth } from "../../backend/lib/AuthContext";
import {
  MessageCircle, Mail, Instagram, Bot, Loader2, MessageSquare,
  Send, ChevronRight, CheckCircle2, RefreshCw, Filter
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import api from "../utils/api";

interface Message {
  id: string;
  content: string;
  senderName: string;
  category: "client" | "relative" | "undetermined";
  platform: "whatsapp" | "instagram" | "email" | "telegram";
  timestamp: any;
  isNewClient?: boolean;
  taskId?: string;
  summary?: string;
  userId: string;
}

const PlatformIcon = ({ platform }: { platform: string }) => {
  if (platform === "whatsapp") return <MessageCircle className="w-5 h-5" />;
  if (platform === "instagram") return <Instagram className="w-5 h-5" />;
  if (platform === "email") return <Mail className="w-5 h-5" />;
  if (platform === "telegram") return <Send className="w-5 h-5" />;
  return <MessageSquare className="w-5 h-5" />;
};

export function UnifiedInbox() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<"all" | "client" | "relative">("all");
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "messages"),
      orderBy("timestamp", "desc")
    );
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
    });
  }, [user]);

  const syncAll = async () => {
    setSyncing(true);
    const platforms = ["email", "whatsapp", "instagram"];
    await Promise.allSettled(platforms.map(p => api.post(`/platforms/sync/${p}`).catch(() => {})));
    setSyncing(false);
  };

  const handleStartTask = async (msg: Message) => {
    if (!user) return;
    setExecutingId(msg.id);
    try {
      await api.post("/ai/tasks", {
        messageId: msg.id,
        content: msg.content
      });
    } catch (err) {
      console.error("Task start error:", err);
    } finally {
      setExecutingId(null);
    }
  };

  const filtered = messages.filter(m => filter === "all" || m.category === filter);

  const clientCount = messages.filter(m => m.category === "client").length;
  const relativeCount = messages.filter(m => m.category === "relative").length;

  return (
    <div className="space-y-10">

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: messages.length, color: "text-white" },
          { label: "Clients", value: clientCount, color: "text-green-400" },
          { label: "Personal", value: relativeCount, color: "text-white/40" }
        ].map(stat => (
          <div key={stat.label} className="glass p-5 rounded-3xl text-center">
            <p className={`text-3xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between glass p-2 rounded-[2rem] border-white/5 border-2">
        <div className="flex gap-1">
          {(["all", "client", "relative"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-2 ${filter === f ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "text-white/30 hover:text-white/60"}`}
            >
              {f === "client" && <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />}
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={syncAll}
          disabled={syncing}
          className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sync All
        </button>
      </div>

      {/* Messages */}
      <div className="grid gap-5">
        <AnimatePresence mode="popLayout">
          {filtered.map(msg => (
            <motion.div
              layout
              key={msg.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`glass p-8 rounded-[2rem] flex gap-7 items-start card-hover group border ${msg.category === "client" ? "border-green-400/10 hover:border-green-400/20" : "border-white/5"}`}
            >
              <div className={`p-4 rounded-2xl flex-shrink-0 border transition-all ${msg.category === "client" ? "bg-green-400/10 border-green-400/20 text-green-400" : "bg-white/5 border-white/10 text-white/40"}`}>
                <PlatformIcon platform={msg.platform} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-3 gap-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-black text-base tracking-tight text-white uppercase italic truncate">{msg.senderName}</span>
                    <span className="text-[9px] font-black text-white/20 tracking-widest bg-white/5 px-2 py-0.5 rounded uppercase">{msg.platform}</span>
                    {msg.category === "client" && (
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase border ${msg.isNewClient ? "border-green-400/30 text-green-400/80 bg-green-400/10" : "border-white/10 text-white/30"}`}>
                        {msg.isNewClient ? "New Client" : "Returning"}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-white/10 italic flex-shrink-0">
                    {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "..."}
                  </span>
                </div>

                {msg.summary && (
                  <p className="text-[11px] text-green-400/60 font-medium mb-2 italic">{msg.summary}</p>
                )}

                <p className="text-white/40 text-sm leading-relaxed mb-6 group-hover:text-white/60 transition-colors line-clamp-3">{msg.content}</p>

                {msg.category === "client" && (
                  <div className={`rounded-2xl p-5 flex items-center justify-between border transition-all ${msg.taskId ? "bg-white/5 border-green-400/20" : "bg-black/20 border-white/5"}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl border transition-all ${msg.taskId ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-white/30"}`}>
                        {msg.taskId ? <CheckCircle2 className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className="font-black text-[11px] block text-white uppercase tracking-wider">
                          {msg.taskId ? "Agent Working" : "Ready to Execute"}
                        </span>
                        <span className="text-[10px] text-white/20">
                          {msg.taskId ? "Nexus AI is processing this request" : "Start the AI agent loop on this message"}
                        </span>
                      </div>
                    </div>
                    {!msg.taskId && (
                      <button
                        onClick={() => handleStartTask(msg)}
                        disabled={executingId === msg.id}
                        className="bg-white text-black p-3.5 rounded-xl hover:scale-110 active:scale-90 transition-all disabled:opacity-30 shadow-[0_8px_20px_rgba(255,255,255,0.15)]"
                      >
                        {executingId === msg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-32 glass border-dashed border-2 rounded-[4rem]">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
              <MessageSquare className="w-8 h-8 text-white/10" />
            </div>
            <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em] mb-3">No Messages</p>
            <p className="text-white/10 text-[10px]">Connect a platform and click Sync All to fetch messages</p>
          </div>
        )}
      </div>
    </div>
  );
}
