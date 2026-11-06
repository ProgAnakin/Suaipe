import { motion } from "framer-motion";
import { History, Inbox } from "lucide-react";

export type ActiveTab = "catalogo" | "sessioni" | "storico" | "gestione";
export type GestioneTab = "catalogo" | "carte" | "email" | "ruoli" | "guida" | "privacy";

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const tabClass = (active: boolean, size: "lg" | "sm") =>
  `flex flex-1 items-center justify-center gap-1.5 rounded-xl ${
    size === "lg" ? "px-4 py-2.5 text-sm" : "px-4 py-2 text-xs"
  } font-semibold transition-colors ${
    active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
  }`;

const PrimaryTabButton = ({ active, onClick, children }: TabButtonProps) => (
  <button onClick={onClick} className={tabClass(active, "lg")}>
    {children}
  </button>
);

const SubTabButton = ({ active, onClick, children }: TabButtonProps) => (
  <button onClick={onClick} className={tabClass(active, "sm")}>
    {children}
  </button>
);

interface PrimaryTabsProps {
  active: ActiveTab;
  showManagement: boolean;
  onChange: (tab: ActiveTab) => void;
}

export const PrimaryTabs = ({ active, showManagement, onChange }: PrimaryTabsProps) => (
  <motion.div
    className="flex gap-1 rounded-2xl border border-border bg-muted/30 p-1"
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
  >
    <PrimaryTabButton active={active === "catalogo"} onClick={() => onChange("catalogo")}>
      📦 Catalog
    </PrimaryTabButton>
    <PrimaryTabButton active={active === "sessioni"} onClick={() => onChange("sessioni")}>
      <Inbox className="h-3.5 w-3.5" /> Sessions &amp; Codes
    </PrimaryTabButton>
    <PrimaryTabButton active={active === "storico"} onClick={() => onChange("storico")}>
      <History className="h-3.5 w-3.5" /> History
    </PrimaryTabButton>
    {showManagement && (
      <PrimaryTabButton active={active === "gestione"} onClick={() => onChange("gestione")}>
        🗂️ Management
      </PrimaryTabButton>
    )}
  </motion.div>
);

interface ManagementSubTabsProps {
  active: GestioneTab;
  onChange: (tab: GestioneTab) => void;
}

export const ManagementSubTabs = ({ active, onChange }: ManagementSubTabsProps) => (
  <div className="flex flex-wrap gap-1 rounded-2xl border border-border bg-muted/30 p-1">
    <SubTabButton active={active === "catalogo"} onClick={() => onChange("catalogo")}>
      📦 Global catalog
    </SubTabButton>
    <SubTabButton active={active === "carte"} onClick={() => onChange("carte")}>
      🃏 Quiz Cards
    </SubTabButton>
    <SubTabButton active={active === "email"} onClick={() => onChange("email")}>
      📧 Email
    </SubTabButton>
    <SubTabButton active={active === "ruoli"} onClick={() => onChange("ruoli")}>
      👥 Roles
    </SubTabButton>
    <SubTabButton active={active === "guida"} onClick={() => onChange("guida")}>
      🎓 Guide
    </SubTabButton>
    <SubTabButton active={active === "privacy"} onClick={() => onChange("privacy")}>
      Privacy
    </SubTabButton>
  </div>
);
