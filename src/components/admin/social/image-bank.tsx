// Banco de imagens do editor: fotos curadas do NutriConnect (por categoria) e a biblioteca da equipe
// (envio comprimido para o Storage, seleção e exclusão). Clicar numa foto coloca ela na arte.
import { useRef, useState } from "react";
import { siteConfirm } from "@/components/confirm-action";
import { toast } from "sonner";
import { Check, ImagePlus, Loader2, Trash2 } from "lucide-react";
import {
  MEDIA_CATEGORY_LABEL,
  MEDIA_TYPES,
  STOCK_MEDIA,
  compressToBlob,
  useDeleteMedia,
  useTeamMedia,
  useUploadMedia,
  type MediaCategory,
  type MediaItem,
} from "@/lib/social-media";
import { cn } from "@/lib/utils";
import { useTr } from "@/components/settings-ui";

const pill =
  "inline-flex h-7 shrink-0 items-center rounded-full border px-3 text-[11px] font-semibold transition";
const pillOn = "border-foreground bg-foreground text-background";
const pillOff = "border-border/70 bg-card text-muted-foreground hover:text-foreground";

export function ImageBank({
  value,
  onPick,
}: {
  value?: string;
  onPick: (src: string | undefined) => void;
}) {
  const tr = useTr();
  const [tab, setTab] = useState<"banco" | "equipe">("banco");
  const [cat, setCat] = useState<MediaCategory | "todas">("todas");
  const team = useTeamMedia(tab === "equipe");
  const upload = useUploadMedia();
  const remove = useDeleteMedia();
  const file = useRef<HTMLInputElement>(null);
  const stock = STOCK_MEDIA.filter((m) => cat === "todas" || m.category === cat);

  const send = async (f: File) => {
    if (!MEDIA_TYPES.includes(f.type))
      return toast.error(
        tr([
          "Use uma foto JPEG, PNG ou WebP.",
          "Use a JPEG, PNG or WebP photo.",
          "Usa una foto JPEG, PNG o WebP.",
          "Utilisez une photo JPEG, PNG ou WebP.",
        ]),
      );
    try {
      const blob = await compressToBlob(f);
      const url = await upload.mutateAsync({ blob, name: f.name });
      onPick(url);
      setTab("equipe");
      toast.success(
        tr([
          "Foto salva na biblioteca da equipe e aplicada na arte.",
          "Photo saved to the team library and applied to the artwork.",
          "Foto guardada en la biblioteca del equipo y aplicada al diseño.",
          "Photo enregistrée dans la bibliothèque de l’équipe et appliquée au visuel.",
        ]),
      );
    } catch (err) {
      toast.error(
        (err as Error).message ||
          tr([
            "Não foi possível enviar a foto.",
            "Couldn’t upload the photo.",
            "No se pudo subir la foto.",
            "Impossible d’envoyer la photo.",
          ]),
      );
    }
  };

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 rounded-full bg-secondary/70 p-1">
        {(
          [
            ["banco", `NutriConnect (${STOCK_MEDIA.length})`],
            ["equipe", tr(["Da equipe", "Team", "Del equipo", "De l’équipe"])],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "h-8 flex-1 rounded-full text-xs font-semibold transition",
              tab === id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "banco" ? (
        <>
          <div className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {(["todas", ...Object.keys(MEDIA_CATEGORY_LABEL)] as (MediaCategory | "todas")[]).map(
              (c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={cn(pill, cat === c ? pillOn : pillOff)}
                >
                  {c === "todas"
                    ? tr(["Todas", "All", "Todas", "Toutes"])
                    : MEDIA_CATEGORY_LABEL[c]}
                </button>
              ),
            )}
          </div>
          <Grid items={stock} value={value} onPick={onPick} />
          <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
            {tr([
              "Fotos do Unsplash (licença de uso livre, inclusive comercial).",
              "Photos from Unsplash (free-use license, including commercial).",
              "Fotos de Unsplash (licencia de uso libre, incluso comercial).",
              "Photos Unsplash (licence d’utilisation libre, y compris commerciale).",
            ])}
          </p>
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={upload.isPending}
            onClick={() => file.current?.click()}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/80 text-xs font-semibold text-muted-foreground transition hover:border-accent hover:bg-accent/5 hover:text-foreground disabled:opacity-60"
          >
            {upload.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {upload.isPending
              ? tr(["Enviando…", "Uploading…", "Subiendo…", "Envoi…"])
              : tr([
                  "Enviar foto para a biblioteca",
                  "Upload photo to the library",
                  "Subir foto a la biblioteca",
                  "Envoyer une photo dans la bibliothèque",
                ])}
          </button>
          <input
            ref={file}
            type="file"
            accept={MEDIA_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void send(f);
            }}
          />
          {team.isLoading ? (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((k) => (
                <div key={k} className="st-shimmer aspect-[4/5] rounded-xl bg-secondary" />
              ))}
            </div>
          ) : team.error ? (
            <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {tr([
                "Não foi possível abrir a biblioteca:",
                "Couldn’t open the library:",
                "No se pudo abrir la biblioteca:",
                "Impossible d’ouvrir la bibliothèque :",
              ])}{" "}
              {(team.error as Error).message}
            </p>
          ) : (team.data ?? []).length === 0 ? (
            <p className="mt-3 rounded-xl bg-secondary/60 px-3 py-3 text-center text-xs text-muted-foreground">
              {tr([
                "A biblioteca da equipe ainda está vazia. As fotos enviadas ficam aqui para reusar.",
                "The team library is still empty. Uploaded photos stay here to reuse.",
                "La biblioteca del equipo aún está vacía. Las fotos subidas quedan aquí para reutilizarlas.",
                "La bibliothèque de l’équipe est encore vide. Les photos envoyées restent ici pour être réutilisées.",
              ])}
            </p>
          ) : (
            <Grid
              items={team.data ?? []}
              value={value}
              onPick={onPick}
              onDelete={async (m) => {
                if (
                  !(await siteConfirm(
                    tr([
                      "Apagar esta foto da biblioteca da equipe?",
                      "Delete this photo from the team library?",
                      "¿Borrar esta foto de la biblioteca del equipo?",
                      "Supprimer cette photo de la bibliothèque de l’équipe ?",
                    ]),
                  ))
                )
                  return;
                remove.mutate(m.id, {
                  onSuccess: () => {
                    if (value === m.src) onPick(undefined);
                    toast.success(
                      tr(["Foto apagada.", "Photo deleted.", "Foto borrada.", "Photo supprimée."]),
                    );
                  },
                  onError: (err) => toast.error((err as Error).message),
                });
              }}
            />
          )}
          <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
            {tr([
              "Use só fotos próprias ou com direito de uso. Nada de “antes e depois”.",
              "Only use your own photos or ones you have the rights to. No “before and after”.",
              "Usa solo fotos propias o con derecho de uso. Nada de “antes y después”.",
              "N’utilisez que vos propres photos ou des photos dont vous avez les droits. Pas d’« avant/après ».",
            ])}
          </p>
        </>
      )}
    </div>
  );
}

