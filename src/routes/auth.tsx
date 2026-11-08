import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Check, X, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REGRAS_SENHA, garantirPerfil, senhaValida, traduzirErroAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar — Treinaí" },
      { name: "description", content: "Entre ou crie sua conta no Treinaí para organizar seus treinos." },
      { property: "og:title", content: "Entrar — Treinaí" },
      { property: "og:description", content: "Entre ou crie sua conta no Treinaí." },
    ],
  }),
  component: AuthPage,
});

function destinoSeguro(r?: string) {
  if (!r) return "/inicio";
  try {
    const u = new URL(r, window.location.origin);
    if (u.origin !== window.location.origin) return "/inicio";
    return u.pathname + u.search;
  } catch {
    return "/inicio";
  }
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [nome, setNome] = useState("");
  const [nasc, setNasc] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  const ir = () => {
    const d = destinoSeguro(redirect);
    navigate({ to: d as "/inicio", replace: true });
  };

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEnviando(false);
    if (error) return setErro(traduzirErroAuth(error));
    await garantirPerfil();
    ir();
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const nomeT = nome.trim();
    if (nomeT.length < 2) return setErro("Informe seu nome completo.");
    if (!nasc) return setErro("Informe sua data de nascimento.");
    if (nasc > new Date().toISOString().slice(0, 10)) return setErro("Data de nascimento inválida.");
    if (!z.string().email().safeParse(email.trim()).success) return setErro("E-mail inválido.");
    if (!senhaValida(senha)) return setErro("A senha não atende aos requisitos abaixo.");
    setEnviando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        emailRedirectTo: window.location.origin + "/inicio",
        data: { nome: nomeT, data_nascimento: nasc },
      },
    });
    setEnviando(false);
    if (error) return setErro(traduzirErroAuth(error));
    if (data.user && data.user.identities && data.user.identities.length === 0)
      return setErro("Este e-mail já está cadastrado. Tente entrar.");
    if (data.session) {
      await garantirPerfil({ nome: nomeT, data_nascimento: nasc });
      ir();
    } else {
      setConfirmar(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-center font-display text-4xl font-bold text-primary">
          Treina<span className="text-foreground">í</span>
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Seus treinos organizados, sem bagunça no grupo.</p>

        <div className="mt-8 rounded-2xl border bg-card p-6 shadow-card">
          {confirmar ? (
            <div className="space-y-3 text-center">
              <MailCheck className="mx-auto size-10 text-primary" />
              <h2 className="text-xl font-semibold">Confirme seu e-mail</h2>
              <p className="text-sm text-muted-foreground">
                Enviamos um link para <strong>{email}</strong>. Clique nele para ativar sua conta e depois entre aqui.
              </p>
              <Button variant="outline" onClick={() => { setConfirmar(false); setModo("login"); }}>
                Ir para o login
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-medium">
                {(["login", "cadastro"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setModo(m); setErro(null); }}
                    className={cn("rounded-md py-2 transition", modo === m ? "bg-card shadow-sm" : "text-muted-foreground")}
                  >
                    {m === "login" ? "Entrar" : "Criar conta"}
                  </button>
                ))}
              </div>

              <form onSubmit={modo === "login" ? entrar : cadastrar} className="space-y-4" noValidate>
                {modo === "cadastro" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="nome">Nome completo</Label>
                      <Input id="nome" value={nome} maxLength={100} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="nasc">Data de nascimento</Label>
                      <Input id="nasc" type="date" value={nasc} onChange={(e) => setNasc(e.target.value)} />
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoComplete={modo === "login" ? "current-password" : "new-password"}
                  />
                  {modo === "cadastro" && (
                    <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
                      {REGRAS_SENHA.map((r) => {
                        const ok = r.test(senha);
                        return (
                          <li key={r.id} className={cn("flex items-center gap-1", ok ? "text-success" : "text-muted-foreground")}>
                            {ok ? <Check className="size-3.5" /> : <X className="size-3.5" />} {r.label}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                {erro && <p role="alert" className="rounded-md bg-destructive/10 p-2.5 text-sm text-destructive">{erro}</p>}
                <Button type="submit" size="lg" className="w-full" disabled={enviando || (modo === "cadastro" && !senhaValida(senha))}>
                  {enviando && <Loader2 className="animate-spin" />}
                  {modo === "login" ? "Entrar" : "Criar conta"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
