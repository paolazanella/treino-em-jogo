import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { TreinoCard } from "@/components/TreinoCard";
import { Carregando, Erro, Vazio } from "@/components/Estados";
import { buscarOrganizados, buscarParticipando, mensagemErro, type TreinoComContagem } from "@/lib/treinos";

export const Route = createFileRoute("/_authenticated/meus-treinos")({
  head: () => ({
    meta: [
      { title: "Meus treinos — Treinaí" },
      { name: "description", content: "Treinos que você organizou e treinos em que vai participar." },
      { property: "og:title", content: "Meus treinos — Treinaí" },
      { property: "og:description", content: "Treinos que você organizou e em que vai participar." },
    ],
  }),
  component: MeusTreinos,
});

function MeusTreinos() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const org = useQuery({ queryKey: ["treinos", "organizados", user.id], queryFn: () => buscarOrganizados(user.id) });
  const part = useQuery({ queryKey: ["treinos", "participando", user.id], queryFn: () => buscarParticipando(user.id) });
  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold md:text-3xl">Meus treinos</h1>
      <Secao titulo="Treinos que organizei" q={org} vazio="Você ainda não criou nenhum treino." />
      <Secao titulo="Treinos que vou participar" q={part} vazio="Você ainda não confirmou presença em nenhum treino." />
    </div>
  );
}

function Secao({ titulo, q, vazio }: { titulo: string; q: { data?: TreinoComContagem[]; isLoading: boolean; error: unknown; refetch: () => unknown }; vazio: string }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">{titulo}</h2>
      {q.isLoading ? <Carregando /> : q.error ? (
        <Erro texto={mensagemErro(q.error, "Não foi possível carregar os treinos. Tente novamente.")} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? <Vazio>{vazio}</Vazio> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{q.data.map((t) => <TreinoCard key={t.id} treino={t} />)}</div>
      )}
    </section>
  );
}
