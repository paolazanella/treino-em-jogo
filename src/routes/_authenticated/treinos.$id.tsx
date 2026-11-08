import { createFileRoute, Link, useRouteContext, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Clock, Copy, KeyRound, Lock, MapPin, Share2, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Carregando, Erro } from "@/components/Estados";
import {
  buscarTreino, estaLotado, formatarData, formatarHora, gerarTextoCompartilhamento,
  mensagemErro, nomeModalidade, vagasRestantes,
} from "@/lib/treinos";

export const Route = createFileRoute("/_authenticated/treinos/$id")({
  head: () => ({
    meta: [
      { title: "Treino — Treinaí" },
      { name: "description", content: "Detalhes do treino, participantes e confirmação de presença." },
      { property: "og:title", content: "Treino — Treinaí" },
      { property: "og:description", content: "Confirme sua presença neste treino no Treinaí." },
    ],
  }),
  component: DetalhesTreino,
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function DetalhesTreino() {
  const { id } = Route.useParams();
  const { user } = useRouteContext({ from: "/_authenticated" });
  const router = useRouter();
  const qc = useQueryClient();
  const idValido = UUID_RE.test(id);

  const treino = useQuery({ queryKey: ["treino", id], queryFn: () => buscarTreino(id), enabled: idValido });
  const participantes = useQuery({
    queryKey: ["treino", id, "participantes"],
    enabled: idValido && !!treino.data,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("participantes_do_treino", { _treino_id: id });
      if (error) throw error;
      return data ?? [];
    },
  });
  const organizador = useQuery({
    queryKey: ["treino", id, "organizador"],
    enabled: idValido && !!treino.data,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("nome_organizador", { _treino_id: id });
      if (error) throw error;
      return data as string | null;
    },
  });
  const ehOrganizador = treino.data?.organizador_id === user.id;
  const codigo = useQuery({
    queryKey: ["treino", id, "codigo"],
    enabled: !!treino.data && ehOrganizador && treino.data.visibilidade === "privado",
    queryFn: async () => {
      const { data, error } = await supabase.from("treino_codigos").select("codigo_acesso").eq("treino_id", id).maybeSingle();
      if (error) throw error;
      return data?.codigo_acesso ?? null;
    },
  });

  const atualizar = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["treino", id] }),
    qc.invalidateQueries({ queryKey: ["treinos"] }),
  ]);

  const confirmar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("participacoes").insert({ treino_id: id, usuario_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Presença confirmada!"),
    onError: (e) => toast.error(mensagemErro(e, "Não foi possível confirmar presença. Tente novamente.")),
    onSettled: atualizar,
  });
  const cancelar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("participacoes").delete().eq("treino_id", id).eq("usuario_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Presença cancelada. Sua vaga foi liberada."),
    onError: (e) => toast.error(mensagemErro(e, "Não foi possível cancelar. Tente novamente.")),
    onSettled: atualizar,
  });

  const voltar = () => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/inicio" }));

  if (!idValido || (treino.isSuccess && !treino.data)) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <h1 className="text-2xl font-bold">Treino não encontrado</h1>
        <p className="text-sm text-muted-foreground">Ele pode ter sido removido, ou é privado e precisa de código.</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={voltar}><ArrowLeft /> Voltar</Button>
          <Button asChild><Link to="/codigo"><KeyRound /> Entrar com código</Link></Button>
        </div>
      </div>
    );
  }
  if (treino.isLoading) return <Carregando texto="Carregando treino..." />;
  if (treino.error) return <Erro texto={mensagemErro(treino.error, "Não foi possível carregar o treino. Tente novamente.")} onRetry={() => treino.refetch()} />;

  const t = treino.data!;
  const lista = participantes.data ?? [];
  const total = participantes.data ? lista.length : t.participantes;
  const confirmado = lista.some((p) => p.usuario_id === user.id);
  const lotado = estaLotado(t.limite_participantes, total);
  const vagas = vagasRestantes(t.limite_participantes, total);
  const ocupado = confirmar.isPending || cancelar.isPending;

  async function compartilhar() {
    const link = `${window.location.origin}/treinos/${t.id}`;
    const texto = gerarTextoCompartilhamento(t, link, t.visibilidade === "privado" ? codigo.data : null);
    if (navigator.share) {
      try { await navigator.share({ title: `Treinaí — ${t.nome}`, text: texto }); return; }
      catch (e) { if ((e as Error).name === "AbortError") return; }
    }
    copiar(texto);
  }
  async function copiar(texto?: string) {
    const link = `${window.location.origin}/treinos/${t.id}`;
    try {
      await navigator.clipboard.writeText(texto ?? gerarTextoCompartilhamento(t, link, t.visibilidade === "privado" ? codigo.data : null));
      toast.success("Informações copiadas!");
    } catch (e) {
      toast.error(mensagemErro(e, "Não foi possível copiar."));
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={voltar} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-5 shadow-card md:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">{nomeModalidade(t)}</span>
              {t.visibilidade === "privado" && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" /> Privado</span>}
            </div>
            <h1 className="mt-3 text-3xl font-bold">{t.nome}</h1>
            {t.descricao && <p className="mt-2 whitespace-pre-line text-muted-foreground">{t.descricao}</p>}
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <Info icon={CalendarDays} label="Data" valor={formatarData(t.data)} />
              <Info icon={Clock} label="Horário" valor={formatarHora(t.horario)} />
              <Info icon={MapPin} label="Local" valor={t.local} />
              <Info icon={UserRound} label="Organizador" valor={organizador.data ?? "…"} />
            </dl>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-card md:p-7">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Users className="size-5 text-primary" /> Participantes ({total})</h2>
            {participantes.isLoading ? <Carregando /> : participantes.error ? (
              <Erro texto="Não foi possível carregar a lista de participantes." onRetry={() => participantes.refetch()} />
            ) : lista.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Ninguém confirmou ainda. Seja o primeiro!</p>
            ) : (
              <ol className="mt-3 grid gap-2 sm:grid-cols-2">
                {lista.map((p, i) => (
                  <li key={p.usuario_id} className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-sm">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                    {p.nome}{p.usuario_id === user.id && <span className="text-xs text-muted-foreground">(você)</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <div className="grid grid-cols-3 text-center">
              <Stat n={total} l="confirmados" />
              <Stat n={t.limite_participantes} l="limite" />
              <Stat n={vagas} l="vagas" />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, (total / t.limite_participantes) * 100)}%` }} />
            </div>
            <div className="mt-5">
              {confirmado ? (
                <>
                  <p className="mb-2 text-center text-sm font-semibold text-success">✓ Presença confirmada</p>
                  <Button variant="outline" size="lg" className="w-full" disabled={ocupado} onClick={() => cancelar.mutate()}>Cancelar presença</Button>
                </>
              ) : lotado ? (
                <Button size="lg" className="w-full" disabled>Treino lotado</Button>
              ) : (
                <Button variant="success" size="lg" className="w-full" disabled={ocupado || participantes.isLoading} onClick={() => confirmar.mutate()}>Confirmar presença</Button>
              )}
            </div>
          </div>

          {ehOrganizador && t.visibilidade === "privado" && (
            <div className="rounded-2xl border border-accent bg-accent/20 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Código de acesso</p>
              <p className="mt-1 font-display text-4xl font-bold tracking-[0.3em]">{codigo.data ?? "····"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Só você vê este código. Envie para sua turma.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={compartilhar}><Share2 /> Compartilhar</Button>
            <Button variant="outline" onClick={() => copiar()}><Copy /> Copiar informações</Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Info({ icon: I, label, valor }: { icon: typeof MapPin; label: string; valor: string }) {
  return (
    <div className="flex items-start gap-3">
      <I className="mt-0.5 size-4 text-primary" />
      <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium">{valor}</dd></div>
    </div>
  );
}
function Stat({ n, l }: { n: number; l: string }) {
  return <div><p className="font-display text-2xl font-bold">{n}</p><p className="text-xs text-muted-foreground">{l}</p></div>;
}
