import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../backend/lib/firebase";
import { useAuth } from "../../backend/lib/AuthContext";
import {
  Play, Code, CheckCircle, Clock, AlertTriangle, Terminal,
  Cpu, GitBranch, Github, Loader2, ExternalLink, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

interface Task {
  id: string;
  requirements: string;
  status: "pending" | "analyzing" | "executing" | "completed" | "failed";
  githubPrUrl?: string;
  executionCount: number;
  result?: string;
  currentDraft?: string;
  error?: string;
  timestamp?: any;
  completedAt?: any;
}

const statusConfig = {
  pending: { color: "text-white/20", bg: "bg-white/5", label: "Pending", pulse: false },
  analyzing: { color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Analyzing", pulse: true },
  executing: { color: "text-blue-400", bg: "bg-blue-400/10", label: "Executing", pulse: true },
  completed: { color: "text-green-400", bg: "bg-white", label: "Completed", pulse: false },
  failed: { color: "text-red-400", bg: "bg-red-400/10", label: "Failed", pulse: false },
};

export function TaskExecution() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "tasks"),
      orderBy("timestamp", "desc")
    );
    return onSnapshot(q, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });
  }, [user]);

  const active = tasks.filter(t => t.status === "executing" || t.status === "analyzing");
  const done = tasks.filter(t => t.status === "completed" || t.status === "failed");
  const pending = tasks.filter(t => t.status === "pending");

  return (
    <div className="space-y-10">

      {/* Active indicator */}
      {active.length > 0 && (
        <div className="glass p-6 rounded-3xl border border-blue-400/20 bg-blue-400/5 flex items-center gap-4">
          <div className="w-8 h-8 rounded-xl bg-blue-400/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-blue-400 animate-pulse" />
          </div>
          <div>
            <p className="text-[12px] font-black text-blue-400 uppercase tracking-wider">{active.length} Agent{active.length > 1 ? "s" : ""} Running</p>
            <p className="text-[10px] text-white/30">Nexus AI is processing your client requests autonomously</p>
          </div>
          <div className="ml-auto flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Cluster header */}
      <div className="glass border-white/5 rounded-[3rem] p-10 relative overflow-hidden">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center text-black shadow-[0_20px_50px_rgba(255,255,255,0.1)]">
              <Cpu className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-black text-xl tracking-tighter text-white uppercase italic">Execution Threads</h3>
              <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mt-0.5">{tasks.length} total · {active.length} active · {done.length} resolved</p>
            </div>
          </div>
          <span className="px-4 py-2 glass-dark text-white/40 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${active.length > 0 ? "bg-blue-400 animate-pulse" : "bg-white/20"}`} />
            Nexus v2.0
          </span>
        </div>

        <div className="space-y-5">
          <AnimatePresence>
            {tasks.map(task => {
              const cfg = statusConfig[task.status] || statusConfig.pending;
              const isExpanded = expanded === task.id;
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass p-7 rounded-[2rem] border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : task.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.bg} ${cfg.pulse ? "animate-pulse" : ""}`}>
                        {task.status === "completed" ? <CheckCircle className={`w-4 h-4 text-black`} /> :
                          task.status === "failed" ? <AlertTriangle className={`w-4 h-4 ${cfg.color}`} /> :
                          task.status === "executing" || task.status === "analyzing" ? <Loader2 className={`w-4 h-4 ${cfg.color} animate-spin`} /> :
                          <Clock className={`w-4 h-4 ${cfg.color}`} />}
                      </div>
                      <div>
                        <p className="font-black text-sm uppercase italic tracking-tighter text-white">Thread #{task.id.slice(0, 6)}</p>
                        <p className={`text-[10px] font-black tracking-[0.15em] uppercase ${cfg.color}`}>{cfg.label} · loop {task.executionCount || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {task.githubPrUrl && (
                        <a
                          href={task.githubPrUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-2 px-4 py-2 glass-dark rounded-xl text-[10px] font-black uppercase tracking-wider text-white/50 hover:text-white transition-all border border-white/10"
                        >
                          <Github className="w-3.5 h-3.5" />
                          PR <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <span className="text-[10px] font-mono text-white/10">
                        {task.timestamp?.toDate ? task.timestamp.toDate().toLocaleDateString() : ""}
                      </span>
                    </div>
                  </div>

                  <div className="bg-black/40 border border-white/5 p-5 rounded-xl font-mono text-[11px] text-white/30 mb-4">
                    <p className="text-white/50 mb-2">$ nexus analyze --requirements</p>
                    <p className="line-clamp-2">{task.requirements?.slice(0, 120)}...</p>
                    {(task.status === "executing" || task.status === "analyzing") && (
                      <div className="flex items-center gap-2 mt-3 text-blue-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="animate-pulse">Iterating towards solution...</span>
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {isExpanded && task.result && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-black/60 border border-green-400/10 rounded-2xl p-6 mt-2">
                          <div className="flex items-center gap-2 mb-4">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-green-400">AI Result</span>
                          </div>
                          <div className="prose prose-invert prose-sm max-w-none text-white/60 text-xs leading-relaxed">
                            <ReactMarkdown>{task.result}</ReactMarkdown>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {task.result && (
                    <p className="text-[9px] text-white/20 mt-2 text-center">
                      {isExpanded ? "▲ collapse" : "▼ view result"}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {tasks.length === 0 && (
            <div className="text-center py-20 glass border-dashed glass-dark rounded-[3rem]">
              <Terminal className="w-10 h-10 text-white/10 mx-auto mb-5" />
              <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em]">No Active Threads</p>
              <p className="text-white/10 text-[10px] mt-2">Start an agent from the Inbox when a client message arrives</p>
            </div>
          )}
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: AlertTriangle, title: "Self-Healing Loop", body: "AI retries until requirements are met" },
          { icon: GitBranch, title: "Auto Branching", body: "Changes pushed to isolated GitHub branch" },
          { icon: Code, title: "Draft Delivery", body: "Results appear in your Results tab on wake-up" }
        ].map((feat, i) => (
          <div key={i} className="glass p-8 rounded-[2.5rem] border-white/5 flex flex-col items-center text-center card-hover">
            <div className="w-12 h-12 bg-white/5 border border-white/10 text-white/40 rounded-2xl flex items-center justify-center mb-5">
              <feat.icon className="w-5 h-5" />
            </div>
            <h4 className="font-black text-[12px] uppercase tracking-widest text-white mb-2">{feat.title}</h4>
            <p className="text-[10px] uppercase font-black tracking-widest text-white/20">{feat.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
