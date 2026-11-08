import { createFileRoute, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Carregando, Erro } from "@/components/Estados";
import { mensagemErro } from "@/lib/treinos";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — Treinaí" },
      { name: "description", content: "Seus dados no Treinaí." },
      { property: "og:title", content: "Perfil — Treinaí" },
      { property: "og:description", content: "Seus dados no Treinaí." },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["perfil-completo", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("nome,email,data_nascimento").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: undefined }, replace: true });
  }

  const nasc = q.data?.data_nascimento
    ? new Date(q.data.data_nascimento + "T00:00:00").toLocaleDateString("pt-BR")
    : "—";

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold md:text-3xl">Perfil</h1>
      <div className="mt-6 rounded-2xl border bg-card p-6 shadow-card">
        {q.isLoading ? <Carregando /> : q.error ? (
          <Erro texto={mensagemErro(q.error, "Não foi possível carregar seu perfil.")} onRetry={() => q.refetch()} />
        ) : (
          <dl className="space-y-4">
            <Item l="Nome" v={q.data?.nome || "—"} />
            <Item l="E-mail" v={q.data?.email || user.email || "—"} />
            <Item l="Data de nascimento" v={nasc} />
          </dl>
        )}
        <Button variant="outline" className="mt-6 w-full" onClick={sair}><LogOut /> Sair</Button>
      </div>
    </div>
  );
}
function Item({ l, v }: { l: string; v: string }) {
  return <div><dt className="text-xs text-muted-foreground">{l}</dt><dd className="font-medium">{v}</dd></div>;
}
