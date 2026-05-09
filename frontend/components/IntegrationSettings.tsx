import { Github, Mail, MessageCircle, Instagram, Send, Save, Loader2, Check, RefreshCw, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import api from "../utils/api";

interface PlatformStatus {
  hasGithub: boolean;
  hasTelegram: boolean;
  hasWhatsapp: boolean;
  hasInstagram: boolean;
  hasEmail: boolean;
  emailUser: string;
  imapHost: string;
  whatsappPhoneId: string;
}

interface SyncState {
  [key: string]: "idle" | "syncing" | "done" | "error";
}

export function IntegrationSettings() {
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  const [githubToken, setGithubToken] = useState("");
  const [telegramToken, setTelegramToken] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [instaToken, setInstaToken] = useState("");
  const [emailUser, setEmailUser] = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [imapHost, setImapHost] = useState("imap.gmail.com");
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>({});

  useEffect(() => {
    api.get("/platforms/settings").then(r => {
      setStatus(r.data);
      setEmailUser(r.data.emailUser || "");
      setImapHost(r.data.imapHost || "imap.gmail.com");
      setWhatsappPhoneId(r.data.whatsappPhoneId || "");
    }).catch(console.error);
  }, []);

  const save = async (platform: string, payload: Record<string, string>) => {
    setSaving(platform);
    try {
      await api.post("/platforms/settings", payload);
      setSaved(platform);
      const r = await api.get("/platforms/settings");
      setStatus(r.data);
      setTimeout(() => setSaved(null), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  const sync = async (platform: string) => {
    setSyncState(s => ({ ...s, [platform]: "syncing" }));
    try {
      const r = await api.post(`/platforms/sync/${platform}`);
      setSyncState(s => ({ ...s, [platform]: "done" }));
      setTimeout(() => setSyncState(s => ({ ...s, [platform]: "idle" })), 3000);
    } catch (err: any) {
      setSyncState(s => ({ ...s, [platform]: "error" }));
      setTimeout(() => setSyncState(s => ({ ...s, [platform]: "idle" })), 3000);
    }
  };

  const StatusDot = ({ active }: { active?: boolean }) => (
    <span className={`w-2 h-2 rounded-full inline-block ${active ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]" : "bg-white/20"}`} />
  );

  const SaveButton = ({ platform, onClick }: { platform: string; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`p-4 rounded-2xl transition-all flex-shrink-0 ${saved === platform ? "bg-white text-black" : "bg-white/10 hover:bg-white/20 text-white"}`}
    >
      {saving === platform ? <Loader2 className="w-5 h-5 animate-spin" /> : saved === platform ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
    </button>
  );

  const SyncButton = ({ platform }: { platform: string }) => {
    const state = syncState[platform] || "idle";
    return (
      <button
        onClick={() => sync(platform)}
        disabled={state === "syncing"}
        className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all disabled:opacity-40"
      >
        {state === "syncing" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
          state === "done" ? <Check className="w-3.5 h-3.5 text-green-400" /> :
          state === "error" ? <AlertCircle className="w-3.5 h-3.5 text-red-400" /> :
          <RefreshCw className="w-3.5 h-3.5" />}
        {state === "done" ? "Synced" : state === "error" ? "Failed" : "Sync Now"}
      </button>
    );
  };

  return (
    <div className="space-y-10 pb-32">

      {/* Snapchat Notice */}
      <div className="glass-dark p-6 rounded-3xl border border-yellow-400/10 flex items-start gap-4">
        <AlertCircle className="w-5 h-5 text-yellow-400/60 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-white/40 leading-relaxed">
          <span className="text-yellow-400/80 font-black uppercase tracking-wider">Note:</span> Snapchat has no public API for reading chats. All other platforms below are fully supported.
        </p>
      </div>

      {/* GitHub */}
      <section className="glass p-10 rounded-[3rem] border-white/5 group">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-black shadow-[0_0_40px_rgba(255,255,255,0.1)]">
              <Github className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-black text-2xl tracking-tighter text-white uppercase italic">GitHub</h3>
                <StatusDot active={status?.hasGithub} />
              </div>
              <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest">Personal Access Token · branch push & PR creation</p>
            </div>
          </div>
          <div className="flex-1 max-w-md w-full flex gap-3">
            <input
              type="password"
              value={githubToken}
              onChange={e => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="flex-1 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl font-mono text-xs focus:outline-none focus:bg-white/10 transition-all placeholder:text-white/20"
            />
            <SaveButton platform="github" onClick={() => save("github", { githubToken })} />
          </div>
        </div>
      </section>

      {/* Telegram */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-10 rounded-[3rem] border-white/5 group">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-white">
              <Send className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-black text-xl tracking-tighter text-white uppercase italic">Telegram</h3>
                <StatusDot active={status?.hasTelegram} />
              </div>
              <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest">Bot API · real-time polling · auto-categorization</p>
            </div>
          </div>
          <div className="flex-1 max-w-md w-full flex gap-3">
            <input
              type="password"
              value={telegramToken}
              onChange={e => setTelegramToken(e.target.value)}
              placeholder="1234567890:AABBCC..."
              className="flex-1 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl font-mono text-xs focus:outline-none focus:bg-white/10 transition-all placeholder:text-white/20"
            />
            <SaveButton platform="telegram" onClick={() => save("telegram", { telegramBotToken: telegramToken })} />
          </div>
        </div>
        <p className="mt-4 text-[10px] text-white/20 pl-2">Create a bot via <span className="text-white/40">@BotFather</span> on Telegram and paste the token above. Messages will stream in automatically.</p>
      </motion.section>

      {/* WhatsApp */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-10 rounded-[3rem] border-white/5 group">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-white">
            <MessageCircle className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-black text-xl tracking-tighter text-white uppercase italic">WhatsApp</h3>
              <StatusDot active={status?.hasWhatsapp} />
            </div>
            <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest">Meta Business API · webhook + manual sync</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1">Phone Number ID</label>
            <input type="text" value={whatsappPhoneId} onChange={e => setWhatsappPhoneId(e.target.value)} placeholder="1029384756..." className="w-full bg-white/5 border border-white/5 hover:border-white/10 px-4 py-3.5 rounded-xl font-mono text-[11px] focus:outline-none focus:bg-white/10 transition-all placeholder:text-white/10" />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1">Permanent Access Token</label>
            <input type="password" value={whatsappToken} onChange={e => setWhatsappToken(e.target.value)} placeholder="EAAG..." className="w-full bg-white/5 border border-white/5 hover:border-white/10 px-4 py-3.5 rounded-xl font-mono text-[11px] focus:outline-none focus:bg-white/10 transition-all placeholder:text-white/10" />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => save("whatsapp", { whatsappPhoneId, whatsappToken })} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${saved === "whatsapp" ? "bg-white text-black" : "bg-white/10 hover:bg-white/20 text-white"}`}>
            {saving === "whatsapp" ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === "whatsapp" ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            Save
          </button>
          {status?.hasWhatsapp && <SyncButton platform="whatsapp" />}
        </div>
        <p className="mt-4 text-[10px] text-white/20 pl-1">Webhook URL: <code className="text-white/40">/api/platforms/webhook/whatsapp?userId=YOUR_UID</code></p>
      </motion.section>

      {/* Instagram */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-10 rounded-[3rem] border-white/5 group">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-white">
            <Instagram className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-black text-xl tracking-tighter text-white uppercase italic">Instagram</h3>
              <StatusDot active={status?.hasInstagram} />
            </div>
            <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest">Graph API · DM reading · webhook support</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input type="password" value={instaToken} onChange={e => setInstaToken(e.target.value)} placeholder="IGQV..." className="flex-1 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl font-mono text-xs focus:outline-none focus:bg-white/10 transition-all placeholder:text-white/20" />
          <SaveButton platform="instagram" onClick={() => save("instagram", { instaToken })} />
          {status?.hasInstagram && <SyncButton platform="instagram" />}
        </div>
      </motion.section>

      {/* Email */}
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-10 rounded-[3rem] border-white/5 group">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-white">
            <Mail className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-black text-xl tracking-tighter text-white uppercase italic">Email</h3>
              <StatusDot active={status?.hasEmail} />
            </div>
            <p className="text-white/30 text-[11px] font-bold uppercase tracking-widest">IMAP · unread mail fetch · Gmail / Outlook / custom</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1">Email Address</label>
            <input type="text" value={emailUser} onChange={e => setEmailUser(e.target.value)} placeholder="you@gmail.com" className="w-full bg-white/5 border border-white/5 hover:border-white/10 px-4 py-3.5 rounded-xl font-mono text-[11px] focus:outline-none focus:bg-white/10 transition-all placeholder:text-white/10" />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1">App Password</label>
            <input type="password" value={emailPass} onChange={e => setEmailPass(e.target.value)} placeholder="xxxx xxxx xxxx xxxx" className="w-full bg-white/5 border border-white/5 hover:border-white/10 px-4 py-3.5 rounded-xl font-mono text-[11px] focus:outline-none focus:bg-white/10 transition-all placeholder:text-white/10" />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1">IMAP Host</label>
            <input type="text" value={imapHost} onChange={e => setImapHost(e.target.value)} placeholder="imap.gmail.com" className="w-full bg-white/5 border border-white/5 hover:border-white/10 px-4 py-3.5 rounded-xl font-mono text-[11px] focus:outline-none focus:bg-white/10 transition-all placeholder:text-white/10" />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => save("email", { emailUser, emailPass, imapHost })} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${saved === "email" ? "bg-white text-black" : "bg-white/10 hover:bg-white/20 text-white"}`}>
            {saving === "email" ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === "email" ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            Save
          </button>
          {status?.hasEmail && <SyncButton platform="email" />}
        </div>
        <p className="mt-4 text-[10px] text-white/20 pl-1">For Gmail, use an <span className="text-white/40">App Password</span> (not your main password). Enable IMAP in Gmail settings first.</p>
      </motion.section>

    </div>
  );
}
