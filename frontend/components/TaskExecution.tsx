import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../backend/lib/firebase";
import { useAuth } from "../../backend/lib/AuthContext";
import { Play, Code, CheckCircle, Clock, AlertTriangle, Terminal, Cpu, GitBranch, Github } from "lucide-react";
import { motion } from "motion/react";

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
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Task {
  id: string;
  requirements: string;
  status: "pending" | "analyzing" | "executing" | "completed" | "failed";
  githubPrUrl?: string;
  executionCount: number;
}

export function TaskExecution() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!user) return;
    const path = `users/${user.uid}/tasks`;
    const q = query(
      collection(db, "users", user.uid, "tasks"),
      orderBy("timestamp", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="glass border-white/5 rounded-[3rem] p-12 relative overflow-hidden group">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-black shadow-[0_20px_50px_rgba(255,255,255,0.1)]">
              <Cpu className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-2xl tracking-tighter text-white uppercase italic">Active Clusters</h3>
              <p className="text-white/20 text-[11px] font-bold uppercase tracking-widest mt-1">Self-healing neural models</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="px-5 py-2 glass-dark text-white/60 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-3">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse blur-[1px]" />
              Nexus v1.4
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {tasks.map((task) => (
            <motion.div 
              key={task.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-8 rounded-[2rem] border-white/5 hover:bg-white/[0.04] transition-all cursor-pointer group/task"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-700 ${
                    task.status === 'completed' ? 'bg-white text-black' :
                    task.status === 'executing' ? 'bg-white/10 text-white animate-pulse' : 'bg-white/5 text-white/20'
                  }`}>
                    {task.status === 'completed' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase italic tracking-tighter text-white">Execution #{task.id.slice(0, 5)}</h4>
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white/20">{task.status}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono text-white/10 uppercase italic">Loop Count: {task.executionCount || 0}</span>
                </div>
              </div>
              
              <div className="bg-black/40 border border-white/5 p-6 rounded-2xl font-mono text-[11px] text-white/40 mb-6 relative overflow-hidden group-hover/task:border-white/10 transition-colors">
                <div className="absolute top-0 right-0 p-4 flex gap-3 opacity-20">
                  <GitBranch className="w-4 h-4" />
                  <Code className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <p className="text-white/60 select-all leading-relaxed">
                    $ nexus-agent analyze --requirements "{task.requirements.split('\n')[0].slice(0, 40)}..."
                  </p>
                  <div className={`mt-4 font-black ${task.status === 'executing' ? 'text-white animate-pulse' : 'text-white/20'}`}>
                    {task.status === 'executing' ? '> SH-LOOP-INIT: Retrying build errors...' : '> S_HLP-COMPLETED: 1.0.4-STABLE'}
                  </div>
                </div>
              </div>

              {task.githubPrUrl && (
                <a 
                  href={task.githubPrUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-3 px-6 py-3 glass-dark rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all group-hover/task:border-white/20"
                >
                  <Github className="w-4 h-4" />
                  View Pull Request
                </a>
              )}
            </motion.div>
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-20 glass border-dashed glass-dark rounded-[3rem]">
              <Terminal className="w-12 h-12 text-white/10 mx-auto mb-6" />
              <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.4em]">Zero Active Threads</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: AlertTriangle, title: "SH-Healing", body: "Retrials on failure" },
          { icon: Github, title: "Ghost-Branch", body: "Isolated branches" },
          { icon: Code, title: "Dual-Engine", body: "Claude + LLM-vQ" }
        ].map((feat, i) => (
          <div key={i} className="glass p-8 rounded-[2.5rem] border-white/5 flex flex-col items-center text-center card-hover overflow-hidden relative">
            <div className="w-12 h-12 bg-white/5 border border-white/10 text-white/40 rounded-2xl flex items-center justify-center mb-6">
              <feat.icon className="w-6 h-6" />
            </div>
            <h4 className="font-black text-[12px] uppercase tracking-widest text-white mb-2">{feat.title}</h4>
            <p className="text-[10px] uppercase font-black tracking-widest text-white/10">{feat.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
