"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { isLoggedIn } from "@/lib/auth";

const C = { bg:'#07070a', accent:'#f5c842', accentGlow:'rgba(245,200,66,0.3)', textMuted:'#44445a' };
const mono = "'JetBrains Mono','Fira Code',monospace";
const serif = "'Playfair Display',Georgia,serif";

export default function AuthGuard({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) router.replace("/auth");
    else setReady(true);
  }, []);

  if (!ready) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"1.2rem" }}>
        {/* Dual ring spinner */}
        <div style={{ position:"relative", width:56, height:56, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <motion.div
            style={{ position:"absolute", inset:0, borderRadius:"50%", border:"1.5px solid transparent", borderTopColor:C.accent, borderRightColor:`${C.accent}44` }}
            animate={{ rotate:360 }}
            transition={{ duration:2, repeat:Infinity, ease:"linear" }}
          />
          <motion.div
            style={{ position:"absolute", inset:8, borderRadius:"50%", border:"1px solid transparent", borderBottomColor:`${C.accent}33`, borderLeftColor:`${C.accent}22` }}
            animate={{ rotate:-360 }}
            transition={{ duration:3, repeat:Infinity, ease:"linear" }}
          />
          <span style={{ fontFamily:serif, fontSize:"0.9rem", fontWeight:700, color:"#f0f0f2" }}>
            ET<span style={{ color:C.accent }}>AI</span>
          </span>
        </div>
        <p style={{ fontFamily:mono, fontSize:"0.6rem", textTransform:"uppercase", letterSpacing:"0.15em", color:C.textMuted, margin:0 }}>
          Loading...
        </p>
      </div>
    </div>
  );

  return children;
}