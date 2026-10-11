import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  // Supabase fires PASSWORD_RECOVERY when the recovery token in the URL is valid
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    setError("");
    if (password.length < 6) {
      setError("The password must be at least 6 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError("Could not update the password. Please try again.");
    } else {
      navigate("/stats");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-8">
      <motion.div
        className="w-full max-w-sm space-y-5 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-5xl">🔑</div>
        <h1 className="text-2xl font-bold text-foreground">New password</h1>
        <p className="text-sm text-muted-foreground">
          {ready ? "Choose a new password for your account." : "Checking your link…"}
        </p>

        {ready && (
          <div className="space-y-3 text-left">
            <input
              type="password"
              placeholder="New password (min. 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleReset()}
              className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {error && (
              <p className="text-center text-sm text-destructive">{error}</p>
            )}

            <button
              onClick={handleReset}
              disabled={loading || !password || !confirm}
              className="gradient-primary shadow-glow w-full rounded-2xl px-8 py-4 text-lg font-bold text-primary-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save password"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;
