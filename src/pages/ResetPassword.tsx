import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const inFlight = useRef(false);

  // Supabase fires PASSWORD_RECOVERY when the recovery token in the URL is valid
  useEffect(() => {
    const timeout=setTimeout(()=>setError('Link non valido o scaduto. Richiedi un nuovo link dalla pagina di accesso.'),10_000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") { clearTimeout(timeout); setError(''); setReady(true); }
      if (event === "SIGNED_OUT") setReady(false);
    });
    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  const handleReset = async () => {
    if (!ready || inFlight.current) return;
    setError("");
    if (password.length < 12 || password.length > 128) {
      setError("La password deve avere tra 12 e 128 caratteri.");
      return;
    }
    if (password !== confirm) {
      setError("Le password non coincidono.");
      return;
    }
    setLoading(true);
    inFlight.current=true;
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword('');setConfirm('');setReady(false);
      navigate("/stats");
    } catch {
      setError("Errore durante l'aggiornamento. Riprova.");
    } finally { inFlight.current=false;setLoading(false); }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-8">
      <motion.div
        className="w-full max-w-sm space-y-5 text-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-5xl">🔑</div>
        <h1 className="text-2xl font-bold text-foreground">Nuova Password</h1>
        <p className="text-sm text-muted-foreground">
          {ready ? "Scegli una nuova password per il tuo account." : error ? 'Richiedi un nuovo link.' : "Verifica del link in corso…"}
        </p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!ready && error && <Link to="/stats" className="inline-block rounded border border-border px-4 py-2">Torna all’accesso</Link>}

        {ready && (
          <div className="space-y-3 text-left">
            <input
              type="password"
              aria-label="Nuova password"
              autoComplete="new-password"
              maxLength={128}
              placeholder="Nuova password (min. 12 caratteri)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="password"
              placeholder="Conferma password"
              aria-label="Conferma password"
              autoComplete="new-password"
              maxLength={128}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleReset()}
              className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <button
              onClick={handleReset}
              disabled={loading || !password || !confirm}
              className="gradient-primary shadow-glow w-full rounded-2xl px-8 py-4 text-lg font-bold text-primary-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Salvataggio…" : "Salva Password"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ResetPassword;
