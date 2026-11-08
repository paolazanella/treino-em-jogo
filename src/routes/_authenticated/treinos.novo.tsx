import { useState } from "react";
import { createFileRoute, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Globe, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MODALIDADES, hojeISO, mensagemErro } from "@/lib/treinos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/treinos/novo")({
  head: () => ({
    meta: [
      { title: "Criar treino — Treinaí" },
      { name: "description", content: "Crie um novo treino público ou privado." },
      { property: "og:title", content: "Criar treino — Treinaí" },
      { property: "og:description", content: "Crie um novo treino público ou privado." },
    ],
  }),
  component: NovoTreino,
});

const schema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome do treino.").max(120),
    modalidade: z.enum(MODALIDADES, { message: "Escolha a modalidade." }),
    modalidade_outro: z.string().trim().max(60).optional(),
    data: z.string().min(1, "Informe a data."),
    horario: z.string().min(1, "Informe o horário."),
    local: z.string().trim().min(2, "Informe o local.").max(200),
    limite_participantes: z.coerce.number().int("Use um número inteiro.").min(1, "O limite deve ser maior que zero.").max(1000),
    descricao: z.string().trim().max(1000).optional(),
    visibilidade: z.enum(["publico", "privado"]),
  })
  .refine((v) => v.modalidade !== "Outro" || (v.modalidade_outro && v.modalidade_outro.length > 1), {
    path: ["modalidade_outro"],
    message: "Digite a modalidade.",
  })
  .refine((v) => v.data >= hojeISO(), { path: ["data"], message: "A data não pode estar no passado." });

function NovoTreino() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState({
    nome: "", modalidade: "", modalidade_outro: "", data: "", horario: "", local: "",
    limite_participantes: "", descricao: "", visibilidade: "publico",
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const r = schema.safeParse(f);
    if (!r.success) {
      const m: Record<string, string> = {};
      r.error.issues.forEach((i) => { m[String(i.path[0])] ??= i.message; });
      setErros(m);
      return;
    }
    setErros({});
    setSalvando(true);
    const v = r.data;
    const { data, error } = await supabase
      .from("treinos")
      .insert({
        nome: v.nome,
        modalidade: v.modalidade,
        modalidade_outro: v.modalidade === "Outro" ? (v.modalidade_outro ?? null) : null,
        data: v.data,
        horario: v.horario,
        local: v.local,
        limite_participantes: v.limite_participantes,
        descricao: v.descricao || null,
        visibilidade: v.visibilidade,
        organizador_id: user.id,
      })
      .select("id")
      .single();
    setSalvando(false);
    if (error || !data) {
      toast.error(mensagemErro(error, "Não foi possível criar o treino. Tente novamente."));
      return;
    }
    await qc.invalidateQueries({ queryKey: ["treinos"] });
    toast.success("Treino criado!");
    navigate({ to: "/treinos/$id", params: { id: data.id } });
  }

  const Campo = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {erros[id] && <p className="text-xs text-destructive">{erros[id]}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold md:text-3xl">Criar treino</h1>
      <form onSubmit={salvar} className="mt-6 space-y-5 rounded-2xl border bg-card p-5 shadow-card md:p-7" noValidate>
        {Campo({ id: "nome", label: "Nome do treino", children: <Input id="nome" value={f.nome} onChange={(e) => set("nome")(e.target.value)} maxLength={120} placeholder="Ex.: Vôlei de quinta" /> })}
        {Campo({
          id: "modalidade", label: "Modalidade",
          children: (
            <div className="flex flex-wrap gap-2">
              {MODALIDADES.map((m) => (
                <button key={m} type="button" onClick={() => set("modalidade")(m)}
                  className={cn("rounded-full border px-3 py-1.5 text-sm transition", f.modalidade === m ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                  {m}
                </button>
              ))}
            </div>
          ),
        })}
        {f.modalidade === "Outro" && Campo({ id: "modalidade_outro", label: "Qual modalidade?", children: <Input id="modalidade_outro" value={f.modalidade_outro} onChange={(e) => set("modalidade_outro")(e.target.value)} maxLength={60} /> })}
        <div className="grid gap-5 sm:grid-cols-2">
          {Campo({ id: "data", label: "Data", children: <Input id="data" type="date" min={hojeISO()} value={f.data} onChange={(e) => set("data")(e.target.value)} /> })}
          {Campo({ id: "horario", label: "Horário", children: <Input id="horario" type="time" value={f.horario} onChange={(e) => set("horario")(e.target.value)} /> })}
        </div>
        <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
          {Campo({ id: "local", label: "Local", children: <Input id="local" value={f.local} onChange={(e) => set("local")(e.target.value)} maxLength={200} placeholder="Ex.: Ginásio Municipal" /> })}
          {Campo({ id: "limite_participantes", label: "Limite de participantes", children: <Input id="limite_participantes" type="number" min={1} inputMode="numeric" value={f.limite_participantes} onChange={(e) => set("limite_participantes")(e.target.value)} /> })}
        </div>
        {Campo({ id: "descricao", label: "Descrição (opcional)", children: <Textarea id="descricao" value={f.descricao} onChange={(e) => set("descricao")(e.target.value)} maxLength={1000} rows={3} /> })}
        {Campo({
          id: "visibilidade", label: "Visibilidade",
          children: (
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                { v: "publico", t: "Público", d: "Aparece na página inicial", I: Globe },
                { v: "privado", t: "Privado", d: "Acesso com código de 4 dígitos", I: Lock },
              ] as const).map((o) => (
                <button key={o.v} type="button" onClick={() => set("visibilidade")(o.v)}
                  className={cn("flex items-start gap-3 rounded-xl border p-3 text-left transition", f.visibilidade === o.v ? "border-primary bg-secondary" : "hover:bg-muted")}>
                  <o.I className="mt-0.5 size-5 text-primary" />
                  <span><span className="block font-medium">{o.t}</span><span className="text-xs text-muted-foreground">{o.d}</span></span>
                </button>
              ))}
            </div>
          ),
        })}
        <Button type="submit" size="lg" className="w-full" disabled={salvando}>
          {salvando && <Loader2 className="animate-spin" />} Criar treino
        </Button>
      </form>
    </div>
  );
}
