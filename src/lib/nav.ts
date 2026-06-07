// Shared navigation tabs — used by BottomNav (mobile) and NavSidebar (desktop).
import { Receipt, Siren, Bot, type LucideIcon } from "lucide-react";

export type NavTab = { href: string; label: string; icon: LucideIcon };

export const NAV_TABS: NavTab[] = [
  { href: "/",          label: "Mis Pedidos", icon: Receipt },
  { href: "/semaforo",  label: "Alertas",     icon: Siren },
  { href: "/asistente", label: "Asistente",   icon: Bot },
];
