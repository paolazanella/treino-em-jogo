import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { Home, ListChecks, Plus, User, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { garantirPerfil } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  loader: async () => {
    await garantirPerfil();
  },
  component: AppLayout,
});

type NavItem = { to: "/inicio" | "/meus-treinos" | "/treinos/novo" | "/perfil"; label: string; icon: typeof Home; destaque?: boolean };
const NAV: NavItem[] = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/meus-treinos", label: "Meus treinos", icon: ListChecks },
  { to: "/treinos/novo", label: "Criar", icon: Plus, destaque: true },
  { to: "/perfil", label: "Perfil", icon: User },
];

function AppLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link to="/inicio" className="font-display text-xl font-bold text-primary">
            Treina<span className="text-foreground">í</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                  n.destaque
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : path === n.to
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                )}
              >
                <n.icon className="size-4" /> {n.label === "Criar" ? "Criar treino" : n.label}
              </Link>
            ))}
            <Link
              to="/codigo"
              className="ml-1 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <KeyRound className="size-4" /> Entrar com código
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card md:hidden">
        <div className="grid grid-cols-4">
          {NAV.map((n) => {
            const ativo = path === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                  ativo ? "text-primary" : "text-muted-foreground",
                )}
              >
                {n.destaque ? (
                  <span className="-mt-5 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fab">
                    <n.icon className="size-6" />
                  </span>
                ) : (
                  <n.icon className="size-5" />
                )}
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
