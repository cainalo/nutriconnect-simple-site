// Programas à venda de um profissional (N10), no perfil dele.
import { ShoppingBag } from "lucide-react";
import { ProgramCard } from "@/components/program-card";
import { useTr } from "@/components/settings-ui";
import { useProPrograms } from "@/lib/programs";

export function ProProgramsSection({ professionalId }: { professionalId: string }) {
  const tr = useTr();
  const programs = useProPrograms(professionalId);
  const list = programs.data ?? [];
  if (!list.length) return null;
  return (
    <section className="mt-6">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <ShoppingBag className="h-4 w-4 text-accent" />
        {tr(["Programas", "Programs", "Programas", "Programmes"])}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((p) => (
          <ProgramCard key={p.id} program={p} />
        ))}
      </div>
    </section>
  );
}
