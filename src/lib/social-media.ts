// Banco de imagens do estúdio de redes sociais: fotos curadas do NutriConnect (licença Unsplash, em
// public/images/social, ver CREDITS.md) e a biblioteca da equipe no bucket público "social-media"
// (só administradores listam, enviam e apagam; migration 20261015140000).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Names } from "@/lib/appearance-data";

export type MediaCategory = "pratos" | "frutas" | "cafe" | "mercado" | "cozinha" | "bem-estar";

export const MEDIA_CATEGORY_LABEL: Record<MediaCategory, Names> = {
  pratos: ["Pratos", "Dishes", "Platos", "Plats"],
  frutas: [
    "Frutas e verduras",
    "Fruit and vegetables",
    "Frutas y verduras",
    "Fruits et légumes",
  ],
  cafe: ["Café e lanches", "Coffee & snacks", "Café y meriendas", "Café et collations"],
  mercado: [
    "Feira e mercado",
    "Market and groceries",
    "Feria y mercado",
    "Marché et courses",
  ],
  cozinha: [
    "Cozinha e pessoas",
    "Cooking and people",
    "Cocina y personas",
    "Cuisine et personnes",
  ],
  "bem-estar": ["Bem-estar", "Well-being", "Bienestar", "Bien-être"],
};

export interface MediaItem {
  id: string;
  /** Caminho/URL usado na arte (resolução cheia). */
  src: string;
  /** Miniatura para a grade. */
  thumb: string;
  label: string;
  category?: MediaCategory;
}

const stock = (id: string, label: string, category: MediaCategory): MediaItem => ({
  id,
  src: `/images/social/${id}.jpg`,
  thumb: `/images/social/thumbs/${id}.jpg`,
  label,
  category,
});
const site = (src: string, label: string, category: MediaCategory): MediaItem => ({
  id: src,
  src,
  thumb: src,
  label,
  category,
});

export const STOCK_MEDIA: MediaItem[] = [
  stock("bowl-legumes", "Bowl de legumes", "pratos"),
  stock("bowl-salmao", "Bowl com salmão", "pratos"),
  stock("bowl-graos", "Bowl de grãos", "pratos"),
  stock("salada-colorida", "Salada colorida", "pratos"),
  stock("salada-verde", "Salada verde", "pratos"),
  stock("salada-rabanete", "Salada com rabanete", "pratos"),
  stock("salada-macarrao", "Salada de macarrão", "pratos"),
  stock("frango-grelhado", "Frango grelhado", "pratos"),
  stock("peixe-molho", "Peixe ao molho", "pratos"),
  stock("espetinhos", "Espetinhos", "pratos"),
  stock("pratos-mesa", "Pratos na mesa", "pratos"),
  stock("prato-minimalista", "Prato minimalista", "pratos"),
  site("/images/recipes/roasted-veg.jpg", "Legumes assados", "pratos"),
  site("/images/presentation/salad-dark.jpg", "Salada (fundo escuro)", "pratos"),
  site("/images/presentation/jar-salad.jpg", "Salada no pote", "pratos"),
  site("/images/challenges/salad-bowl.jpg", "Tigela de salada", "pratos"),
  stock("frutas-variadas", "Frutas variadas", "frutas"),
  stock("frutas-tropicais", "Frutas tropicais", "frutas"),
  stock("frutas-vermelhas", "Frutas vermelhas", "frutas"),
  stock("bowl-frutas", "Bowl de frutas", "frutas"),
  stock("cerejas", "Cerejas", "frutas"),
  stock("morango", "Morango", "frutas"),
  stock("couve", "Couve", "frutas"),
  stock("espinafre", "Espinafre", "frutas"),
  stock("pepino-limao", "Pepino e limão", "frutas"),
  stock("mesa-cafe-da-manha", "Mesa de café da manhã", "cafe"),
  stock("torrada-ovo-abacate", "Torrada com ovo e abacate", "cafe"),
  stock("torrada-ovo", "Torrada com ovo", "cafe"),
  stock("iogurte-morango", "Iogurte com morango", "cafe"),
  stock("panquecas", "Panquecas", "cafe"),
  stock("panquecas-mel", "Panquecas com mel", "cafe"),
  stock("rabanada-frutas", "Rabanada com frutas", "cafe"),
  stock("suco-natural", "Suco natural", "cafe"),
  stock("leite", "Leite", "cafe"),
  stock("agua-copo", "Copo de água", "cafe"),
  site("/images/presentation/breakfast-plate.jpg", "Prato de café da manhã", "cafe"),
  stock("hortifruti", "Hortifrúti", "mercado"),
  stock("feira-legumes", "Feira de legumes", "mercado"),
  site("/images/presentation/market.jpg", "Mercado", "mercado"),
  stock("ingredientes-mesa", "Ingredientes na mesa", "cozinha"),
  stock("legumes-tabua", "Legumes na tábua", "cozinha"),
  stock("cozinhando-juntos", "Cozinhando juntos", "cozinha"),
  site("/images/presentation/cutting-board.jpg", "Tábua de corte", "cozinha"),
  site("/images/presentation/cooking-together.jpg", "Cozinhando em família", "cozinha"),
  site("/images/hero/kitchen-prep.jpg", "Preparo na cozinha", "cozinha"),
  site("/images/hero/hero-table.jpg", "Mesa posta", "cozinha"),
  site("/images/communities/friends-dinner.jpg", "Jantar com amigos", "cozinha"),
  site("/images/presentation/friends.jpg", "Amigos", "cozinha"),
  stock("yoga", "Yoga", "bem-estar"),
  stock("exercicio", "Exercício em casa", "bem-estar"),
];

