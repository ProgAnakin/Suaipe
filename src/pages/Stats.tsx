import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  // Set when 2FA enrolment succeeds, so the modal's onClose (which also fires on
  // success) doesn't sign the user back out.
  const enrolledRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) {
        console.error("[suaipe] getSession failed:", error);
        setAuthStep("login");
        setChecking(false);
        return;
      }
      if (data.session) {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel === "aal2") {
          setAuthStep("dashboard");
        } else if (aal?.nextLevel === "aal2") {
          setAuthStep("mfa");
        } else {
          // Enforce 2FA: an account with no TOTP factor must enrol before access.
          setAuthStep("enroll");
        }
      } else {
        setAuthStep("login");
      }
      setChecking(false);
    }).catch((err) => {
      console.error("[suaipe] auth check threw:", err);
      setAuthStep("login");
      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") setAuthStep("login");
    });
    return () => listener.subscription.unsubscribe();
  }, []);

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
            onLoginSuccess={() => setAuthStep("dashboard")}
            onMfaRequired={() => setAuthStep("mfa")}
            onEnrollRequired={() => setAuthStep("enroll")}
          />
        </motion.div>
      )}
      {authStep === "mfa" && (
        <motion.div key="mfa" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <MfaVerifyForm
            onVerified={() => setAuthStep("dashboard")}
            onCancel={async () => {
              await supabase.auth.signOut();
              setAuthStep("login");
            }}
          />
        </motion.div>
      )}
      {authStep === "enroll" && (
        <motion.div key="enroll" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="min-h-screen bg-background" />
          <MfaSetupModal
            onEnabled={() => { enrolledRef.current = true; setAuthStep("dashboard"); }}
            onClose={async () => {
              // The modal fires onClose on success too — don't sign out then.
              if (enrolledRef.current) { enrolledRef.current = false; return; }
              await supabase.auth.signOut();
              setAuthStep("login");
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
