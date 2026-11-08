import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TreinoCard } from "@/components/TreinoCard";
import { Carregando, Erro, Vazio } from "@/components/Estados";
import { buscarParticipando, buscarTreinosPublicos, hojeISO, mensagemErro } from "@/lib/treinos";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Início — Treinaí" },
      { name: "description", content: "Próximos treinos e suas presenças confirmadas." },
      { property: "og:title", content: "Início — Treinaí" },
      { property: "og:description", content: "Próximos treinos e suas presenças confirmadas." },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const perfil = useQuery({
    queryKey: ["perfil", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const publicos = useQuery({ queryKey: ["treinos", "publicos"], queryFn: buscarTreinosPublicos });
  const meus = useQuery({ queryKey: ["treinos", "participando", user.id], queryFn: () => buscarParticipando(user.id) });

  const primeiroNome = (perfil.data?.nome || (user.user_metadata?.["nome"] as string) || "").split(" ")[0];
  const hoje = hojeISO();
  const confirmados = (meus.data ?? []).filter((t) => t.data >= hoje);

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-primary p-6 text-primary-foreground md:p-8">
        <h1 className="text-2xl font-bold md:text-3xl">Olá{primeiroNome ? `, ${primeiroNome}` : ""}! 👋</h1>
        <p className="mt-1 opacity-90">Bora treinar? Crie um treino ou entre em um com código.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="accent" size="lg"><Link to="/treinos/novo"><Plus /> Criar treino</Link></Button>
          <Button asChild variant="secondary" size="lg"><Link to="/codigo"><KeyRound /> Entrar com código</Link></Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Vou participar</h2>
        {meus.isLoading ? <Carregando /> : meus.error ? (
          <Erro texto={mensagemErro(meus.error, "Não foi possível carregar suas presenças.")} onRetry={() => meus.refetch()} />
        ) : confirmados.length === 0 ? (
          <Vazio>Você ainda não confirmou presença em nenhum treino.</Vazio>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{confirmados.map((t) => <TreinoCard key={t.id} treino={t} />)}</div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Próximos treinos</h2>
        {publicos.isLoading ? <Carregando /> : publicos.error ? (
          <Erro texto={mensagemErro(publicos.error, "Não foi possível carregar os treinos. Tente novamente.")} onRetry={() => publicos.refetch()} />
        ) : (publicos.data ?? []).length === 0 ? (
          <Vazio>Nenhum treino público marcado. Que tal criar o primeiro?</Vazio>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{publicos.data!.map((t) => <TreinoCard key={t.id} treino={t} />)}</div>
        )}
      </section>
    </div>
  );
}
