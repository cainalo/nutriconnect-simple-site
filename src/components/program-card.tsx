// Cartão de um programa da loja (N10): vitrine, perfil do profissional e "Meus programas".
import { Link } from "@tanstack/react-router";
import { useTr } from "@/components/settings-ui";
import { useI18n } from "@/hooks/use-i18n";
import type { Program } from "@/lib/programs";

export function ProgramCard({
  program,
  proName,
  owned,
}: {
  program: Program;
  proName?: string;
  owned?: boolean;
}) {
  const tr = useTr();
  const { locale } = useI18n();
  const price = new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(
    program.price_cents / 100,
  );
  return (
    <Link
      to="/programas/$programId"
      params={{ programId: program.id }}
      className="flex h-full flex-col rounded-3xl border border-border/70 bg-card p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-card"
    >
      <span className="text-4xl" aria-hidden>
        {program.emoji}
      </span>
      <p className="mt-3 font-display text-lg font-bold leading-tight text-foreground">
        {program.title}
      </p>
      {proName && <p className="mt-0.5 text-xs text-muted-foreground">{proName}</p>}
      {program.summary && (
        <p className="mt-2 line-clamp-3 text-sm text-foreground/80">{program.summary}</p>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs">
        <span className="text-muted-foreground">
          {program.duration_weeks} {tr(["semanas", "weeks", "semanas", "semaines"])}
        </span>
        <span className="rounded-full bg-accent-soft px-3 py-1 font-bold text-foreground">
          {owned ? tr(["Seu", "Yours", "Tuyo", "À vous"]) : price}
        </span>
      </div>
    </Link>
  );
}