function Grid({
  items,
  value,
  onPick,
  onDelete,
}: {
  items: MediaItem[];
  value?: string;
  onPick: (src: string | undefined) => void;
  onDelete?: (m: MediaItem) => void;
}) {
  const tr = useTr();
  return (
    <div className="st-thin mt-2 grid max-h-[22rem] grid-cols-3 gap-2 overflow-y-auto pr-0.5">
      {items.map((m, k) => {
        const on = value === m.src;
        return (
          <div
            key={m.id}
            className="group relative animate-in fade-in zoom-in-95 duration-300"
            style={{ animationDelay: `${Math.min(k, 18) * 20}ms`, animationFillMode: "both" }}
          >
            <button
              type="button"
              onClick={() => onPick(on ? undefined : m.src)}
              title={m.label}
              className={cn(
                "relative block aspect-[4/5] w-full overflow-hidden rounded-xl border-2 bg-secondary transition",
                on ? "border-accent shadow-md" : "border-transparent hover:border-accent/40",
              )}
            >
              <img
                src={m.thumb}
                alt={m.label}
                loading="lazy"
                draggable={false}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5 text-left text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                {m.label}
              </span>
              {on && (
                <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-accent text-accent-foreground shadow nc-pop">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(m)}
                aria-label={tr([
                  "Apagar foto",
                  "Delete photo",
                  "Borrar foto",
                  "Supprimer la photo",
                ])}
                className="absolute left-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition hover:bg-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
