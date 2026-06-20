import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useLockoutCountdown } from "@/hooks/useLockoutCountdown";

interface LoginFormProps {
  onLoginSuccess: () => void;
  onMfaRequired: () => void;
  /** Called after a password login when the account has NO 2FA factor enrolled.
   *  When provided, the caller enforces enrolment before granting access. */
  onEnrollRequired?: () => void;
  /** Header copy — defaults to the analytics dashboard. /consulente overrides it. */
  title?: string;
  subtitle?: string;
  icon?: string;
}

// Rate limiting is enforced server-side via check_login_rate_limit RPC.
export const LoginForm = ({
  onLoginSuccess,
  onMfaRequired,
  onEnrollRequired,
  title = "Analytics Dashboard",
  subtitle = "Restricted access",
  icon = "📊",
}: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { lockedSeconds, isLocked, setLockedSeconds } = useLockoutCountdown();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim() || isLocked) return;
    setLoading(true); setError("");

    const { data: limitData } = await supabase.rpc("check_login_rate_limit", {
      p_email: email.trim().toLowerCase(),
    });
    const limit = limitData as { locked: boolean; locked_seconds: number } | null;
    if (limit?.locked) {
      setLockedSeconds(limit.locked_seconds);
      setLoading(false);
      setError("Too many attempts. Try again in a few minutes.");
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(), password,
    });

    supabase.rpc("record_login_attempt", {
      p_email: email.trim().toLowerCase(),
      p_success: !authError,
    });

    setLoading(false);
    if (authError) {
      setError("Invalid credentials.");
    } else {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") {
        onLoginSuccess();
      } else if (aal?.nextLevel === "aal2") {
        onMfaRequired();
      } else if (onEnrollRequired) {
        // No TOTP factor enrolled — enforce enrolment before granting access.
        onEnrollRequired();
      } else {
        onLoginSuccess();
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-8">
      <motion.div className="w-full max-w-sm space-y-5 text-center"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-5xl">{icon}</div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
        <div className="space-y-3 text-left">
          <input type="email" placeholder="Email" value={email} autoComplete="email"
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="password" placeholder="Password" value={password} autoComplete="current-password"
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-sm text-destructive">{error}</motion.p>
          )}
        </AnimatePresence>
        <button onClick={handleLogin}
          disabled={loading || isLocked || !email.trim() || !password.trim()}
          className="gradient-primary shadow-glow w-full rounded-2xl px-8 py-4 text-lg font-bold text-primary-foreground active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? "Signing in…" : isLocked ? `Locked — ${lockedSeconds}s` : "Sign in"}
        </button>
      </motion.div>
    </div>
  );
};