const BUCKET = "social-media";
const FOLDER = "library";
export const MAX_MEDIA_BYTES = 3 * 1024 * 1024;
export const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Fotos enviadas pela equipe (mais recentes primeiro). */
export function useTeamMedia(enabled = true) {
  return useQuery({
    queryKey: ["social-media-library"],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<MediaItem[]> => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(FOLDER, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      return (data ?? [])
        .filter((f) => f.name && !f.name.startsWith("."))
        .map((f) => {
          const url = supabase.storage.from(BUCKET).getPublicUrl(`${FOLDER}/${f.name}`)
            .data.publicUrl;
          return {
            id: `${FOLDER}/${f.name}`,
            src: url,
            thumb: url,
            label: f.name
              .replace(/^\d+-/, "")
              .replace(/\.\w+$/, "")
              .replace(/[-_]+/g, " "),
          };
        });
    },
  });
}

/** Envia uma foto (já comprimida em JPEG) para a biblioteca da equipe e devolve a URL pública. */
export function useUploadMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ blob, name }: { blob: Blob; name: string }) => {
      if (blob.size > MAX_MEDIA_BYTES) throw new Error("A foto passa de 3 MB.");
      const slug =
        name
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/\.\w+$/, "")
          .replace(/[^\w-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase()
          .slice(0, 40) || "foto";
      const path = `${FOLDER}/${Date.now()}-${slug}.jpg`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social-media-library"] }),
  });
}

export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (path: string) => {
      const { error } = await supabase.storage.from(BUCKET).remove([path]);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social-media-library"] }),
  });
}

/** Lê e comprime uma foto para JPEG (lado maior até `max`). */
export function compressToBlob(file: File, max = 1600, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const error = () => new Error("Não foi possível ler a imagem.");
    let url: string;
    try {
      url = URL.createObjectURL(file);
    } catch {
      reject(error());
      return;
    }

    const img = new Image();
    let settled = false;
    let released = false;
    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
      if (!released) {
        released = true;
        try {
          URL.revokeObjectURL(url);
        } catch {
          /* a URL já pode ter sido liberada pelo navegador */
        }
      }
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error());
    };

    img.onload = () => {
      if (settled) return;
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (!width || !height || !Number.isFinite(max) || max <= 0) throw error();

        const ratio = Math.min(1, max / Math.max(width, height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * ratio));
        canvas.height = Math.max(1, Math.round(height * ratio));
        const context = canvas.getContext("2d");
        if (!context) throw error();
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        cleanup();

        canvas.toBlob(
          (blob) => {
            if (settled) return;
            settled = true;
            if (blob) resolve(blob);
            else reject(error());
          },
          "image/jpeg",
          quality,
        );
      } catch {
        fail();
      }
    };
    img.onerror = fail;
    try {
      img.src = url;
    } catch {
      fail();
    }
  });
}
