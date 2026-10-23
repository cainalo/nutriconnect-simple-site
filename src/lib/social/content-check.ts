import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { loadLocale } from "@/lib/i18n";
import { pickName, type Names } from "@/lib/appearance-data";

/** A IA não aprovou o conteúdo: nada foi salvo. `message` já vem pronta para mostrar à pessoa. */
export class ContentRejectedError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "ContentRejectedError";
  }
}

export interface PostCheckInput {
  kind: "post";
  title?: string | null;
  body: string;
  tags: string[];
  recipe?: unknown;
  /** Foto como data URL, ou endereço de uma foto já enviada pela própria pessoa. */
  image?: string | null;
  /** Campos que a IA não analisa; ficam guardados só se o conteúdo for barrado e depois liberado. */
  context?: {
    type?: string;
    audience?: string;
    communityId?: string | null;
    themeId?: string | null;
    blockOrder?: string[] | null;
  };
}

export interface CommentCheckInput {
  kind: "comment";
  postId: string;
  body: string;
}

export interface Approved {
  imageUrl: string | null;
  title: string | null;
  body: string;
  tags: string[];
}

interface Reply {
  ok?: boolean;
  approved?: boolean;
  code?: string;
  message?: string;
  imageUrl?: string | null;
  title?: string | null;
  body?: string;
  tags?: string[];
}

const UNAVAILABLE: Names = [
  "Não foi possível analisar o conteúdo agora. Tente de novo em instantes.",
  "We couldn't review the content right now. Please try again in a moment.",
  "No se pudo analizar el contenido ahora. Inténtalo de nuevo en un momento.",
  "Impossible d'analyser le contenu pour le moment. Réessayez dans un instant.",
];

// A análise responde em português. Nos outros idiomas mostramos o motivo pelo código (a dica
// específica da IA fica só em português).
const REASONS: Record<string, Names> = {
  fora_do_tema: [
    "Este assunto não tem relação com o NutriConnect. Publique conteúdo sobre alimentação, nutrição, receitas, saúde e bem-estar.",
    "This topic isn't related to NutriConnect. Post about food, nutrition, recipes, health and well-being.",
    "Este tema no tiene relación con NutriConnect. Publica sobre alimentación, nutrición, recetas, salud y bienestar.",
    "Ce sujet n'a pas de lien avec NutriConnect. Publiez sur l'alimentation, la nutrition, les recettes, la santé et le bien-être.",
  ],
  imagem_fora_do_tema: [
    "A foto não tem relação com alimentação, nutrição ou saúde. Escolha uma imagem que combine com o tema do site.",
    "The photo isn't related to food, nutrition or health. Choose an image that fits the site's theme.",
    "La foto no tiene relación con alimentación, nutrición o salud. Elige una imagen acorde al tema del sitio.",
    "La photo n'a pas de lien avec l'alimentation, la nutrition ou la santé. Choisissez une image adaptée au thème du site.",
  ],
  imagem_nao_combina: [
    "A foto parece ser de outro assunto. Use uma imagem relacionada ao que você está contando.",
    "The photo seems to be about something else. Use an image related to what you're sharing.",
    "La foto parece ser de otro tema. Usa una imagen relacionada con lo que cuentas.",
    "La photo semble porter sur autre chose. Utilisez une image liée à ce que vous racontez.",
  ],
  spam: [
    "Parece propaganda, golpe ou divulgação em excesso. Esse tipo de conteúdo não pode ser publicado.",
    "This looks like advertising, a scam or excessive promotion. It can't be posted.",
    "Parece publicidad, estafa o promoción excesiva. Este contenido no se puede publicar.",
    "Cela ressemble à de la publicité, une arnaque ou une promotion excessive. Ce contenu ne peut pas être publié.",
  ],
  desinformacao: [
    "O texto traz uma informação de saúde que pode ser perigosa. Revise e cite fontes confiáveis.",
    "The text includes health information that may be dangerous. Please review it and cite reliable sources.",
    "El texto trae información de salud que puede ser peligrosa. Revísalo y cita fuentes confiables.",
    "Le texte contient une information de santé qui peut être dangereuse. Relisez-le et citez des sources fiables.",
  ],
  ofensivo: [
    "O conteúdo tem ofensas ou linguagem inadequada.",
    "The content has insults or inappropriate language.",
    "El contenido tiene ofensas o lenguaje inadecuado.",
    "Le contenu contient des insultes ou un langage inapproprié.",
  ],
  assedio: [
    "O conteúdo parece assédio ou ataque a outra pessoa.",
    "The content looks like harassment or an attack on someone.",
    "El contenido parece acoso o ataque a otra persona.",
    "Le contenu ressemble à du harcèlement ou à une attaque contre quelqu'un.",
  ],
  inadequado: [
    "O conteúdo (texto ou imagem) é impróprio para a plataforma.",
    "The content (text or image) isn't appropriate for the platform.",
    "El contenido (texto o imagen) no es apropiado para la plataforma.",
    "Le contenu (texte ou image) n'est pas approprié pour la plateforme.",
  ],
  limite_diario: [
    "Você chegou ao limite diário de publicações e comentários. Volte amanhã!",
    "You've reached today's limit for posts and comments. Come back tomorrow!",
    "Llegaste al límite diario de publicaciones y comentarios. ¡Vuelve mañana!",
    "Vous avez atteint la limite quotidienne de publications et de commentaires. Revenez demain !",
  ],
};

/** Mensagem no idioma da pessoa: em português, a da IA; nos outros, a do código. */
export function rejectionMessage(
  code: string,
  aiMessage: string | undefined,
  locale = loadLocale(),
) {
  if (locale === "pt-BR" && aiMessage) return aiMessage;
  return pickName(REASONS[code] ?? REASONS.inadequado, locale);
}

/**
 * Manda o conteúdo para a análise da IA ANTES de salvar. Só devolve se foi aprovado (e então o banco
 * aceita exatamente estes valores); reprovado ou IA fora do ar lança erro e nada é publicado.
 */
export async function checkContent(input: PostCheckInput | CommentCheckInput): Promise<Approved> {
  const { data, error } = await supabase.functions.invoke<Reply>("check-content", { body: input });
  if (error) {
    const locale = loadLocale();
    let message = pickName(UNAVAILABLE, locale);
    if (error instanceof FunctionsHttpError && locale === "pt-BR") {
      const payload = await error.context.json().catch(() => null);
      if (payload?.error) message = payload.error;
    }
    throw new Error(message);
  }
  if (!data || data.ok === false) {
    const locale = loadLocale();
    throw new Error(
      locale === "pt-BR" && data?.message ? data.message : pickName(UNAVAILABLE, locale),
    );
  }
  if (!data.approved) {
    const code = data.code ?? "inadequado";
    throw new ContentRejectedError(rejectionMessage(code, data.message), code);
  }
  return {
    imageUrl: data.imageUrl ?? null,
    title: data.title ?? null,
    body: data.body ?? "",
    tags: data.tags ?? [],
  };
}
