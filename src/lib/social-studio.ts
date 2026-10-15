// Estúdio de redes sociais (S1): perfis, posts (ideias, rascunhos, agendados, publicados) e
// modelos, guardados no banco. A IA fica em social-studio.functions.ts.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables, TablesInsert } from "@/integrations/supabase/types";
import type { Names } from "@/lib/appearance-data";
import type { Network, PostFormat, PostIdea } from "@/lib/social-studio.functions";

export type SocialProfile = Tables<"social_profiles">;
export type SocialPost = Tables<"social_posts">;
export type PostStatus = "ideia" | "rascunho" | "aprovado" | "agendado" | "publicado";
export type Slide = { title: string; text: string };

export const NETWORK_LABEL: Record<Network, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  x: "X",
  outro: "Outra",
};
export const FORMAT_LABEL: Record<PostFormat, string> = {
  post: "Post",
  carrossel: "Carrossel",
  reels: "Reels",
  story: "Story",
  video: "Vídeo",
  texto: "Texto",
};
export const STATUS_LABEL: Record<PostStatus, string> = {
  ideia: "Ideia",
  rascunho: "Rascunho",
  aprovado: "Aprovado",
  agendado: "Agendado",
  publicado: "Publicado",
};
export const STATUSES = Object.keys(STATUS_LABEL) as PostStatus[];
export const ERROR_TEXT: Record<string, Names> = {
  forbidden: [
    "Sem acesso ao estúdio.",
    "No studio access.",
    "Sin acceso al estudio.",
    "Pas d'accès au studio.",
  ],
  limit: [
    "A cota diária de IA do estúdio acabou. Amanhã tem mais.",
    "The studio's daily AI quota is used up. More tomorrow.",
    "Se acabó la cuota diaria de IA del estudio. Mañana hay más.",
    "Le quota quotidien d'IA du studio est épuisé. À demain.",
  ],
  unavailable: [
    "A IA não está disponível agora.",
    "AI is unavailable right now.",
    "La IA no está disponible ahora.",
    "L'IA n'est pas disponible pour le moment.",
  ],
  failed: [
    "A IA não conseguiu responder. Tente de novo.",
    "AI couldn't answer. Try again.",
    "La IA no pudo responder. Inténtalo de nuevo.",
    "L'IA n'a pas pu répondre. Réessayez.",
  ],
};

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export const studioKeys = {
  all: ["social-studio"] as const,
  profiles: () => ["social-studio", "profiles"] as const,
  posts: () => ["social-studio", "posts"] as const,
  trends: () => ["social-studio", "trends"] as const,
};

export function useSocialProfiles() {
  return useQuery({
    queryKey: studioKeys.profiles(),
    retry: false,
    queryFn: async (): Promise<SocialProfile[]> => {
      const { data, error } = await supabase
        .from("social_profiles")
        .select("*")
        .order("created_at", { ascending: true });
      fail(error);
      return data ?? [];
    },
  });
}

export function useSocialPosts() {
  return useQuery({
    queryKey: studioKeys.posts(),
    retry: false,
    queryFn: async (): Promise<SocialPost[]> => {
      const { data, error } = await supabase
        .from("social_posts")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1000);
      fail(error);
      return data ?? [];
    },
  });
}

/** Números do que está em alta dentro do NutriConnect (só conteúdo público). */
export interface InternalTrends {
  top_posts: { type: string; title: string; tags: string[]; reactions: number; comments: number }[];
  top_tags: { tag: string; n: number }[];
  post_types: Record<string, number>;
  theme: { title: string; subtitle: string | null } | null;
  challenges: { title: string; people: number }[];
}

export function useInternalTrends() {
  return useQuery({
    queryKey: studioKeys.trends(),
    retry: false,
    queryFn: async (): Promise<InternalTrends> => {
      const { data, error } = await supabase.rpc("social_trends", { p_days: 14 });
      fail(error);
      return data as unknown as InternalTrends;
    },
  });
}

function useStudioMutation<T, R = unknown>(fn: (arg: T) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => qc.invalidateQueries({ queryKey: studioKeys.all }),
  });
}

