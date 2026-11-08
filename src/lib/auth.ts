import { supabase } from "@/integrations/supabase/client";

export const REGRAS_SENHA = [
  { id: "len", label: "Mínimo de 8 caracteres", test: (s: string) => s.length >= 8 },
  { id: "upper", label: "Uma letra maiúscula", test: (s: string) => /[A-Z]/.test(s) },
  { id: "lower", label: "Uma letra minúscula", test: (s: string) => /[a-z]/.test(s) },
  { id: "num", label: "Um número", test: (s: string) => /\d/.test(s) },
] as const;

export function senhaValida(s: string) {
  return REGRAS_SENHA.every((r) => r.test(s));
}

export function traduzirErroAuth(err: unknown): string {
  console.error("[Treinaí auth]", err);
  const msg = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "";
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este e-mail já está cadastrado. Tente entrar.";
  if (m.includes("pwned") || m.includes("leaked") || m.includes("compromised"))
    return "Esta senha apareceu em vazamentos de dados. Escolha outra senha.";
  if (m.includes("password") && (m.includes("at least") || m.includes("characters") || m.includes("weak")))
    return `A senha não atende aos requisitos: ${msg}`;
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  if (m.includes("invalid") && m.includes("email")) return "E-mail inválido.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  return msg ? `Não foi possível concluir: ${msg}` : "Não foi possível concluir. Tente novamente.";
}

/** Ensures a profile row exists for the signed-in user (idempotent). */
export async function garantirPerfil(dados?: { nome?: string; data_nascimento?: string }) {
  const { data: u } = await supabase.auth.getUser();
  const user = u.user;
  if (!user) return;
  const meta = (user.user_metadata ?? {}) as Record<string, string>;
  const nome = dados?.nome ?? meta["nome"] ?? "";
  const nasc = dados?.data_nascimento ?? meta["data_nascimento"] ?? null;
  const { data: atual } = await supabase.from("profiles").select("id,nome,data_nascimento").eq("id", user.id).maybeSingle();
  if (atual && atual.nome && atual.data_nascimento) return;
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    nome: atual?.nome || nome,
    data_nascimento: atual?.data_nascimento || nasc || null,
    email: user.email ?? null,
  });
  if (error) console.error("[Treinaí] falha ao salvar perfil", error);
}
