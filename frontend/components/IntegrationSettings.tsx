import { Github, Mail, Instagram, MessageCircle, Link, Check, ExternalLink, Save, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../backend/lib/firebase";
import { useAuth } from "../../backend/lib/AuthContext";

export function IntegrationSettings() {
  const { user } = useAuth();
  const [githubToken, setGithubToken] = useState("");
  const [whatsappKey, setWhatsappKey] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [instaKey, setInstaKey] = useState("");
  const [emailUser, setEmailUser] = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGithubToken(data.githubToken || "");
        setWhatsappKey(data.whatsappKey || "");
        setWhatsappPhone(data.whatsappPhone || "");
        setInstaKey(data.instaKey || "");
        setEmailUser(data.emailUser || "");
        setEmailPass(data.emailPass || "");
      }
    });
  }, [user]);

  const handleSave = async (platform: string) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const update: any = { updatedAt: new Date().toISOString() };
      if (platform === 'github') update.githubToken = githubToken;
      if (platform === 'whatsapp') { update.whatsappKey = whatsappKey; update.whatsappPhone = whatsappPhone; }
      if (platform === 'instagram') update.instaKey = instaKey;
      if (platform === 'email') { update.emailUser = emailUser; update.emailPass = emailPass; }

      await setDoc(doc(db, "users", user.uid), update, { merge: true });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const platforms = [
    { 
      id: "whatsapp", 
      name: "WhatsApp", 
      icon: MessageCircle, 
      desc: "Connect via Meta Business API or Twilio",
      inputs: [
        { label: "Phone Number ID", placeholder: "e.g. 1029384756", value: whatsappPhone, setter: setWhatsappPhone },
        { label: "Permanent Token", placeholder: "EAAG...", value: whatsappKey, setter: setWhatsappKey, type: "password" }
      ]
    },
    { 
      id: "instagram", 
      name: "Instagram", 
      icon: Instagram, 
      desc: "Requires Instagram Graph API Token",
      inputs: [
        { label: "Access Token", placeholder: "IGQV...", value: instaKey, setter: setInstaKey, type: "password" }
      ]
    },
    { 
      id: "telegram", 
      name: "Telegram", 
      icon: MessageSquare, 
      desc: "Connect your bot via Telegram BotFather API",
      inputs: [
        { label: "Bot Token", placeholder: "123456:ABC-DEF...", value: githubToken.slice(0,0), setter: (v:string) => {}, type: "password" }
      ]
    },
    { 
      id: "email", 
      name: "Email (SMTP/IMAP)", 
      icon: Mail, 
      desc: "Direct connection for automated client replies",
      inputs: [
        { label: "Email Address", placeholder: "you@company.com", value: emailUser, setter: setEmailUser },
        { label: "App Password", placeholder: "xxxx xxxx xxxx xxxx", value: emailPass, setter: setEmailPass, type: "password" }
      ]
    }
  ];

  return (
    <div className="space-y-12 pb-32">
      {/* GitHub Section */}
      <section className="glass p-10 rounded-[3rem] border-white/5 relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-black shadow-[0_0_40px_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform duration-500">
              <Github className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-black text-2xl tracking-tighter text-white uppercase italic">GitHub Hub</h3>
              <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mt-1">Self-Healing Execution Key</p>
            </div>
          </div>
          <div className="flex-1 max-w-md w-full flex gap-3">
            <input 
              type="password" 
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="Personal Access Token"
              className="flex-1 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl font-mono text-xs focus:outline-none focus:bg-white/10 transition-all placeholder:text-white/20"
            />
            <button 
              onClick={() => handleSave('github')}
              className={`p-4 rounded-2xl transition-all ${isSaved ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </section>

      {/* Other Platforms */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {platforms.map((p) => (
          <motion.div 
            key={p.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-8 rounded-[2.5rem] border-white/10 flex flex-col h-full group card-hover relative overflow-hidden"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white selection:bg-white selection:text-black">
                <p.icon className="w-5 h-5" />
              </div>
              <h4 className="font-black text-sm uppercase tracking-widest">{p.name}</h4>
            </div>
            
            <p className="text-[11px] text-white/30 font-medium leading-relaxed mb-8">{p.desc}</p>

            <div className="space-y-4 flex-1">
              {p.inputs.map((input, idx) => (
                <div key={idx} className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1">{input.label}</label>
                  <input 
                    type={input.type || "text"}
                    value={input.value}
                    onChange={(e) => input.setter(e.target.value)}
                    placeholder={input.placeholder}
                    className="w-full bg-white/5 border border-white/5 hover:border-white/10 px-4 py-3.5 rounded-xl font-mono text-[10px] focus:outline-none focus:bg-white/10 transition-all placeholder:text-white/10"
                  />
                </div>
              ))}
            </div>

            <button 
              onClick={() => handleSave(p.id)}
              className="mt-8 w-full bg-white/5 border border-white/10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all group-hover:border-white/20"
            >
              Initialize {p.name}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Webhook Info */}
      <div className="glass-dark p-12 rounded-[3.5rem] relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse blur-[1px]" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Real-time Endpoint</p>
          </div>
          <h3 className="text-3xl font-black italic tracking-tighter text-white mb-4 uppercase">Direct Neural Hook</h3>
          <p className="text-white/30 text-xs max-w-md leading-relaxed mb-10">
            For WhatsApp and Instagram, configure your Meta Developer app to send webhooks to the address below. Our server will process them instantly.
          </p>
          
          <div className="flex flex-col md:flex-row items-center gap-4 bg-black/40 border border-white/5 p-4 rounded-3xl backdrop-blur-2xl">
            <div className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black text-white/60 tracking-widest uppercase">POST</div>
            <code className="text-[11px] font-mono text-white/40 select-all truncate">https://nexus-ai.app/api/webhooks/nexus-bridge</code>
            <button className="ml-auto p-3 hover:bg-white/10 rounded-xl transition-colors">
              <ExternalLink className="w-4 h-4 text-white/20" />
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/[0.02] blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
}