export function useSaveProfile() {
  return useStudioMutation(
    async (p: Partial<SocialProfile> & { network: string; handle: string }) => {
      const row = {
        network: p.network,
        handle: p.handle.trim(),
        url: p.url?.trim() || null,
        notes: p.notes ?? "",
        sample_posts: p.sample_posts ?? "",
        metrics: (p.metrics ?? {}) as Json,
      };
      const { error } = p.id
        ? await supabase.from("social_profiles").update(row).eq("id", p.id)
        : await supabase.from("social_profiles").insert(row);
      fail(error);
    },
  );
}

export function useDeleteProfile() {
  return useStudioMutation(async (id: string) => {
    const { error } = await supabase.from("social_profiles").delete().eq("id", id);
    fail(error);
  });
}

/** Ideia da IA → linha do banco. */
export function ideaToPost(
  idea: PostIdea,
  network: Network,
  profileId: string | null,
): TablesInsert<"social_posts"> {
  return {
    network,
    profile_id: profileId,
    format: idea.format,
    title: idea.title,
    hook: idea.hook,
    caption: idea.caption,
    slides: idea.slides as unknown as Json,
    script: idea.script,
    hashtags: idea.hashtags,
    cta: idea.cta,
    visual_idea: [idea.visual_idea, idea.best_time && `Melhor horário: ${idea.best_time}`]
      .filter(Boolean)
      .join("\n")
      .slice(0, 1000),
    pillar: idea.pillar,
    status: "ideia",
    source: "ia",
  };
}

export function useInsertPosts() {
  return useStudioMutation(async (rows: TablesInsert<"social_posts">[]) => {
    if (!rows.length) return;
    const { error } = await supabase.from("social_posts").insert(rows);
    fail(error);
  });
}

export function useUpdatePost() {
  return useStudioMutation(async ({ id, ...patch }: Partial<SocialPost> & { id: string }) => {
    const { error } = await supabase.from("social_posts").update(patch).eq("id", id);
    fail(error);
  });
}

export function useDeletePost() {
  return useStudioMutation(async (id: string) => {
    const { error } = await supabase.from("social_posts").delete().eq("id", id);
    fail(error);
  });
}

/** Cria um post novo a partir de um modelo (ou duplica um post). */
export function useDuplicatePost() {
  return useStudioMutation(
    async ({ post, asTemplate }: { post: SocialPost; asTemplate: boolean }) => {
      const { id: _id, created_at: _c, updated_at: _u, owner_id: _o, ...rest } = post;
      const { error } = await supabase.from("social_posts").insert({
        ...rest,
        is_template: asTemplate,
        status: "rascunho",
        scheduled_for: null,
        // Salvar como modelo ou usar um modelo mantém o título; duplicar um post marca "(cópia)".
        title: asTemplate || post.is_template ? rest.title : `${rest.title} (cópia)`.slice(0, 160),
      });
      fail(error);
    },
  );
}

export const slidesOf = (p: SocialPost): Slide[] =>
  Array.isArray(p.slides)
    ? (p.slides as unknown[])
        .map((s) => s as Partial<Slide>)
        .map((s) => ({ title: String(s.title ?? ""), text: String(s.text ?? "") }))
    : [];

/** Texto pronto para colar na rede: legenda + CTA + hashtags. */
export function fullCaption(p: Pick<SocialPost, "caption" | "cta" | "hashtags">) {
  return [p.caption, p.cta, p.hashtags.length ? p.hashtags.map((h) => `#${h}`).join(" ") : ""]
    .filter(Boolean)
    .join("\n\n");
}

/** Cria ou atualiza um post e devolve o id (o editor continua no mesmo post depois de salvar). */
export function useSavePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, row }: { id?: string; row: TablesInsert<"social_posts"> }) => {
      if (id) {
        const { error } = await supabase.from("social_posts").update(row).eq("id", id);
        fail(error);
        return id;
      }
      const { data, error } = await supabase.from("social_posts").insert(row).select("id").single();
      fail(error);
      return data!.id as string;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: studioKeys.all }),
  });
}
