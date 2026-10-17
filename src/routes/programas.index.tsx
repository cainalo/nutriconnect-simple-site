// Loja de programas (N10): programas à venda dos profissionais e os que a pessoa já comprou.
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, ShoppingBag } from "lucide-react";
import { ProgramCard } from "@/components/program-card";
import { useTr } from "@/components/settings-ui";
import { useAuth } from "@/hooks/use-auth";
import { useOwnedPrograms, useProgramStore } from "@/lib/programs";
import { cardsByIds } from "@/lib/social/api";
import { EmptyPhoto } from "@/components/clinical/ui";

export const Route = createFileRoute("/programas/")({
  component: ProgramStore,
});

function ProgramStore() {
  const tr = useTr();
  const { user } = useAuth();
  const store = useProgramStore();
  const owned = useOwnedPrograms(user?.id);
  const [q, setQ] = useState("");

  const all = [...(store.data ?? []), ...(owned.data ?? [])];
  const proIds = [...new Set(all.map((p) => p.professional_id))].sort();
  const pros = useQuery({
    queryKey: ["program-pros", ...proIds],
    enabled: proIds.length > 0,
    queryFn: () => cardsByIds(proIds),
  });
  const ownedIds = new Set((owned.data ?? []).map((p) => p.id));
  const term = q.trim().toLowerCase();
  const list = (store.data ?? []).filter(
    (p) =>
      !ownedIds.has(p.id) &&
      (!term ||
        `${p.title} ${p.summary} ${pros.data?.get(p.professional_id)?.name ?? ""}`
          .toLowerCase()
          .includes(term)),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1
          data-page-head
          className="flex items-center gap-2 text-2xl font-extrabold font-display text-foreground"
        >
          <ShoppingBag className="h-6 w-6 text-accent" />
          {tr(["Programas", "Programs", "Programas", "Programmes"])}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {tr([
            "Programas criados por profissionais verificados, em módulos para seguir no seu ritmo. Pagamento único, acesso para sempre.",
            "Programs by verified professionals, in modules to follow at your pace. One-time payment, lifetime access.",
            "Programas creados por profesionales verificados, en módulos para seguir a tu ritmo. Pago único, acceso para siempre.",
            "Des programmes créés par des professionnels vérifiés, en modules à suivre à votre rythme. Paiement unique, accès à vie.",
          ])}
        </p>
      </header>

      {(owned.data ?? []).length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold text-foreground">
            {tr(["Meus programas", "My programs", "Mis programas", "Mes programmes"])}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(owned.data ?? []).map((p) => (
              <ProgramCard
                key={p.id}
                program={p}
                proName={pros.data?.get(p.professional_id)?.name}
                owned
              />
            ))}
          </div>
        </section>
      )}

      <div className="mb-4 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tr([
            "Buscar por tema ou profissional",
            "Search by topic or professional",
            "Buscar por tema o profesional",
            "Rechercher par thème ou professionnel",
          ])}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {store.isLoading ? (
        <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-muted-foreground" />
      ) : list.length === 0 ? (
        <div className="overflow-hidden rounded-3xl border border-border/70 bg-card p-6 text-center text-sm text-muted-foreground">
          {!term && (
            <EmptyPhoto
              src="/images/presentation/breakfast-plate.jpg"
              className="-mx-6 -mt-6 mb-5"
            />
          )}
          {term
            ? tr(["Nada encontrado.", "Nothing found.", "No se encontró nada.", "Rien trouvé."])
            : tr([
                "Ainda não há programas à venda. Volte em breve!",
                "No programs for sale yet. Come back soon!",
                "Aún no hay programas a la venta. ¡Vuelve pronto!",
                "Pas encore de programmes en vente. Revenez bientôt !",
              ])}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <ProgramCard key={p.id} program={p} proName={pros.data?.get(p.professional_id)?.name} />
          ))}
        </div>
      )}
    </div>
  );
}
