import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, KeyRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Treinaí — listas de treino sem bagunça" },
      { name: "description", content: "Crie treinos esportivos, compartilhe e confirme presença sem listas manuais no WhatsApp." },
      { property: "og:title", content: "Treinaí — listas de treino sem bagunça" },
      { property: "og:description", content: "Crie treinos, compartilhe e confirme presença em segundos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <span className="font-display text-2xl font-bold text-primary">
          Treina<span className="text-foreground">í</span>
        </span>
        <Button asChild variant="outline"><Link to="/auth" search={{ redirect: undefined }}>Entrar</Link></Button>
      </header>
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-6 md:pt-20">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Vôlei · Futebol · Judô · Academia</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          Chega de lista no grupo. <span className="text-primary">Confirme presença em um toque.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          Crie o treino, compartilhe o link e acompanhe quem vai — com limite de vagas e treinos privados por código.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg"><Link to="/auth" search={{ redirect: undefined }}>Começar agora</Link></Button>
        </div>
        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            { icon: CalendarCheck, t: "Crie em segundos", d: "Modalidade, data, local e limite de vagas." },
            { icon: Users, t: "Presença confirmada", d: "Cada um confirma ou cancela. A vaga é liberada na hora." },
            { icon: KeyRound, t: "Treinos privados", d: "Compartilhe um código de 4 dígitos só com sua turma." },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border bg-card p-5 shadow-card">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-3 font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
