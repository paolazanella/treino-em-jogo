import { supabase } from "@/integrations/supabase/client";

export const MODALIDADES = [
  "Vôlei",
  "Vôlei de Praia",
  "Basquete",
  "Futebol",
  "Judô",
  "Jiu-jítsu",
  "Academia",
  "Outro",
] as const;

export type Treino = {
  id: string;
  nome: string;
  modalidade: string;
  modalidade_outro: string | null;
  descricao: string | null;
  data: string;
  horario: string;
  local: string;
  limite_participantes: number;
  visibilidade: "publico" | "privado" | string;
  organizador_id: string;
  created_at: string;
};

export type TreinoComContagem = Treino & { participantes: number };

export const TREINO_COLS =
  "id,nome,modalidade,modalidade_outro,descricao,data,horario,local,limite_participantes,visibilidade,organizador_id,created_at,participacoes(count)";

type RawTreino = Treino & { participacoes?: { count: number }[] | null };

export function normalizar(r: RawTreino): TreinoComContagem {
  const { participacoes, ...t } = r;
  return { ...t, participantes: participacoes?.[0]?.count ?? 0 };
}

export function nomeModalidade(t: Pick<Treino, "modalidade" | "modalidade_outro">) {
  return t.modalidade === "Outro" && t.modalidade_outro ? t.modalidade_outro : t.modalidade;
}

export function formatarData(data: string) {
  const [y, m, d] = data.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function formatarHora(h: string) {
  return h.slice(0, 5);
}

export function hojeISO() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Remaining spots, never negative. */
export function vagasRestantes(limite: number, participantes: number) {
  return Math.max(0, limite - participantes);
}

export function estaLotado(limite: number, participantes: number) {
  return participantes >= limite;
}

export function gerarTextoCompartilhamento(
  t: Pick<Treino, "nome" | "modalidade" | "modalidade_outro" | "data" | "horario" | "local">,
  link: string,
  codigo?: string | null,
) {
  const linhas = [
    "Treinaí",
    "",
    nomeModalidade(t),
    "",
    t.nome,
    "",
    `${formatarData(t.data)} às ${formatarHora(t.horario)}`,
    "",
    t.local,
    "",
    "Acesse:",
    link,
  ];
  if (codigo) linhas.push("", `Código de acesso: ${codigo}`);
  return linhas.join("\n");
}

export function mensagemErro(err: unknown, fallback: string) {
  console.error("[Treinaí]", err);
  const msg =
    err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "";
  if (msg.includes("TREINO_LOTADO")) return "Treino lotado.";
  if (msg.includes("duplicate key") && msg.includes("participacoes")) return "Você já confirmou presença.";
  if (/Failed to fetch|NetworkError|network/i.test(msg))
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  return fallback;
}

// ---- queries ----

export async function buscarTreinosPublicos(): Promise<TreinoComContagem[]> {
  const { data, error } = await supabase
    .from("treinos")
    .select(TREINO_COLS)
    .eq("visibilidade", "publico")
    .gte("data", hojeISO())
    .order("data")
    .order("horario")
    .limit(100);
  if (error) throw error;
  return (data as unknown as RawTreino[]).map(normalizar);
}

export async function buscarOrganizados(userId: string): Promise<TreinoComContagem[]> {
  const { data, error } = await supabase
    .from("treinos")
    .select(TREINO_COLS)
    .eq("organizador_id", userId)
    .order("data", { ascending: false });
  if (error) throw error;
  return (data as unknown as RawTreino[]).map(normalizar);
}

export async function buscarParticipando(userId: string): Promise<TreinoComContagem[]> {
  const { data, error } = await supabase
    .from("participacoes")
    .select(`treino:treinos(${TREINO_COLS})`)
    .eq("usuario_id", userId);
  if (error) throw error;
  return (data as unknown as { treino: RawTreino | null }[])
    .map((r) => r.treino)
    .filter((t): t is RawTreino => !!t)
    .map(normalizar)
    .sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario));
}

export async function buscarTreino(id: string): Promise<TreinoComContagem | null> {
  const { data, error } = await supabase.from("treinos").select(TREINO_COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizar(data as unknown as RawTreino) : null;
}
