import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../../backend/lib/firebase";
import { useAuth } from "../../backend/lib/AuthContext";
import { CheckCircle2, Github, ExternalLink, Circle, Inbox, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

interface Result {
  id: string;
  taskId: string;
  result: string;
  requirements: string;
  githubPrUrl?: string;
  createdAt: any;
  read: boolean;
}

export function Results() {
  const { user } = useAuth();
  const [results, setResults] = useState<Result[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "results"),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, snap => {
      setResults(snap.docs.map(d => ({ id: d.id, ...d.data() } as Result)));
    });
  }, [user]);

  const markRead = async (id: string) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "results", id), { read: true });
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const unreadCount = results.filter(r => !r.read).length;

  return (
    <div className="space-y-10">
      {unreadCount > 0 && (
        <div className="glass p-6 rounded-3xl border border-green-400/20 bg-green-400/5 flex items-center gap-4">
          <div className="w-8 h-8 rounded-xl bg-green-400/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-[12px] font-black text-green-400 uppercase tracking-wider">{unreadCount} New Result{unreadCount > 1 ? "s" : ""} Ready</p>
            <p className="text-[10px] text-white/30">Your AI agent completed work while you were away</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <AnimatePresence>
          {results.map(result => (
            <motion.div
              key={result.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass p-8 rounded-[2rem] transition-all border ${!result.read ? "border-green-400/15 bg-green-400/[0.02]" : "border-white/5"}`}
            >
              <div className="flex items-start justify-between mb-5 gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${!result.read ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" : "bg-white/10"}`} />
                  <div>
                    <p className="font-black text-sm text-white uppercase italic tracking-tight">
                      Delivery #{result.id.slice(0, 6)}
                    </p>
                    <p className="text-[10px] text-white/20 mt-0.5">
                      {result.createdAt?.toDate ? result.createdAt.toDate().toLocaleString() : "..."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {result.githubPrUrl && (
                    <a
                      href={result.githubPrUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 glass-dark rounded-xl text-[10px] font-black uppercase tracking-wider text-white/50 hover:text-white transition-all border border-white/10"
                    >
                      <Github className="w-3.5 h-3.5" />
                      View PR <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {!result.read && (
                    <button
                      onClick={() => markRead(result.id)}
                      className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-green-400/60 hover:text-green-400 glass rounded-xl transition-all"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-xl p-4 mb-5">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-2">Requirements</p>
                <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">{result.requirements}</p>
              </div>

              <div
                className="cursor-pointer"
                onClick={() => {
                  setExpanded(expanded === result.id ? null : result.id);
                  if (!result.read) markRead(result.id);
                }}
              >
                <div className="bg-black/50 border border-green-400/10 rounded-2xl p-6 relative group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-green-400">AI Draft · Ready to Expand</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => { e.stopPropagation(); copyToClipboard(result.result, result.id); }}
                        className="p-2 glass rounded-lg hover:bg-white/10 transition-all"
                      >
                        {copied === result.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white/30" />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expanded === result.id ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="prose prose-invert prose-sm max-w-none text-white/60 text-xs leading-relaxed"
                      >
                        <ReactMarkdown>{result.result}</ReactMarkdown>
                      </motion.div>
                    ) : (
                      <motion.p className="text-white/40 text-xs leading-relaxed line-clamp-4">
                        {result.result}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <p className="text-[9px] text-white/20 text-center mt-4">
                    {expanded === result.id ? "▲ collapse" : "▼ expand full draft"}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {results.length === 0 && (
          <div className="text-center py-32 glass border-dashed border-2 rounded-[4rem]">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
              <Inbox className="w-8 h-8 text-white/10" />
            </div>
            <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em] mb-2">No Deliveries Yet</p>
            <p className="text-white/10 text-[10px]">AI results will appear here when agents complete their work</p>
          </div>
        )}
      </div>
    </div>
  );
}
