import { AuthProvider, useAuth } from "../backend/lib/AuthContext";
import { useState, useEffect } from "react";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { db } from "../backend/lib/firebase";
import { MessageSquare, Settings, Play, Users, LogIn, Menu, X, Send, Inbox } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UnifiedInbox } from "./components/UnifiedInbox";
import { IntegrationSettings } from "./components/IntegrationSettings";
import { TaskExecution } from "./components/TaskExecution";
import { Results } from "./components/Results";

function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, unreadCount }: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  unreadCount: number;
}) {
  const tabs = [
    { id: "inbox", label: "Unified Inbox", icon: MessageSquare },
    { id: "tasks", label: "AI Execution", icon: Play },
    { id: "results", label: "Deliveries", icon: Inbox, badge: unreadCount },
    { id: "integrations", label: "Connections", icon: Settings },
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className={`fixed inset-y-0 left-0 lg:static w-72 h-screen glass border-r border-white/5 flex flex-col p-8 bg-black/20 z-50 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex items-center justify-between mb-16 px-2">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <Play className="text-black w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tighter text-white">NEXUS AI</h1>
              <div className="h-0.5 w-full bg-white/10 mt-1 rounded-full overflow-hidden">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "0%" }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="h-full w-1/2 bg-white/40"
                />
              </div>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg text-white/40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (window.innerWidth < 1024) setIsOpen(false); }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[13px] font-semibold transition-all duration-300 relative ${activeTab === tab.id ? "bg-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.1)]" : "text-white/40 hover:text-white/80 hover:bg-white/5"}`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? "opacity-100" : "opacity-40"}`} />
              {tab.label}
              {"badge" in tab && tab.badge! > 0 && (
                <span className={`ml-auto w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${activeTab === tab.id ? "bg-black text-white" : "bg-green-400 text-black"}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-8 border-t border-white/5">
          <div className="flex items-center gap-3 px-2">
            <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            <span className="text-[10px] uppercase font-black tracking-widest text-white/20">System Live</span>
          </div>
        </div>
      </div>
    </>
  );
}

function MainContent() {
  const { user, loading, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("inbox");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "results"),
      where("read", "==", false)
    );
    return onSnapshot(q, snap => setUnreadCount(snap.size));
  }, [user]);

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-black">
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="w-12 h-12 bg-white rounded-2xl"
      />
    </div>
  );

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#050505] p-6 selection:bg-white selection:text-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass p-12 rounded-[3rem] text-center bg-white/[0.01]"
        >
          <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-[0_20px_50px_rgba(255,255,255,0.1)]">
            <Play className="text-black w-10 h-10 fill-current" />
          </div>
          <h2 className="text-3xl font-black mb-4 tracking-tighter text-white">NEXUS AI</h2>
          <p className="text-white/40 text-sm mb-3 font-medium leading-relaxed">
            The intelligent bridge between <br />human request and machine execution.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-10 text-[10px] text-white/20 font-black uppercase tracking-widest">
            {["WhatsApp", "Telegram", "Email", "Instagram"].map(p => (
              <div key={p} className="glass px-3 py-2 rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-400/60 rounded-full" />
                {p}
              </div>
            ))}
          </div>
          <button
            onClick={login}
            className="w-full bg-white text-black py-5 rounded-[1.5rem] font-bold text-sm tracking-tight flex items-center justify-center gap-3 hover:bg-[#e0e0e0] transition-all active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
          >
            <LogIn className="w-5 h-5" />
            Continue with Google
          </button>
        </motion.div>
      </div>
    );
  }

  const tabLabels: Record<string, string> = {
    inbox: "Inbox",
    tasks: "Agents",
    results: "Deliveries",
    integrations: "Core",
  };

  const tabSubLabels: Record<string, string> = {
    inbox: "Signal Filtering",
    tasks: "Execution Loop",
    results: "AI Drafts",
    integrations: "Neural Links",
  };

  return (
    <div className="flex h-screen bg-[#050505] overflow-hidden selection:bg-white selection:text-black relative">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        unreadCount={unreadCount}
      />

      <main className="flex-1 overflow-y-auto p-6 md:p-12 pb-32">
        <div className="max-w-5xl mx-auto">
          <header className="flex items-center justify-between mb-12 md:mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-3 glass rounded-xl text-white/40 hover:text-white"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white uppercase italic">
                  {tabLabels[activeTab]}
                </h2>
                <div className="flex items-center gap-3 mt-2">
                  <div className="h-[1px] w-8 bg-white/20" />
                  <p className="text-white/40 text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em]">
                    {tabSubLabels[activeTab]}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 md:gap-6 glass px-4 md:px-6 py-3 rounded-2xl border-white/5">
              <div className="hidden sm:block text-right">
                <span className="block text-[10px] font-black tracking-widest text-white/30 uppercase mb-0.5">Authorized</span>
                <span className="text-xs font-bold text-white/80">{user.displayName || user.email}</span>
              </div>
              <button onClick={logout} className="p-2 md:p-3 hover:bg-white/10 rounded-xl transition-all group">
                <Users className="w-5 h-5 text-white/40 group-hover:text-white" />
              </button>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.99, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.01, filter: "blur(5px)" }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              {activeTab === "inbox" && <UnifiedInbox />}
              {activeTab === "integrations" && <IntegrationSettings />}
              {activeTab === "tasks" && <TaskExecution />}
              {activeTab === "results" && <Results />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
