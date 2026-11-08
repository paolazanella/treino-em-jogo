import { Link } from "@tanstack/react-router";
import { CalendarDays, Clock, Lock, MapPin, Users } from "lucide-react";
import {
  estaLotado,
  formatarData,
  formatarHora,
  nomeModalidade,
  vagasRestantes,
  type TreinoComContagem,
} from "@/lib/treinos";

export function TreinoCard({ treino }: { treino: TreinoComContagem }) {
  const lotado = estaLotado(treino.limite_participantes, treino.participantes);
  const vagas = vagasRestantes(treino.limite_participantes, treino.participantes);
  return (
    <Link
      to="/treinos/$id"
      params={{ id: treino.id }}
      className="group block rounded-xl border bg-card p-4 shadow-card transition hover:border-primary/40 hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
          {nomeModalidade(treino)}
        </span>
        {treino.visibilidade === "privado" && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Lock className="size-3" /> Privado
          </span>
        )}
      </div>
      <h3 className="mt-2 text-lg font-semibold leading-tight group-hover:text-primary">{treino.nome}</h3>
      <div className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <CalendarDays className="size-4" /> {formatarData(treino.data)}
          <Clock className="ml-2 size-4" /> {formatarHora(treino.horario)}
        </span>
        <span className="flex items-center gap-2 truncate">
          <MapPin className="size-4 shrink-0" /> <span className="truncate">{treino.local}</span>
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <Users className="size-4 text-primary" /> {treino.participantes}/{treino.limite_participantes}
        </span>
        {lotado ? (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
            Treino lotado
          </span>
        ) : (
          <span className="text-xs font-semibold text-success">
            {vagas} {vagas === 1 ? "vaga" : "vagas"}
          </span>
        )}
      </div>
    </Link>
  );
}
