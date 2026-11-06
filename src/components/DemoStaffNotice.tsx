import { Link } from 'react-router-dom';
import { useLang } from '@/i18n/LanguageContext';
export function DemoStaffNotice() {
  const {lang}=useLang();
  return <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background p-8 text-center">
    <p role="status">DEMO</p>
    <h1 className="text-xl font-semibold">{ {
      it:'Accesso del personale disabilitato nella demo.',en:'Staff access is disabled in this demo.',
      pt:'O acesso de funcionários está desativado nesta demonstração.',es:'El acceso del personal está desactivado en esta demostración.',
      fr:'L’accès du personnel est désactivé dans cette démonstration.',
    }[lang] }</h1>
    <Link to="/" className="rounded-xl border border-border px-5 py-3">← Demo</Link>
  </main>;
}
