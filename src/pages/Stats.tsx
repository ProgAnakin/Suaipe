import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lockStaffSession } from "@/lib/staffLogout";
import { LoginForm } from "@/components/stats/LoginForm";
import { MfaVerifyForm } from "@/components/stats/MfaVerifyForm";
import { MfaSetupModal } from "@/components/stats/MfaSetupModal";
import { Dashboard } from "@/components/stats/Dashboard";
import type { AuthStep } from "@/components/stats/types";

// ─── Stats — auth state machine ───────────────────────────────────────────────
// Renders LoginForm → MfaVerifyForm → Dashboard based on the current auth step.

const AdminSpinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <div className="text-muted-foreground text-sm">Loading…</div>
    </div>
  </div>
);

const Stats = () => {
  const navigate = useNavigate();
  const [authStep, setAuthStep] = useState<AuthStep>("login");
  const [checking, setChecking] = useState(true);
  const [authRevision,setAuthRevision] = useState(0);
  // Set when 2FA enrolment succeeds, so the modal's onClose (which also fires on
  // success) doesn't sign the user back out.
  const enrolledRef = useRef(false);

  useEffect(() => {
    let generation=0,disposed=false;
    let pending:ReturnType<typeof setTimeout>;
    const check=async () => {
      const current=++generation;
      setChecking(true);
      try {
        const {data,error}=await supabase.auth.getSession();
        if (disposed || current!==generation) return;
        if (error || !data.session) {setAuthStep('login');return;}
        const {data:aal,error:mfaError}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (disposed || current!==generation) return;
        if (mfaError) throw mfaError;
        if (aal?.currentLevel==='aal2') {
          const {data:roles,error:roleError}=await supabase.rpc('get_my_store_role');
          if (disposed || current!==generation) return;
          if (roleError || !roles?.some(r=>['manager','consulente_responsabile','consulente'].includes(r.role))) {
            lockStaffSession(()=>setAuthStep('login'));return;
          }
          setAuthStep('dashboard');
        } else setAuthStep(aal?.nextLevel==='aal2'?'mfa':'enroll');
      } catch {if (!disposed && current===generation) setAuthStep('login');}
      finally {if (!disposed && current===generation) setChecking(false);}
    };
    void check();
    const {data:listener}=supabase.auth.onAuthStateChange(event=>{
      ++generation;clearTimeout(pending);
      if (event==='SIGNED_OUT') {setAuthStep('login');setChecking(false);return;}
      setChecking(true);
      // Supabase holds its internal auth lock while notifying listeners.
      pending=setTimeout(()=>{void check();},0);
    });
    return ()=>{disposed=true;++generation;clearTimeout(pending);listener.subscription.unsubscribe();};
  }, [authRevision]);

  if (checking) return <AdminSpinner />;

  return (
    <>
      <button
        onClick={() => navigate("/")}
        className="fixed left-4 top-4 z-50 flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground/60 transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Home
      </button>
    <AnimatePresence mode="wait">
      {authStep === "login" && (
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <LoginForm
            onLoginSuccess={() => {setChecking(true);setAuthRevision(v=>v+1);}}
            onMfaRequired={() => setAuthStep("mfa")}
            onEnrollRequired={() => setAuthStep("enroll")}
          />
        </motion.div>
      )}
      {authStep === "mfa" && (
        <motion.div key="mfa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <MfaVerifyForm
            onVerified={() => {setChecking(true);setAuthRevision(v=>v+1);}}
            onCancel={async () => {
              lockStaffSession(() => setAuthStep("login"));
            }}
          />
        </motion.div>
      )}
      {authStep === "enroll" && (
        <motion.div key="enroll" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="min-h-screen bg-background" />
          <MfaSetupModal
            onEnabled={() => { enrolledRef.current = true; setChecking(true);setAuthRevision(v=>v+1); }}
            onClose={async () => {
              // The modal fires onClose on success too — don't sign out then.
              if (enrolledRef.current) { enrolledRef.current = false; return; }
              lockStaffSession(() => setAuthStep("login"));
            }}
          />
        </motion.div>
      )}
      {authStep === "dashboard" && (
        <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Dashboard onLogout={() => setAuthStep("login")} />
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};

export default Stats;
