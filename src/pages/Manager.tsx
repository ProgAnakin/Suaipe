import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ManagerDashboard } from "@/components/manager/ManagerDashboard";

// ─── Manager — auth guard ─────────────────────────────────────────────────────
// Verifies the Supabase session; redirects to /stats (login) if unauthenticated.

const AdminSpinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <div className="text-muted-foreground text-sm">Loading…</div>
    </div>
  </div>
);

const Manager = () => {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let generation = 0;
    let disposed = false;
    const check = async () => {
      const current = ++generation;
      setAuthed(false);
      setChecking(true);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) throw new Error("Session unavailable");
        const { data: aal, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (mfaError || aal?.currentLevel !== "aal2") throw new Error("MFA required");
        const { data: roles, error: roleError } = await supabase.rpc("get_my_store_role");
        if (roleError || !roles?.some((r) => ["manager", "consulente_responsabile"].includes(r.role))) throw new Error("Role denied");
        if (!disposed && current === generation) setAuthed(true);
      } catch {
        if (!disposed && current === generation) navigate("/stats", { replace: true });
      } finally {
        if (!disposed && current === generation) setChecking(false);
      }
    };
    void check();
    // Return from auth callbacks before making additional auth requests.
    let pending: ReturnType<typeof setTimeout>;
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      ++generation;
      setAuthed(false);
      setChecking(true);
      clearTimeout(pending);
      pending = setTimeout(() => { void check(); }, 0);
    });
    return () => { disposed = true; ++generation; clearTimeout(pending); listener.subscription.unsubscribe(); };

  }, [navigate]);

  if (checking) return <AdminSpinner />;

  if (!authed) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div key="manager" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <ManagerDashboard onLogout={() => navigate("/stats", { replace: true })} />
      </motion.div>
    </AnimatePresence>
  );
};

export default Manager;
