import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mensagemErro } from "@/lib/treinos";

export const Route = createFileRoute("/_authenticated/codigo")({
  head: () => ({
    meta: [
      { title: "Entrar com código — Treinaí" },
      { name: "description", content: "Acesse um treino privado com o código de 4 dígitos." },
      { property: "og:title", content: "Entrar com código — Treinaí" },
      { property: "og:description", content: "Acesse um treino privado com o código de 4 dígitos." },
    ],
  }),
  component: EntrarCodigo,
});

function EntrarCodigo() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!/^\d{4}$/.test(codigo)) return setErro("Digite os 4 números do código.");
    setEnviando(true);
    const { data, error } = await supabase.rpc("entrar_com_codigo", { _codigo: codigo });
    setEnviando(false);
    if (error) return setErro(mensagemErro(error, "Não foi possível validar o código. Tente novamente."));
    if (!data) return setErro("Código inválido.");
    navigate({ to: "/treinos/$id", params: { id: data } });
  }

  return (
    <div className="mx-auto max-w-sm py-6">
      <div className="rounded-2xl border bg-card p-6 text-center shadow-card">
        <KeyRound className="mx-auto size-10 text-primary" />
        <h1 className="mt-3 text-2xl font-bold">Entrar com código</h1>
        <p className="mt-1 text-sm text-muted-foreground">Digite o código de 4 dígitos que o organizador enviou.</p>
        <form onSubmit={enviar} className="mt-5 space-y-3">
          <Input
            aria-label="Código de acesso"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="0000"
            className="h-14 text-center font-display text-3xl tracking-[0.5em]"
          />
          {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={enviando}>
            {enviando && <Loader2 className="animate-spin" />} Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
